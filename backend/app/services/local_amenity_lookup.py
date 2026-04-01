"""Look up nearby amenities from local databases (OSM POIs + ZVV transit stops).

Produces data compatible with ListingProfile.amenities dict format.
Synchronous — wrap with asyncio.to_thread() in async contexts.
"""

from __future__ import annotations

import logging
import math

from app.models.listing_profile import AmenityCategory, AmenityResult
from app.services.neighborhood_db import query_pois_in_radius
from app.services.zurich_geodata_db import get_nearby_transit_stops

logger = logging.getLogger(__name__)

EARTH_RADIUS_M = 6_371_000

# Maps amenity category name → OSM query parameters (or ZVV special case)
AMENITY_CATEGORY_MAP: dict[str, dict | str] = {
    "supermarket":      {"category_group": "shop",    "categories": ["supermarket", "convenience"]},
    "restaurant":       {"category_group": "amenity", "categories": ["restaurant", "cafe", "fast_food"]},
    "school":           {"category_group": "amenity", "categories": ["school"]},
    "kindergarten":     {"category_group": "amenity", "categories": ["kindergarten"]},
    "park":             {"category_group": "leisure", "categories": ["park", "garden", "playground"]},
    "hospital":         {"category_group": "amenity", "categories": ["hospital", "clinic", "doctors"]},
    "pharmacy":         {"category_group": "amenity", "categories": ["pharmacy"]},
    "gym":              {"category_group": "leisure", "categories": ["fitness_centre", "sports_centre"]},
    "public_transport": "USE_ZVV_STOPS",
}

MAX_RESULTS = 5


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in meters."""
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _query_osm_category(
    lat: float, lon: float, radius_m: int,
    category_group: str, categories: list[str],
) -> AmenityCategory:
    """Query OSM POIs for a set of categories, return nearest as AmenityCategory."""
    pois = query_pois_in_radius(
        lat, lon, radius_m,
        category_group=category_group,
    )

    # Filter to matching categories and compute distances
    results: list[tuple[float, AmenityResult]] = []
    for poi in pois:
        if poi.category not in categories:
            continue
        dist_m = _haversine_m(lat, lon, poi.lat, poi.lon)
        if dist_m > radius_m:
            continue
        results.append((dist_m, AmenityResult(
            name=poi.name or f"{poi.category}",
            distance_km=round(dist_m / 1000, 3),
            address=poi.tags.get("addr:street"),
        )))

    # Sort by distance, take nearest N
    results.sort(key=lambda x: x[0])
    return AmenityCategory(results=[r for _, r in results[:MAX_RESULTS]])


def _query_transit(lat: float, lon: float, radius_m: int) -> AmenityCategory:
    """Query ZVV transit stops and return as AmenityCategory."""
    stops = get_nearby_transit_stops(lat, lon, radius_m)
    results = []
    for stop in stops[:MAX_RESULTS]:
        name = stop["name"] or "Transit stop"
        lines = stop.get("lines") or ""
        if lines:
            name = f"{name} ({lines})"
        results.append(AmenityResult(
            name=name,
            distance_km=round(stop["distance_m"] / 1000, 3),
            type=stop.get("transport_type"),
        ))
    return AmenityCategory(results=results)


def get_local_amenities(
    lat: float, lon: float, radius_m: int = 1000,
) -> dict[str, AmenityCategory]:
    """Look up nearby amenities from local OSM + ZVV data.

    Args:
        lat: Latitude of the listing.
        lon: Longitude of the listing.
        radius_m: Search radius in meters (default 1000).

    Returns:
        Dict keyed by amenity name with AmenityCategory values.
    """
    result: dict[str, AmenityCategory] = {}

    for category_name, spec in AMENITY_CATEGORY_MAP.items():
        try:
            if spec == "USE_ZVV_STOPS":
                result[category_name] = _query_transit(lat, lon, radius_m)
            else:
                result[category_name] = _query_osm_category(
                    lat, lon, radius_m,
                    category_group=spec["category_group"],
                    categories=spec["categories"],
                )
        except Exception:
            logger.exception("Failed to query %s amenities", category_name)
            result[category_name] = AmenityCategory()

    return result
