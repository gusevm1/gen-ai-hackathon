"""Scoring router for the property analysis pipeline.

Provides POST /score endpoint that orchestrates the full scoring flow:
1. Fetch listing from Flatfox API
2. Load user preferences from Supabase
3. Score listing against preferences via Claude
4. Save analysis results to Supabase
5. Return ScoreResponse to caller

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

    Orchestrates the full pipeline: fetch listing, load preferences,
    call Claude for scoring, save results, return response.

    - 404: User preferences not found
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

    # 2. Load user preferences from Supabase
    try:
        prefs_data = await asyncio.to_thread(
            supabase_service.get_preferences, request.user_id
        )
        preferences = UserPreferences.model_validate(prefs_data)
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Preferences not found: {e}",
        )

    # 3. Score with Claude
    try:
        result = await claude_scorer.score_listing(listing, preferences)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Scoring failed: {e}",
        )

    # 4. Save analysis to Supabase (fire and forget -- log error but don't fail)
    try:
        await asyncio.to_thread(
            supabase_service.save_analysis,
            request.user_id,
            str(request.listing_id),
            result.model_dump(),
        )
    except Exception:
        logger.exception("Failed to save analysis for user=%s listing=%s", request.user_id, request.listing_id)

    # 5. Return the ScoreResponse
    return result
