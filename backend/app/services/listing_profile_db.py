"""Supabase CRUD operations for the listing_profiles table.

Provides synchronous functions for listing profile persistence.
In async FastAPI endpoints, wrap calls with asyncio.to_thread()
to avoid blocking the event loop.

Follows the same patterns as app.services.supabase.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app.models.listing_profile import AmenityCategory, ListingProfile
from app.services.supabase import supabase_service

logger = logging.getLogger(__name__)


def get_listing_profile(listing_id: int) -> ListingProfile | None:
    """Fetch a listing profile by listing_id. Returns None if not found."""
    client = supabase_service.get_client()
    result = (
        client.table("listing_profiles")
        .select("*")
        .eq("listing_id", listing_id)
        .maybeSingle()
        .execute()
    )
    if result.data:
        return ListingProfile.model_validate(result.data)
    return None


def save_listing_profile(profile: ListingProfile) -> None:
    """Upsert a listing profile (on_conflict=listing_id).

    Converts the Pydantic model to a dict via model_dump(), handles
    the amenities field specially (nested Pydantic models -> dicts),
    and upserts on listing_id.
    """
    client = supabase_service.get_client()
    data = profile.model_dump(mode="json")

    # Convert amenities: dict[str, AmenityCategory] -> dict[str, dict]
    # model_dump(mode="json") should handle this, but ensure nested
    # Pydantic models are fully serialized
    if "amenities" in data and isinstance(data["amenities"], dict):
        serialized_amenities = {}
        for key, value in data["amenities"].items():
            if isinstance(value, AmenityCategory):
                serialized_amenities[key] = value.model_dump(mode="json")
            else:
                serialized_amenities[key] = value
        data["amenities"] = serialized_amenities

    client.table("listing_profiles").upsert(
        data,
        on_conflict="listing_id",
    ).execute()

    logger.info("Saved listing profile for listing_id=%d", profile.listing_id)


def get_unanalyzed_listing_ids(known_ids: list[int]) -> list[int]:
    """Given a list of listing IDs, return those that don't have profiles yet.

    Queries the listing_profiles table for all IDs in the input list,
    then returns the difference.
    """
    if not known_ids:
        return []

    client = supabase_service.get_client()

    # Supabase .in_() can handle reasonably sized lists; for very large
    # batches this would need chunking, but polling batches are small (<200)
    result = (
        client.table("listing_profiles")
        .select("listing_id")
        .in_("listing_id", known_ids)
        .execute()
    )

    existing_ids = {row["listing_id"] for row in (result.data or [])}
    return [lid for lid in known_ids if lid not in existing_ids]


def get_stale_profiles(max_age_days: int = 7) -> list[int]:
    """Return listing_ids of profiles older than max_age_days.

    Uses the analyzed_at timestamp to determine staleness.
    Profiles without an analyzed_at value are considered stale.
    """
    client = supabase_service.get_client()
    threshold = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()

    result = (
        client.table("listing_profiles")
        .select("listing_id")
        .lt("analyzed_at", threshold)
        .execute()
    )

    stale_ids = [row["listing_id"] for row in (result.data or [])]

    # Also fetch profiles with null analyzed_at (never fully analyzed)
    null_result = (
        client.table("listing_profiles")
        .select("listing_id")
        .is_("analyzed_at", "null")
        .execute()
    )

    stale_ids.extend(row["listing_id"] for row in (null_result.data or []))

    return stale_ids
