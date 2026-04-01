#!/usr/bin/env python3
"""
Enrich grid cells with LLM-generated neighborhood analyses.

For each hex grid cell, queries local POIs from Supabase, builds a summary,
calls Featherless AI (Qwen3.5-397B), and saves the structured result.

Usage:
    cd backend
    python -m scripts.enrich_grid_cells [--concurrency 4] [--force] [--cell-ids 1,2,3]
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

import httpx
from openai import OpenAI

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

GRID_PATH = Path(__file__).parent / "output" / "zurich_hex_grid.json"
FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"
PRIMARY_MODEL = "Qwen/Qwen3.5-397B-A17B"
FALLBACK_MODEL = "Qwen/Qwen3.5-27B"


def load_grid() -> list[dict]:
    data = json.loads(GRID_PATH.read_text())
    return data["pins"]


def extract_json_from_response(text: str) -> dict | None:
    """Extract JSON from LLM response, handling think tags and fences."""
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return None


def build_llm_prompt(poi_counts: dict[str, int], lat: float, lon: float, radius_m: int) -> str:
    lines = [f"POI data within {radius_m}m of ({lat:.4f}, {lon:.4f}) in Canton Zürich:\n"]
    for cat in sorted(poi_counts, key=poi_counts.get, reverse=True):
        lines.append(f"- {cat}: {poi_counts[cat]}")

    total = sum(poi_counts.values())
    lines.append(f"\nTotal POIs: {total}")

    return "\n".join(lines) + """

Based on this POI data, analyze this neighborhood. Return ONLY valid JSON (no markdown fences):
{
  "neighborhood_character": "urban center | quiet residential | family suburb | rural village | ...",
  "noise_level_estimate": 0-100,
  "family_friendly_score": 0-100,
  "nightlife_proximity_score": 0-100,
  "green_space_score": 0-100,
  "transit_score": 0-100,
  "dining_score": 0-100,
  "summary": "2-3 sentence description",
  "highlights": ["up to 5 items"],
  "concerns": ["up to 5 items"]
}"""


def analyze_cell_with_llm(poi_counts: dict[str, int], lat: float, lon: float, radius_m: int) -> dict:
    """Call Featherless AI to analyze a cell."""
    api_key = os.environ.get("FEATHERLESS_API_KEY") or os.environ.get("FEATHERLESS_API_KEY_1")
    if not api_key:
        print("ERROR: Set FEATHERLESS_API_KEY env var")
        sys.exit(1)

    client = OpenAI(
        base_url=FEATHERLESS_BASE_URL,
        api_key=api_key,
        timeout=httpx.Timeout(300, connect=30),
    )
    prompt = build_llm_prompt(poi_counts, lat, lon, radius_m)

    for model in [PRIMARY_MODEL, FALLBACK_MODEL]:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a neighborhood analysis expert for Swiss cities. Analyze POI data and return structured JSON."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=2000,
                extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            raw = resp.choices[0].message.content or ""
            parsed = extract_json_from_response(raw)
            if parsed:
                return {"model": model, "parsed": parsed}
            else:
                print(f"    WARNING: Could not parse JSON from {model}")
                if model == FALLBACK_MODEL:
                    return {"model": model, "error": "unparseable", "raw": raw[:500]}
        except Exception as e:
            print(f"    {model} failed: {type(e).__name__}: {e}")
            if model == FALLBACK_MODEL:
                return {"model": model, "error": str(e)}

    return {"error": "All models failed"}


def process_cell(cell: dict, force: bool = False) -> dict | None:
    """Process a single grid cell: query POIs, call LLM, save analysis."""
    from app.services.neighborhood_db import count_pois_by_category, save_analysis
    from app.models.neighborhood import NeighborhoodAnalysis

    cell_id = cell["id"]
    lat, lon = cell["lat"], cell["lon"]
    radius_m = 500  # grid radius

    # Check if already analyzed (unless --force)
    if not force:
        from app.services.supabase import supabase_service
        client = supabase_service.get_client()
        existing = (
            client.table("neighborhood_analyses")
            .select("cell_id")
            .eq("cell_id", cell_id)
            .maybe_single()
            .execute()
        )
        if existing.data:
            return None  # already done

    # Count POIs
    poi_counts = count_pois_by_category(lat, lon, radius_m)
    total = sum(poi_counts.values())

    if total == 0:
        # Save empty analysis — no POIs in this cell
        analysis = NeighborhoodAnalysis(
            cell_id=cell_id,
            lat=lat,
            lon=lon,
            radius_m=radius_m,
            poi_counts=poi_counts,
            total_pois=0,
            neighborhood_character="rural / no data",
            summary="No POIs found within radius. Likely rural or undeveloped area.",
        )
        save_analysis(analysis)
        return {"cell_id": cell_id, "total_pois": 0, "skipped": "no POIs"}

    # Call LLM
    result = analyze_cell_with_llm(poi_counts, lat, lon, radius_m)

    if result.get("error"):
        print(f"  Cell {cell_id}: LLM error — {result['error']}")
        return {"cell_id": cell_id, "error": result["error"]}

    parsed = result["parsed"]
    analysis = NeighborhoodAnalysis(
        cell_id=cell_id,
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        poi_counts=poi_counts,
        total_pois=total,
        neighborhood_character=parsed.get("neighborhood_character"),
        noise_level_estimate=parsed.get("noise_level_estimate"),
        family_friendly_score=parsed.get("family_friendly_score"),
        nightlife_proximity_score=parsed.get("nightlife_proximity_score"),
        green_space_score=parsed.get("green_space_score"),
        transit_score=parsed.get("transit_score"),
        dining_score=parsed.get("dining_score"),
        summary=parsed.get("summary"),
        highlights=parsed.get("highlights", []),
        concerns=parsed.get("concerns", []),
        model_used=result["model"],
    )
    save_analysis(analysis)
    return {"cell_id": cell_id, "total_pois": total, "model": result["model"]}


async def process_cell_async(cell: dict, sem: asyncio.Semaphore, force: bool) -> dict | None:
    """Async wrapper around process_cell with semaphore."""
    async with sem:
        return await asyncio.to_thread(process_cell, cell, force)


async def run(cells: list[dict], concurrency: int, force: bool):
    sem = asyncio.Semaphore(concurrency)
    tasks = [process_cell_async(cell, sem, force) for cell in cells]

    done = 0
    skipped = 0
    errors = 0
    t0 = time.time()

    for coro in asyncio.as_completed(tasks):
        result = await coro
        if result is None:
            skipped += 1
        elif result.get("error"):
            errors += 1
        else:
            done += 1

        total_processed = done + skipped + errors
        if total_processed % 50 == 0:
            elapsed = time.time() - t0
            rate = total_processed / elapsed if elapsed > 0 else 0
            print(f"  Progress: {total_processed}/{len(cells)} ({done} done, {skipped} skipped, {errors} errors) — {rate:.1f} cells/s")

    elapsed = time.time() - t0
    print(f"\nComplete: {done} analyzed, {skipped} skipped, {errors} errors in {elapsed:.1f}s")


def main():
    parser = argparse.ArgumentParser(description="Enrich grid cells with LLM analysis")
    parser.add_argument("--concurrency", type=int, default=4, help="Max concurrent LLM calls")
    parser.add_argument("--force", action="store_true", help="Re-analyze already analyzed cells")
    parser.add_argument("--cell-ids", type=str, help="Comma-separated cell IDs to process (default: all)")
    args = parser.parse_args()

    # Load env
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")

    grid = load_grid()
    print(f"Loaded grid: {len(grid)} cells")

    if args.cell_ids:
        ids = set(int(x) for x in args.cell_ids.split(","))
        grid = [c for c in grid if c["id"] in ids]
        print(f"Filtered to {len(grid)} cells: {sorted(ids)}")

    print(f"Concurrency: {args.concurrency}, Force: {args.force}")
    print("=" * 60)

    asyncio.run(run(grid, args.concurrency, args.force))


if __name__ == "__main__":
    main()
