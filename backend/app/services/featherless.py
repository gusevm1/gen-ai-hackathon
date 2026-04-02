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
FEATHERLESS_VISION_MODEL = os.environ.get(
    "FEATHERLESS_VISION_MODEL", "mlabonne/gemma-3-27b-it-abliterated"
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


def _image_fallback_result() -> dict:
    """Return a safe fallback dict when image analysis fails."""
    return {
        "condition_score": None,
        "natural_light_score": None,
        "kitchen_quality_score": None,
        "bathroom_quality_score": None,
        "interior_style": None,
        "maintenance_notes": [],
    }


IMAGE_ANALYSIS_PROMPT = """Analyze these property listing images. Use the criteria below to assign each score.

CONDITION (condition_score 0-100):
- High (80-100): freshly painted walls, clean surfaces, new flooring, no visible damage
- Medium (50-79): minor wear but well-maintained, no structural concerns
- Low (0-49): cracks, peeling paint, damaged floors, water stains, mold, dirty grout, broken fixtures, patchy repairs

NATURAL LIGHT (natural_light_score 0-100):
- High (80-100): large windows, south/west-facing, bright room exposure in photos
- Medium (40-79): adequate windows, neutral orientation
- Low (0-39): dark rooms, north-facing or small windows, basement feel

KITCHEN QUALITY (kitchen_quality_score 0-100):
- High (80-100): integrated appliances, stone/composite countertops, modern cabinets, backsplash
- Medium (40-79): clean older cabinets, adequate counter space, basic appliances
- Low (0-39): outdated or damaged cabinets, missing handles, worn countertop, no visible appliances

BATHROOM QUALITY (bathroom_quality_score 0-100):
- High (80-100): walk-in shower or modern bathtub, clean tiles, new fixtures, good lighting
- Medium (40-79): functional but dated, clean condition, older fixtures
- Low (0-39): stained grout, chipped tiles, old fixtures, visible mold

INTERIOR STYLE — pick one:
- "modern": clean lines, neutral palette, no visible wallpaper, <10 year feel
- "renovated": older bones but updated kitchen/bath
- "classic": older construction, well-maintained traditional finishes
- "dated": 1980s-90s style, parquet/laminate in poor shape, formica, heavy wallpaper

Respond with JSON only:
{
  "condition_score": <0-100>,
  "natural_light_score": <0-100>,
  "kitchen_quality_score": <0-100>,
  "bathroom_quality_score": <0-100>,
  "interior_style": "modern" | "classic" | "renovated" | "dated",
  "maintenance_notes": ["specific issue observed, e.g. bathroom grout stained"]
}"""


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

    async def _call_llm(self, prompt: str, max_retries: int = 3) -> str:
        """Make a single chat completion request to Featherless AI.

        Uses a fresh httpx client per request to avoid HTTP/2 connection
        sharing issues under high concurrency. Retries on transient errors,
        rotating to a different API key on each retry.
        """
        if not self._load_keys():
            raise RuntimeError("No Featherless API key available")

        last_err: Exception | None = None
        for attempt in range(max_retries):
            api_key = self._next_key()
            try:
                async with httpx.AsyncClient(timeout=120.0, http2=False) as client:
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
            except (httpx.RemoteProtocolError, httpx.LocalProtocolError, httpx.ReadError, ConnectionError) as e:
                last_err = e
                wait = 2 ** attempt
                logger.warning("Featherless attempt %d/%d failed: %s — retrying in %ds", attempt + 1, max_retries, e, wait)
                import asyncio
                await asyncio.sleep(wait)
            except httpx.HTTPStatusError as e:
                if e.response.status_code in (429, 502, 503, 504):
                    last_err = e
                    wait = 2 ** attempt
                    logger.warning("Featherless HTTP %d — retrying in %ds", e.response.status_code, wait)
                    import asyncio
                    await asyncio.sleep(wait)
                else:
                    raise
        raise last_err or RuntimeError("Featherless call failed after retries")

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

    async def _call_vision_llm(
        self, image_urls: list[str], prompt: str, max_retries: int = 3
    ) -> str:
        """Make a vision chat completion request to Featherless AI.

        Sends images as OpenAI-compatible image_url content parts.
        Uses a fresh httpx client per request. Retries on transient errors,
        rotating to a different API key on each retry.
        """
        if not self._load_keys():
            raise RuntimeError("No Featherless API key available")

        # Build multimodal content: images first, then text prompt
        content: list[dict[str, Any]] = [
            {"type": "image_url", "image_url": {"url": url}}
            for url in image_urls
        ]
        content.append({"type": "text", "text": prompt})

        last_err: Exception | None = None
        for attempt in range(max_retries):
            api_key = self._next_key()
            try:
                async with httpx.AsyncClient(timeout=180.0, http2=False) as client:
                    response = await client.post(
                        FEATHERLESS_URL,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": FEATHERLESS_VISION_MODEL,
                            "messages": [{"role": "user", "content": content}],
                            "temperature": 0.1,
                            "max_tokens": 1024,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
            except (
                httpx.RemoteProtocolError,
                httpx.LocalProtocolError,
                httpx.ReadError,
                ConnectionError,
            ) as e:
                last_err = e
                wait = 2**attempt
                logger.warning(
                    "Featherless vision attempt %d/%d failed: %s — retrying in %ds",
                    attempt + 1, max_retries, e, wait,
                )
                import asyncio
                await asyncio.sleep(wait)
            except httpx.HTTPStatusError as e:
                if e.response.status_code in (429, 502, 503, 504):
                    last_err = e
                    wait = 2**attempt
                    logger.warning(
                        "Featherless vision HTTP %d — retrying in %ds",
                        e.response.status_code, wait,
                    )
                    import asyncio
                    await asyncio.sleep(wait)
                else:
                    logger.error(
                        "Featherless vision HTTP %d: %s",
                        e.response.status_code,
                        e.response.text[:300],
                    )
                    raise
        raise last_err or RuntimeError("Featherless vision call failed after retries")

    async def analyze_images(
        self, image_data_urls: list[str], listing_context: str = ""
    ) -> dict:
        """Analyze listing images with vision model.

        Args:
            image_data_urls: Base64 data URLs (``data:image/jpeg;base64,...``).
                Featherless only supports base64, not external URLs.
                First 5 used.
            listing_context: Optional listing title for context.

        Returns:
            Dict with: condition_score, natural_light_score,
            kitchen_quality_score, bathroom_quality_score,
            interior_style, maintenance_notes.
            Returns fallback dict with None values on failure.
        """
        if not image_data_urls:
            return _image_fallback_result()

        try:
            urls = image_data_urls[:5]
            raw = await self._call_vision_llm(urls, IMAGE_ANALYSIS_PROMPT)
            parsed = _parse_json_response(raw)

            if not isinstance(parsed, dict):
                logger.warning("Featherless vision returned non-dict response")
                return _image_fallback_result()

            result = _image_fallback_result()
            result.update(parsed)
            return result

        except Exception:
            logger.exception("Featherless image analysis failed")
            return _image_fallback_result()

    async def close(self) -> None:
        """No-op — clients are per-request now."""
        pass


# Singleton instance used by routers and services
featherless_service = FeatherlessService()
