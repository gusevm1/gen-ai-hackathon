"""Featherless AI LLM client for listing analysis.

Calls Llama 3.1 70B (or configurable model) via the Featherless AI
OpenAI-compatible API to analyze apartment listings and produce
structured neighborhood/listing insights.

Key design decisions:
- Multi-key round-robin across up to 3 API keys for higher throughput.
- Robust JSON parsing reused from openrouter.py pattern.
- Graceful degradation: returns fallback dict with None values on failure.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
from typing import Any

import httpx

logger = logging.getLogger(__name__)

FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions"
FEATHERLESS_MODEL = os.environ.get(
    "FEATHERLESS_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct"
)


# ── JSON parsing helpers ─────────────────────────────────────────────


def _parse_json_response(text: str) -> dict | list:
    """Parse JSON from LLM response, handling markdown code blocks and malformed JSON."""
    text = text.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # 2. Strip markdown fences
    stripped = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.MULTILINE)
    stripped = re.sub(r"\n?```\s*$", "", stripped, flags=re.MULTILINE).strip()
    try:
        return json.loads(stripped)
    except (json.JSONDecodeError, ValueError):
        pass

    # 3. Regex extract first JSON object or array
    for pattern in [r"(\{[\s\S]*\})", r"(\[[\s\S]*\])"]:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group(1))
            except (json.JSONDecodeError, ValueError):
                continue

    # 4. Fallback
    logger.warning("Could not parse JSON from Featherless response: %s", text[:200])
    return {}


def _fallback_result() -> dict:
    """Return a safe fallback dict when analysis fails."""
    return {
        "neighborhood_character": None,
        "noise_level_estimate": None,
        "family_friendly_score": None,
        "nightlife_proximity_score": None,
        "green_space_score": None,
        "description_summary": None,
        "highlights": [],
        "concerns": [],
        "price_vs_market": None,
        "interior_style": None,
    }


def _format_zurich_data(zurich_data: dict | None) -> str:
    """Format Zürich open-data dict into a human-readable summary."""
    if not zurich_data:
        return "No official Zürich data available."

    lines: list[str] = []

    if zurich_data.get("transit_quality") is not None:
        lines.append(f"- Transit quality score: {zurich_data['transit_quality']}")
    if zurich_data.get("population") is not None:
        lines.append(f"- Area population: {zurich_data['population']}")
    if zurich_data.get("transit_stops") is not None:
        stops = zurich_data["transit_stops"]
        if isinstance(stops, list):
            lines.append(f"- Nearby transit stops: {', '.join(str(s) for s in stops[:10])}")
        else:
            lines.append(f"- Nearby transit stops: {stops}")
    if zurich_data.get("construction") is not None:
        lines.append(f"- Nearby construction activity: {zurich_data['construction']}")
    if zurich_data.get("noise") is not None:
        lines.append(f"- Noise level data: {zurich_data['noise']}")
    if zurich_data.get("air_quality") is not None:
        lines.append(f"- Air quality index: {zurich_data['air_quality']}")

    return "\n".join(lines) if lines else "No official Zürich data available."


def _build_prompt(context: dict) -> str:
    """Build the analysis prompt from listing context."""
    amenity_summary = context.get("amenity_summary") or "No amenity data available."
    zurich_data_summary = _format_zurich_data(context.get("zurich_data"))

    return (
        "You are a Swiss real estate analyst. Analyze this Zürich apartment listing "
        "using the provided data.\n\n"
        "## Listing\n"
        f"Title: {context.get('title', 'N/A')}\n"
        f"Address: {context.get('address', 'N/A')}, "
        f"{context.get('zipcode', '')} {context.get('city', 'Zürich')}\n"
        f"Price: CHF {context.get('price', 'N/A')}/month "
        f"({context.get('rent_net', 'N/A')} net + "
        f"{context.get('rent_charges', 'N/A')} charges)\n"
        f"Rooms: {context.get('rooms', 'N/A')}, "
        f"Size: {context.get('sqm', 'N/A')} sqm, "
        f"Floor: {context.get('floor', 'N/A')}\n"
        f"Year built: {context.get('year_built', 'N/A')}, "
        f"Renovated: {context.get('year_renovated', 'N/A')}\n"
        f"Attributes: {context.get('attributes', 'N/A')}\n"
        f"Description: {context.get('description', 'N/A')}\n\n"
        "## Nearby Amenities (from OpenStreetMap)\n"
        f"{amenity_summary}\n\n"
        "## Official Zürich Data\n"
        f"{zurich_data_summary}\n\n"
        "Respond with ONLY a JSON object:\n"
        "{\n"
        '  "neighborhood_character": "2-3 sentence description of the area",\n'
        '  "noise_level_estimate": <0-100>,\n'
        '  "family_friendly_score": <0-100>,\n'
        '  "nightlife_proximity_score": <0-100>,\n'
        '  "green_space_score": <0-100>,\n'
        '  "description_summary": "2-3 sentence summary of the listing",\n'
        '  "highlights": ["positive point 1", "positive point 2"],\n'
        '  "concerns": ["concern 1", "concern 2"],\n'
        '  "price_vs_market": "below" | "at" | "above",\n'
        '  "interior_style": "modern" | "classic" | "renovated" | "dated" | "unknown"\n'
        "}"
    )


# ── Service class ────────────────────────────────────────────────────


class FeatherlessService:
    """Async client for the Featherless AI chat completions API.

    Supports round-robin across multiple API keys for higher throughput.
    Lazy-initializes an httpx.AsyncClient on first use.
    """

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._api_keys: list[str] = []
        self._key_index = 0
        self._lock = threading.Lock()

    def _load_keys(self) -> list[str]:
        """Load API keys from environment on first use."""
        if not self._api_keys:
            keys: list[str] = []
            for i in range(1, 4):
                key = os.environ.get(f"FEATHERLESS_API_KEY_{i}", "")
                if key:
                    keys.append(key)
            if not keys:
                # Fall back to single key env var
                single = os.environ.get("FEATHERLESS_API_KEY", "")
                if single:
                    keys.append(single)
            self._api_keys = keys
            if not keys:
                logger.error("No FEATHERLESS_API_KEY_* env vars set")
        return self._api_keys

    def _next_key(self) -> str:
        """Get the next API key via thread-safe round-robin."""
        keys = self._load_keys()
        if not keys:
            return ""
        with self._lock:
            key = keys[self._key_index % len(keys)]
            self._key_index += 1
        return key

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create the httpx async client (lazy initialization)."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    async def _call_llm(self, prompt: str) -> str:
        """Make a single chat completion request to Featherless AI."""
        client = self._get_client()
        api_key = self._next_key()

        if not api_key:
            raise RuntimeError("No Featherless API key available")

        response = await client.post(
            FEATHERLESS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": FEATHERLESS_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2048,
            },
        )
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def analyze_listing(self, context: dict) -> dict:
        """Analyze an apartment listing and return structured insights.

        Args:
            context: Dict with keys: title, address, zipcode, city, price,
                rent_net, rent_charges, rooms, sqm, floor, year_built,
                year_renovated, attributes, description, amenity_summary,
                zurich_data.

        Returns:
            Dict with: neighborhood_character, noise_level_estimate,
            family_friendly_score, nightlife_proximity_score,
            green_space_score, description_summary, highlights,
            concerns, price_vs_market, interior_style.
            Returns fallback dict with None values on failure.
        """
        try:
            prompt = _build_prompt(context)
            raw = await self._call_llm(prompt)
            parsed = _parse_json_response(raw)

            if not isinstance(parsed, dict):
                logger.warning("Featherless returned non-dict response")
                return _fallback_result()

            # Merge parsed into fallback to ensure all keys exist
            result = _fallback_result()
            result.update(parsed)
            return result

        except Exception:
            logger.exception("Featherless listing analysis failed")
            return _fallback_result()

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# Singleton instance used by routers and services
featherless_service = FeatherlessService()
