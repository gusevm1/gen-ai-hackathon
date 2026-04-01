"""Google Places search via Apify compass~crawler-google-places actor."""

import logging
import math
import os

import httpx

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


async def search_nearby_places(
    query: str,
    latitude: float,
    longitude: float,
    radius_km: float = 1.0,
    max_results: int = 5,
) -> list[dict]:
    """Search for nearby places using Google Places via Apify.

    Args:
        query: Search query (e.g. "primary school", "gym", "supermarket").
        latitude: Listing latitude.
        longitude: Listing longitude.
        radius_km: Search radius in kilometers (default 1.0).
        max_results: Maximum number of results to return (default 5).

    Returns:
        List of dicts with keys: title, address, rating, reviews, category, location.
        Returns [] on any failure (timeout, error, no token).
    """
    if not APIFY_TOKEN:
        logger.warning("APIFY_TOKEN not set, cannot search nearby places")
        return []

    actor_name = "compass~crawler-google-places"
    url = f"{APIFY_BASE}/acts/{actor_name}/run-sync-get-dataset-items"

    payload = {
        "searchStringsArray": [query],
        "customGeolocation": {
            "type": "Point",
            "coordinates": [longitude, latitude],
            "radiusKm": radius_km,
        },
        "maxCrawledPlacesPerSearch": max_results,
    }

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                url,
                params={"token": APIFY_TOKEN},
                json=payload,
            )
            resp.raise_for_status()
            items = resp.json()

            return [
                {
                    "title": item.get("title", ""),
                    "address": item.get("address", ""),
                    "rating": item.get("totalScore"),
                    "reviews": item.get("reviewsCount"),
                    "category": item.get("categoryName", ""),
                    "location": item.get("location"),  # dict with "lat" and "lng" keys, or None
                }
                for item in items
                if isinstance(item, dict)
            ]
    except Exception as e:
        logger.warning("Apify places search failed for %r: %s", query, e)
        return []


async def search_nearby_places_batch(
    queries: list[str],
    latitude: float,
    longitude: float,
    radius_km: float = 2.0,
    max_results_per_query: int = 5,
) -> dict[str, list[dict]]:
    """Search for multiple place categories in a single Apify actor run.

    Sends all queries as a single searchStringsArray to the actor, which is
    more RAM-efficient than N separate runs.

    Args:
        queries: List of search queries (e.g. ["supermarket", "gym"]).
        latitude: Listing latitude.
        longitude: Listing longitude.
        radius_km: Search radius in kilometers (default 2.0).
        max_results_per_query: Max results per query (default 5).

    Returns:
        Dict mapping each query string to its list of place dicts.
        Returns empty lists for all queries on any failure.
    """
    if not queries:
        return {}

    if not APIFY_TOKEN:
        logger.warning("APIFY_TOKEN not set, cannot batch search nearby places")
        return {q: [] for q in queries}

    actor_name = "compass~crawler-google-places"
    url = f"{APIFY_BASE}/acts/{actor_name}/run-sync-get-dataset-items"

    payload = {
        "searchStringsArray": queries,
        "customGeolocation": {
            "type": "Point",
            "coordinates": [longitude, latitude],
            "radiusKm": radius_km,
        },
        "maxCrawledPlacesPerSearch": max_results_per_query,
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                url,
                params={"token": APIFY_TOKEN},
                json=payload,
            )
            resp.raise_for_status()
            items = resp.json()

        # Apify returns results with a "searchString" field indicating which query produced them
        results: dict[str, list[dict]] = {q: [] for q in queries}
        for item in items:
            if not isinstance(item, dict):
                continue
            search_string = item.get("searchString", "")
            if search_string in results:
                results[search_string].append({
                    "title": item.get("title", ""),
                    "address": item.get("address", ""),
                    "rating": item.get("totalScore"),
                    "reviews": item.get("reviewsCount"),
                    "category": item.get("categoryName", ""),
                    "location": item.get("location"),
                })
        return results

    except Exception as e:
        logger.warning("Apify batch places search failed: %s", e)
        return {q: [] for q in queries}
