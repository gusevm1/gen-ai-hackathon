"""Supabase CRUD for zurich_geodata table.

Synchronous functions — in async FastAPI endpoints, wrap with asyncio.to_thread().
"""

from __future__ import annotations

import logging
import math
import time

from httpx import RemoteProtocolError

from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)

EARTH_RADIUS_M = 6_371_000


# ---------------------------------------------------------------------------
# Spatial helpers (same as neighborhood_db)
# ---------------------------------------------------------------------------

def _bbox(lat: float, lon: float, radius_m: float) -> tuple[float, float, float, float]:
    """Return (lat_min, lat_max, lon_min, lon_max) bounding box."""
    dlat = radius_m / 111_320
    dlon = radius_m / (111_320 * math.cos(math.radians(lat)))
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres."""
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2)
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Generic query
# ---------------------------------------------------------------------------

def _query_dataset(
    dataset: str,
    lat: float,
    lon: float,
    radius_m: float,
    limit: int = 1000,
    select: str = "lat, lon, properties",
    _max_retries: int = 3,
) -> list[dict]:
    """Return rows from zurich_geodata matching dataset + bbox.

    Retries on HTTP/2 connection errors (common under concurrency when
    the shared Supabase client's connection pool gets terminated).
    """
    lat_min, lat_max, lon_min, lon_max = _bbox(lat, lon, radius_m)
    last_err: Exception | None = None
    for attempt in range(_max_retries):
        try:
            client = supabase_service.get_client()
            result = (
                client.table("zurich_geodata")
                .select(select)
                .eq("dataset", dataset)
                .gte("lat", lat_min)
                .lte("lat", lat_max)
                .gte("lon", lon_min)
                .lte("lon", lon_max)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            # Catch broad exceptions — Supabase wraps HTTP/2 errors in
            # various forms (RemoteProtocolError, Cloudflare 400s, etc.)
            last_err = e
            supabase_service.reset_client()
            wait = 0.5 * (2 ** attempt)
            logger.warning("Supabase query retry %d/%d for %s: %s", attempt + 1, _max_retries, dataset, e)
            time.sleep(wait)
    logger.error("Supabase query failed after %d retries for %s", _max_retries, dataset)
    raise last_err  # type: ignore[misc]


def _nearest_row(
    rows: list[dict], lat: float, lon: float,
) -> tuple[dict | None, float]:
    """Pick the nearest row by haversine. Returns (row, distance_m)."""
    best, best_dist = None, float("inf")
    for r in rows:
        d = _haversine_m(lat, lon, r["lat"], r["lon"])
        if d < best_dist:
            best, best_dist = r, d
    return best, best_dist


# ---------------------------------------------------------------------------
# Dataset-specific queries
# ---------------------------------------------------------------------------

def get_transit_quality(lat: float, lon: float) -> dict | None:
    """ÖV-Güteklasse (A–F) at this location.

    Returns e.g. {"class": "B", "year": 2024} or None.
    """
    # Polygons stored as centroids — search in expanding radius
    for radius in (200, 500, 1000):
        rows = _query_dataset("oev_gueteklassen", lat, lon, radius, limit=10)
        if rows:
            nearest, _ = _nearest_row(rows, lat, lon)
            if nearest:
                props = nearest["properties"]
                return {
                    "class": props.get("gk") or props.get("GK"),
                    "year": props.get("jahr") or props.get("JAHR"),
                }
    return None


def get_population_density(
    lat: float, lon: float, radius_m: float = 500,
) -> dict | None:
    """Average population stats from hectare grid within radius.

    Returns e.g. {"density_per_ha": 93.2, "total_persons": 450,
                   "youth_quotient": 51.8, "age_quotient": 32.1,
                   "foreign_pct": 35.2, "grid_points": 5}
    """
    rows = _query_dataset("population_ha", lat, lon, radius_m)
    if not rows:
        return None

    n = len(rows)
    # Sum / average numeric fields
    total_persons = 0
    densities = []
    youth_quots = []
    age_quots = []
    foreign_pcts = []

    for r in rows:
        p = r["properties"]
        pers = p.get("pers_n") or p.get("PERS_N") or 0
        if pers and float(pers) >= 0:
            total_persons += int(pers)

        for val, target in [
            (p.get("dichte_pha") or p.get("DICHTE_PHA"), densities),
            (p.get("jugendquot") or p.get("JUGENDQUOT"), youth_quots),
            (p.get("altersquot") or p.get("ALTERSQUOT"), age_quots),
            (p.get("ausland_p") or p.get("AUSLAND_P"), foreign_pcts),
        ]:
            if val is not None:
                try:
                    fv = float(val)
                    if fv >= 0:  # -999 is "no data" sentinel
                        target.append(fv)
                except (ValueError, TypeError):
                    pass

    def _avg(lst: list[float]) -> float | None:
        return round(sum(lst) / len(lst), 1) if lst else None

    return {
        "density_per_ha": _avg(densities),
        "total_persons": total_persons,
        "youth_quotient": _avg(youth_quots),
        "age_quotient": _avg(age_quots),
        "foreign_pct": _avg(foreign_pcts),
        "grid_points": n,
    }


def get_nearby_transit_stops(
    lat: float, lon: float, radius_m: float = 500,
) -> list[dict]:
    """ZVV transit stops within radius.

    Returns list of {"name", "transport_type", "lines", "zones", "distance_m"}.
    """
    rows = _query_dataset("zvv_stops", lat, lon, radius_m, limit=50)
    stops = []
    for r in rows:
        p = r["properties"]
        dist = round(_haversine_m(lat, lon, r["lat"], r["lon"]))
        stops.append({
            "name": p.get("chstname") or p.get("CHSTNAME") or p.get("name"),
            "transport_type": p.get("vtyp") or p.get("VTYP"),
            "lines": p.get("linien") or p.get("LINIEN"),
            "zones": p.get("zonen") or p.get("ZONEN"),
            "distance_m": dist,
        })
    stops.sort(key=lambda s: s["distance_m"])
    return stops


def get_rent_benchmark(quartier: str | None = None) -> dict | None:
    """Rent benchmark for a Stadtquartier (city of Zürich only).

    If quartier is None, returns None. Searches by substring match.
    Returns e.g. {"quartier": "Oerlikon", "median_chf_sqm": 24.72, ...}
    """
    if not quartier:
        return None

    client = supabase_service.get_client()
    # Try exact match first (case-insensitive via ilike)
    result = (
        client.table("zurich_geodata")
        .select("properties")
        .eq("dataset", "rent_benchmarks")
        .execute()
    )
    if not result.data:
        return None

    # Find best match
    q_lower = quartier.lower()
    best = None
    for row in result.data:
        p = row["properties"]
        name = (p.get("quartier") or p.get("QuarLang") or "").lower()
        if q_lower in name or name in q_lower:
            best = p
            break

    return best


def get_nearby_construction(
    lat: float, lon: float, radius_m: float = 500,
) -> list[dict]:
    """Active Tiefbau construction projects within radius.

    Returns list of {"name", "category", "description", "start", "end", "distance_m"}.
    """
    rows = _query_dataset("construction", lat, lon, radius_m, limit=20)
    projects = []
    for r in rows:
        p = r["properties"]
        dist = round(_haversine_m(lat, lon, r["lat"], r["lon"]))
        projects.append({
            "name": p.get("name") or p.get("NAME"),
            "category": p.get("kategorie") or p.get("KATEGORIE"),
            "description": p.get("projektbeschrieb") or p.get("PROJEKTBESCHRIEB"),
            "start": p.get("baubeginn") or p.get("BAUBEGINN"),
            "end": p.get("bauende") or p.get("BAUENDE"),
            "distance_m": dist,
        })
    projects.sort(key=lambda c: c["distance_m"])
    return projects


def get_noise_level(
    lat: float, lon: float, radius_m: float = 200,
) -> dict | None:
    """Noise level from nearest evaluation points.

    Returns e.g. {"day_db": 65.2, "night_db": 55.1, "points": 3, "source": "city"}
    """
    rows = _query_dataset("noise_city", lat, lon, radius_m, limit=20)
    if not rows:
        return None

    day_vals = []
    night_vals = []
    for r in rows:
        p = r["properties"]
        for key in ("lr_tag", "LR_TAG", "lrtag", "day_db"):
            v = p.get(key)
            if v is not None:
                try:
                    day_vals.append(float(v))
                except (ValueError, TypeError):
                    pass
                break
        for key in ("lr_nacht", "LR_NACHT", "lrnacht", "night_db"):
            v = p.get(key)
            if v is not None:
                try:
                    night_vals.append(float(v))
                except (ValueError, TypeError):
                    pass
                break

    def _avg(lst: list[float]) -> float | None:
        return round(sum(lst) / len(lst), 1) if lst else None

    return {
        "day_db": _avg(day_vals),
        "night_db": _avg(night_vals),
        "points": len(rows),
        "source": "city",
    }


def get_air_quality(lat: float, lon: float) -> dict | None:
    """Nearest air quality station reading.

    Returns e.g. {"station": "Stampfenbachstrasse", "no2": 28.5, "pm10": 15.2, ...}
    """
    # Air quality stations are sparse — search wide radius
    for radius in (1000, 3000, 5000):
        rows = _query_dataset("air_quality", lat, lon, radius, limit=5)
        if rows:
            nearest, dist = _nearest_row(rows, lat, lon)
            if nearest:
                result = dict(nearest["properties"])
                result["distance_m"] = round(dist)
                return result
    return None


def get_tax_rate(gemeinde: str | None = None) -> dict | None:
    """Steuerfuss for a Gemeinde.

    Returns e.g. {"gemeinde": "Zürich", "steuerfuss": 119, "year": 2024}
    """
    if not gemeinde:
        return None

    client = supabase_service.get_client()
    result = (
        client.table("zurich_geodata")
        .select("properties")
        .eq("dataset", "tax_rates")
        .execute()
    )
    if not result.data:
        return None

    g_lower = gemeinde.lower()
    for row in result.data:
        p = row["properties"]
        name = (p.get("gemeinde") or p.get("GEBIET_NAME") or "").lower()
        if g_lower in name or name in g_lower:
            return p
    return None


# ---------------------------------------------------------------------------
# Combined enrichment
# ---------------------------------------------------------------------------

def get_zurich_enrichment(lat: float, lon: float) -> dict:
    """Return all available Zürich open data for a location.

    Combines transit quality, population, transit stops, construction,
    noise, and air quality into a single dict.
    """
    return {
        "transit_quality": get_transit_quality(lat, lon),
        "population": get_population_density(lat, lon),
        "transit_stops": get_nearby_transit_stops(lat, lon),
        "construction": get_nearby_construction(lat, lon),
        "noise": get_noise_level(lat, lon),
        "air_quality": get_air_quality(lat, lon),
    }


# ---------------------------------------------------------------------------
# Bulk operations (used by import script)
# ---------------------------------------------------------------------------

def clear_dataset(dataset: str) -> int:
    """Delete all rows for a dataset. Returns approximate count deleted."""
    client = supabase_service.get_client()
    result = (
        client.table("zurich_geodata")
        .delete()
        .eq("dataset", dataset)
        .execute()
    )
    count = len(result.data) if result.data else 0
    logger.info("Cleared %d rows for dataset=%s", count, dataset)
    return count


def bulk_insert(rows: list[dict], chunk_size: int = 500) -> int:
    """Insert rows into zurich_geodata in chunks."""
    client = supabase_service.get_client()
    total = 0
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        client.table("zurich_geodata").insert(chunk).execute()
        total += len(chunk)
        if total % 5000 == 0 or total == len(rows):
            logger.info("  Inserted %d / %d rows", total, len(rows))
    return total
