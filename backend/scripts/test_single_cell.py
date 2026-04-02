#!/usr/bin/env python3
"""
Single-cell test: Overpass API + Featherless AI neighborhood analysis.
Tests the end-to-end flow on Zürich center (47.3769, 8.5472), 3km radius.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import httpx
from openai import OpenAI

# --- Config ---
LAT, LON = 47.3769, 8.5472
RADIUS = 3000  # meters
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"
PRIMARY_MODEL = "Qwen/Qwen3.5-397B-A17B"
FALLBACK_MODEL = "Qwen/Qwen3.5-27B"
OUTPUT_DIR = Path(__file__).parent / "output"


# --- Category normalization ---
TAG_TO_CATEGORY = {
    ("shop", "supermarket"): "supermarket",
    ("shop", "convenience"): "supermarket",
    ("shop", "bakery"): "bakery",
    ("public_transport", "stop_position"): "public_transport",
    ("railway", "station"): "public_transport",
    ("railway", "halt"): "public_transport",
    ("railway", "tram_stop"): "public_transport",
    ("highway", "bus_stop"): "public_transport",
    ("amenity", "school"): "school",
    ("amenity", "kindergarten"): "kindergarten",
    ("leisure", "fitness_centre"): "gym",
    ("amenity", "restaurant"): "restaurant",
    ("amenity", "cafe"): "cafe",
    ("leisure", "park"): "park",
    ("leisure", "garden"): "park",
    ("landuse", "forest"): "park",
    ("amenity", "hospital"): "hospital",
    ("amenity", "pharmacy"): "pharmacy",
    ("amenity", "bar"): "nightlife",
    ("amenity", "nightclub"): "nightlife",
    ("amenity", "pub"): "nightlife",
    ("leisure", "swimming_pool"): "swimming_pool",
    ("amenity", "post_office"): "post_office",
    ("amenity", "bank"): "bank",
    ("amenity", "library"): "library",
}

TAG_KEYS_TO_CHECK = {k for k, _ in TAG_TO_CATEGORY}


OVERPASS_BATCHES = [
    # Batch 1: shops + transport
    [
        'node["shop"="supermarket"]',
        'way["shop"="supermarket"]',
        'node["shop"="convenience"]',
        'node["shop"="bakery"]',
        'node["public_transport"="stop_position"]',
        'node["railway"="station"]',
        'node["railway"="halt"]',
        'node["highway"="bus_stop"]',
        'node["railway"="tram_stop"]',
    ],
    # Batch 2: education + food + leisure
    [
        'node["amenity"="school"]',
        'way["amenity"="school"]',
        'node["amenity"="kindergarten"]',
        'way["amenity"="kindergarten"]',
        'node["leisure"="fitness_centre"]',
        'way["leisure"="fitness_centre"]',
        'node["amenity"="restaurant"]',
        'node["amenity"="cafe"]',
        'node["leisure"="park"]',
        'way["leisure"="park"]',
        'way["landuse"="forest"]',
    ],
    # Batch 3: health + nightlife + services
    [
        'node["amenity"="hospital"]',
        'way["amenity"="hospital"]',
        'node["amenity"="pharmacy"]',
        'node["amenity"="bar"]',
        'node["amenity"="nightclub"]',
        'node["amenity"="pub"]',
        'node["leisure"="swimming_pool"]',
        'way["leisure"="swimming_pool"]',
        'node["amenity"="post_office"]',
        'node["amenity"="bank"]',
        'node["amenity"="library"]',
    ],
]


def build_overpass_query(clauses: list[str], lat: float, lon: float, radius: int) -> str:
    body = "\n".join(f'  {c}(around:{radius},{lat},{lon});' for c in clauses)
    return f"[out:json][timeout:90];\n(\n{body}\n);\nout center tags;"


def classify_element(tags: dict) -> str | None:
    """Map OSM tags to our category."""
    for key in TAG_KEYS_TO_CHECK:
        val = tags.get(key)
        if val and (key, val) in TAG_TO_CATEGORY:
            return TAG_TO_CATEGORY[(key, val)]
    return None


def query_overpass(lat: float, lon: float, radius: int) -> dict:
    """Query Overpass API in batches and return categorized POI data."""
    print(f"Querying Overpass API ({lat}, {lon}, {radius}m) in {len(OVERPASS_BATCHES)} batches...")
    t0 = time.time()
    all_elements = []

    for i, batch in enumerate(OVERPASS_BATCHES, 1):
        query = build_overpass_query(batch, lat, lon, radius)
        for attempt in range(3):
            bt0 = time.time()
            try:
                resp = httpx.post(OVERPASS_URL, data={"data": query}, timeout=120)
                resp.raise_for_status()
                elements = resp.json().get("elements", [])
                print(f"  Batch {i}/{len(OVERPASS_BATCHES)}: {len(elements)} elements in {time.time() - bt0:.1f}s")
                all_elements.extend(elements)
                break
            except httpx.HTTPStatusError as e:
                wait = 10 * (attempt + 1)
                print(f"  Batch {i} attempt {attempt + 1} failed ({e.response.status_code}), retrying in {wait}s...")
                time.sleep(wait)
        else:
            raise RuntimeError(f"Batch {i} failed after 3 attempts")
        if i < len(OVERPASS_BATCHES):
            time.sleep(2)  # small delay between batches

    elapsed = time.time() - t0
    print(f"  Total: {len(all_elements)} elements in {elapsed:.1f}s")

    # Categorize
    categories: dict[str, list[str]] = {}
    for el in all_elements:
        tags = el.get("tags", {})
        cat = classify_element(tags)
        if cat:
            name = tags.get("name", "unnamed")
            categories.setdefault(cat, []).append(name)

    return {
        "overpass_time_s": round(elapsed, 2),
        "total_elements": len(all_elements),
        "categories": {k: sorted(set(v)) for k, v in categories.items()},
        "category_counts": {k: len(v) for k, v in categories.items()},
    }


def build_llm_prompt(poi_data: dict) -> str:
    """Build the neighborhood analysis prompt from POI data."""
    counts = poi_data["category_counts"]
    categories = poi_data["categories"]

    lines = ["POI data within 3km of cell center (Zürich):\n"]
    for cat in sorted(counts, key=counts.get, reverse=True):
        top_names = categories[cat][:10]
        names_str = ", ".join(top_names)
        lines.append(f"- {cat}: {counts[cat]} ({names_str})")

    poi_summary = "\n".join(lines)

    return f"""{poi_summary}

Based on this POI data, analyze this neighborhood. Return ONLY valid JSON (no markdown fences):
{{
  "neighborhood_character": "urban center | quiet residential | family suburb | ...",
  "noise_level_estimate": 0-100,
  "family_friendly_score": 0-100,
  "nightlife_proximity_score": 0-100,
  "green_space_score": 0-100,
  "summary": "2-3 sentence description",
  "highlights": ["..."],
  "concerns": ["..."]
}}"""


def extract_json_from_response(text: str) -> dict | None:
    """Extract JSON from response, handling think tags."""
    # Strip think tags if present
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON block from markdown fences
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return None


def analyze_with_featherless(poi_data: dict) -> dict:
    """Send POI data to Featherless AI for neighborhood analysis."""
    api_key = os.environ.get("FEATHERLESS_API_KEY") or os.environ.get("FEATHERLESS_API_KEY_1")
    if not api_key:
        print("ERROR: Set FEATHERLESS_API_KEY or FEATHERLESS_API_KEY_1 env var")
        sys.exit(1)

    client = OpenAI(
        base_url=FEATHERLESS_BASE_URL,
        api_key=api_key,
        timeout=httpx.Timeout(300, connect=30),
    )
    prompt = build_llm_prompt(poi_data)

    for model in [PRIMARY_MODEL, FALLBACK_MODEL]:
        print(f"Calling Featherless AI ({model})...")
        t0 = time.time()
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a neighborhood analysis expert. Analyze POI data and return structured JSON."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=2000,
                extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            elapsed = time.time() - t0
            msg = resp.choices[0].message
            raw_text = msg.content or ""
            reasoning = (msg.model_extra or {}).get("reasoning", "")
            usage = resp.usage
            print(f"  Featherless responded in {elapsed:.1f}s (model: {model})")
            if usage:
                print(f"  Tokens: {usage.prompt_tokens} prompt + {usage.completion_tokens} completion")

            parsed = extract_json_from_response(raw_text)
            return {
                "model": model,
                "featherless_time_s": round(elapsed, 2),
                "raw_response": raw_text,
                "reasoning": reasoning,
                "parsed_analysis": parsed,
            }
        except Exception as e:
            print(f"  {model} failed: {type(e).__name__}: {e}")
            if model == FALLBACK_MODEL:
                return {"model": model, "error": str(e)}
            print("  Trying fallback model...")

    return {"error": "All models failed"}


def main():
    print("=" * 60)
    print(f"Single-cell test: Zürich center ({LAT}, {LON}), {RADIUS}m")
    print("=" * 60)

    # Step 1: Overpass
    poi_data = query_overpass(LAT, LON, RADIUS)

    print(f"\nPOI counts by category:")
    for cat, count in sorted(poi_data["category_counts"].items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    print(f"  TOTAL: {sum(poi_data['category_counts'].values())}")

    # Step 2: Featherless AI
    ai_result = analyze_with_featherless(poi_data)

    if ai_result.get("parsed_analysis"):
        print(f"\nAI Analysis (parsed):")
        print(json.dumps(ai_result["parsed_analysis"], indent=2))
    elif ai_result.get("raw_response"):
        print(f"\nAI Raw Response (could not parse JSON):")
        print(ai_result["raw_response"][:2000])
    else:
        print(f"\nAI Error: {ai_result.get('error')}")

    # Step 3: Save results
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "test_cell_zurich_center.json"
    result = {
        "cell": {"lat": LAT, "lon": LON, "radius_m": RADIUS},
        "poi": poi_data,
        "ai": ai_result,
    }
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\nResults saved to {output_path}")

    # Summary
    print(f"\n{'=' * 60}")
    print(f"Overpass: {poi_data['overpass_time_s']}s, {poi_data['total_elements']} elements")
    if ai_result.get("featherless_time_s"):
        print(f"Featherless: {ai_result['featherless_time_s']}s ({ai_result['model']})")
    print(f"Total categories: {len(poi_data['category_counts'])}")


if __name__ == "__main__":
    main()
