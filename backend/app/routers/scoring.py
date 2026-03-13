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
from app.services.claude import claude_scorer
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
    # 1. Fetch listing from Flatfox
    try:
        listing = await flatfox_client.get_listing(request.listing_id)
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch listing: {e}",
        )

    # 2. Parse preferences from request (provided by edge function, no DB query)
    preferences = UserPreferences.model_validate(request.preferences)

    # 3. Fetch listing images for visual analysis (graceful -- empty list on failure)
    image_urls = await flatfox_client.get_listing_image_urls(listing.slug, listing.pk)
    logger.info(
        "Found %d images for listing %d", len(image_urls), listing.pk
    )

    # 4. Score with Claude (includes images when available)
    try:
        result = await claude_scorer.score_listing(
            listing, preferences, image_urls=image_urls
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Scoring failed: {e}",
        )

    # 5. Save analysis to Supabase with profile_id (fire and forget -- log error but don't fail)
    try:
        await asyncio.to_thread(
            supabase_service.save_analysis,
            request.user_id,
            request.profile_id,
            str(request.listing_id),
            result.model_dump(),
        )
    except Exception:
        logger.exception("Failed to save analysis for user=%s listing=%s", request.user_id, request.listing_id)

    # 6. Return the ScoreResponse
    return result
