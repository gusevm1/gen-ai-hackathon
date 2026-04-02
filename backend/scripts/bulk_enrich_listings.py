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
import base64
import json
import logging
import re
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

    Uses explicit offset pagination instead of the API's ``next`` URL,
    which returns duplicates.

    Note: The Flatfox API ignores city/object_category filters and returns
    all listing types.  We filter client-side by ``object_type`` to keep
    only residential listings (APARTMENT, FURNISHED_FLAT, SHARED_FLAT)
    in the target city.

    Args:
        city: City name (e.g. "zürich").
        max_listings: Stop discovery after collecting this many PKs.
            None = fetch all pages.
    """
    page_size = 50
    city_lower = city.lower()
    # Residential object types we want to enrich
    WANTED_TYPES = {"APARTMENT", "FURNISHED_FLAT", "SHARED_FLAT"}
    all_pks: list[int] = []
    seen: set[int] = set()
    offset = 0
    page = 0
    consecutive_empty = 0  # pages with 0 new matches in a row

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            params: dict[str, str | int] = {
                "ordering": "-created",
                "offer_type": "RENT",
                "object_category": "APARTMENT",
                "city": city,
                "limit": page_size,
                "offset": offset,
            }
            resp = await client.get(FLATFOX_API, params=params, headers={"Accept": "application/json"})
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])

            if not results:
                logger.info("  Page %d: empty results — stopping pagination", page + 1)
                break

            new_on_page = 0
            for item in results:
                if not isinstance(item, dict) or "pk" not in item:
                    continue
                # Client-side filter: city + residential object types
                item_city = (item.get("city") or "").lower()
                item_type = (item.get("object_type") or "").upper()
                if item_city != city_lower or item_type not in WANTED_TYPES:
                    continue
                pk = item["pk"]
                if pk not in seen:
                    seen.add(pk)
                    all_pks.append(pk)
                    new_on_page += 1

            page += 1
            total = data.get("count", "?")
            # Log every 10 pages or when there are matches (discovery can take 18+ min)
            if page % 10 == 0 or new_on_page > 0:
                logger.info(
                    "  Page %d: %d new / %d on page (total unique: %d, available: %s)",
                    page, new_on_page, len(results), len(all_pks), total,
                )

            # Track consecutive pages with no matches to avoid infinite pagination
            if new_on_page == 0:
                consecutive_empty += 1
            else:
                consecutive_empty = 0

            if max_listings and len(all_pks) >= max_listings:
                all_pks = all_pks[:max_listings]
                logger.info("  Reached --max %d during discovery, stopping pagination", max_listings)
                break

            # Stop after 50 consecutive pages with no matches — Zürich apartments
            # are only ~5.5% of all listings, so many pages will have 0 matches
            if consecutive_empty >= 50:
                logger.info("  %d consecutive pages with no matches — stopping pagination", consecutive_empty)
                break

            # No more pages
            if not data.get("next"):
                break

            offset += page_size

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


async def fetch_cover_image_data_url(listing: FlatfoxListing) -> str | None:
    """Scrape listing page for cover image thumb URL and convert to base64.

    Flatfox image IDs don't serve images via the API — the actual JPEG files
    live at ``/thumb/`` paths that are only discoverable from the listing HTML.
    Featherless requires base64 data URLs and allows only 1 image per request,
    so we fetch just the cover (first) image.
    """
    url = listing.url or f"/en/{listing.pk}/"
    page_url = f"https://flatfox.ch{url}"

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(page_url)
            resp.raise_for_status()
    except Exception:
        logger.warning("  [%d] Failed to fetch listing page for images", listing.pk)
        return None

    # Extract first medium-sized thumb URL from HTML
    raw_thumbs = re.findall(
        r'/thumb/ff/\S+?\.jpg\?alias=listing_gallery_m[^"\'\s>]+',
        resp.text,
    )
    if not raw_thumbs:
        return None

    thumb_url = "https://flatfox.ch" + raw_thumbs[0].replace("&amp;", "&")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            img_resp = await client.get(thumb_url)
            img_resp.raise_for_status()
            ct = img_resp.headers.get("content-type", "image/jpeg")
            if not ct.startswith("image/"):
                return None
            b64 = base64.b64encode(img_resp.content).decode()
            return f"data:{ct};base64,{b64}"
    except Exception:
        logger.debug("  [%d] Failed to download cover image: %s", listing.pk, thumb_url)
        return None


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
    image_scores: dict | None = None,
) -> ListingProfile:
    """Merge all data sources into a ListingProfile."""
    if image_scores is None:
        image_scores = {}

    # Sanitize interior_style — prefer image analysis (more reliable), fall back to text
    VALID_STYLES = {"modern", "classic", "renovated", "dated"}
    raw_style = image_scores.get("interior_style") or analysis.get("interior_style")
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
        condition_score=_clamp_score(image_scores.get("condition_score")),
        natural_light_score=_clamp_score(image_scores.get("natural_light_score")),
        kitchen_quality_score=_clamp_score(image_scores.get("kitchen_quality_score")),
        bathroom_quality_score=_clamp_score(image_scores.get("bathroom_quality_score")),
        maintenance_notes=image_scores.get("maintenance_notes", []),
        # Local amenities
        amenities=amenities,
        # Swiss context
        canton_tax_rate=canton_tax_rate,
        avg_rent_for_area=avg_rent,
        price_vs_market=price_vs_market,
        # Metadata
        analyzed_at=datetime.now(timezone.utc),
    )


async def enrich_listing(
    pk: int, sem: asyncio.Semaphore, dry_run: bool,
    progress_path: Path | None = None,
) -> str:
    """Enrich a single listing with graceful degradation.

    Each phase (amenities, zurich data, text, vision, save) is wrapped
    independently — a failure in one phase degrades that data source but
    doesn't kill the whole listing.
    """
    async with sem:
        t_start = time.monotonic()
        try:
            # ── Fetch listing ──
            listing = await fetch_listing(pk)
            title = listing.short_title or listing.public_title or f"pk={pk}"
            logger.info("  [%d] fetched: %s", pk, title)

            if not listing.latitude or not listing.longitude:
                logger.warning("  [%d] skipped (no coordinates)", pk)
                return "skipped_no_coords"

            # ── Local amenities (graceful) ──
            amenities: dict = {}
            try:
                amenities = await asyncio.to_thread(
                    get_local_amenities, listing.latitude, listing.longitude
                )
            except Exception as e:
                logger.warning("  [%d] amenities failed (continuing): %s", pk, e)

            # ── Zürich geodata (graceful) ──
            zurich_data: dict = {}
            try:
                zurich_data = await asyncio.to_thread(
                    get_zurich_enrichment, listing.latitude, listing.longitude
                )
            except Exception as e:
                logger.warning("  [%d] zürich data failed (continuing): %s", pk, e)

            amenity_summary = format_amenity_summary(amenities)

            if dry_run:
                logger.info("  [DRY RUN] %d: %s", pk, title)
                return "dry_run"

            # ── Text analysis (required) ──
            context = build_context(listing, amenity_summary, zurich_data)
            analysis = await featherless_service.analyze_listing(context)
            t_text = time.monotonic()
            logger.info("  [%d] text %.1fs — style=%s highlights=%d concerns=%d",
                        pk, t_text - t_start,
                        analysis.get("interior_style"),
                        len(analysis.get("highlights", [])),
                        len(analysis.get("concerns", [])))

            # ── Vision analysis (graceful) ──
            image_scores: dict = {}
            if listing.images:
                try:
                    cover_data_url = await fetch_cover_image_data_url(listing)
                    if cover_data_url:
                        image_scores = await featherless_service.analyze_images(
                            [cover_data_url],
                            listing_context=context.get("title", ""),
                        )
                        t_vision = time.monotonic()
                        logger.info("  [%d] vision %.1fs — condition=%s light=%s style=%s",
                                    pk, t_vision - t_text,
                                    image_scores.get("condition_score"),
                                    image_scores.get("natural_light_score"),
                                    image_scores.get("interior_style"))
                    else:
                        logger.info("  [%d] no cover image found", pk)
                except Exception as e:
                    logger.warning("  [%d] vision failed (continuing text-only): %s", pk, e)
            else:
                logger.info("  [%d] no images on listing", pk)

            # ── Save to Supabase ──
            profile = build_profile(listing, amenities, zurich_data, analysis, image_scores)
            await asyncio.to_thread(save_listing_profile, profile)

            elapsed = time.monotonic() - t_start
            logger.info("  [OK] %d: %s — %.1fs", pk, title, elapsed)

            # Track progress
            if progress_path:
                _append_progress(progress_path, pk)

            return "success"

        except Exception as e:
            elapsed = time.monotonic() - t_start
            logger.error("  [FAIL] %d after %.1fs: %s", pk, elapsed, e)
            return "failed"


def _append_progress(path: Path, pk: int) -> None:
    """Append a completed PK to the progress file (one per line)."""
    with open(path, "a") as f:
        f.write(f"{pk}\n")


def _load_progress(path: Path) -> set[int]:
    """Load completed PKs from progress file."""
    if not path.exists():
        return set()
    pks = set()
    for line in path.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                pks.add(int(line))
            except ValueError:
                pass
    return pks


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
    parser.add_argument("--pks-file", type=str, default=None,
                        help="Path to JSON file with pre-discovered PKs (skip discovery)")
    parser.add_argument("--save-pks", type=str, default=None,
                        help="Save discovered PKs to this JSON file and exit")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    t0 = time.monotonic()

    # 1. Discover listings — or load from file
    if args.pks_file:
        pks_path = Path(args.pks_file)
        all_pks = json.loads(pks_path.read_text())
        logger.info("Loaded %d PKs from %s", len(all_pks), pks_path)
    else:
        discover_cap = args.max  # None if --max not specified → discover all
        logger.info("Discovering listings in %s (max discover: %s)...", args.city, discover_cap or "all")
        all_pks = await discover_all_listings(city=args.city, max_listings=discover_cap)
        logger.info("Discovered %d listings", len(all_pks))

    # Optionally save PKs and exit
    if args.save_pks:
        save_path = Path(args.save_pks)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_path.write_text(json.dumps(all_pks))
        logger.info("Saved %d PKs to %s — exiting", len(all_pks), save_path)
        return

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
        logger.info("%d of %d listings need analysis (DB check)", len(pks), len(all_pks))
    else:
        pks = all_pks
        logger.info("Force mode: re-analyzing all %d listings", len(pks))

    # 3. Filter already-completed in this run's progress file
    progress_path = Path(backend_dir / "scripts" / "output" / "enrich_progress.txt")
    already_done = _load_progress(progress_path)
    if already_done:
        before = len(pks)
        pks = [pk for pk in pks if pk not in already_done]
        logger.info("Skipped %d already-completed from progress file (%d remaining)",
                    before - len(pks), len(pks))

    # 4. Apply --max cap
    if args.max and len(pks) > args.max:
        pks = pks[: args.max]
        logger.info("Capped to %d listings (--max)", args.max)

    if not pks:
        logger.info("Nothing to process — all listings already analyzed.")
        return

    # 5. Process with concurrency control
    sem = asyncio.Semaphore(args.concurrency)
    logger.info(
        "Processing %d listings (concurrency=%d, dry_run=%s)...",
        len(pks), args.concurrency, args.dry_run,
    )

    results = await asyncio.gather(*[
        enrich_listing(pk, sem, args.dry_run, progress_path=progress_path)
        for pk in pks
    ])

    # 6. Summary
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
        level=logging.DEBUG,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # Keep noisy libraries at INFO
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        sys.exit(0)
