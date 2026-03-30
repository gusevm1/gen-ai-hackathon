"""Save research agent JSON output to the listing_profiles table in Supabase.

Usage:
    cd backend
    python -m scripts.save_research <path_to_json> [<path_to_json2> ...]

Maps the research JSON schema to listing_profiles columns and upserts.
Stores the full research JSON in the `research_json` column for reference.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Load .env before importing app modules
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.models.listing_profile import AmenityCategory, AmenityResult, ListingProfile
from app.services.listing_profile_db import save_listing_profile

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def research_json_to_profile(data: dict) -> ListingProfile:
    """Convert research agent JSON output to a ListingProfile model."""

    ld = data.get("listing_data", {})
    ca = data.get("condition_assessment", {})
    lr = data.get("location_research", {})
    prox = data.get("proximity", {})
    mc = data.get("market_context", {})
    meta = data.get("metadata", {})

    # Build amenities dict from proximity data
    amenities: dict[str, AmenityCategory] = {}
    for category_key, places in prox.items():
        if not isinstance(places, list):
            continue
        results = []
        for p in places:
            if not isinstance(p, dict):
                continue
            # Convert distance_m to distance_km
            distance_m = p.get("distance_m")
            distance_km = None
            if distance_m is not None:
                try:
                    distance_km = round(float(distance_m) / 1000.0, 3)
                except (ValueError, TypeError):
                    pass
            results.append(AmenityResult(
                name=p.get("name", "Unknown"),
                distance_km=distance_km,
                rating=p.get("rating"),
                review_count=p.get("review_count"),
                address=p.get("address"),
                type=p.get("type"),
            ))
        amenities[category_key] = AmenityCategory(results=results)

    # Parse noise score from nested structure
    noise_score = None
    noise_assessment = lr.get("noise_assessment")
    if isinstance(noise_assessment, dict):
        noise_score = noise_assessment.get("score")
    elif isinstance(noise_assessment, (int, float)):
        noise_score = int(noise_assessment)

    # Parse analyzed_at timestamp
    analyzed_at = None
    analyzed_at_str = meta.get("analyzed_at")
    if analyzed_at_str:
        try:
            analyzed_at = datetime.fromisoformat(analyzed_at_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            analyzed_at = datetime.now(timezone.utc)
    else:
        analyzed_at = datetime.now(timezone.utc)

    # Parse rooms
    rooms = ld.get("rooms")
    if rooms is not None:
        try:
            rooms = float(rooms)
        except (ValueError, TypeError):
            rooms = None

    # Build profile
    profile = ListingProfile(
        listing_id=data.get("listing_id", 0),
        slug=data.get("slug", ""),
        title=ld.get("title"),
        address=ld.get("address"),
        city=ld.get("city"),
        zipcode=ld.get("zipcode"),
        canton=ld.get("canton"),
        country="CH",
        price=ld.get("price"),
        rent_net=ld.get("rent_net"),
        rent_charges=ld.get("rent_charges"),
        rooms=rooms,
        sqm=ld.get("sqm"),
        floor=ld.get("floor"),
        year_built=ld.get("year_built"),
        year_renovated=ld.get("year_renovated"),
        offer_type=ld.get("offer_type", "RENT"),
        object_category=ld.get("object_category", "APARTMENT"),
        object_type=ld.get("object_type", "APARTMENT"),
        is_furnished=ld.get("is_furnished", False),
        is_temporary=ld.get("is_temporary", False),
        moving_date=ld.get("moving_date"),
        moving_date_type=ld.get("moving_date_type"),
        attributes=ld.get("attributes", []),
        image_urls=ld.get("image_urls", []),
        description=ld.get("description"),
        # Condition assessment
        condition_score=ca.get("overall_score"),
        natural_light_score=ca.get("natural_light"),
        kitchen_quality_score=ca.get("kitchen_quality"),
        bathroom_quality_score=ca.get("bathroom_quality"),
        interior_style=ca.get("interior_style"),
        maintenance_notes=ca.get("notes", []),
        # Neighborhood
        neighborhood_character=lr.get("neighborhood_character"),
        noise_level_estimate=noise_score,
        # Proximity
        amenities=amenities,
        # Market context
        avg_rent_for_area=mc.get("avg_rent_area"),
        price_vs_market=mc.get("price_vs_market"),
        # Research notes
        highlights=data.get("key_insights", []),
        concerns=data.get("potential_concerns", []),
        description_summary=mc.get("notes"),
        # Metadata
        analyzed_at=analyzed_at,
        profile_version=meta.get("profile_version", 2),
    )

    return profile


def save_research_file(json_path: str) -> None:
    """Load a research JSON file and save it to Supabase."""
    path = Path(json_path)
    if not path.exists():
        logger.error("File not found: %s", json_path)
        return

    with open(path) as f:
        data = json.load(f)

    listing_id = data.get("listing_id")
    if not listing_id:
        logger.error("No listing_id found in %s", json_path)
        return

    logger.info("Processing listing %d from %s", listing_id, path.name)

    # Convert to ListingProfile and save
    profile = research_json_to_profile(data)
    save_listing_profile(profile)

    # Also save the raw research JSON in the research_json column
    from app.services.supabase import supabase_service
    client = supabase_service.get_client()
    client.table("listing_profiles").update(
        {"research_json": data}
    ).eq("listing_id", listing_id).execute()

    logger.info("Saved listing %d to Supabase (with research_json)", listing_id)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.save_research <json_file> [<json_file2> ...]")
        sys.exit(1)

    for json_path in sys.argv[1:]:
        try:
            save_research_file(json_path)
        except Exception as e:
            logger.error("Failed to save %s: %s", json_path, e)


if __name__ == "__main__":
    main()
