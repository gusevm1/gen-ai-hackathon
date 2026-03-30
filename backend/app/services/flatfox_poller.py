"""Polls Flatfox search API for new listings across Swiss cities.

Provides async functions to discover new listing IDs from the Flatfox
public search endpoint. Used by the poller script and analysis pipeline
to find listings that haven't been profiled yet.

Endpoint: GET /api/v1/public-listing/?ordering=-created&...
No authentication required.
"""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

FLATFOX_SEARCH_URL = "https://flatfox.ch/api/v1/public-listing/"

# Major Swiss cities to poll by default
DEFAULT_CITIES = [
    "zürich",
    "bern",
    "basel",
    "genève",
    "lausanne",
    "luzern",
    "st-gallen",
    "winterthur",
]


async def poll_new_listings(
    city: str | None = None,
    offer_type: str = "RENT",
    object_category: str = "APARTMENT",
    limit: int = 50,
) -> list[int]:
    """Poll Flatfox search API for listing IDs.

    Queries the public search endpoint with newest-first ordering
    and returns a list of listing PKs from the results.

    Args:
        city: Optional city filter (e.g. "zürich"). None = all cities.
        offer_type: "RENT" or "SALE".
        object_category: "APARTMENT" or "HOUSE".
        limit: Maximum number of results per request (max 50).

    Returns:
        List of listing PKs from the search results.
    """
    params: dict[str, str | int] = {
        "ordering": "-created",
        "offer_type": offer_type,
        "object_category": object_category,
        "limit": limit,
    }
    if city:
        params["city"] = city

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                FLATFOX_SEARCH_URL,
                params=params,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()

        results = data.get("results", [])
        pks = [item["pk"] for item in results if isinstance(item, dict) and "pk" in item]

        logger.info(
            "Polled Flatfox: city=%s offer_type=%s category=%s -> %d listings",
            city or "all",
            offer_type,
            object_category,
            len(pks),
        )
        return pks

    except Exception as e:
        logger.warning(
            "Flatfox poll failed for city=%s offer_type=%s: %s",
            city or "all",
            offer_type,
            e,
        )
        return []


async def discover_new_listings(
    cities: list[str] | None = None,
    offer_types: list[str] | None = None,
) -> list[int]:
    """Discover all new listing IDs across multiple cities and offer types.

    Polls the Flatfox search API for each combination of city and offer type,
    deduplicates results, and returns all unique listing PKs.

    Args:
        cities: List of cities to poll. Defaults to major Swiss cities.
        offer_types: List of offer types ("RENT", "SALE"). Defaults to ["RENT"].

    Returns:
        Deduplicated list of listing PKs across all queries.
    """
    if cities is None:
        cities = DEFAULT_CITIES
    if offer_types is None:
        offer_types = ["RENT"]

    seen: set[int] = set()
    all_pks: list[int] = []

    for city in cities:
        for offer_type in offer_types:
            pks = await poll_new_listings(
                city=city,
                offer_type=offer_type,
            )
            for pk in pks:
                if pk not in seen:
                    seen.add(pk)
                    all_pks.append(pk)

    logger.info(
        "Discovery complete: %d unique listings from %d cities, %d offer types",
        len(all_pks),
        len(cities),
        len(offer_types),
    )
    return all_pks
