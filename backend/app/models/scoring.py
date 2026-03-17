"""Pydantic models for the scoring pipeline response.

These models define the structured output format for Claude's property
evaluation. Used with AsyncAnthropic messages.parse() to guarantee
valid responses.

Covers: EVAL-02 (0-100 score + category breakdown), EVAL-03 (reasoning bullets).
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


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


class ScoreResponse(BaseModel):
    """Complete scoring response from Claude.

    Validated via messages.parse() with output_format=ScoreResponse.
    """

    overall_score: int = Field(ge=0, le=100, description="Overall match score")
    match_tier: Literal["excellent", "good", "fair", "poor"] = Field(
        description="Match tier for badge coloring"
    )
    summary_bullets: list[str] = Field(
        min_length=3,
        max_length=5,
        description="3-5 pro/con bullets highlighting compromises",
    )
    categories: list[CategoryScore] = Field(description="Per-category breakdown")
    checklist: list[ChecklistItem] = Field(description="Soft criteria + feature checklist")
    language: str = Field(description="Language code of the response (de, fr, it, en)")


class ScoreRequest(BaseModel):
    """Request body for the scoring endpoint."""

    listing_id: int = Field(description="Flatfox listing primary key")
    user_id: str = Field(description="Supabase user UUID")
    profile_id: str = Field(description="Active profile UUID")
    preferences: dict = Field(description="Profile preferences JSONB")
    force_rescore: bool = Field(default=False, description="If True, bypass cached score and recompute")
