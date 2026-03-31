"""Subjective scorer using OpenRouter API for property evaluation.

Uses httpx to call OpenRouter chat completions with configurable model
(SUBJECTIVE_MODEL env var, default: google/gemini-2.5-flash-lite).
Parses JSON responses and validates with Pydantic models.

No Anthropic Claude API calls are made in this module.
The claude_scorer singleton name is kept for backward compatibility
with router imports -- Phase 31 will rename to subjective_scorer.
"""

from __future__ import annotations

import json
import logging
import os
import re

import httpx

from app.models.listing import FlatfoxListing
from app.models.preferences import (
    CriterionType,
    DynamicField,
    ImportanceLevel,
    UserPreferences,
)
from app.models.scoring import BulletsOnlyResponse, SubjectiveResponse
from app.services.deterministic_scorer import FulfillmentResult
from app.prompts.scoring import (
    build_bullets_system_prompt,
    build_system_prompt,
    build_user_prompt,
)

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
SUBJECTIVE_MODEL = os.environ.get("SUBJECTIVE_MODEL", "google/gemini-2.5-flash-lite")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    text = text.strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
    # Strip markdown fences
    stripped = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.MULTILINE)
    stripped = re.sub(r"\n?```\s*$", "", stripped, flags=re.MULTILINE).strip()
    try:
        return json.loads(stripped)
    except (json.JSONDecodeError, ValueError):
        pass
    # Regex extract first JSON object
    match = re.search(r"(\{[\s\S]*\})", text)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            pass
    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


def _to_fulfillment_result(
    r: "SubjectiveCriterionResult",
    field: DynamicField,
) -> FulfillmentResult:
    """Convert a subjective criterion result to a FulfillmentResult for Phase 31 aggregation."""
    from app.models.scoring import SubjectiveCriterionResult  # noqa: F811

    raw_fulfillment = r.fulfillment if r.fulfillment is not None else 0.5
    fulfillment_rounded = round(round(raw_fulfillment * 10) / 10, 1)
    return FulfillmentResult(
        criterion_name=r.criterion,
        fulfillment=fulfillment_rounded,
        importance=field.importance,
        reasoning=r.reasoning,
    )


def _build_subjective_criteria_block(fields: list[DynamicField]) -> str:
    """Format subjective criteria for injection into the user prompt."""
    lines = ["## Subjective Criteria to Evaluate\n"]
    for f in fields:
        value_part = f.value if f.value else "not specified"
        lines.append(f"- {f.name} ({f.importance.value.upper()}): {value_part}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# ClaudeScorer (name kept for backward compatibility)
# ---------------------------------------------------------------------------


class ClaudeScorer:
    """Subjective scorer using OpenRouter API.

    Despite the class name (kept for backward compatibility with router imports),
    this now calls OpenRouter instead of the Anthropic Claude API.
    Phase 31 will rename this to SubjectiveScorer.

    Uses httpx for HTTP calls and Pydantic model_validate() for response parsing.
    """

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create the httpx async client (lazy initialization)."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    def _get_api_key(self) -> str:
        """Read OPENROUTER_API_KEY from environment."""
        key = os.environ.get("OPENROUTER_API_KEY", "")
        if not key:
            logger.error("OPENROUTER_API_KEY is not set in environment")
        return key

    async def _call_openrouter(
        self,
        system_prompt: str,
        user_content: str,
        max_tokens: int = 4096,
    ) -> str:
        """Make a chat completion request to OpenRouter.

        Args:
            system_prompt: The system message content.
            user_content: The user message content (text only -- images not
                          supported via OpenRouter for this use case).
            max_tokens: Maximum tokens in the response.

        Returns:
            The assistant's response text.

        Raises:
            httpx.HTTPStatusError: On non-2xx responses.
        """
        client = self._get_client()
        api_key = self._get_api_key()

        response = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": SUBJECTIVE_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.1,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def score_listing(
        self,
        listing: FlatfoxListing,
        preferences: UserPreferences,
        image_urls: list[str] | None = None,
        nearby_places: dict[str, list[dict]] | None = None,
    ) -> tuple[list[FulfillmentResult], list[str]]:
        """Score subjective criteria and generate summary bullets via OpenRouter.

        Returns (subjective_results, summary_bullets).
        - If subjective criteria exist: single combined call returning both
        - If no subjective criteria: bullets-only call, empty results list

        Note: image_urls are NOT sent to OpenRouter (text-only model).
        Images are still used by the old Claude fallback path (Phase 31 gating).
        """
        # Filter subjective fields (criterion_type=None treated as subjective per Phase 27 design)
        subjective_fields = [
            f
            for f in preferences.dynamic_fields
            if f.criterion_type is None or f.criterion_type == CriterionType.SUBJECTIVE
        ]

        # Build user prompt text (images not sent to OpenRouter)
        user_text = build_user_prompt(listing, preferences, nearby_places=nearby_places)

        if subjective_fields:
            # PATH A: Combined criteria + bullets call
            criteria_block = _build_subjective_criteria_block(subjective_fields)
            full_user_text = f"{user_text}\n\n{criteria_block}"

            raw = await self._call_openrouter(
                system_prompt=build_system_prompt(preferences.language),
                user_content=full_user_text,
                max_tokens=4096,
            )
            parsed_json = _parse_json_response(raw)
            parsed = SubjectiveResponse.model_validate(parsed_json)

            # Build field lookup by name for importance mapping
            field_map = {f.name.lower(): f for f in subjective_fields}
            results = []
            for r in parsed.criteria:
                field = field_map.get(r.criterion.lower())
                if field:
                    results.append(_to_fulfillment_result(r, field))
                else:
                    # Criterion name doesn't match any field -- log and use MEDIUM default
                    logger.warning(
                        "Subjective criterion '%s' not found in field map",
                        r.criterion,
                    )
                    raw_f = r.fulfillment if r.fulfillment is not None else 0.5
                    results.append(
                        FulfillmentResult(
                            criterion_name=r.criterion,
                            fulfillment=round(round(raw_f * 10) / 10, 1),
                            importance=ImportanceLevel.MEDIUM,
                            reasoning=r.reasoning,
                        )
                    )
            return results, list(parsed.summary_bullets)
        else:
            # PATH B: Minimal bullets-only call
            raw = await self._call_openrouter(
                system_prompt=build_bullets_system_prompt(preferences.language),
                user_content=user_text,
                max_tokens=1024,
            )
            parsed_json = _parse_json_response(raw)
            parsed = BulletsOnlyResponse.model_validate(parsed_json)
            return [], list(parsed.summary_bullets)

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# Singleton instance used by routers and lifespan
claude_scorer = ClaudeScorer()
