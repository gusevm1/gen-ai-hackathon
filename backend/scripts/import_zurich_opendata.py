#!/usr/bin/env python3
"""
Import Zürich open data (WFS + CSV) into Supabase zurich_geodata table.

Datasets:
  oev_gueteklassen  Transit quality classes A-F (canton-wide, polygon centroids)
  population_ha     Population density per hectare (canton-wide, points)
  zvv_stops         ZVV transit stops with lines (canton-wide, points)
  tax_rates         Steuerfuss per Gemeinde (canton-wide, CSV)
  rent_benchmarks   Rent CHF/sqm by Stadtquartier (city, CSV)
  construction      Active Tiefbau projects (city, polygon centroids)
  noise_city        Street noise evaluation points (city, WFS bbox-chunked)
  air_quality       Air quality monitoring stations (city, CSV)

Usage:
    cd backend
    python -m scripts.import_zurich_opendata --dataset oev_gueteklassen
    python -m scripts.import_zurich_opendata --all
    python -m scripts.import_zurich_opendata --all --dry-run
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import math
import sys
import time
from pathlib import Path

import httpx

# Allow imports from backend/app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# WFS endpoints
# ---------------------------------------------------------------------------
CANTON_WFS = "https://maps.zh.ch/wfs/OGDZHWFS"

STADT_WFS_BASE = "https://www.ogd.stadt-zuerich.ch/wfs/geoportal"
STADT_WFS_CONSTRUCTION = f"{STADT_WFS_BASE}/Aktuelle_Tiefbauprojekte_im_oeffentlichen_Grund"
STADT_WFS_NOISE = f"{STADT_WFS_BASE}/Strassenlaermkataster_der_Stadt_Zuerich"

# CSV URLs
RENT_CSV_URL = (
    "https://data.stadt-zuerich.ch/dataset/"
    "bau_whg_mpe_mietpreis_raum_zizahl_gn_jahr_od5161/download/BAU516OD5161.csv"
)
# Air quality — daily values (latest year)
AIR_QUALITY_CSV_URL = (
    "https://data.stadt-zuerich.ch/dataset/"
    "ugz_luftschadstoffmessung_tageswerte/download/ugz_ogd_air_d1_2025.csv"
)
# Tax rates — Steuerfuss per Gemeinde
TAX_RATES_CSV_URL = (
    "https://www.web.statistik.zh.ch/ogd/data/steuerfuesse/"
    "kanton_zuerich_stf_aktuell.csv"
)

# Timeouts (seconds)
WFS_TIMEOUT = 120
CSV_TIMEOUT = 60

# WFS output format attempts (in order of preference)
WFS_FORMATS = [
    "application/json; subtype=geojson",  # Canton ZH MapServer
    "application/vnd.geo+json",            # Stadt ZH GeoServer
    "application/geo+json",
    "application/json",
    "GeoJSON",
]


# ---------------------------------------------------------------------------
# Swiss coordinate conversion: CH1903+/LV95 (EPSG:2056) → WGS84 (EPSG:4326)
# Uses official swisstopo approximate formulas (~1m accuracy)
# ---------------------------------------------------------------------------

def ch1903p_to_wgs84(e: float, n: float) -> tuple[float, float]:
    """Convert CH1903+/LV95 easting/northing to WGS84 lat/lon."""
    y = (e - 2_600_000) / 1_000_000
    x = (n - 1_200_000) / 1_000_000

    lat_sec = (16.9023892
               + 3.238272 * x
               - 0.270978 * y ** 2
               - 0.002528 * x ** 2
               - 0.0447 * y ** 2 * x
               - 0.0140 * x ** 3)

    lon_sec = (2.6779094
               + 4.728982 * y
               + 0.791484 * y * x
               + 0.1306 * y * x ** 2
               - 0.0436 * y ** 3)

    return lat_sec * 100 / 36, lon_sec * 100 / 36


def _is_swiss(x: float, y: float) -> bool:
    """Detect CH1903+ coordinates (E ~2480k–2840k, N ~1070k–1300k)."""
    return x > 2_000_000 or y > 1_000_000


# ---------------------------------------------------------------------------
# GeoJSON geometry helpers
# ---------------------------------------------------------------------------

def _flat_coords(geometry: dict) -> list[tuple[float, float]]:
    """Extract all [x, y] pairs from any GeoJSON geometry."""
    gt = geometry.get("type", "")
    coords = geometry.get("coordinates", [])

    if gt == "Point":
        return [tuple(coords[:2])]
    if gt == "MultiPoint" or gt == "LineString":
        return [tuple(c[:2]) for c in coords]
    if gt == "MultiLineString" or gt == "Polygon":
        return [tuple(c[:2]) for ring in coords for c in ring]
    if gt == "MultiPolygon":
        return [tuple(c[:2]) for poly in coords for ring in poly for c in ring]
    return []


def _centroid(geometry: dict) -> tuple[float, float] | None:
    """Compute naive centroid (average of vertices) for any geometry."""
    pts = _flat_coords(geometry)
    if not pts:
        return None
    avg_x = sum(p[0] for p in pts) / len(pts)
    avg_y = sum(p[1] for p in pts) / len(pts)
    return avg_x, avg_y


def extract_lat_lon(geometry: dict | None) -> tuple[float, float] | None:
    """Extract (lat, lon) from GeoJSON geometry, converting Swiss coords if needed."""
    if not geometry:
        return None

    gt = geometry.get("type", "")
    if gt == "Point":
        x, y = geometry["coordinates"][0], geometry["coordinates"][1]
    else:
        c = _centroid(geometry)
        if not c:
            return None
        x, y = c

    if _is_swiss(x, y):
        lat, lon = ch1903p_to_wgs84(x, y)
    else:
        # Standard GeoJSON: [lon, lat]
        lat, lon = y, x

    return lat, lon


# ---------------------------------------------------------------------------
# WFS fetcher with pagination and format negotiation
# ---------------------------------------------------------------------------

def fetch_wfs_features(
    wfs_url: str,
    layer: str,
    *,
    page_size: int = 1000,
    max_features: int | None = None,
    bbox: tuple[float, float, float, float] | None = None,
    srs: str = "EPSG:4326",
) -> list[dict]:
    """Fetch GeoJSON features from a WFS endpoint, paginating as needed.

    Args:
        wfs_url: Base WFS URL.
        layer: TYPENAMES value.
        page_size: Features per page.
        max_features: Stop after this many features (None = all).
        bbox: Optional (min_lon, min_lat, max_lon, max_lat) filter.
        srs: Coordinate reference system to request.

    Returns list of GeoJSON Feature dicts.
    """
    all_features: list[dict] = []
    start_index = 0

    # Try different output formats until one works
    working_format = None
    working_version = None
    # Some servers don't support CRS transformation — try with and without SRSNAME
    srs_options = [srs, None] if srs else [None]
    # Try WFS 2.0.0 first, then 1.1.0 (Stadt ZH uses 1.1.0)
    version_options = ["2.0.0", "1.1.0"]

    while True:
        found = False
        iter_versions = version_options if working_version is None else [working_version]
        iter_srs = srs_options if working_format is None else [srs_options[0]]
        iter_fmts = WFS_FORMATS if working_format is None else [working_format]

        for ver in iter_versions:
            for try_srs in iter_srs:
                for fmt in iter_fmts:
                    # Build params based on WFS version
                    if ver == "2.0.0":
                        params: dict[str, str] = {
                            "SERVICE": "WFS",
                            "VERSION": ver,
                            "REQUEST": "GetFeature",
                            "TYPENAMES": layer,
                            "OUTPUTFORMAT": fmt,
                            "COUNT": str(page_size),
                            "STARTINDEX": str(start_index),
                        }
                    else:
                        # WFS 1.1.0: TYPENAME (singular), MAXFEATURES, no STARTINDEX
                        params = {
                            "SERVICE": "WFS",
                            "VERSION": ver,
                            "REQUEST": "GetFeature",
                            "TYPENAME": layer,
                            "OUTPUTFORMAT": fmt,
                            "MAXFEATURES": str(max_features or page_size * 100),
                        }
                    if try_srs:
                        params["SRSNAME"] = try_srs
                    if bbox:
                        bbox_srs = try_srs or "EPSG:4326"
                        params["BBOX"] = f"{bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]},{bbox_srs}"

                    try:
                        resp = httpx.get(
                            wfs_url, params=params,
                            timeout=WFS_TIMEOUT, follow_redirects=True,
                        )
                        if resp.status_code == 200:
                            ct = resp.headers.get("content-type", "")
                            if "json" in ct or "geo+json" in ct:
                                data = resp.json()
                                working_format = fmt
                                working_version = ver
                                srs_options = [try_srs]
                                found = True
                                break
                            if "xml" in ct or "Exception" in resp.text[:500]:
                                continue
                            try:
                                data = resp.json()
                                working_format = fmt
                                working_version = ver
                                srs_options = [try_srs]
                                found = True
                                break
                            except Exception:
                                continue
                        else:
                            logger.debug(
                                "WFS %d ver=%s fmt=%s srs=%s",
                                resp.status_code, ver, fmt, try_srs,
                            )
                    except httpx.TimeoutException:
                        logger.warning("WFS timeout ver=%s fmt=%s", ver, fmt)
                    except Exception as e:
                        logger.debug("WFS error ver=%s fmt=%s: %s", ver, fmt, e)
                if found:
                    break
            if found:
                break

        if not found:
            if start_index == 0:
                raise RuntimeError(
                    f"WFS {wfs_url} layer={layer}: no working combination. "
                    f"Tried versions: {version_options}, formats: {WFS_FORMATS}"
                )
            break  # Pagination ended

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        logger.info(
            "  Fetched %d features (total: %d)",
            len(features), len(all_features),
        )

        # WFS 1.1.0 doesn't support pagination — we get everything in one request
        if working_version == "1.1.0":
            break

        if len(features) < page_size:
            break  # Last page

        if max_features and len(all_features) >= max_features:
            all_features = all_features[:max_features]
            break

        start_index += len(features)
        time.sleep(0.5)  # Be polite to WFS servers

    return all_features


# ---------------------------------------------------------------------------
# CSV fetcher
# ---------------------------------------------------------------------------

def fetch_csv(url: str, delimiter: str = ",", encoding: str = "utf-8-sig") -> list[dict]:
    """Download a CSV and return list of row dicts."""
    resp = httpx.get(url, timeout=CSV_TIMEOUT, follow_redirects=True)
    resp.raise_for_status()

    text = resp.content.decode(encoding, errors="replace")
    # Try to detect delimiter
    first_line = text.split("\n")[0]
    if delimiter == "," and ";" in first_line and "," not in first_line:
        delimiter = ";"

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    return list(reader)


# ---------------------------------------------------------------------------
# Feature → row converter
# ---------------------------------------------------------------------------

def feature_to_row(
    feature: dict,
    dataset: str,
    source: str,
    geom_type: str = "point",
) -> dict | None:
    """Convert a GeoJSON Feature to a zurich_geodata row dict."""
    coords = extract_lat_lon(feature.get("geometry"))
    if not coords:
        return None
    lat, lon = coords

    # Sanity check: should be in Switzerland
    if not (45.5 < lat < 48.0 and 5.5 < lon < 10.5):
        return None

    props = feature.get("properties") or {}
    # Remove None values and geometry-related fields to keep JSONB clean
    clean_props = {
        k: v for k, v in props.items()
        if v is not None and k not in ("geometry", "geom", "the_geom", "shape")
    }

    return {
        "source": source,
        "dataset": dataset,
        "lat": round(lat, 7),
        "lon": round(lon, 7),
        "properties": clean_props,  # Pass as dict — Supabase handles JSONB serialization
        "geom_type": geom_type,
    }


# ---------------------------------------------------------------------------
# Dataset importers
# ---------------------------------------------------------------------------

def import_oev_gueteklassen() -> list[dict]:
    """ÖV-Güteklassen (transit quality A-F) — canton-wide polygons."""
    logger.info("Fetching ÖV-Güteklassen from Canton WFS...")
    features = fetch_wfs_features(
        CANTON_WFS,
        "ms:ogd-0069_giszhpub_ogd_oev_gueteklassen_f",
        page_size=2000,
    )
    logger.info("  Got %d features", len(features))

    rows = []
    for f in features:
        row = feature_to_row(f, "oev_gueteklassen", "canton_wfs", "polygon_centroid")
        if row:
            rows.append(row)
    return rows


def import_population_ha() -> list[dict]:
    """Population per hectare grid — canton-wide points."""
    logger.info("Fetching population hectare grid from Canton WFS...")
    features = fetch_wfs_features(
        CANTON_WFS,
        "ms:ogd-0063_stat_bevoelkerung_ha_p",
        page_size=2000,
    )
    logger.info("  Got %d features", len(features))

    rows = []
    for f in features:
        row = feature_to_row(f, "population_ha", "canton_wfs", "point")
        if row:
            rows.append(row)
    return rows


def import_zvv_stops() -> list[dict]:
    """ZVV transit stops with transport type and line numbers — canton-wide."""
    logger.info("Fetching ZVV transit stops from Canton WFS...")
    features = fetch_wfs_features(
        CANTON_WFS,
        "ms:ogd-0140_giszhpub_zvv_haltestellen_p",
        page_size=2000,
    )
    logger.info("  Got %d features", len(features))

    rows = []
    for f in features:
        row = feature_to_row(f, "zvv_stops", "canton_wfs", "point")
        if row:
            rows.append(row)
    return rows


def import_tax_rates() -> list[dict]:
    """Steuerfuss (tax multiplier) per Gemeinde — canton-wide CSV.

    CSV format (comma-delimited, quoted):
      LAST_REFRESH, YEAR, COMMUNITY, BFSNR, FLAG,
      STF_O_KIRCHE1-3, DIFF_O_KIRCHE, STF_REF1-3, DIFF_REF,
      STF_KATH1-3, DIFF_KATH, STF_CKRKATH1-3, DIFF_CHRKATH, JUR_PERS
    """
    logger.info("Fetching tax rates from %s", TAX_RATES_CSV_URL)
    try:
        resp = httpx.get(TAX_RATES_CSV_URL, timeout=CSV_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        logger.error("Failed to fetch tax rates CSV: %s", e)
        logger.info("Check opendata.swiss for current URL.")
        return []

    text = resp.content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text), delimiter=",", quotechar='"')
    csv_rows = list(reader)

    if not csv_rows:
        logger.warning("Tax rates CSV is empty")
        return []

    logger.info("  CSV columns: %s", list(csv_rows[0].keys()))
    logger.info("  Total rows: %d", len(csv_rows))

    rows = []
    for r in csv_rows:
        gemeinde = (r.get("COMMUNITY") or "").strip()
        if not gemeinde:
            continue

        year = r.get("YEAR", "")
        bfs_nr = r.get("BFSNR", "")

        # STF_O_KIRCHE1 is typically the general Steuerfuss
        stf_val = r.get("STF_O_KIRCHE1") or r.get("JUR_PERS") or ""

        props: dict = {"gemeinde": gemeinde}
        if year:
            props["year"] = int(year) if year.isdigit() else year
        if bfs_nr:
            props["bfs_nr"] = int(bfs_nr) if bfs_nr.isdigit() else bfs_nr
        if stf_val:
            try:
                props["steuerfuss"] = float(stf_val)
            except (ValueError, TypeError):
                pass
        # Store all tax-related fields
        for key in ("STF_O_KIRCHE1", "STF_REF1", "STF_KATH1", "STF_CKRKATH1", "JUR_PERS"):
            val = r.get(key, "")
            if val:
                try:
                    props[key.lower()] = float(val)
                except (ValueError, TypeError):
                    pass

        rows.append({
            "source": "opendata_csv",
            "dataset": "tax_rates",
            "lat": None,
            "lon": None,
            "properties": props,
            "geom_type": None,
        })

    logger.info("  %d Gemeinden with tax data", len(rows))
    return rows


def import_rent_benchmarks() -> list[dict]:
    """Rent benchmarks (CHF/sqm) by Stadtquartier — city CSV.

    CSV structure: RaumeinheitLang=spatial grouping type, GliederungLang=actual name.
    We filter to RaumeinheitLang='Stadtquartiere' and PreisartLang='netto'.
    One row per quartier per room type with mean, qu10-qu90 percentiles.
    """
    logger.info("Fetching rent benchmarks from %s", RENT_CSV_URL)
    try:
        csv_rows = fetch_csv(RENT_CSV_URL)
    except Exception as e:
        logger.error("Failed to fetch rent CSV: %s", e)
        return []

    if not csv_rows:
        logger.warning("Rent CSV is empty")
        return []

    # Fix BOM in first column name
    fixed_rows = []
    for r in csv_rows:
        fixed = {}
        for k, v in r.items():
            fixed[k.strip().strip("\ufeff").strip('"')] = v
        fixed_rows.append(fixed)
    csv_rows = fixed_rows

    logger.info("  CSV columns: %s", list(csv_rows[0].keys()))
    logger.info("  Total rows: %d", len(csv_rows))

    # Filter to: Stadtquartiere, netto rent, latest year
    filtered = [
        r for r in csv_rows
        if r.get("RaumeinheitLang") == "Stadtquartiere"
        and r.get("PreisartLang") == "netto"
    ]
    logger.info("  After Stadtquartiere + netto filter: %d rows", len(filtered))

    # Find latest year
    years = set()
    for r in filtered:
        try:
            years.add(int(r.get("StichtagDatJahr", 0)))
        except (ValueError, TypeError):
            pass
    if years:
        latest_year = max(years)
        filtered = [r for r in filtered if str(r.get("StichtagDatJahr", "")) == str(latest_year)]
        logger.info("  Filtered to year %d: %d rows", latest_year, len(filtered))

    # Group by quartier, aggregate across room types
    quartier_data: dict[str, dict] = {}
    for r in filtered:
        quartier = r.get("GliederungLang", "")
        if not quartier or quartier.lower() in ("ganze stadt",):
            continue

        zimmer = r.get("ZimmerLang", "")
        prefix = zimmer.replace(" ", "_").lower() if zimmer else "all"

        if quartier not in quartier_data:
            quartier_data[quartier] = {"quartier": quartier, "year": latest_year}

        # Store percentiles with room-type prefix
        for field in ("mean", "qu10", "qu25", "qu50", "qu75", "qu90"):
            val = r.get(field)
            if val:
                try:
                    quartier_data[quartier][f"{prefix}_{field}"] = float(val)
                except (ValueError, TypeError):
                    pass

        # Also store overall median as convenience field (from first room type seen)
        if "median_chf" not in quartier_data[quartier] and r.get("qu50"):
            try:
                quartier_data[quartier]["median_chf"] = float(r["qu50"])
            except (ValueError, TypeError):
                pass

    rows = []
    for quartier, props in quartier_data.items():
        rows.append({
            "source": "opendata_csv",
            "dataset": "rent_benchmarks",
            "lat": None,
            "lon": None,
            "properties": props,
            "geom_type": None,
        })

    logger.info("  %d quartiers with rent data", len(rows))
    return rows


def import_construction() -> list[dict]:
    """Active Tiefbau construction projects — city WFS polygons."""
    logger.info("Fetching construction projects from Stadt ZH WFS...")
    features = fetch_wfs_features(
        STADT_WFS_CONSTRUCTION,
        "aer_baustellen_a",
        page_size=500,
    )
    logger.info("  Got %d features", len(features))

    rows = []
    for f in features:
        row = feature_to_row(f, "construction", "stadt_wfs", "polygon_centroid")
        if row:
            rows.append(row)
    return rows


def import_noise_city() -> list[dict]:
    """Street noise evaluation points — city WFS, queried in bbox chunks.

    The full noise dataset is very large (~728MB GeoJSON), so we query
    in ~1km grid cells covering Stadt Zürich.
    """
    logger.info("Fetching city noise data in bbox chunks...")

    # Stadt Zürich approximate bounds
    lat_min, lat_max = 47.320, 47.435
    lon_min, lon_max = 47.0, 8.610  # Note: lon_min should be 8.47
    # Fix: correct bounds
    lon_min, lon_max = 8.470, 8.610

    # Grid cell size in degrees (~1km)
    step_lat = 0.009  # ~1km
    step_lon = 0.013  # ~1km at this latitude

    all_rows: list[dict] = []
    cell_count = 0
    total_cells = (
        math.ceil((lat_max - lat_min) / step_lat)
        * math.ceil((lon_max - lon_min) / step_lon)
    )

    lat = lat_min
    while lat < lat_max:
        lon = lon_min
        while lon < lon_max:
            cell_count += 1
            bbox = (lon, lat, lon + step_lon, lat + step_lat)

            try:
                features = fetch_wfs_features(
                    STADT_WFS_NOISE,
                    "strlaerm_ep",
                    page_size=5000,
                    max_features=10000,
                    bbox=bbox,
                )
                for f in features:
                    row = feature_to_row(f, "noise_city", "stadt_wfs", "point")
                    if row:
                        all_rows.append(row)

                if features:
                    logger.info(
                        "  Cell %d/%d (%.3f,%.3f): %d points (total: %d)",
                        cell_count, total_cells, lat, lon,
                        len(features), len(all_rows),
                    )
            except Exception as e:
                logger.warning(
                    "  Cell %d/%d (%.3f,%.3f) failed: %s",
                    cell_count, total_cells, lat, lon, e,
                )

            lon += step_lon
            time.sleep(0.3)  # Rate limit
        lat += step_lat

    logger.info("  Noise import complete: %d total points from %d cells", len(all_rows), cell_count)
    return all_rows


def import_air_quality() -> list[dict]:
    """Air quality stations with latest readings — city CSV.

    CSV is long format: Datum, Standort, Parameter, Intervall, Einheit, Wert, Status.
    One row per (station, parameter, date). We pivot to one row per station
    with the latest reading for each pollutant.
    """
    logger.info("Fetching air quality data from %s", AIR_QUALITY_CSV_URL)
    try:
        csv_rows = fetch_csv(AIR_QUALITY_CSV_URL)
    except Exception as e:
        logger.error("Failed to fetch air quality CSV: %s", e)
        return []

    if not csv_rows:
        logger.warning("Air quality CSV is empty")
        return []

    logger.info("  CSV columns: %s", list(csv_rows[0].keys()))
    logger.info("  Total rows: %d", len(csv_rows))

    # Known Zürich air quality station coordinates (from Stadt Zürich metadata)
    STATION_COORDS: dict[str, tuple[float, float]] = {
        "Zch_Stampfenbachstrasse": (47.3865, 8.5396),
        "Zch_Schimmelstrasse": (47.3781, 8.5253),
        "Zch_Heubeeribüel": (47.4025, 8.5125),
        "Zch_Rosengartenstrasse": (47.3917, 8.5225),
        "Zch_Kaserne": (47.3782, 8.5318),
    }

    # Group by station, collect latest reading per parameter
    stations: dict[str, dict] = {}
    for r in csv_rows:
        station = r.get("Standort", "").strip()
        param = r.get("Parameter", "").strip()
        date = r.get("Datum", "").strip()
        wert = r.get("Wert", "").strip()

        if not station or not param or not wert:
            continue

        if station not in stations:
            stations[station] = {"station": station, "_latest_date": ""}

        # Only keep the latest date per station-parameter
        key = f"{param}_date"
        prev_date = stations[station].get(key, "")
        if date >= prev_date:
            stations[station][key] = date
            try:
                stations[station][param.lower()] = float(wert)
            except (ValueError, TypeError):
                pass
            # Track overall latest date
            if date > stations[station]["_latest_date"]:
                stations[station]["_latest_date"] = date

    rows = []
    for station_name, data in stations.items():
        # Clean up internal tracking fields
        latest_date = data.pop("_latest_date", "")
        clean_data = {
            k: v for k, v in data.items()
            if not k.endswith("_date")
        }
        clean_data["latest_date"] = latest_date

        # Find coordinates
        lat, lon = None, None
        for known_name, coords in STATION_COORDS.items():
            if (known_name.lower() in station_name.lower()
                    or station_name.lower() in known_name.lower()):
                lat, lon = coords
                break

        rows.append({
            "source": "opendata_csv",
            "dataset": "air_quality",
            "lat": lat,
            "lon": lon,
            "properties": clean_data,
            "geom_type": "point" if lat else None,
        })

    logger.info("  %d air quality stations", len(rows))
    return rows


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

IMPORTERS: dict[str, tuple[callable, str]] = {
    "oev_gueteklassen": (import_oev_gueteklassen, "Transit quality classes A-F"),
    "population_ha": (import_population_ha, "Population per hectare grid"),
    "zvv_stops": (import_zvv_stops, "ZVV transit stops with lines"),
    "tax_rates": (import_tax_rates, "Steuerfuss per Gemeinde"),
    "rent_benchmarks": (import_rent_benchmarks, "Rent CHF/sqm by Stadtquartier"),
    "construction": (import_construction, "Active construction projects"),
    "noise_city": (import_noise_city, "Street noise (Stadt ZH)"),
    "air_quality": (import_air_quality, "Air quality stations"),
}


# ---------------------------------------------------------------------------
# Database operations
# ---------------------------------------------------------------------------

def save_to_db(dataset: str, rows: list[dict]) -> int:
    """Clear existing data and insert new rows."""
    from app.services.zurich_geodata_db import bulk_insert, clear_dataset

    clear_dataset(dataset)
    if not rows:
        return 0
    return bulk_insert(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Import Zürich open data into Supabase zurich_geodata table",
    )
    parser.add_argument(
        "--dataset",
        choices=list(IMPORTERS.keys()),
        help="Import a single dataset",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Import all datasets",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data but don't write to database",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available datasets",
    )
    args = parser.parse_args()

    if args.list:
        print("Available datasets:")
        for name, (_, desc) in IMPORTERS.items():
            print(f"  {name:20s}  {desc}")
        return

    if not args.dataset and not args.all:
        parser.error("Specify --dataset NAME or --all")

    datasets = list(IMPORTERS.keys()) if args.all else [args.dataset]

    if not args.dry_run:
        # Load env for Supabase credentials
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent.parent / ".env")

    print("=" * 60)
    print("Zürich Open Data Import")
    print(f"Datasets: {', '.join(datasets)}")
    print(f"Dry run: {args.dry_run}")
    print("=" * 60)

    results: dict[str, tuple[int, str | None]] = {}

    for name in datasets:
        fn, desc = IMPORTERS[name]
        print(f"\n--- {name}: {desc} ---")
        t0 = time.time()

        try:
            rows = fn()
            elapsed = time.time() - t0
            print(f"  Fetched {len(rows)} rows in {elapsed:.1f}s")

            if args.dry_run:
                results[name] = (len(rows), None)
                # Save preview
                out_dir = Path(__file__).parent / "output"
                out_dir.mkdir(parents=True, exist_ok=True)
                preview = {
                    "dataset": name,
                    "total_rows": len(rows),
                    "sample": rows[:5],
                }
                out_path = out_dir / f"zurich_{name}_preview.json"
                out_path.write_text(json.dumps(preview, indent=2, ensure_ascii=False))
                print(f"  Preview saved to {out_path}")
            else:
                count = save_to_db(name, rows)
                results[name] = (count, None)
                print(f"  Saved {count} rows to Supabase")

        except Exception as e:
            elapsed = time.time() - t0
            logger.error("  FAILED after %.1fs: %s", elapsed, e)
            results[name] = (0, str(e))

    # Summary
    print(f"\n{'=' * 60}")
    print("Summary:")
    for name, (count, err) in results.items():
        status = f"✓ {count} rows" if not err else f"✗ {err}"
        print(f"  {name:20s}  {status}")
    print("=" * 60)

    # Exit with error if any dataset failed
    if any(err for _, err in results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
