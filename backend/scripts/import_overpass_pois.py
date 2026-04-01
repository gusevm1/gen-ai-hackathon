#!/usr/bin/env python3
"""
Bulk import OSM POIs for Canton Zürich into Supabase neighborhood_pois table.

One-time import: queries Overpass API for broad tag keys (amenity, shop, leisure, etc.)
across the full canton bbox, then upserts into Supabase. Idempotent via unique(osm_id, osm_type).

Usage:
    cd backend
    python -m scripts.import_overpass_pois [--dry-run]
"""

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

# Add backend to path for app imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Canton Zürich bounding box
BBOX = "47.15,8.35,47.70,8.99"

# Tag keys we care about, and how to determine category_group + category.
# Each query grabs a broad tag key; category = the tag value, category_group = the tag key.
OVERPASS_BATCHES = [
    {
        "name": "amenity",
        "queries": [
            f'node["amenity"]({BBOX});',
            f'way["amenity"]({BBOX});',
        ],
        "tag_keys": ["amenity"],
    },
    {
        "name": "shop",
        "queries": [
            f'node["shop"]({BBOX});',
            f'way["shop"]({BBOX});',
        ],
        "tag_keys": ["shop"],
    },
    {
        "name": "leisure",
        "queries": [
            f'node["leisure"]({BBOX});',
            f'way["leisure"]({BBOX});',
        ],
        "tag_keys": ["leisure"],
    },
    {
        "name": "tourism + healthcare",
        "queries": [
            f'node["tourism"]({BBOX});',
            f'way["tourism"]({BBOX});',
            f'node["healthcare"]({BBOX});',
            f'way["healthcare"]({BBOX});',
        ],
        "tag_keys": ["tourism", "healthcare"],
    },
    {
        "name": "transport + railway",
        "queries": [
            f'node["public_transport"]({BBOX});',
            f'node["railway"]({BBOX});',
            f'way["railway"]({BBOX});',
            f'node["highway"="bus_stop"]({BBOX});',
            f'node["highway"="street_lamp"]({BBOX});',
            f'way["highway"~"^(motorway|trunk|primary|secondary)$"]({BBOX});',
        ],
        "tag_keys": ["public_transport", "railway", "highway"],
    },
    {
        "name": "landuse",
        "queries": [
            f'way["landuse"]({BBOX});',
        ],
        "tag_keys": ["landuse"],
    },
    {
        "name": "natural + waterway",
        "queries": [
            f'way["natural"]({BBOX});',
            f'node["natural"]({BBOX});',
            f'way["waterway"]({BBOX});',
        ],
        "tag_keys": ["natural", "waterway"],
    },
]

# Priority order for determining category_group when an element has multiple tag keys
TAG_KEY_PRIORITY = [
    "amenity", "shop", "leisure", "tourism", "healthcare",
    "public_transport", "railway", "highway",
    "landuse", "natural", "waterway",
]


def build_overpass_query(queries: list[str]) -> str:
    body = "\n".join(f"  {q}" for q in queries)
    return f"[out:json][timeout:300];\n(\n{body}\n);\nout center tags;"


def extract_category(tags: dict, tag_keys: list[str]) -> tuple[str, str] | None:
    """Determine (category_group, category) from element tags.

    Uses tag_keys from the batch, but falls back to TAG_KEY_PRIORITY
    for elements that match multiple keys.
    """
    # Check batch-specific keys first
    for key in tag_keys:
        val = tags.get(key)
        if val and val != "yes":
            return key, val

    # Fallback: check all known keys
    for key in TAG_KEY_PRIORITY:
        val = tags.get(key)
        if val and val != "yes":
            return key, val

    return None


def get_coords(element: dict) -> tuple[float, float] | None:
    """Extract lat/lon from a node or way (with center)."""
    if element.get("type") == "node":
        lat = element.get("lat")
        lon = element.get("lon")
        if lat is not None and lon is not None:
            return lat, lon
    elif element.get("type") == "way":
        center = element.get("center")
        if center:
            return center.get("lat"), center.get("lon")
    return None


def query_overpass_batch(batch: dict, attempt_limit: int = 5) -> list[dict]:
    """Query Overpass for one batch with retry logic."""
    query = build_overpass_query(batch["queries"])
    tag_keys = batch["tag_keys"]

    for attempt in range(attempt_limit):
        t0 = time.time()
        try:
            resp = httpx.post(OVERPASS_URL, data={"data": query}, timeout=600)
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            elapsed = time.time() - t0
            print(f"  {batch['name']}: {len(elements)} elements in {elapsed:.1f}s")

            # Parse into POI dicts
            pois = []
            seen = set()
            for el in elements:
                tags = el.get("tags", {})
                cat_result = extract_category(tags, tag_keys)
                if not cat_result:
                    continue

                coords = get_coords(el)
                if not coords:
                    continue

                osm_id = el["id"]
                osm_type = el["type"]
                key = (osm_id, osm_type)
                if key in seen:
                    continue
                seen.add(key)

                category_group, category = cat_result
                pois.append({
                    "osm_id": osm_id,
                    "osm_type": osm_type,
                    "name": tags.get("name"),
                    "category": category,
                    "category_group": category_group,
                    "lat": coords[0],
                    "lon": coords[1],
                    "tags": tags,
                })
            return pois

        except (httpx.HTTPStatusError, httpx.ReadTimeout) as e:
            wait = 30 * (attempt + 1)
            print(f"  {batch['name']} attempt {attempt + 1} failed: {e}")
            if attempt < attempt_limit - 1:
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise RuntimeError(f"Batch '{batch['name']}' failed after {attempt_limit} attempts") from e

    return []


def main():
    parser = argparse.ArgumentParser(description="Import OSM POIs for Canton Zürich")
    parser.add_argument("--dry-run", action="store_true", help="Query Overpass but don't write to DB")
    parser.add_argument("--skip-batches", type=int, default=0, help="Skip first N batches (for resuming)")
    args = parser.parse_args()

    print("=" * 60)
    print("Bulk OSM POI Import — Canton Zürich")
    print(f"Bbox: {BBOX}")
    print(f"Batches: {len(OVERPASS_BATCHES)}")
    print("=" * 60)

    all_pois = []
    seen_global = set()
    batches = OVERPASS_BATCHES[args.skip_batches:]

    for i, batch in enumerate(batches, args.skip_batches + 1):
        print(f"\nBatch {i}/{len(OVERPASS_BATCHES)}: {batch['name']}")
        pois = query_overpass_batch(batch)

        # Deduplicate across batches
        new_pois = []
        for p in pois:
            key = (p["osm_id"], p["osm_type"])
            if key not in seen_global:
                seen_global.add(key)
                new_pois.append(p)

        all_pois.extend(new_pois)
        print(f"  → {len(new_pois)} new unique POIs (total so far: {len(all_pois)})")

        # Delay between batches to be polite to Overpass
        if i < len(OVERPASS_BATCHES):
            time.sleep(10)

    # Summary by category_group
    group_counts: dict[str, int] = {}
    for p in all_pois:
        g = p["category_group"]
        group_counts[g] = group_counts.get(g, 0) + 1

    print(f"\n{'=' * 60}")
    print(f"Total unique POIs: {len(all_pois)}")
    print("By category_group:")
    for g, c in sorted(group_counts.items(), key=lambda x: -x[1]):
        print(f"  {g}: {c}")

    if args.dry_run:
        print("\n[DRY RUN] Skipping database insert.")
        # Save to file for inspection
        out_path = Path(__file__).parent / "output" / "overpass_pois_preview.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        # Save just counts + sample
        preview = {
            "total": len(all_pois),
            "by_group": group_counts,
            "sample": all_pois[:20],
        }
        out_path.write_text(json.dumps(preview, indent=2, ensure_ascii=False))
        print(f"Preview saved to {out_path}")
        return

    # Import to Supabase
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")

    from app.services.neighborhood_db import bulk_insert_pois

    print(f"\nInserting {len(all_pois)} POIs into Supabase...")
    t0 = time.time()
    bulk_insert_pois(all_pois)
    elapsed = time.time() - t0
    print(f"Done in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
