"""Scoring router for the property analysis pipeline.

Provides POST /score endpoint that orchestrates the full scoring flow:
1. Fetch listing from Flatfox API
2. Parse preferences from request (provided by edge function)
3. Fetch listing images for visual analysis
4. Score listing against preferences via Claude (with images when available)
5. Save analysis results to Supabase with profile_id
6. Return ScoreResponse to caller

Error handling returns appropriate HTTP status codes for each failure mode.
"""

import asyncio
import logging

import httpx
from fastapi import APIRouter, HTTPException

from app.models.preferences import UserPreferences
from app.models.scoring import ScoreRequest, ScoreResponse
from app.services.apify import geocode_listing
from app.services.claude import claude_scorer
from app.services.proximity import fetch_all_proximity_data
from app.services.flatfox import flatfox_client
from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/score", tags=["scoring"])


@router.post("", response_model=ScoreResponse)
async def score_listing(request: ScoreRequest) -> ScoreResponse:
    """Score a Flatfox listing against user preferences.

    Orchestrates the full pipeline: fetch listing, parse preferences,
    call Claude for scoring, save results with profile attribution, return response.

    - 502: Listing fetch failed or Claude scoring failed
    """
    # 0. Safeguard: return cached score if it exists (unless force_rescore)
    if not request.force_rescore:
        try:
            cached = await asyncio.to_thread(
                supabase_service.get_analysis,
                request.user_id,
                request.profile_id,
                str(request.listing_id),
            )
            if cached:
                return ScoreResponse.model_validate(cached)
        except Exception:
            logger.warning("Cache pre-check failed for listing=%s, proceeding to score", request.listing_id)

    # 1. Fetch listing from Flatfox
    try:
        listing = await flatfox_client.get_listing(request.listing_id)
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch listing: {e}",
        )

    # 1a. Resolve coordinates if missing (COORD-01, COORD-02, COORD-03)
    # ClaudeScorer already gates proximity evaluation on has_coords, so if geocoding
    # fails here, scoring proceeds normally without proximity — no crash possible.
    if listing.latitude is None or listing.longitude is None:
        logger.info("Listing %d missing coordinates, attempting geocoding", listing.pk)
        try:
            geo = await geocode_listing(listing)
            if geo:
                listing.latitude = float(geo["lat"])
                listing.longitude = float(geo["lon"])
                logger.info(
                    "Geocoded listing %d to lat=%.6f lon=%.6f",
                    listing.pk, listing.latitude, listing.longitude,
                )
            else:
                logger.warning(
                    "Geocoding returned no result for listing %d — proximity evaluation will be skipped",
                    listing.pk,
                )
        except Exception:
            logger.exception(
                "Geocoding raised an unexpected error for listing %d — continuing without coordinates",
                listing.pk,
            )

    # 1b/1c. Fetch proximity data (PROX-01 through CACHE-06)
    # Only runs if listing has coordinates. Returns {} immediately if no proximity
    # requirements exist in dynamic_fields (PROX-03 gate inside fetch_all_proximity_data).
    nearby_data: dict[str, list[dict]] = {}
    if listing.latitude is not None and listing.longitude is not None:
        try:
            # Parse preferences early for proximity extraction (full parse happens at step 2)
            _prefs_for_proximity = UserPreferences.model_validate(request.preferences)
            nearby_data = await fetch_all_proximity_data(
                listing.latitude,
                listing.longitude,
                _prefs_for_proximity,
            )
            if nearby_data:
                logger.info(
                    "Fetched proximity data for listing %d: %d queries",
                    listing.pk, len(nearby_data),
                )
        except Exception:
            logger.exception(
                "Proximity fetch raised unexpected error for listing %d — continuing without proximity data",
                listing.pk,
            )

    # 2. Parse preferences from request (provided by edge function, no DB query)
    preferences = UserPreferences.model_validate(request.preferences)

    # 3. Fetch listing page data (images + web-displayed prices)
    page_data = await flatfox_client.get_listing_page_data(listing.slug, listing.pk)
    image_urls = page_data.image_urls
    logger.info(
        "Found %d images for listing %d", len(image_urls), listing.pk
    )

    # 4. Override API prices with web-scraped prices (Flatfox API returns stale data)
    # Only apply rent price overrides for RENT listings — SALE listings use price_display directly
    wp = page_data.web_prices
    if listing.offer_type.upper() != "SALE":
        if wp.rent_gross is not None and wp.rent_gross != listing.rent_gross:
            logger.warning(
                "Listing %d price mismatch: API rent_gross=%s, web=%s -- using web price",
                listing.pk, listing.rent_gross, wp.rent_gross,
            )
            listing.rent_gross = wp.rent_gross
            listing.price_display = wp.rent_gross
        if wp.rent_net is not None:
            listing.rent_net = wp.rent_net
        if wp.rent_charges is not None:
            listing.rent_charges = wp.rent_charges

    # 5. Score with Claude (includes images + pre-fetched nearby places when available)
    try:
        result = await claude_scorer.score_listing(
            listing, preferences, image_urls=image_urls, nearby_places=nearby_data or None
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Scoring failed: {e}",
        )

    # 6. Save analysis to Supabase with profile_id (fire and forget -- log error but don't fail)
    try:
        # Inject listing title so frontend can display it instead of the raw listing ID
        score_data = result.model_dump()
        score_data["listing_title"] = (
            listing.description_title or listing.public_title or listing.short_title or None
        )
        if nearby_data:
            score_data["nearby_places"] = nearby_data
        await asyncio.to_thread(
            supabase_service.save_analysis,
            request.user_id,
            request.profile_id,
            str(request.listing_id),
            score_data,
        )
    except Exception:
        logger.exception("Failed to save analysis for user=%s listing=%s", request.user_id, request.listing_id)

    # 7. Return the ScoreResponse
    return result
