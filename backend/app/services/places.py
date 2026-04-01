"""Google Places search via Apify compass~crawler-google-places actor."""

import asyncio
import json
import logging
import math
import os
import subprocess

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")

# Global semaphore: only 1 Apify actor call at a time to avoid concurrency limits
_apify_semaphore = asyncio.Semaphore(1)


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


def _curl_apify(url: str, payload: dict, timeout: int = 60) -> list[dict]:
    """Call Apify API via curl subprocess (works around httpx 402 issue)."""
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST",
            f"{url}?token={APIFY_TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(payload),
            "--max-time", str(timeout),
        ],
        capture_output=True,
        text=True,
        timeout=timeout + 10,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed (exit {result.returncode}): {result.stderr[:200]}")
    return json.loads(result.stdout)


async def search_nearby_places(
    query: str,
    latitude: float,
    longitude: float,
    radius_km: float = 1.0,
    max_results: int = 5,
) -> list[dict]:
    """Search for nearby places using Google Places via Apify."""
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
        async with _apify_semaphore:
            items = await asyncio.to_thread(_curl_apify, url, payload, 60)
        logger.info("Apify places search OK for %r: %d results", query, len(items))
        return [
            {
                "title": item.get("title", ""),
                "address": item.get("address", ""),
                "rating": item.get("totalScore"),
                "reviews": item.get("reviewsCount"),
                "category": item.get("categoryName", ""),
                "location": item.get("location"),
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
    """Search for multiple place categories in a single Apify actor run."""
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
        async with _apify_semaphore:
            logger.info("Apify semaphore acquired for %d queries: %s", len(queries), queries)
            items = await asyncio.to_thread(_curl_apify, url, payload, 90)
        logger.info("Apify batch places search OK: %d items for %d queries", len(items), len(queries))

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
