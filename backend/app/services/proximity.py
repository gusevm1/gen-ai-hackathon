"""Proximity requirement extraction and Apify fetch-with-cache pipeline.

Deterministic alternative to the Claude tool approach:
1. Extract proximity requirements from UserPreferences.dynamic_fields
2. For each requirement, check Supabase cache before calling Apify
3. Return structured nearby-place data for Phase 24 prompt injection

Phase 23 coverage: PROX-01, PROX-02, PROX-03, APIFY-01, APIFY-02, APIFY-03, CACHE-05, CACHE-06
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel

from app.models.preferences import ImportanceLevel, UserPreferences
from app.services.claude import _AMENITY_KEYWORDS
from app.services.places import haversine_km, search_nearby_places
from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)

# Regex to parse distance from free-text field value (e.g. "500m", "2km", "1.5 km")
_DISTANCE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(m|km)", re.IGNORECASE)

# Maximum allowed radius cap — matches existing _execute_tool cap in claude.py
_MAX_RADIUS_KM = 5.0

# Default radius when no distance found in value text
_DEFAULT_RADIUS_KM = 1.0


class ProximityRequirement(BaseModel):
    """A single proximity requirement extracted from a DynamicField."""

    query: str
    radius_km: float
    importance: ImportanceLevel


def _parse_radius_km(value: str) -> float:
    """Parse radius in km from free-text value string.

    Handles: "500m", "500 m", "1km", "2 km", "1.5km".
    Returns _DEFAULT_RADIUS_KM if no parseable distance found.
    Caps at _MAX_RADIUS_KM.
    """
    m = _DISTANCE_RE.search(value)
    if not m:
        return _DEFAULT_RADIUS_KM
    amount = float(m.group(1))
    unit = m.group(2).lower()
    km = amount / 1000.0 if unit == "m" else amount
    return min(km, _MAX_RADIUS_KM)


def extract_proximity_requirements(
    preferences: UserPreferences,
) -> list[ProximityRequirement]:
    """Filter dynamic_fields to those matching amenity/proximity keywords.

    For each matching field, produces a ProximityRequirement with:
    - query: field.name (the user's label — best search string for Apify)
    - radius_km: parsed from field.value; defaults to 1.0 km
    - importance: field.importance (already an ImportanceLevel)

    Returns [] if no fields match (PROX-03: caller must skip all Apify calls).
    """
    requirements: list[ProximityRequirement] = []
    for field in preferences.dynamic_fields:
        text = f"{field.name} {field.value}"
        if _AMENITY_KEYWORDS.search(text):
            requirements.append(
                ProximityRequirement(
                    query=field.name,
                    radius_km=_parse_radius_km(field.value),
                    importance=field.importance,
                )
            )
    return requirements


async def fetch_nearby_places(
    lat: float,
    lon: float,
    requirement: ProximityRequirement,
) -> list[dict]:
    """Fetch nearby places for a single proximity requirement, with caching.

    Flow:
    1. Check nearby_places_cache (CACHE-05). If hit within 7 days, return cached.
    2. On cache miss, call Apify via search_nearby_places (APIFY-01).
    3. For each result, compute Haversine distance from listing (APIFY-02).
    4. Write result to cache (CACHE-06).
    5. On any Apify failure, search_nearby_places returns [] — propagate gracefully (APIFY-03).
    """
    # CACHE-05: check cache first
    try:
        cached = await asyncio.to_thread(
            supabase_service.get_nearby_places_cache,
            lat,
            lon,
            requirement.query,
            requirement.radius_km,
        )
        if cached is not None:
            logger.info(
                "Cache hit for query=%r lat=%.6f lon=%.6f radius=%.2f",
                requirement.query, lat, lon, requirement.radius_km,
            )
            return cached
    except Exception:
        logger.warning(
            "Cache read failed for query=%r — proceeding to Apify",
            requirement.query,
        )

    # APIFY-01: call Apify (APIFY-03: search_nearby_places returns [] on any failure)
    raw_results = await search_nearby_places(
        query=requirement.query,
        latitude=lat,
        longitude=lon,
        radius_km=requirement.radius_km,
        max_results=5,
    )

    # APIFY-02: compute Haversine distance for each result that has location data
    results: list[dict] = []
    for item in raw_results:
        location = item.get("location")
        distance_km: float | None = None
        if isinstance(location, dict):
            place_lat = location.get("lat")
            place_lng = location.get("lng")
            if place_lat is not None and place_lng is not None:
                try:
                    distance_km = haversine_km(lat, lon, float(place_lat), float(place_lng))
                except Exception:
                    pass  # leave distance_km as None if computation fails
        results.append(
            {
                "name": item.get("title", ""),
                "address": item.get("address", ""),
                "rating": item.get("rating"),
                "review_count": item.get("reviews"),
                "distance_km": distance_km,
            }
        )

    # CACHE-06: write to cache (fire and forget — don't fail scoring on cache write error)
    try:
        await asyncio.to_thread(
            supabase_service.save_nearby_places_cache,
            lat,
            lon,
            requirement.query,
            requirement.radius_km,
            results,
        )
    except Exception:
        logger.warning("Cache write failed for query=%r — results not cached", requirement.query)

    return results


async def fetch_all_proximity_data(
    lat: float,
    lon: float,
    preferences: UserPreferences,
) -> dict[str, list[dict]]:
    """Extract proximity requirements and fetch all nearby place data concurrently.

    Returns a dict keyed by query string, e.g.:
        {"near primary school": [...], "gym": [...]}

    Returns {} immediately if:
    - No proximity requirements found in dynamic_fields (PROX-03)
    - lat or lon is None (no coordinates to search from)
    """
    requirements = extract_proximity_requirements(preferences)
    if not requirements:
        logger.debug("No proximity requirements found — skipping Apify calls (PROX-03)")
        return {}

    # Concurrent fetch across all requirements (avoid sequential 90s timeouts)
    tasks = [fetch_nearby_places(lat, lon, req) for req in requirements]
    results_list = await asyncio.gather(*tasks)

    return {req.query: results for req, results in zip(requirements, results_list)}
