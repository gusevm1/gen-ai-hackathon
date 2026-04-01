"""Scoring router for the hybrid property analysis pipeline (Phase 31).

Orchestrates the full hybrid scoring flow:
1. Cache check -- return cached score if exists
2. ListingProfile lookup from Supabase
3. If profile found (happy path):
   a. Adapt profile to FlatfoxListing + proximity data
   b. Run deterministic scoring on non-subjective criteria
   c. Run subjective scoring via OpenRouter
   d. Weighted aggregation -> ScoreResponse v2
4. If profile not found (degradation):
   a. ALLOW_CLAUDE_FALLBACK=true -> old pipeline (fetch, geocode, score)
   b. ALLOW_CLAUDE_FALLBACK=false -> enrichment_status="unavailable"
5. Save analysis to Supabase (fire-and-forget)
6. Return ScoreResponse

Error handling returns appropriate HTTP status codes for each failure mode.
"""

import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

from app.models.preferences import CriterionType, UserPreferences
from app.models.scoring import (
    ScoreRequest,
    ScoreResponse,
    TopMatchesRequest,
    TopMatchesResponse,
    TopMatchResult,
)
from app.services.claude import claude_scorer
from app.services.deterministic_scorer import (
    FulfillmentResult,
    score_binary_feature,
    score_distance,
    score_price,
    score_proximity_quality,
    score_size,
    synthesize_builtin_results,
)
from app.services.hybrid_scorer import compute_weighted_score, to_criterion_result
from app.services.places import haversine_km, search_nearby_places_batch
from app.services.listing_profile_db import get_all_listing_profiles, get_listing_profile
from app.services.profile_adapter import adapt_profile_to_listing, adapt_profile_amenities
from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/score", tags=["scoring"])

ALLOW_CLAUDE_FALLBACK = os.environ.get("ALLOW_CLAUDE_FALLBACK", "false").lower() == "true"


# ---------------------------------------------------------------------------
# Helper: resolve distance_km from pre-computed proximity data
# ---------------------------------------------------------------------------


def _resolve_distance_km(
    field_name: str, proximity_data: dict[str, list[dict]]
) -> Optional[float]:
    """Extract the nearest distance_km from proximity_data for a distance field.

    Normalizes the field name to lowercase and tries to match against
    proximity_data keys by checking if any word from the field name appears
    in a proximity category key.

    Returns the first entry's distance_km if a match is found, else None.
    """
    if not proximity_data:
        return None

    normalized = field_name.strip().lower()

    # Direct key match
    if normalized in proximity_data:
        entries = proximity_data[normalized]
        if entries and entries[0].get("distance_km") is not None:
            return entries[0]["distance_km"]

    # Try matching by words from the field name against proximity data keys
    words = normalized.replace("-", " ").replace("_", " ").split()
    for key, entries in proximity_data.items():
        key_lower = key.lower()
        for word in words:
            if len(word) > 2 and word in key_lower:
                if entries and entries[0].get("distance_km") is not None:
                    return entries[0]["distance_km"]

    return None


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------


@router.post("", response_model=ScoreResponse)
async def score_listing(request: ScoreRequest) -> ScoreResponse:
    """Score a Flatfox listing against user preferences via the hybrid pipeline.

    Orchestrates: cache check -> profile lookup -> deterministic + subjective
    scoring -> weighted aggregation -> save -> return.

    - 502: Scoring pipeline failed
    """
    # 0. Cache check -- return cached score if it exists (unless force_rescore)
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
            logger.warning(
                "Cache pre-check failed for listing=%s, proceeding to score",
                request.listing_id,
            )

    # 1. Parse preferences
    preferences = UserPreferences.model_validate(request.preferences)

    # 2. ListingProfile lookup
    try:
        profile = await asyncio.to_thread(get_listing_profile, request.listing_id)
    except Exception:
        logger.exception(
            "ListingProfile lookup failed for listing=%s", request.listing_id
        )
        profile = None

    # 3. Happy path: ListingProfile found -> hybrid scoring
    if profile is not None:
        try:
            result = await _score_with_profile(profile, preferences)
        except Exception as e:
            logger.exception(
                "Hybrid scoring failed for listing=%s: %s", request.listing_id, e
            )
            raise HTTPException(
                status_code=502,
                detail=f"Scoring failed: {e}",
            )

        # Save analysis (fire-and-forget)
        _save_analysis_fire_and_forget(request, result, preferences)
        return result

    # 4. Degradation path: no ListingProfile
    if ALLOW_CLAUDE_FALLBACK:
        # Old pipeline: fetch from Flatfox API, geocode, proximity, Claude score
        result = await _fallback_claude_pipeline(request, preferences)
        _save_analysis_fire_and_forget(request, result, preferences)
        return result

    # No fallback allowed (INT-04): return unavailable immediately
    return ScoreResponse(
        overall_score=0,
        match_tier="poor",
        summary_bullets=[
            "Scoring is not yet available for this listing's area.",
            "Pre-computed listing data has not been generated for this property.",
            "Check back later as coverage expands.",
        ],
        criteria_results=[],
        schema_version=2,
        enrichment_status="unavailable",
        categories=[],
        checklist=[],
        language=preferences.language,
    )


# ---------------------------------------------------------------------------
# Hybrid scoring (happy path)
# ---------------------------------------------------------------------------


async def _score_with_profile(profile, preferences: UserPreferences) -> ScoreResponse:
    """Score a listing using the hybrid pipeline with a pre-computed ListingProfile.

    Steps:
    1. Adapt ListingProfile to FlatfoxListing + proximity_data
    2. Run deterministic scoring (built-in fields + dynamic fields)
    3. Run subjective scoring via OpenRouter
    4. Merge results and compute weighted aggregate
    5. Build ScoreResponse v2
    """
    # a. Adapt
    listing = adapt_profile_to_listing(profile)
    proximity_data = adapt_profile_amenities(profile)

    # b. Deterministic scoring
    deterministic_results: list[FulfillmentResult] = []

    # Built-in fields (budget, rooms, living_space)
    builtin = synthesize_builtin_results(preferences, listing)
    deterministic_results.extend(builtin)

    # Dynamic fields -- route by criterion_type; track proximity gaps for on-demand Apify
    gap_fields: list = []  # DISTANCE/PROXIMITY_QUALITY fields with no pre-fetched data

    for field in preferences.dynamic_fields:
        ct = field.criterion_type
        result_value: Optional[float] = None

        if ct == CriterionType.PRICE:
            result_value = score_price(field, listing)
        elif ct == CriterionType.DISTANCE:
            actual_km = _resolve_distance_km(field.name, proximity_data)
            result_value = score_distance(field, listing, actual_km)
            if result_value is None:
                gap_fields.append(field)
                continue
        elif ct == CriterionType.SIZE:
            result_value = score_size(field, listing)
        elif ct == CriterionType.BINARY_FEATURE:
            result_value = score_binary_feature(field, listing)
        elif ct == CriterionType.PROXIMITY_QUALITY:
            result_value = score_proximity_quality(field, listing, proximity_data)
            if result_value is None:
                gap_fields.append(field)
                continue
        elif ct == CriterionType.SUBJECTIVE or ct is None:
            # Handled by subjective scorer below
            continue
        else:
            logger.warning(
                "Unknown criterion_type=%s for field=%s, skipping",
                ct, field.name,
            )
            continue

        deterministic_results.append(
            FulfillmentResult(
                criterion_name=field.name,
                fulfillment=result_value,
                importance=field.importance,
            )
        )

    # Gap-fill: on-demand Apify for DISTANCE/PROXIMITY_QUALITY fields with no pre-fetched data.
    # Also enrich proximity_data for SUBJECTIVE fields so the LLM has real data to evaluate.
    has_coords = profile.latitude is not None and profile.longitude is not None

    # Geocode from address if profile lacks coordinates (98% of profiles have NULL lat/lon)
    if not has_coords:
        try:
            from app.services.apify import geocode_listing as _geocode_listing
            geo = await _geocode_listing(listing)
            if geo:
                listing.latitude = float(geo["lat"])
                listing.longitude = float(geo["lon"])
                has_coords = True
                logger.info(
                    "Geocoded listing %d to lat=%.6f lon=%.6f for on-demand Apify",
                    profile.listing_id, listing.latitude, listing.longitude,
                )
                # Persist geocoded coords back to profile (fire-and-forget)
                try:
                    from app.services.listing_profile_db import save_listing_profile
                    profile.latitude = listing.latitude
                    profile.longitude = listing.longitude
                    await asyncio.to_thread(save_listing_profile, profile)
                    logger.info(
                        "Saved geocoded coords for listing %d", profile.listing_id,
                    )
                except Exception:
                    logger.warning(
                        "Failed to persist geocoded coords for listing %d",
                        profile.listing_id,
                    )
            else:
                logger.warning(
                    "Geocoding failed for listing %d — skipping on-demand Apify",
                    profile.listing_id,
                )
        except Exception:
            logger.warning(
                "Geocoding error for listing %d — continuing without coords",
                profile.listing_id,
                exc_info=True,
            )

    # Collect SUBJECTIVE fields that will go to the LLM — we'll run Apify for them too
    # so the LLM can evaluate proximity-based subjective criteria (e.g. "McDonald's nearby")
    subjective_lookup_fields = [
        f for f in preferences.dynamic_fields
        if (f.criterion_type is None or f.criterion_type == CriterionType.SUBJECTIVE)
        and f.name.lower().replace(" ", "_") not in proximity_data
        and f.name not in proximity_data
    ]

    all_apify_fields = gap_fields + subjective_lookup_fields
    if all_apify_fields and has_coords:
        queries = [f.name for f in all_apify_fields]
        logger.info(
            "On-demand Apify for %d fields (%d det gaps + %d subjective): %s",
            len(queries), len(gap_fields), len(subjective_lookup_fields), queries,
        )
        try:
            # Use 10 km radius so we always find the nearest even if outside the user's requested range
            batch_results = await search_nearby_places_batch(
                queries=queries,
                latitude=profile.latitude,
                longitude=profile.longitude,
                radius_km=10.0,
                max_results_per_query=5,
            )

            def _build_places(raw_places: list[dict]) -> list[dict]:
                """Compute haversine distances and normalise Apify place dicts."""
                out = []
                for place in raw_places:
                    dist_km: Optional[float] = None
                    loc = place.get("location")
                    if isinstance(loc, dict):
                        plat, plng = loc.get("lat"), loc.get("lng")
                        if plat is not None and plng is not None:
                            try:
                                dist_km = haversine_km(
                                    profile.latitude, profile.longitude,
                                    float(plat), float(plng),
                                )
                            except Exception:
                                pass
                    out.append({
                        "name": place.get("title", ""),
                        "distance_km": dist_km,
                        "rating": place.get("rating"),
                        "review_count": place.get("reviews"),
                        "address": place.get("address", ""),
                    })
                return out

            # ── Deterministic gap-fill for DISTANCE / PROXIMITY_QUALITY fields ──
            for field in gap_fields:
                raw_places = batch_results.get(field.name, [])
                places_with_dist = _build_places(raw_places)

                # Store under both original name and normalised key for lookup functions
                proximity_data[field.name] = places_with_dist
                proximity_data[field.name.lower().replace(" ", "_")] = places_with_dist

                ct = field.criterion_type
                if ct == CriterionType.DISTANCE:
                    actual_km = _resolve_distance_km(field.name, proximity_data)
                    result_value = score_distance(field, listing, actual_km)
                else:
                    result_value = score_proximity_quality(field, listing, proximity_data)

                # Build reasoning based on what was actually found
                nearest = places_with_dist[0] if places_with_dist else None
                nearest_km = nearest.get("distance_km") if nearest else None
                nearest_name = nearest.get("name", field.name) if nearest else None

                if result_value is not None:
                    # Scored successfully — add distance context to reasoning
                    if nearest_km is not None:
                        reasoning = f"Closest {field.name}: {nearest_name} at {nearest_km:.1f} km"
                    else:
                        reasoning = None
                else:
                    # Scoring function returned None (e.g. no parseable radius in field.value)
                    if nearest_km is not None:
                        # Found something but couldn't score — compute directly with 2 km default
                        import math as _math
                        default_radius = 2.0
                        result_value = round(_math.exp(-1.0 * nearest_km / default_radius), 3)
                        reasoning = f"Closest {field.name}: {nearest_name} at {nearest_km:.1f} km"
                    else:
                        result_value = 0.0
                        reasoning = f"No {field.name} found within 10 km search radius"

                deterministic_results.append(
                    FulfillmentResult(
                        criterion_name=field.name,
                        fulfillment=result_value,
                        importance=field.importance,
                        reasoning=reasoning,
                    )
                )

            # ── Enrich proximity_data for SUBJECTIVE fields (LLM will evaluate these) ──
            for field in subjective_lookup_fields:
                raw_places = batch_results.get(field.name, [])
                if not raw_places:
                    continue
                places_with_dist = _build_places(raw_places)
                proximity_data[field.name] = places_with_dist
                proximity_data[field.name.lower().replace(" ", "_")] = places_with_dist

        except Exception:
            logger.warning("On-demand Apify gap-fill failed", exc_info=True)

    # c. Subjective scoring via OpenRouter
    subjective_results, summary_bullets = await claude_scorer.score_listing(
        listing, preferences, nearby_places=proximity_data or None,
        listing_profile=profile,
    )

    # d. Merge results
    all_results = deterministic_results + subjective_results

    # e. Aggregate
    overall_score, match_tier = compute_weighted_score(all_results)

    # f. Build ScoreResponse v2
    return ScoreResponse(
        overall_score=overall_score,
        match_tier=match_tier,
        summary_bullets=summary_bullets,
        criteria_results=[to_criterion_result(r) for r in all_results],
        schema_version=2,
        enrichment_status="available",
        categories=[],
        checklist=[],
        language=preferences.language,
    )


# ---------------------------------------------------------------------------
# Claude fallback pipeline (old path, gated by ALLOW_CLAUDE_FALLBACK)
# ---------------------------------------------------------------------------


async def _fallback_claude_pipeline(
    request: ScoreRequest, preferences: UserPreferences
) -> ScoreResponse:
    """Run the legacy Claude-based scoring pipeline.

    This is the pre-Phase 31 flow, preserved behind ALLOW_CLAUDE_FALLBACK=true
    for listings without a ListingProfile.
    """
    from app.services.apify import geocode_listing
    from app.services.flatfox import flatfox_client
    from app.services.proximity import fetch_all_proximity_data

    # Fetch listing from Flatfox API
    try:
        listing = await flatfox_client.get_listing(request.listing_id)
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch listing: {e}",
        )

    # Geocode if missing coordinates
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
                    "Geocoding returned no result for listing %d",
                    listing.pk,
                )
        except Exception:
            logger.exception(
                "Geocoding error for listing %d -- continuing without coordinates",
                listing.pk,
            )

    # Fetch proximity data
    nearby_data: dict[str, list[dict]] = {}
    if listing.latitude is not None and listing.longitude is not None:
        try:
            nearby_data = await fetch_all_proximity_data(
                listing.latitude, listing.longitude, preferences
            )
        except Exception:
            logger.exception(
                "Proximity fetch error for listing %d", listing.pk
            )

    # Fetch listing page data (images + web prices)
    page_data = await flatfox_client.get_listing_page_data(listing.slug, listing.pk)
    image_urls = page_data.image_urls

    # Override API prices with web-scraped prices
    wp = page_data.web_prices
    if listing.offer_type.upper() != "SALE":
        if wp.rent_gross is not None and wp.rent_gross != listing.rent_gross:
            listing.rent_gross = wp.rent_gross
            listing.price_display = wp.rent_gross
        if wp.rent_net is not None:
            listing.rent_net = wp.rent_net
        if wp.rent_charges is not None:
            listing.rent_charges = wp.rent_charges

    # Score via OpenRouter (subjective criteria + summary bullets)
    try:
        subjective_results, summary_bullets = await claude_scorer.score_listing(
            listing, preferences, image_urls=image_urls,
            nearby_places=nearby_data or None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Scoring failed: {e}",
        )

    # Run deterministic scoring for dynamic fields
    deterministic_results: list[FulfillmentResult] = []
    builtin = synthesize_builtin_results(preferences, listing)
    deterministic_results.extend(builtin)

    for field in preferences.dynamic_fields:
        ct = field.criterion_type
        result_value: Optional[float] = None

        if ct == CriterionType.PRICE:
            result_value = score_price(field, listing)
        elif ct == CriterionType.DISTANCE:
            actual_km = _resolve_distance_km(field.name, nearby_data)
            result_value = score_distance(field, listing, actual_km)
        elif ct == CriterionType.SIZE:
            result_value = score_size(field, listing)
        elif ct == CriterionType.BINARY_FEATURE:
            result_value = score_binary_feature(field, listing)
        elif ct == CriterionType.PROXIMITY_QUALITY:
            result_value = score_proximity_quality(field, listing, nearby_data)
        elif ct == CriterionType.SUBJECTIVE or ct is None:
            continue
        else:
            continue

        deterministic_results.append(
            FulfillmentResult(
                criterion_name=field.name,
                fulfillment=result_value,
                importance=field.importance,
            )
        )

    # Merge and aggregate
    all_results = deterministic_results + subjective_results
    overall_score, match_tier = compute_weighted_score(all_results)

    return ScoreResponse(
        overall_score=overall_score,
        match_tier=match_tier,
        summary_bullets=summary_bullets,
        criteria_results=[to_criterion_result(r) for r in all_results],
        schema_version=2,
        enrichment_status="fallback",
        categories=[],
        checklist=[],
        language=preferences.language,
    )


# ---------------------------------------------------------------------------
# Save helper
# ---------------------------------------------------------------------------


def _save_analysis_fire_and_forget(
    request: ScoreRequest,
    result: ScoreResponse,
    preferences: UserPreferences,
) -> None:
    """Schedule analysis save as a fire-and-forget background task."""

    async def _save() -> None:
        try:
            score_data = result.model_dump()

            # Add listing metadata for frontend display
            # Extract from the result's criteria or from profile context
            score_data["listing_title"] = None
            score_data["listing_address"] = None
            score_data["listing_rooms"] = None
            score_data["listing_object_type"] = None

            # Try to populate from the ListingProfile if available
            try:
                profile = await asyncio.to_thread(
                    get_listing_profile, request.listing_id
                )
                if profile:
                    score_data["listing_title"] = profile.title
                    score_data["listing_address"] = " ".join(
                        filter(
                            None,
                            [
                                profile.address,
                                str(profile.zipcode) if profile.zipcode else None,
                                profile.city,
                            ],
                        )
                    ) or None
                    score_data["listing_rooms"] = (
                        str(profile.rooms) if profile.rooms is not None else None
                    )
                    score_data["listing_object_type"] = profile.object_type
            except Exception:
                pass  # Metadata is best-effort

            # Add fulfillment_data for migration 007 column
            score_data["fulfillment_data"] = [
                cr.model_dump() if hasattr(cr, "model_dump") else cr
                for cr in (result.criteria_results or [])
            ]

            await asyncio.to_thread(
                supabase_service.save_analysis,
                request.user_id,
                request.profile_id,
                str(request.listing_id),
                score_data,
            )
        except Exception:
            logger.exception(
                "Failed to save analysis for user=%s listing=%s",
                request.user_id,
                request.listing_id,
            )

    asyncio.create_task(_save())


# ---------------------------------------------------------------------------
# Top Matches endpoint
# ---------------------------------------------------------------------------

TOP_MATCHES_COUNT = 5
CACHE_TTL_SECONDS = 3600  # 1 hour


def _load_preferences(user_id: str, profile_id: str) -> Optional[dict]:
    """Load preferences JSONB from Supabase profiles table."""
    client = supabase_service.get_client()
    result = (
        client.table("profiles")
        .select("preferences")
        .eq("id", profile_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if result.data and result.data.get("preferences"):
        return result.data["preferences"]
    return None


def _score_deterministic_only(
    profile, preferences: UserPreferences
) -> tuple[int, str, list[FulfillmentResult]]:
    """Run deterministic-only scoring (no LLM). Returns (score, tier, results)."""
    listing = adapt_profile_to_listing(profile)
    proximity_data = adapt_profile_amenities(profile)

    deterministic_results: list[FulfillmentResult] = []
    builtin = synthesize_builtin_results(preferences, listing)
    deterministic_results.extend(builtin)

    for field in preferences.dynamic_fields:
        ct = field.criterion_type
        result_value: Optional[float] = None

        if ct == CriterionType.PRICE:
            result_value = score_price(field, listing)
        elif ct == CriterionType.DISTANCE:
            actual_km = _resolve_distance_km(field.name, proximity_data)
            result_value = score_distance(field, listing, actual_km)
        elif ct == CriterionType.SIZE:
            result_value = score_size(field, listing)
        elif ct == CriterionType.BINARY_FEATURE:
            result_value = score_binary_feature(field, listing)
        elif ct == CriterionType.PROXIMITY_QUALITY:
            result_value = score_proximity_quality(field, listing, proximity_data)
        elif ct == CriterionType.SUBJECTIVE or ct is None:
            continue
        else:
            continue

        deterministic_results.append(
            FulfillmentResult(
                criterion_name=field.name,
                fulfillment=result_value,
                importance=field.importance,
            )
        )

    overall_score, match_tier = compute_weighted_score(deterministic_results)
    return overall_score, match_tier, deterministic_results


def _get_cached_top_matches(
    user_id: str, profile_id: str
) -> Optional[TopMatchesResponse]:
    """Return cached top matches if fresh (not stale, within TTL)."""
    client = supabase_service.get_client()
    try:
        result = (
            client.table("top_matches_cache")
            .select("*")
            .eq("user_id", user_id)
            .eq("profile_id", profile_id)
            .eq("stale", False)
            .maybe_single()
            .execute()
        )
    except Exception:
        return None
    if not result or not result.data:
        return None

    computed_at = datetime.fromisoformat(result.data["computed_at"])
    age = (datetime.now(timezone.utc) - computed_at).total_seconds()
    if age > CACHE_TTL_SECONDS:
        return None

    return TopMatchesResponse(
        matches=[TopMatchResult.model_validate(m) for m in result.data["matches"]],
        total_scored=result.data["total_scored"],
        computed_at=result.data["computed_at"],
    )


def _save_top_matches_cache(
    user_id: str, profile_id: str, response: TopMatchesResponse
) -> None:
    """Upsert top matches into the cache table."""
    client = supabase_service.get_client()
    client.table("top_matches_cache").upsert(
        {
            "user_id": user_id,
            "profile_id": profile_id,
            "matches": [m.model_dump(mode="json") for m in response.matches],
            "total_scored": response.total_scored,
            "computed_at": response.computed_at,
            "stale": False,
        },
        on_conflict="user_id,profile_id",
    ).execute()


@router.post("/top-matches", response_model=TopMatchesResponse)
async def top_matches(request: TopMatchesRequest) -> TopMatchesResponse:
    """Return top 5 matches from all pre-analyzed listings.

    Phase A: Deterministic-only batch scoring (~200 listings, <1s)
    Phase B: Full hybrid scoring of top 5 (asyncio.gather, ~3-4s)
    """
    # 1. Load preferences
    raw_prefs = await asyncio.to_thread(
        _load_preferences, request.user_id, request.profile_id
    )
    if not raw_prefs:
        raise HTTPException(status_code=404, detail="Profile or preferences not found")

    preferences = UserPreferences.model_validate(raw_prefs)

    # 2. Cache check
    if not request.force_refresh:
        cached = await asyncio.to_thread(
            _get_cached_top_matches, request.user_id, request.profile_id
        )
        if cached:
            logger.info("Returning cached top matches for profile=%s", request.profile_id)
            return cached

    # 3. Fetch all listing profiles and filter by offer_type + object_category
    all_profiles = await asyncio.to_thread(get_all_listing_profiles)

    # Filter: match offer_type (RENT/SALE)
    all_profiles = [
        p for p in all_profiles
        if p.offer_type.upper() == preferences.offer_type.value.upper()
    ]

    # Filter: match object_category (skip parking, storage, commercial)
    # object_category is the reliable field from Flatfox API
    EXCLUDED_CATEGORIES = {"PARK", "INDUSTRY", "SECONDARY"}
    RESIDENTIAL_CATEGORIES = {"APARTMENT", "HOUSE", "SHARED"}
    pref_cat = preferences.object_category.value.upper()
    if pref_cat == "ANY":
        all_profiles = [
            p for p in all_profiles
            if p.object_category.upper() in RESIDENTIAL_CATEGORIES
        ]
    else:
        all_profiles = [
            p for p in all_profiles
            if p.object_category.upper() == pref_cat
        ]

    if not all_profiles:
        return TopMatchesResponse(
            matches=[],
            total_scored=0,
            computed_at=datetime.now(timezone.utc).isoformat(),
        )

    # 4. Phase A: Deterministic batch scoring
    with ThreadPoolExecutor(max_workers=8) as executor:
        scored = list(executor.map(
            lambda p: (p, _score_deterministic_only(p, preferences)),
            all_profiles,
        ))

    # Sort by score descending, take top N
    scored.sort(key=lambda x: x[1][0], reverse=True)
    top_candidates = scored[:TOP_MATCHES_COUNT]

    # 5. Phase B: Full hybrid scoring of top candidates
    # Limit concurrency to 2 to avoid Apify rate-limiting / timeouts when
    # multiple listings need on-demand geocoding + place searches.
    _apify_sem = asyncio.Semaphore(2)

    async def _full_score(profile):
        async with _apify_sem:
            return await _score_with_profile(profile, preferences)

    full_results = await asyncio.gather(
        *[_full_score(candidate[0]) for candidate in top_candidates],
        return_exceptions=True,
    )

    # 6. Build response
    matches: list[TopMatchResult] = []
    for (profile, (det_score, _, _)), full_result in zip(top_candidates, full_results):
        if isinstance(full_result, Exception):
            logger.warning(
                "Full scoring failed for listing=%d, using deterministic: %s",
                profile.listing_id, full_result,
            )
            # Fall back to deterministic-only score
            det_score_val, det_tier, det_results = _score_deterministic_only(profile, preferences)
            score_resp = ScoreResponse(
                overall_score=det_score_val,
                match_tier=det_tier,
                summary_bullets=["Detailed analysis unavailable.", "Score based on objective criteria only.", "Try refreshing later."],
                criteria_results=[to_criterion_result(r) for r in det_results],
                schema_version=2,
                enrichment_status="partial",
                categories=[],
                checklist=[],
                language=preferences.language,
            )
        else:
            score_resp = full_result

        matches.append(TopMatchResult(
            listing_id=profile.listing_id,
            slug=profile.slug,
            title=profile.title,
            address=profile.address,
            city=profile.city,
            rooms=profile.rooms,
            sqm=profile.sqm,
            price=profile.price,
            image_url=profile.image_urls[0] if profile.image_urls else None,
            score_response=score_resp,
        ))

    # Sort matches by final score descending
    matches.sort(key=lambda m: m.score_response.overall_score, reverse=True)

    response = TopMatchesResponse(
        matches=matches,
        total_scored=len(all_profiles),
        computed_at=datetime.now(timezone.utc).isoformat(),
    )

    # 7. Fire-and-forget cache save
    async def _cache_save():
        try:
            await asyncio.to_thread(
                _save_top_matches_cache, request.user_id, request.profile_id, response
            )
        except Exception:
            logger.exception("Failed to save top matches cache")

    asyncio.create_task(_cache_save())

    return response
