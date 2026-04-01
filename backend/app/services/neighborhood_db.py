"""Supabase CRUD operations for neighborhood_pois and neighborhood_analyses tables.

Synchronous functions — in async FastAPI endpoints, wrap with asyncio.to_thread().
"""

from __future__ import annotations

import logging
import math

from app.models.neighborhood import NeighborhoodAnalysis, NeighborhoodPOI
from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)

# Earth radius in meters for haversine
EARTH_RADIUS_M = 6_371_000


def _bbox(lat: float, lon: float, radius_m: float) -> tuple[float, float, float, float]:
    """Return (lat_min, lat_max, lon_min, lon_max) for a bounding box."""
    dlat = radius_m / 111_320
    dlon = radius_m / (111_320 * math.cos(math.radians(lat)))
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in meters."""
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bulk_insert_pois(pois: list[dict], chunk_size: int = 500) -> int:
    """Insert POIs in chunks. On conflict (osm_id, osm_type) skip.

    Returns total rows inserted (approximate — Supabase doesn't return
    conflict-skipped counts).
    """
    client = supabase_service.get_client()
    total = 0
    for i in range(0, len(pois), chunk_size):
        chunk = pois[i : i + chunk_size]
        client.table("neighborhood_pois").upsert(
            chunk,
            on_conflict="osm_id,osm_type",
            default_to_null=False,
        ).execute()
        total += len(chunk)
        if total % 5000 == 0:
            logger.info("Inserted %d / %d POIs", total, len(pois))
    logger.info("Bulk insert complete: %d POIs", total)
    return total


def count_pois_by_category(
    lat: float, lon: float, radius_m: float
) -> dict[str, int]:
    """Count POIs by category within a bounding box. Returns {category: count}."""
    lat_min, lat_max, lon_min, lon_max = _bbox(lat, lon, radius_m)
    client = supabase_service.get_client()

    # Fetch category + category_group for POIs in bbox
    result = (
        client.table("neighborhood_pois")
        .select("category")
        .gte("lat", lat_min)
        .lte("lat", lat_max)
        .gte("lon", lon_min)
        .lte("lon", lon_max)
        .execute()
    )

    counts: dict[str, int] = {}
    for row in result.data or []:
        cat = row["category"]
        counts[cat] = counts.get(cat, 0) + 1
    return counts


def query_pois_in_radius(
    lat: float,
    lon: float,
    radius_m: float,
    category_group: str | None = None,
    category: str | None = None,
    limit: int = 1000,
) -> list[NeighborhoodPOI]:
    """Return individual POIs within a bounding box, with optional filters."""
    lat_min, lat_max, lon_min, lon_max = _bbox(lat, lon, radius_m)
    client = supabase_service.get_client()

    query = (
        client.table("neighborhood_pois")
        .select("*")
        .gte("lat", lat_min)
        .lte("lat", lat_max)
        .gte("lon", lon_min)
        .lte("lon", lon_max)
    )

    if category_group:
        query = query.eq("category_group", category_group)
    if category:
        query = query.eq("category", category)

    result = query.limit(limit).execute()
    return [NeighborhoodPOI.model_validate(row) for row in (result.data or [])]


def get_nearest_analysis(lat: float, lon: float, max_distance_m: float = 750) -> tuple[NeighborhoodAnalysis | None, float | None]:
    """Find the nearest neighborhood_analyses row within max_distance_m.

    Returns (analysis, distance_m) or (None, None).
    """
    lat_min, lat_max, lon_min, lon_max = _bbox(lat, lon, max_distance_m)
    client = supabase_service.get_client()

    result = (
        client.table("neighborhood_analyses")
        .select("*")
        .gte("lat", lat_min)
        .lte("lat", lat_max)
        .gte("lon", lon_min)
        .lte("lon", lon_max)
        .execute()
    )

    if not result.data:
        return None, None

    best = None
    best_dist = float("inf")
    for row in result.data:
        dist = _haversine_m(lat, lon, row["lat"], row["lon"])
        if dist < best_dist:
            best_dist = dist
            best = row

    if best_dist > max_distance_m:
        return None, None

    return NeighborhoodAnalysis.model_validate(best), round(best_dist, 1)


def save_analysis(analysis: NeighborhoodAnalysis) -> None:
    """Upsert a neighborhood analysis on cell_id."""
    client = supabase_service.get_client()
    data = analysis.model_dump(mode="json", exclude={"id"})
    client.table("neighborhood_analyses").upsert(
        data,
        on_conflict="cell_id",
    ).execute()
    logger.info("Saved analysis for cell_id=%d", analysis.cell_id)
