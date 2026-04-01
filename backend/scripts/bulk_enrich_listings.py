#!/usr/bin/env python3
"""Bulk-enrich Flatfox apartment listings with local data and AI analysis.

Discovers listings via the Flatfox paginated search API, gathers context
from local databases (OSM POIs, ZVV stops, Zürich open data), calls
Featherless AI for analysis, builds ListingProfile objects, and saves
them to Supabase.

Usage:
    cd backend
    python -m scripts.bulk_enrich_listings --city zürich --max 50 --dry-run
    python -m scripts.bulk_enrich_listings --city zürich --concurrency 5
    python -m scripts.bulk_enrich_listings --city zürich --force
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add backend/ to sys.path so app imports work
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

import httpx

from app.models.listing import FlatfoxListing
from app.models.listing_profile import AmenityCategory, ListingProfile
from app.services.featherless import featherless_service
from app.services.listing_profile_db import get_unanalyzed_listing_ids, save_listing_profile
from app.services.local_amenity_lookup import get_local_amenities
from app.services.zurich_geodata_db import get_rent_benchmark, get_tax_rate, get_zurich_enrichment

logger = logging.getLogger("bulk_enrich")

FLATFOX_API = "https://flatfox.ch/api/v1/public-listing/"


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

async def discover_all_listings(city: str, max_listings: int | None = None) -> list[int]:
    """Paginate through Flatfox search results for a city.

    Args:
        city: City name (e.g. "zürich").
        max_listings: Stop discovery after collecting this many PKs.
            None = fetch all pages.
    """
    url = FLATFOX_API
    params: dict[str, str | int] = {
        "ordering": "-created",
        "offer_type": "RENT",
        "object_category": "APARTMENT",
        "city": city,
        "limit": 50,
    }
    all_pks: list[int] = []
    page = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        while url:
            resp = await client.get(url, params=params, headers={"Accept": "application/json"})
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            for item in results:
                if isinstance(item, dict) and "pk" in item:
                    all_pks.append(item["pk"])
            page += 1
            total = data.get("count", "?")
            logger.info("  Page %d: fetched %d listings (total available: %s)", page, len(results), total)
            # Stop early if we have enough
            if max_listings and len(all_pks) >= max_listings:
                all_pks = all_pks[:max_listings]
                logger.info("  Reached --max %d during discovery, stopping pagination", max_listings)
                break
            url = data.get("next")
            params = {}  # next URL already includes query params
    return all_pks


# ---------------------------------------------------------------------------
# Per-listing enrichment
# ---------------------------------------------------------------------------

async def fetch_listing(pk: int) -> FlatfoxListing:
    """Fetch a single listing from Flatfox API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{FLATFOX_API}{pk}/",
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return FlatfoxListing.model_validate(resp.json())


def format_amenity_summary(amenities: dict[str, AmenityCategory]) -> str:
    """Convert amenity dict to readable text for the LLM prompt."""
    lines: list[str] = []
    for category, data in amenities.items():
        if not data.results:
            continue
        entries = []
        for r in data.results[:3]:
            dist = f"{int(r.distance_km * 1000)}m" if r.distance_km is not None else "?"
            entries.append(f"{r.name} ({dist})")
        label = category.replace("_", " ").title()
        lines.append(f"Nearest {label}: {', '.join(entries)}")
    return "\n".join(lines) if lines else "No amenity data available."


def build_context(
    listing: FlatfoxListing,
    amenity_summary: str,
    zurich_data: dict,
) -> dict:
    """Build the context dict expected by Featherless analyze_listing."""
    return {
        "title": listing.short_title or listing.public_title or listing.description_title or "",
        "address": listing.street or listing.public_address or "",
        "zipcode": listing.zipcode,
        "city": listing.city or "",
        "price": listing.price_display,
        "rent_net": listing.rent_net,
        "rent_charges": listing.rent_charges,
        "rooms": listing.number_of_rooms,
        "sqm": listing.surface_living,
        "floor": listing.floor,
        "year_built": listing.year_built,
        "year_renovated": listing.year_renovated,
        "attributes": [a.name for a in listing.attributes],
        "description": listing.description or "",
        "amenity_summary": amenity_summary,
        "zurich_data": zurich_data,
    }


def build_profile(
    listing: FlatfoxListing,
    amenities: dict[str, AmenityCategory],
    zurich_data: dict,
    analysis: dict,
) -> ListingProfile:
    """Merge all data sources into a ListingProfile."""
    # Sanitize interior_style — LLM may return "unknown" which isn't in the Literal
    VALID_STYLES = {"modern", "classic", "renovated", "dated"}
    raw_style = analysis.get("interior_style")
    interior_style = raw_style if raw_style in VALID_STYLES else None

    # Clamp score values to 0-100 range
    def _clamp_score(val: int | None) -> int | None:
        if val is None:
            return None
        try:
            return max(0, min(100, int(val)))
        except (ValueError, TypeError):
            return None

    # Sanitize price_vs_market
    VALID_PVM = {"below", "at", "above"}
    raw_pvm = analysis.get("price_vs_market")

    # Parse rooms from string
    rooms = None
    if listing.number_of_rooms:
        try:
            rooms = float(listing.number_of_rooms)
        except (ValueError, TypeError):
            pass

    # Image URLs from image IDs
    image_urls = [
        f"https://flatfox.ch/api/v1/public-listing/{listing.pk}/image/{img_id}/"
        for img_id in listing.images
    ]

    # Tax rate from zurich geodata
    canton_tax_rate = None
    tax_data = get_tax_rate(listing.city)
    if tax_data:
        canton_tax_rate = tax_data.get("steuerfuss")

    # Rent benchmark
    avg_rent = None
    rent_bench = get_rent_benchmark(listing.city)
    if rent_bench:
        avg_rent = rent_bench.get("median_chf_sqm")

    # Price vs market — prefer deterministic calculation, fall back to LLM's opinion
    price_vs_market = None
    if avg_rent and listing.surface_living and listing.price_display:
        actual_per_sqm = listing.price_display / listing.surface_living
        if actual_per_sqm < avg_rent * 0.9:
            price_vs_market = "below"
        elif actual_per_sqm > avg_rent * 1.1:
            price_vs_market = "above"
        else:
            price_vs_market = "at"
    elif raw_pvm in VALID_PVM:
        price_vs_market = raw_pvm

    return ListingProfile(
        # Objective data
        listing_id=listing.pk,
        slug=listing.slug,
        title=listing.short_title or listing.public_title or listing.description_title,
        address=listing.street or listing.public_address,
        city=listing.city,
        zipcode=listing.zipcode,
        canton=listing.state,
        latitude=listing.latitude,
        longitude=listing.longitude,
        price=listing.price_display or listing.rent_gross,
        rent_net=listing.rent_net,
        rent_charges=listing.rent_charges,
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
        # AI analysis fields (sanitized)
        neighborhood_character=analysis.get("neighborhood_character"),
        noise_level_estimate=_clamp_score(analysis.get("noise_level_estimate")),
        family_friendly_score=_clamp_score(analysis.get("family_friendly_score")),
        nightlife_proximity_score=_clamp_score(analysis.get("nightlife_proximity_score")),
        green_space_score=_clamp_score(analysis.get("green_space_score")),
        highlights=analysis.get("highlights", []),
        concerns=analysis.get("concerns", []),
        description_summary=analysis.get("description_summary"),
        interior_style=interior_style,
        # Local amenities
        amenities=amenities,
        # Swiss context
        canton_tax_rate=canton_tax_rate,
        avg_rent_for_area=avg_rent,
        price_vs_market=price_vs_market,
        # Metadata
        analyzed_at=datetime.now(timezone.utc),
    )


async def enrich_listing(pk: int, sem: asyncio.Semaphore, dry_run: bool) -> str:
    """Enrich a single listing. Returns status string."""
    async with sem:
        try:
            # Fetch listing from Flatfox
            listing = await fetch_listing(pk)
            title = listing.short_title or listing.public_title or f"pk={pk}"

            if not listing.latitude or not listing.longitude:
                logger.warning("  [%d] %s — skipped (no coordinates)", pk, title)
                return "skipped_no_coords"

            # Get local amenities (sync → thread)
            amenities = await asyncio.to_thread(
                get_local_amenities, listing.latitude, listing.longitude
            )

            # Get Zürich enrichment data (sync → thread)
            zurich_data = await asyncio.to_thread(
                get_zurich_enrichment, listing.latitude, listing.longitude
            )

            amenity_summary = format_amenity_summary(amenities)

            if dry_run:
                logger.info(
                    "  [DRY RUN] %d: %s | %d amenity categories | zurich_data=%s",
                    pk, title, len(amenities), bool(zurich_data),
                )
                return "dry_run"

            # Call Featherless AI
            context = build_context(listing, amenity_summary, zurich_data)
            analysis = await featherless_service.analyze_listing(context)

            # Build and save profile
            profile = build_profile(listing, amenities, zurich_data, analysis)
            await asyncio.to_thread(save_listing_profile, profile)

            logger.info("  [OK] %d: %s", pk, title)
            return "success"

        except Exception as e:
            logger.error("  [FAIL] %d: %s", pk, e)
            return "failed"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bulk-enrich Flatfox listings with local data and AI analysis.",
    )
    parser.add_argument("--city", default="zürich", help="City to search (default: zürich)")
    parser.add_argument("--max", type=int, default=None, help="Max listings to process")
    parser.add_argument("--concurrency", type=int, default=10, help="Parallel workers (default: 10)")
    parser.add_argument("--dry-run", action="store_true", help="Gather data but skip LLM + DB writes")
    parser.add_argument("--force", action="store_true", help="Re-analyze listings that already have profiles")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    t0 = time.monotonic()

    # 1. Discover listings (cap discovery to avoid paginating through 30k+ old listings)
    discover_cap = args.max if args.max else 2000  # default: newest 2000
    logger.info("Discovering listings in %s (max discover: %d)...", args.city, discover_cap)
    all_pks = await discover_all_listings(city=args.city, max_listings=discover_cap)
    logger.info("Discovered %d listings", len(all_pks))

    if not all_pks:
        logger.info("No listings found — exiting.")
        return

    # 2. Filter already-analyzed (unless --force) — chunk to avoid huge .in_() queries
    if not args.force:
        pks: list[int] = []
        chunk_size = 200
        for i in range(0, len(all_pks), chunk_size):
            chunk = all_pks[i : i + chunk_size]
            unanalyzed = await asyncio.to_thread(get_unanalyzed_listing_ids, chunk)
            pks.extend(unanalyzed)
        logger.info("%d of %d listings need analysis", len(pks), len(all_pks))
    else:
        pks = all_pks
        logger.info("Force mode: re-analyzing all %d listings", len(pks))

    # 3. Apply --max cap
    if args.max and len(pks) > args.max:
        pks = pks[: args.max]
        logger.info("Capped to %d listings (--max)", args.max)

    if not pks:
        logger.info("Nothing to process — all listings already analyzed.")
        return

    # 4. Process with concurrency control
    sem = asyncio.Semaphore(args.concurrency)
    logger.info(
        "Processing %d listings (concurrency=%d, dry_run=%s)...",
        len(pks), args.concurrency, args.dry_run,
    )

    results = await asyncio.gather(*[enrich_listing(pk, sem, args.dry_run) for pk in pks])

    # 5. Summary
    elapsed = time.monotonic() - t0
    counts: dict[str, int] = {}
    for r in results:
        counts[r] = counts.get(r, 0) + 1

    logger.info("=" * 60)
    logger.info("DONE in %.1fs", elapsed)
    for status, count in sorted(counts.items()):
        logger.info("  %-20s %d", status, count)
    logger.info("=" * 60)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        sys.exit(0)
