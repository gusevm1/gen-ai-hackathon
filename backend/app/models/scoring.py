"""Pydantic models for the scoring pipeline response.

These models define the structured output format for property evaluation.

Legacy models (CategoryScore, ChecklistItem, ScoreResponse, ScoreRequest)
are kept for v1 cache reads.

New subjective models (SubjectiveCriterionResult, SubjectiveResponse,
BulletsOnlyResponse) are used with OpenRouter for per-criterion fulfillment
evaluation. Validated via model_validate_json() after receiving raw JSON
from OpenRouter.

Covers: EVAL-02, EVAL-03 (legacy), SS-01 (SubjectiveResponse).
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CategoryScore(BaseModel):
    """Score for a single evaluation category."""

    name: str = Field(description="Category name: location, price, size, features, or condition")
    score: int = Field(ge=0, le=100, description="0-100 score for this category")
    weight: int = Field(ge=0, le=100, description="User's importance weight for this category")
    reasoning: list[str] = Field(
        min_length=1, max_length=10, description="1-10 bullet points with listing data citations"
    )


class ChecklistItem(BaseModel):
    """Evaluation of a single soft criterion or selected feature."""

    criterion: str = Field(description="The criterion or feature name")
    met: Optional[bool] = Field(description="True if met, False if not, None if unknown")
    note: str = Field(description="Brief explanation with listing data reference")


class CriterionResult(BaseModel):
    """Per-criterion result in the v2 ScoreResponse.

    Maps each user preference criterion to a fulfillment score with
    its importance weight and reasoning. Used by the hybrid scoring
    pipeline (Phase 31) to provide transparent per-criterion breakdown.

    No alias_generator — serializes as snake_case so both the Supabase
    JSONB cache and the API response use criterion_name consistently.
    """

    criterion_name: str
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    importance: str  # "critical", "high", "medium", "low"
    weight: int  # Numeric weight (5, 3, 2, 1)
    reasoning: Optional[str] = None


class ScoreResponse(BaseModel):
    """Complete scoring response (v2).

    v2 additions (Phase 31): schema_version, criteria_results, enrichment_status.
    Field names overall_score/match_tier/summary_bullets preserved for backward
    compatibility (HA-04).

    categories/checklist default to empty lists in v2 (retained for v1 cache reads).
    """

    overall_score: int = Field(ge=0, le=100, description="Overall match score")
    match_tier: Literal["excellent", "good", "fair", "poor"] = Field(
        description="Match tier for badge coloring"
    )
    summary_bullets: list[str] = Field(
        min_length=3,
        max_length=7,
        description="3-7 pro/con bullets highlighting compromises",
    )
    categories: list[CategoryScore] = Field(default_factory=list, description="Per-category breakdown (v1)")
    checklist: list[ChecklistItem] = Field(default_factory=list, description="Soft criteria + feature checklist (v1)")
    language: str = Field(description="Language code of the response (de, fr, it, en)")

    # v2 fields (Phase 31)
    schema_version: int = Field(default=2, description="Response schema version")
    criteria_results: list[CriterionResult] = Field(
        default_factory=list, description="Per-criterion fulfillment breakdown (v2)"
    )
    enrichment_status: Optional[str] = Field(
        None, description="Listing enrichment status: 'available', 'unavailable', or None"
    )


class ScoreRequest(BaseModel):
    """Request body for the scoring endpoint."""

    listing_id: int = Field(description="Flatfox listing primary key")
    user_id: str = Field(description="Supabase user UUID")
    profile_id: str = Field(description="Active profile UUID")
    preferences: dict = Field(description="Profile preferences JSONB")
    force_rescore: bool = Field(default=False, description="If True, bypass cached score and recompute")


# ---------------------------------------------------------------------------
# Subjective scoring models (v2 — OpenRouter per-criterion evaluation)
# ---------------------------------------------------------------------------


class SubjectiveCriterionResult(BaseModel):
    """Result from LLM evaluation of a single subjective criterion."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    criterion: str
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    reasoning: str


class SubjectiveResponse(BaseModel):
    """Structured output from the OpenRouter subjective scoring call.

    Used for Pydantic validation after parsing raw JSON from OpenRouter.
    The JSON schema for this model is embedded in the system prompt
    so the LLM knows what shape to return.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    criteria: list[SubjectiveCriterionResult]
    summary_bullets: list[str] = Field(min_length=3, max_length=5)


class BulletsOnlyResponse(BaseModel):
    """Structured output from the minimal bullets-only call.

    Used when no subjective criteria exist but summary bullets
    are still needed.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    summary_bullets: list[str] = Field(min_length=3, max_length=5)


# ---------------------------------------------------------------------------
# Top Matches models
# ---------------------------------------------------------------------------


class TopMatchesRequest(BaseModel):
    """Request body for the top-matches endpoint."""

    user_id: str = Field(description="Supabase user UUID")
    profile_id: str = Field(description="Active profile UUID")
    force_refresh: bool = Field(default=False, description="If True, bypass cache")


class TopMatchResult(BaseModel):
    """A single top match with listing metadata and full score response."""

    listing_id: int
    slug: str
    title: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    rooms: Optional[float] = None
    sqm: Optional[int] = None
    price: Optional[int] = None
    image_url: Optional[str] = None
    score_response: ScoreResponse


class TopMatchesResponse(BaseModel):
    """Response from the top-matches endpoint."""

    matches: list[TopMatchResult]
    total_scored: int
    computed_at: str
