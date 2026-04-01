"""Apify actor client for geocoding via Nominatim."""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from app.models.listing import FlatfoxListing

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")


async def geocode_location(
    query: str, country_code: str = "ch"
) -> dict | None:
    """Call the homematch-geocoder Apify actor and return bbox result.

    Returns dict with keys: query, lat, lon, displayName, boundingBox
    or None if geocoding fails.
    """
    if not APIFY_TOKEN:
        logger.warning("APIFY_TOKEN not set, falling back to direct Nominatim")
        return await _nominatim_fallback(query, country_code)

    actor_name = "gusevm1~homematch-geocoder"
    url = f"{APIFY_BASE}/acts/{actor_name}/run-sync-get-dataset-items"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                params={"token": APIFY_TOKEN},
                json={"query": query, "countryCode": country_code},
            )
            resp.raise_for_status()
            items = resp.json()
            if items and len(items) > 0:
                return items[0]
    except Exception as e:
        logger.warning("Apify geocode failed for %r: %s, falling back to Nominatim", query, e)

    return await _nominatim_fallback(query, country_code)


async def _nominatim_fallback(query: str, country_code: str = "ch") -> dict | None:
    """Direct Nominatim call as fallback."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": "1",
        "countrycodes": country_code,
    }
    headers = {"User-Agent": "HomeMatch/1.0"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            results = resp.json()
            if results:
                r = results[0]
                bb = r.get("boundingbox", [])
                return {
                    "query": query,
                    "lat": float(r["lat"]),
                    "lon": float(r["lon"]),
                    "displayName": r.get("display_name", ""),
                    "boundingBox": [float(b) for b in bb] if len(bb) == 4 else None,
                }
    except Exception as e:
        logger.warning("Nominatim fallback failed for %r: %s", query, e)

    return None


async def geocode_listing(listing: "FlatfoxListing") -> dict | None:
    """Attempt to geocode a FlatfoxListing using its address fields.

    Address priority:
      1. listing.public_address  (full formatted address from Flatfox API)
      2. "{street}, {zipcode} {city}, Switzerland"
      3. "{zipcode} {city}, Switzerland"

    Returns dict with at minimum 'lat' and 'lon' keys, or None if geocoding
    fails or no address fields are available.
    """
    query: str | None = None
    if listing.public_address:
        query = listing.public_address
    elif listing.street and listing.city:
        query = f"{listing.street}, {listing.zipcode} {listing.city}, Switzerland"
    elif listing.city:
        query = f"{listing.zipcode} {listing.city}, Switzerland"

    if not query:
        logger.warning("Listing %s has no address fields for geocoding", getattr(listing, "pk", "unknown"))
        return None

    # Try queries in order of specificity; fall back to less specific if needed
    queries_to_try = [query]
    # If full address fails, try zipcode + city as a fallback (less precise but reliable)
    if listing.zipcode and listing.city:
        fallback = f"{listing.zipcode} {listing.city}, Switzerland"
        if fallback != query:
            queries_to_try.append(fallback)

    for q in queries_to_try:
        result = await geocode_location(q)
        if result and result.get("lat") is not None and result.get("lon") is not None:
            return result
    return None
