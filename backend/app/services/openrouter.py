"""Featherless AI LLM client for gap-filling.

Calls open-source models (Qwen 3.5) via the Featherless API to
answer scoring questions that the deterministic engine could not resolve
from pre-computed ListingProfile data alone.

Key design decisions:
- Batch all gaps into a single LLM call (fewer requests).
- Fall back to individual calls if batch parsing fails.
- Graceful degradation: if Featherless is unreachable, return gaps as-is.
- Robust JSON parsing handles markdown code fences and malformed output.
- Flat-rate pricing via Featherless subscription (unlimited tokens).
"""

from __future__ import annotations

import json
import logging
import os
import re
from copy import deepcopy
from typing import Any

import httpx

from app.models.scoring import ChecklistItem

logger = logging.getLogger(__name__)

FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions"
FEATHERLESS_MODEL = os.environ.get("FEATHERLESS_MODEL", "Qwen/Qwen3.5-27B")


# ── JSON parsing helpers ─────────────────────────────────────────────


def _parse_json_response(text: str) -> dict | list:
    """Parse JSON from LLM response, handling markdown code blocks and malformed JSON.

    Attempts, in order:
    1. ``json.loads`` on the raw text.
    2. Strip markdown code fences (````json ... ````  or ```` ... ````) and retry.
    3. Regex-extract the first JSON object ``{...}`` or array ``[...]`` and parse.
    4. Return a safe fallback value.

    Returns:
        Parsed dict / list, or a fallback dict on failure.
    """
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

    # 3. Regex extract first JSON array or object
    #    Try array first (batch response), then object (single response).
    for pattern in [r"(\[[\s\S]*\])", r"(\{[\s\S]*\})"]:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group(1))
            except (json.JSONDecodeError, ValueError):
                continue

    # 4. Fallback
    logger.warning("Could not parse JSON from LLM response: %s", text[:200])
    return {"score": 50, "met": None, "note": "Could not evaluate"}


# ── Prompt builders ──────────────────────────────────────────────────


def _build_batch_prompt(
    gaps: list[dict],
    listing_description: str,
    listing_title: str | None = None,
) -> str:
    """Build a single prompt that asks the LLM to evaluate all gaps at once."""

    title_line = f"Title: {listing_title}\n" if listing_title else ""
    criteria_block = "\n".join(
        f'{i + 1}. "{g["field_name"]}": {g["field_value"]}'
        for i, g in enumerate(gaps)
    )

    return (
        f"Given this property listing:\n"
        f"{title_line}"
        f"Description: {listing_description}\n\n"
        f"For EACH of the following criteria, determine whether the listing satisfies it.\n\n"
        f"{criteria_block}\n\n"
        f"Respond with a JSON array (one object per criterion, in the SAME order):\n"
        f'[{{"field_name": "<name>", "score": <0-100>, "met": <true/false/null>, '
        f'"note": "<brief explanation>"}}]\n\n'
        f"Rules:\n"
        f"- score 0-100 reflects how well the listing meets the criterion\n"
        f"- met=true if clearly satisfied, false if clearly not, null if uncertain\n"
        f"- note should be a concise factual explanation (1 sentence)\n"
        f"- Respond ONLY with the JSON array, no other text"
    )


def _build_single_prompt(
    gap: dict,
    listing_description: str,
    listing_title: str | None = None,
) -> str:
    """Build a prompt for a single gap evaluation."""

    title_line = f"Title: {listing_title}\n" if listing_title else ""

    return (
        f"Given this property listing:\n"
        f"{title_line}"
        f"Description: {listing_description}\n\n"
        f'Does this property satisfy: "{gap["field_name"]}: {gap["field_value"]}"?\n\n'
        f"Respond with JSON:\n"
        f'{{"score": <0-100>, "met": <true/false/null>, "note": "<brief explanation>"}}'
    )


# ── Service class ────────────────────────────────────────────────────


class FeatherlessService:
    """Async client for the Featherless AI chat completions API.

    Lazy-initializes an httpx.AsyncClient on first use.
    Designed as a singleton (see module-level ``openrouter_service``).
    """

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create the httpx async client (lazy initialization)."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    def _get_api_key(self) -> str:
        """Read FEATHERLESS_API_KEY from environment."""
        key = os.environ.get("FEATHERLESS_API_KEY", "")
        if not key:
            logger.error("FEATHERLESS_API_KEY is not set in environment")
        return key

    async def _call_llm(self, prompt: str) -> str:
        """Make a single chat completion request to Featherless.

        Args:
            prompt: The user message content.

        Returns:
            The assistant's response text.

        Raises:
            httpx.HTTPStatusError: On non-2xx responses.
        """
        client = self._get_client()
        api_key = self._get_api_key()

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
                "max_tokens": 4096,
            },
        )
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def _fill_single_gap(
        self,
        gap: dict,
        listing_description: str,
        listing_title: str | None = None,
    ) -> dict:
        """Fill a single gap via individual LLM call.

        Returns a result dict with field_name, score, met, note.
        On failure returns a safe fallback.
        """
        try:
            prompt = _build_single_prompt(gap, listing_description, listing_title)
            raw = await self._call_llm(prompt)
            parsed = _parse_json_response(raw)

            if isinstance(parsed, list):
                parsed = parsed[0] if parsed else {}

            return {
                "field_name": gap["field_name"],
                "score": int(parsed.get("score", 50)),
                "met": parsed.get("met"),
                "note": str(parsed.get("note", "Could not evaluate")),
            }
        except Exception:
            logger.exception("Failed to fill single gap: %s", gap["field_name"])
            return {
                "field_name": gap["field_name"],
                "score": 50,
                "met": None,
                "note": "Could not evaluate",
            }

    async def fill_gaps(
        self,
        gaps: list[dict],
        listing_description: str,
        listing_title: str | None = None,
        image_urls: list[str] | None = None,
    ) -> list[dict]:
        """Fill scoring gaps using Featherless AI.

        Batches all gaps into a single LLM call for efficiency.  If the
        batch response cannot be parsed, falls back to individual calls
        for each gap.

        Args:
            gaps: List of gap dicts from ``detect_gaps()``, each with
                  ``field_name``, ``field_value``, ``importance``.
            listing_description: Full listing description text.
            listing_title: Optional listing title for additional context.
            image_urls: Optional image URLs (reserved for future
                        multimodal support).

        Returns:
            List of result dicts, each containing:
            - ``field_name`` (str)
            - ``score``      (int, 0-100)
            - ``met``        (bool | None)
            - ``note``       (str)
        """
        if not gaps:
            return []

        if not listing_description:
            logger.warning("No listing description provided for gap filling")
            return [
                {
                    "field_name": g["field_name"],
                    "score": 50,
                    "met": None,
                    "note": "No listing description available",
                }
                for g in gaps
            ]

        # ── Attempt batch call ───────────────────────────────────────
        try:
            prompt = _build_batch_prompt(gaps, listing_description, listing_title)
            raw = await self._call_llm(prompt)
            parsed = _parse_json_response(raw)

            # Validate batch response structure
            if isinstance(parsed, list) and len(parsed) == len(gaps):
                results: list[dict] = []
                for i, gap in enumerate(gaps):
                    item = parsed[i] if i < len(parsed) else {}
                    results.append(
                        {
                            "field_name": gap["field_name"],
                            "score": int(item.get("score", 50)),
                            "met": item.get("met"),
                            "note": str(item.get("note", "Could not evaluate")),
                        }
                    )
                logger.info("Batch gap-fill succeeded for %d gaps", len(gaps))
                return results
            else:
                logger.warning(
                    "Batch response length mismatch (got %s, expected %d) — "
                    "falling back to individual calls",
                    len(parsed) if isinstance(parsed, list) else "non-list",
                    len(gaps),
                )
        except Exception:
            logger.exception("Batch gap-fill failed — falling back to individual calls")

        # ── Fall back to individual calls ────────────────────────────
        results = []
        for gap in gaps:
            result = await self._fill_single_gap(gap, listing_description, listing_title)
            results.append(result)

        logger.info("Individual gap-fill completed for %d gaps", len(results))
        return results

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# ── Merge helper ─────────────────────────────────────────────────────


def merge_gap_results(
    checklist: list[ChecklistItem],
    gap_results: list[dict],
) -> list[ChecklistItem]:
    """Update checklist items with gap-filled results from the LLM.

    Matches gap results to checklist items by ``field_name`` == ``criterion``.
    Updates ``met`` and ``note`` fields.  Removes the ``[GAP]`` prefix from
    notes so downstream consumers see clean text.

    Args:
        checklist: The original checklist (items are copied, not mutated).
        gap_results: Results from ``fill_gaps()``.

    Returns:
        New list of ChecklistItem with gaps filled where possible.
    """
    result_by_name: dict[str, dict] = {r["field_name"]: r for r in gap_results}

    updated: list[ChecklistItem] = []
    for item in checklist:
        gap_result = result_by_name.get(item.criterion)
        if gap_result is not None:
            # Build updated item with gap-filled values
            new_note = gap_result.get("note", item.note)
            # Remove [GAP] prefix if still present
            if new_note.startswith("[GAP]"):
                new_note = new_note[len("[GAP]"):].strip()

            updated.append(
                ChecklistItem(
                    criterion=item.criterion,
                    met=gap_result.get("met", item.met),
                    note=new_note,
                )
            )
        else:
            # No gap result — strip [GAP] prefix if present, keep as-is otherwise
            if item.note.startswith("[GAP]"):
                clean_note = item.note[len("[GAP]"):].strip()
                updated.append(
                    ChecklistItem(
                        criterion=item.criterion,
                        met=item.met,
                        note=clean_note,
                    )
                )
            else:
                updated.append(item)

    return updated


# Singleton instance used by routers and lifespan
# Name kept as openrouter_service for backward compatibility with imports
openrouter_service = FeatherlessService()
