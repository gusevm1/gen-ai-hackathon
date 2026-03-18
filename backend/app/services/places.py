"""Google Places search via Apify compass~crawler-google-places actor."""

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")


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
        List of dicts with keys: title, address, rating, reviews, category.
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
                }
                for item in items
                if isinstance(item, dict)
            ]
    except Exception as e:
        logger.warning("Apify places search failed for %r: %s", query, e)
        return []
