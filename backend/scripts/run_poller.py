#!/usr/bin/env python3
"""Run the Flatfox listing poller and analyzer.

Polls the Flatfox search API for new listings, filters out those that
have already been analyzed, and runs the full analysis pipeline on each
new listing. Can run as a one-shot or continuous loop.

Usage:
    python -m scripts.run_poller [--once] [--cities zürich,bern] [--interval 3600]

Options:
    --once          Run a single poll cycle and exit
    --cities        Comma-separated list of cities to poll (default: major Swiss cities)
    --offer-types   Comma-separated offer types: RENT,SALE (default: RENT)
    --interval      Seconds between poll cycles (default: 3600)
    --max-per-run   Maximum listings to analyze per cycle (default: 20)
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so imports work when running
# as `python -m scripts.run_poller` from the backend/ directory
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

# Load environment variables before importing app modules
load_dotenv(backend_dir / ".env")

from app.services.flatfox_poller import discover_new_listings
from app.services.listing_analyzer import analyze_listing
from app.services.listing_profile_db import get_unanalyzed_listing_ids

logger = logging.getLogger("poller")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Poll Flatfox for new listings and analyze them.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single poll cycle and exit",
    )
    parser.add_argument(
        "--cities",
        type=str,
        default=None,
        help="Comma-separated list of cities to poll (default: major Swiss cities)",
    )
    parser.add_argument(
        "--offer-types",
        type=str,
        default="RENT",
        help="Comma-separated offer types: RENT,SALE (default: RENT)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=3600,
        help="Seconds between poll cycles (default: 3600)",
    )
    parser.add_argument(
        "--max-per-run",
        type=int,
        default=20,
        help="Maximum listings to analyze per cycle (default: 20)",
    )
    return parser.parse_args()


async def run_cycle(
    cities: list[str] | None,
    offer_types: list[str],
    max_per_run: int,
) -> int:
    """Run a single poll-and-analyze cycle.

    Args:
        cities: List of cities to poll, or None for defaults.
        offer_types: List of offer types to poll.
        max_per_run: Maximum number of listings to analyze this cycle.

    Returns:
        Number of listings successfully analyzed.
    """
    # 1. Discover new listing IDs from Flatfox search
    logger.info("Polling Flatfox for new listings...")
    all_ids = await discover_new_listings(cities=cities, offer_types=offer_types)
    logger.info("Discovered %d listing IDs", len(all_ids))

    if not all_ids:
        return 0

    # 2. Filter out already-analyzed listings
    try:
        new_ids = await asyncio.to_thread(get_unanalyzed_listing_ids, all_ids)
    except Exception:
        logger.exception("Failed to check DB for existing profiles, analyzing all")
        new_ids = all_ids

    logger.info(
        "%d of %d listings are new (not yet analyzed)",
        len(new_ids),
        len(all_ids),
    )

    if not new_ids:
        return 0

    # 3. Limit to max_per_run to control API costs
    if len(new_ids) > max_per_run:
        logger.info(
            "Capping analysis to %d listings (of %d new)",
            max_per_run,
            len(new_ids),
        )
        new_ids = new_ids[:max_per_run]

    # 4. Analyze each new listing (handle errors per-listing)
    analyzed = 0
    for i, listing_id in enumerate(new_ids, 1):
        logger.info(
            "Analyzing listing %d/%d (pk=%d)...",
            i,
            len(new_ids),
            listing_id,
        )
        try:
            await analyze_listing(listing_id)
            analyzed += 1
        except Exception:
            logger.exception(
                "Failed to analyze listing %d — skipping", listing_id
            )

    logger.info(
        "Cycle complete: %d/%d listings analyzed successfully",
        analyzed,
        len(new_ids),
    )
    return analyzed


async def main() -> None:
    """Main entry point for the poller."""
    args = parse_args()

    # Parse cities and offer types from comma-separated strings
    cities = args.cities.split(",") if args.cities else None
    offer_types = [t.strip().upper() for t in args.offer_types.split(",")]

    if args.once:
        # Single cycle mode
        count = await run_cycle(cities, offer_types, args.max_per_run)
        logger.info("Single run complete: %d listings analyzed", count)
        return

    # Continuous polling loop
    logger.info(
        "Starting continuous poller (interval=%ds, max_per_run=%d)",
        args.interval,
        args.max_per_run,
    )
    while True:
        try:
            count = await run_cycle(cities, offer_types, args.max_per_run)
            logger.info(
                "Cycle done (%d analyzed). Sleeping %ds...",
                count,
                args.interval,
            )
        except Exception:
            logger.exception("Unexpected error in poll cycle")

        await asyncio.sleep(args.interval)


if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Poller stopped by user (KeyboardInterrupt)")
        sys.exit(0)
