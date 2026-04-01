"""Subjective scorer using Featherless AI for property evaluation.

Uses httpx to call Featherless chat completions with configurable model
(SUBJECTIVE_MODEL env var, default: Qwen/Qwen3.5-27B).
Parses JSON responses and validates with Pydantic models.

The claude_scorer singleton name is kept for backward compatibility
with router imports.
"""

from __future__ import annotations

import json
import logging
import os
import re

import asyncio

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

FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions"
SUBJECTIVE_MODEL = os.environ.get("SUBJECTIVE_MODEL", "Qwen/Qwen3.5-27B")


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
        """Read FEATHERLESS_API_KEY from environment."""
        key = os.environ.get("FEATHERLESS_API_KEY", "")
        if not key:
            logger.error("FEATHERLESS_API_KEY is not set in environment")
        return key

    def _log_cost_fire_and_forget(
        self,
        usage: dict,
        call_type: str,
        listing_id: int | None = None,
        user_id: str | None = None,
    ) -> None:
        """Log AI cost to Supabase ai_costs table (fire-and-forget)."""

        async def _save() -> None:
            try:
                from app.services.supabase import supabase_service

                row = {
                    "call_type": call_type,
                    "model": SUBJECTIVE_MODEL,
                    "prompt_tokens": usage.get("prompt_tokens"),
                    "completion_tokens": usage.get("completion_tokens"),
                    "total_tokens": usage.get("total_tokens"),
                    "total_cost": usage.get("cost") or usage.get("total_cost"),
                    "listing_id": listing_id,
                    "user_id": user_id,
                    "raw_usage": usage,
                }
                import asyncio as _aio

                await _aio.to_thread(
                    lambda: supabase_service.get_client()
                    .table("ai_costs")
                    .insert(row)
                    .execute()
                )
                logger.info(
                    "AI cost logged: type=%s model=%s tokens=%s cost=$%s",
                    call_type,
                    SUBJECTIVE_MODEL,
                    usage.get("total_tokens"),
                    usage.get("total_cost"),
                )
            except Exception:
                logger.warning("Failed to log AI cost", exc_info=True)

        asyncio.create_task(_save())

    async def _call_openrouter(
        self,
        system_prompt: str,
        user_content: str,
        max_tokens: int = 4096,
        temperature: float = 0.1,
        call_type: str = "unknown",
        listing_id: int | None = None,
        user_id: str | None = None,
    ) -> str:
        """Make a chat completion request to Featherless AI.

        Args:
            system_prompt: The system message content.
            user_content: The user message content.
            max_tokens: Maximum tokens in the response.
            temperature: Sampling temperature.
            call_type: Label for cost logging.
            listing_id: Optional listing ID for cost logging.
            user_id: Optional user ID for cost logging.

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
                "model": SUBJECTIVE_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()

        data = response.json()

        # Log cost if usage data present
        usage = data.get("usage", {})
        if usage:
            self._log_cost_fire_and_forget(
                usage, call_type, listing_id=listing_id, user_id=user_id
            )

        return data["choices"][0]["message"]["content"]

    async def score_listing(
        self,
        listing: FlatfoxListing,
        preferences: UserPreferences,
        image_urls: list[str] | None = None,
        nearby_places: dict[str, list[dict]] | None = None,
        listing_profile=None,
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

        # Build listing_profile_context dict if a ListingProfile was provided
        lp_ctx: dict | None = None
        if listing_profile is not None:
            lp_ctx = {}
            lp = listing_profile
            if lp.condition_score is not None:
                lp_ctx["condition_score"] = lp.condition_score
            if lp.natural_light_score is not None:
                lp_ctx["natural_light_score"] = lp.natural_light_score
            if lp.kitchen_quality_score is not None:
                lp_ctx["kitchen_quality_score"] = lp.kitchen_quality_score
            if lp.bathroom_quality_score is not None:
                lp_ctx["bathroom_quality_score"] = lp.bathroom_quality_score
            if lp.interior_style:
                lp_ctx["interior_style"] = lp.interior_style
            if lp.neighborhood_character:
                lp_ctx["neighborhood_character"] = lp.neighborhood_character
            if lp.noise_level_estimate is not None:
                lp_ctx["noise_level_estimate"] = lp.noise_level_estimate
            if lp.highlights:
                lp_ctx["image_highlights"] = lp.highlights[:5]
            if lp.concerns:
                lp_ctx["image_concerns"] = lp.concerns[:5]
            if lp.description_summary:
                lp_ctx["description_summary"] = lp.description_summary
            if lp.maintenance_notes:
                # Encode the most salient maintenance note as a condition note
                lp_ctx["condition_note"] = lp.maintenance_notes[0]
            if not lp_ctx:
                lp_ctx = None

        # Build user prompt text (images not sent to OpenRouter)
        user_text = build_user_prompt(
            listing, preferences,
            nearby_places=nearby_places,
            listing_profile_context=lp_ctx,
        )

        if subjective_fields:
            # PATH A: Combined criteria + bullets call
            criteria_block = _build_subjective_criteria_block(subjective_fields)
            full_user_text = f"{user_text}\n\n{criteria_block}"

            raw = await self._call_openrouter(
                system_prompt=build_system_prompt(preferences.language),
                user_content=full_user_text,
                max_tokens=4096,
                call_type="subjective_scoring",
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
                call_type="bullets_only",
            )
            parsed_json = _parse_json_response(raw)
            parsed = BulletsOnlyResponse.model_validate(parsed_json)
            return [], list(parsed.summary_bullets)

    async def review_deterministic_scores(
        self,
        deterministic_results: list[FulfillmentResult],
        listing: FlatfoxListing,
        preferences: UserPreferences,
    ) -> list[FulfillmentResult]:
        """LLM review of deterministic scores to add variance and reasoning.

        Sends the deterministic results + listing context to OpenRouter and
        returns adjusted FulfillmentResults. On any failure, returns originals.
        """
        if not deterministic_results:
            return deterministic_results

        try:
            from app.prompts.scoring import LANGUAGE_MAP
            lang_name = LANGUAGE_MAP.get(preferences.language, "German (Deutsch)")
            system_prompt = (
                "You are a Swiss apartment matching expert. You review formula-based "
                "match scores and add human-readable reasoning.\n\n"
                f"LANGUAGE RULES (MANDATORY):\n"
                f"- You MUST write ALL reasoning text EXCLUSIVELY in {lang_name}.\n"
                f"- This overrides everything else. No mixed-language output.\n\n"
                "IMPORTANT: The formula scores are correct and must NOT be changed.\n"
                "- within budget/range → formula returns 1.0 — keep it 1.0\n"
                "- over budget/range → formula applies exponential decay — keep that score\n"
                "Your ONLY job is to add a specific, one-sentence reasoning for each criterion.\n\n"
                "REASONING GUIDELINES:\n"
                "BUDGET: Cite the actual price vs budget (e.g. 'CHF 1950 vs max CHF 2000').\n"
                "ROOMS: State actual vs desired rooms.\n"
                "SIZE: State actual sqm vs desired.\n"
                "BINARY FEATURES: Note whether the feature is present and any nuance from description.\n"
                "DISTANCE/PROXIMITY: Cite the actual distance found.\n\n"
                "RULES:\n"
                "- Copy the formula_score value unchanged into fulfillment\n"
                "- If formula_score is null, set fulfillment to null\n"
                "- Each reasoning is 1 specific sentence about THIS listing\n\n"
                "Return ONLY JSON:\n"
                '{"criteria":[{"criterion_name":"...","fulfillment":0.85,"reasoning":"..."}]}'
            )

            # Build compact listing summary
            title = listing.description_title or listing.short_title or listing.public_title
            address = listing.public_address or listing.street
            listing_parts = []
            if title:
                listing_parts.append(f"Title: {title}")
            if listing.price_display:
                listing_parts.append(f"Price: CHF {listing.price_display}/month")
            if listing.rent_net and listing.rent_charges:
                listing_parts.append(
                    f"  (net: {listing.rent_net}, charges: {listing.rent_charges})"
                )
            if listing.number_of_rooms:
                listing_parts.append(f"Rooms: {listing.number_of_rooms}")
            if listing.surface_living:
                listing_parts.append(f"Living area: {listing.surface_living}m²")
            if address:
                listing_parts.append(f"Address: {address}")
            if listing.city:
                listing_parts.append(f"City: {listing.city}")
            if listing.floor is not None:
                listing_parts.append(f"Floor: {listing.floor}")
            if listing.year_built:
                listing_parts.append(f"Built: {listing.year_built}")
            if listing.year_renovated:
                listing_parts.append(f"Renovated: {listing.year_renovated}")
            if listing.object_type:
                listing_parts.append(f"Type: {listing.object_type}")
            listing_summary = "\n".join(listing_parts)

            if listing.attributes:
                attr_names = [a.name for a in listing.attributes[:25]]
                listing_summary += f"\nFeatures: {', '.join(attr_names)}"
            if listing.description:
                listing_summary += f"\nDescription: {listing.description[:600]}"

            # Build deterministic results JSON with raw values for context
            det_entries = []
            for r in deterministic_results:
                entry: dict = {
                    "criterion_name": r.criterion_name,
                    "formula_score": r.fulfillment,
                    "importance": r.importance.value if r.importance else "medium",
                }
                det_entries.append(entry)
            det_json = json.dumps(det_entries, indent=2)

            # Build preferences summary with actual values
            pref_parts = []
            if preferences.budget_max:
                pref_parts.append(f"Budget max: CHF {preferences.budget_max}/month")
            if preferences.budget_min:
                pref_parts.append(f"Budget min: CHF {preferences.budget_min}/month")
            if preferences.rooms_min:
                pref_parts.append(f"Rooms min: {preferences.rooms_min}")
            if preferences.rooms_max:
                pref_parts.append(f"Rooms max: {preferences.rooms_max}")
            if preferences.living_space_min:
                pref_parts.append(f"Min living space: {preferences.living_space_min}m²")
            if preferences.living_space_max:
                pref_parts.append(f"Max living space: {preferences.living_space_max}m²")
            dealbreakers = []
            if preferences.budget_dealbreaker:
                dealbreakers.append("budget")
            if preferences.rooms_dealbreaker:
                dealbreakers.append("rooms")
            if preferences.living_space_dealbreaker:
                dealbreakers.append("living_space")
            if dealbreakers:
                pref_parts.append(f"HARD dealbreakers: {', '.join(dealbreakers)}")
            for df in preferences.dynamic_fields:
                if df.value:
                    pref_parts.append(
                        f"  {df.name}: {df.value} ({df.importance.value})"
                    )
            pref_summary = "\n".join(pref_parts) if pref_parts else "No specific preferences"

            user_content = (
                f"## Listing\n{listing_summary}\n\n"
                f"## Formula Scores (to review)\n{det_json}\n\n"
                f"## User Preferences\n{pref_summary}\n\n"
                "Rescore each criterion using the guidelines. Use the full 0.0-1.0 range."
            )

            raw = await self._call_openrouter(
                system_prompt=system_prompt,
                user_content=user_content,
                max_tokens=1024,
                temperature=0.3,
                call_type="deterministic_review",
            )

            parsed = _parse_json_response(raw)
            reviewed = parsed.get("criteria", [])

            # Build lookup from LLM response
            review_map: dict[str, dict] = {}
            for item in reviewed:
                name = item.get("criterion_name", "")
                if name:
                    review_map[name.lower()] = item

            # Map back to FulfillmentResults, preserving originals on mismatch
            updated: list[FulfillmentResult] = []
            for orig in deterministic_results:
                match = review_map.get(orig.criterion_name.lower())
                if match and match.get("fulfillment") is not None:
                    new_f = max(0.0, min(1.0, float(match["fulfillment"])))
                    updated.append(
                        FulfillmentResult(
                            criterion_name=orig.criterion_name,
                            fulfillment=round(new_f, 2),
                            importance=orig.importance,
                            reasoning=match.get("reasoning"),
                        )
                    )
                else:
                    updated.append(orig)

            return updated

        except Exception:
            logger.warning(
                "LLM review of deterministic scores failed, returning originals",
                exc_info=True,
            )
            return deterministic_results

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# Singleton instance used by routers and lifespan
claude_scorer = ClaudeScorer()
