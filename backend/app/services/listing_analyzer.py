"""Listing analysis pipeline: Flatfox listing -> ListingProfile.

Takes a Flatfox listing ID and produces a comprehensive ListingProfile by:
1. Fetching listing data from Flatfox API
2. Fetching page data (images + web prices)
3. Pre-fetching proximity data for standard amenity categories
4. Analyzing images with Claude for condition scoring
5. Analyzing description with Claude for neighborhood context
6. Building and saving the ListingProfile
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone

from app.models.listing import FlatfoxListing
from app.models.listing_profile import (
    AmenityCategory,
    AmenityResult,
    ListingProfile,
)
from app.services.claude import claude_scorer
from app.services.flatfox import flatfox_client
from app.services.listing_profile_db import save_listing_profile
from app.services.places import haversine_km, search_nearby_places, search_nearby_places_batch
from app.services.proximity import ProximityRequirement, fetch_nearby_places
from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)

# Standard amenity categories to pre-fetch for every listing
STANDARD_AMENITIES = [
    "supermarket",
    "public transport",
    "school",
    "gym",
    "restaurant",
    "park",
    "hospital",
    "pharmacy",
    "kindergarten",
]

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

IMAGE_ANALYSIS_PROMPT = """Analyze these property listing images. Use the criteria below to assign each score.

CONDITION (condition_score 0-100):
- High (80-100): freshly painted walls, clean surfaces, new flooring, no visible damage
- Medium (50-79): minor wear but well-maintained, no structural concerns
- Low (0-49): cracks, peeling paint, damaged floors, water stains, mold, dirty grout, broken fixtures, patchy repairs

NATURAL LIGHT (natural_light_score 0-100):
- High (80-100): large windows, south/west-facing, bright room exposure in photos
- Medium (40-79): adequate windows, neutral orientation
- Low (0-39): dark rooms, north-facing or small windows, basement feel

KITCHEN QUALITY (kitchen_quality_score 0-100):
- High (80-100): integrated appliances, stone/composite countertops, modern cabinets, backsplash
- Medium (40-79): clean older cabinets, adequate counter space, basic appliances
- Low (0-39): outdated or damaged cabinets, missing handles, worn countertop, no visible appliances

BATHROOM QUALITY (bathroom_quality_score 0-100):
- High (80-100): walk-in shower or modern bathtub, clean tiles, new fixtures, good lighting
- Medium (40-79): functional but dated, clean condition, older fixtures
- Low (0-39): stained grout, chipped tiles, old fixtures, visible mold

INTERIOR STYLE — pick one:
- "modern": clean lines, neutral palette, no visible wallpaper, <10 year feel
- "renovated": older bones but updated kitchen/bath
- "classic": older construction, well-maintained traditional finishes
- "dated": 1980s-90s style, parquet/laminate in poor shape, formica, heavy wallpaper

Respond with JSON only:
{
  "condition_score": <0-100>,
  "natural_light_score": <0-100>,
  "kitchen_quality_score": <0-100>,
  "bathroom_quality_score": <0-100>,
  "interior_style": "modern" | "classic" | "renovated" | "dated",
  "maintenance_notes": ["specific issue observed, e.g. bathroom grout stained"],
  "highlights": ["standout positive, e.g. large south-facing windows"],
  "concerns": ["potential problem, e.g. visible ceiling stain"]
}
"""

DESCRIPTION_ANALYSIS_PROMPT = """Analyze this property listing description and extract the following fields.

neighborhood_character: one of "urban center" | "quiet residential" | "family suburb" | "mixed commercial" | "village"
noise_level_estimate: 0-100 (100 = very noisy). Infer from keywords like "ruhig" (quiet→low), "Hauptstrasse" (main road→high), "Gewerbe" (commercial→medium-high).
family_friendly_score: 0-100. Infer from keywords like "ruhig", "Spielplatz", "Schulen", "Familien", "kindergartenfreundlich". Default 50 if no signal.
nightlife_proximity_score: 0-100. Infer from keywords like "Ausgehviertel", "Bars", "Clubs", "zentral", "lebhaft", "Nachtleben". Default 50 if no signal.
green_space_score: 0-100. Infer from keywords like "Park", "Natur", "Wald", "Grünanlage", "Wiese", "See", "Naherholung". Default 50 if no signal.
description_summary: 2-3 sentence summary of the property and location.
highlights: list of standout positive features mentioned in the description.
concerns: list of potential drawbacks mentioned or implied.

Respond with JSON only:
{{
  "neighborhood_character": "...",
  "noise_level_estimate": <0-100>,
  "family_friendly_score": <0-100>,
  "nightlife_proximity_score": <0-100>,
  "green_space_score": <0-100>,
  "description_summary": "...",
  "highlights": ["..."],
  "concerns": ["..."]
}}

Description:
{description}
"""


async def analyze_listing(listing_id: int) -> ListingProfile:
    """Fully analyze a Flatfox listing and return a ListingProfile.

    Steps:
    1. Fetch listing from Flatfox API
    2. Fetch page data (images + web prices)
    3. Pre-fetch proximity data for standard amenity categories
    4. Analyze images with Claude for condition scoring
    5. Analyze description with Claude for neighborhood context
    6. Build and save ListingProfile

    Args:
        listing_id: The Flatfox listing primary key.

    Returns:
        A fully populated ListingProfile.

    Raises:
        httpx.HTTPStatusError: If the listing cannot be fetched.
    """
    # Step 1: Fetch listing from Flatfox API
    logger.info("Analyzing listing %d: fetching from Flatfox", listing_id)
    listing = await flatfox_client.get_listing(listing_id)

    # Step 2: Fetch page data (images + web prices)
    page_data = await flatfox_client.get_listing_page_data(listing.slug, listing.pk)
    image_urls = page_data.image_urls

    # Apply web price overrides (same logic as scoring.py)
    wp = page_data.web_prices
    if listing.offer_type.upper() != "SALE":
        if wp.rent_gross is not None and wp.rent_gross != listing.rent_gross:
            logger.info(
                "Listing %d price override: API rent_gross=%s -> web=%s",
                listing.pk,
                listing.rent_gross,
                wp.rent_gross,
            )
            listing.rent_gross = wp.rent_gross
            listing.price_display = wp.rent_gross
        if wp.rent_net is not None:
            listing.rent_net = wp.rent_net
        if wp.rent_charges is not None:
            listing.rent_charges = wp.rent_charges

    # Step 3: Pre-fetch proximity data for standard amenity categories
    amenities: dict[str, AmenityCategory] = {}
    if listing.latitude is not None and listing.longitude is not None:
        amenities = await _fetch_standard_amenities(
            listing.latitude, listing.longitude
        )

    # Step 4: Analyze images with Claude for condition scoring
    image_analysis = {}
    if image_urls:
        image_analysis = await _analyze_images(image_urls)

    # Step 5: Analyze description with Claude for neighborhood context
    description_analysis = {}
    if listing.description:
        description_analysis = await _analyze_description(listing.description)

    # Step 6: Build ListingProfile
    # Parse rooms safely
    rooms: float | None = None
    if listing.number_of_rooms:
        try:
            rooms = float(listing.number_of_rooms)
        except (ValueError, TypeError):
            pass

    # Determine effective price
    price = listing.rent_gross or listing.price_display
    rent_net = listing.rent_net
    rent_charges = listing.rent_charges

    # Merge highlights and concerns from image + description analysis
    all_highlights = image_analysis.get("highlights", []) + description_analysis.get(
        "highlights", []
    )
    all_concerns = image_analysis.get("concerns", []) + description_analysis.get(
        "concerns", []
    )

    profile = ListingProfile(
        # Objective data from Flatfox
        listing_id=listing.pk,
        slug=listing.slug,
        title=listing.description_title or listing.public_title,
        address=listing.public_address,
        city=listing.city,
        zipcode=listing.zipcode,
        canton=listing.state,
        country=listing.country or "CH",
        latitude=listing.latitude,
        longitude=listing.longitude,
        price=price,
        rent_net=rent_net,
        rent_charges=rent_charges,
        rooms=rooms,
        sqm=listing.surface_living,
        floor=listing.floor,
        year_built=listing.year_built,
        year_renovated=listing.year_renovated,
        offer_type=listing.offer_type,
        object_category=listing.object_category,
        object_type=listing.object_type,
        is_furnished=listing.is_furnished,
        is_temporary=listing.is_temporary,
        moving_date=listing.moving_date,
        moving_date_type=listing.moving_date_type,
        attributes=[a.name for a in listing.attributes],
        image_urls=image_urls,
        description=listing.description,
        # AI-analyzed condition (from images)
        condition_score=image_analysis.get("condition_score"),
        natural_light_score=image_analysis.get("natural_light_score"),
        kitchen_quality_score=image_analysis.get("kitchen_quality_score"),
        bathroom_quality_score=image_analysis.get("bathroom_quality_score"),
        interior_style=image_analysis.get("interior_style"),
        maintenance_notes=image_analysis.get("maintenance_notes", []),
        # AI-researched neighborhood (from description)
        neighborhood_character=description_analysis.get("neighborhood_character"),
        noise_level_estimate=description_analysis.get("noise_level_estimate"),
        family_friendly_score=description_analysis.get("family_friendly_score"),
        nightlife_proximity_score=description_analysis.get("nightlife_proximity_score"),
        green_space_score=description_analysis.get("green_space_score"),
        description_summary=description_analysis.get("description_summary"),
        # Pre-fetched proximity data
        amenities=amenities,
        # Free-text research notes
        highlights=all_highlights,
        concerns=all_concerns,
        # Metadata
        analyzed_at=datetime.now(timezone.utc),
        flatfox_last_updated=listing.published or listing.created,
        profile_version=1,
    )

    # Save to DB
    await asyncio.to_thread(save_listing_profile, profile)
    logger.info("Listing %d analysis complete and saved", listing_id)

    return profile


async def _fetch_standard_amenities(
    lat: float, lon: float
) -> dict[str, AmenityCategory]:
    """Pre-fetch proximity data for all standard amenity categories.

    Uses a SINGLE batched Apify actor run with all queries in one
    searchStringsArray — much more RAM-efficient than 9 separate runs.
    Checks Supabase cache first for each category; only sends uncached
    queries to Apify.

    Args:
        lat: Listing latitude.
        lon: Listing longitude.

    Returns:
        Dict mapping category key to AmenityCategory with results.
    """
    amenities: dict[str, AmenityCategory] = {}
    uncached_queries: list[str] = []

    # Check cache for each category first
    for category in STANDARD_AMENITIES:
        try:
            cached = await asyncio.to_thread(
                supabase_service.get_nearby_places_cache,
                lat, lon, category, 2.0,
            )
            if cached is not None:
                key = category.replace(" ", "_")
                amenities[key] = AmenityCategory(
                    results=[
                        AmenityResult(
                            name=p.get("name", ""),
                            distance_km=p.get("distance_km"),
                            rating=p.get("rating"),
                            review_count=p.get("review_count"),
                            address=p.get("address"),
                        )
                        for p in cached
                    ]
                )
                logger.debug("Cache hit for amenity %r", category)
                continue
        except Exception:
            pass
        uncached_queries.append(category)

    if not uncached_queries:
        logger.info("All %d amenity categories served from cache", len(STANDARD_AMENITIES))
        return amenities

    logger.info(
        "Fetching %d uncached amenity categories in single batch: %s",
        len(uncached_queries), uncached_queries,
    )

    # Single batched Apify call for all uncached queries
    batch_results = await search_nearby_places_batch(
        queries=uncached_queries,
        latitude=lat,
        longitude=lon,
        radius_km=2.0,
        max_results_per_query=5,
    )

    # Process results: compute haversine distances, build AmenityCategory, cache
    for category in uncached_queries:
        raw_places = batch_results.get(category, [])
        results_with_distance: list[dict] = []

        for place in raw_places:
            distance_km: float | None = None
            location = place.get("location")
            if isinstance(location, dict):
                place_lat = location.get("lat")
                place_lng = location.get("lng")
                if place_lat is not None and place_lng is not None:
                    try:
                        distance_km = haversine_km(lat, lon, float(place_lat), float(place_lng))
                    except Exception:
                        pass

            results_with_distance.append({
                "name": place.get("title", ""),
                "distance_km": distance_km,
                "rating": place.get("rating"),
                "review_count": place.get("reviews"),
                "address": place.get("address"),
            })

        key = category.replace(" ", "_")
        amenities[key] = AmenityCategory(
            results=[AmenityResult(**p) for p in results_with_distance]
        )

        # Cache results (fire and forget)
        try:
            await asyncio.to_thread(
                supabase_service.save_nearby_places_cache,
                lat, lon, category, 2.0, results_with_distance,
            )
        except Exception:
            logger.warning("Failed to cache amenity results for %r", category)

    return amenities


async def _analyze_images(image_urls: list[str]) -> dict:
    """Analyze listing images with Claude for condition scoring.

    Sends images to Claude with a focused prompt to extract condition
    scores, interior style, and maintenance observations.

    Args:
        image_urls: List of image URLs to analyze.

    Returns:
        Dict with condition_score, natural_light_score, kitchen_quality_score,
        bathroom_quality_score, interior_style, maintenance_notes, highlights,
        concerns. Returns {} on failure.
    """
    try:
        client = claude_scorer.get_client()

        # Build image content blocks
        content: list[dict] = []
        for url in image_urls:
            content.append(
                {
                    "type": "image",
                    "source": {"type": "url", "url": url},
                }
            )
        content.append({"type": "text", "text": IMAGE_ANALYSIS_PROMPT})

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": content}],
        )

        # Parse JSON from response text
        response_text = response.content[0].text.strip()
        # Handle markdown code blocks
        if response_text.startswith("```"):
            # Strip ```json ... ``` wrapping
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        return json.loads(response_text)

    except Exception as e:
        logger.warning("Image analysis failed: %s", e)
        return {}


async def _analyze_description(description: str) -> dict:
    """Extract neighborhood character, noise estimate, summary from description.

    Asks Claude to analyze the listing description and return structured
    data about the neighborhood and property highlights.

    Args:
        description: The listing description text.

    Returns:
        Dict with neighborhood_character, noise_level_estimate,
        description_summary, highlights, concerns. Returns {} on failure.
    """
    if not description or not description.strip():
        return {}

    try:
        client = claude_scorer.get_client()

        prompt = DESCRIPTION_ANALYSIS_PROMPT.format(description=description)

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()
        # Handle markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        return json.loads(response_text)

    except Exception as e:
        logger.warning("Description analysis failed: %s", e)
        return {}
