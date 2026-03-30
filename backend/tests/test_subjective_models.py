"""Unit tests for subjective scoring Pydantic models and prompt functions.

Covers: SS-01 (SubjectiveResponse model), SS-03 (system prompt rewrite).
"""

import pytest
from pydantic import ValidationError


class TestSubjectiveModels:
    """Tests for SubjectiveCriterionResult, SubjectiveResponse, and BulletsOnlyResponse models."""

    # --- SubjectiveCriterionResult ---

    def test_valid_criterion_result(self):
        """SubjectiveCriterionResult with valid data validates successfully."""
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.5, reasoning="ok"
        )
        assert result.criterion == "test"
        assert result.fulfillment == 0.5
        assert result.reasoning == "ok"

    def test_criterion_result_rejects_fulfillment_above_1(self):
        """SubjectiveCriterionResult rejects fulfillment > 1.0."""
        from app.models.scoring import SubjectiveCriterionResult

        with pytest.raises(ValidationError):
            SubjectiveCriterionResult(
                criterion="test", fulfillment=1.5, reasoning="ok"
            )

    def test_criterion_result_rejects_fulfillment_below_0(self):
        """SubjectiveCriterionResult rejects fulfillment < 0.0."""
        from app.models.scoring import SubjectiveCriterionResult

        with pytest.raises(ValidationError):
            SubjectiveCriterionResult(
                criterion="test", fulfillment=-0.1, reasoning="ok"
            )

    def test_criterion_result_accepts_boundary_0(self):
        """SubjectiveCriterionResult accepts fulfillment=0.0."""
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.0, reasoning="not met"
        )
        assert result.fulfillment == 0.0

    def test_criterion_result_accepts_boundary_1(self):
        """SubjectiveCriterionResult accepts fulfillment=1.0."""
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=1.0, reasoning="fully met"
        )
        assert result.fulfillment == 1.0

    # --- SubjectiveResponse ---

    def test_valid_subjective_response_3_bullets(self):
        """SubjectiveResponse with valid criteria and 3 bullets validates."""
        from app.models.scoring import SubjectiveCriterionResult, SubjectiveResponse

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.5, reasoning="ok"
        )
        resp = SubjectiveResponse(
            criteria=[result], summary_bullets=["a", "b", "c"]
        )
        assert len(resp.criteria) == 1
        assert len(resp.summary_bullets) == 3

    def test_valid_subjective_response_5_bullets_0_criteria(self):
        """SubjectiveResponse with 0 criteria and 5 bullets validates."""
        from app.models.scoring import SubjectiveResponse

        resp = SubjectiveResponse(
            criteria=[], summary_bullets=["a", "b", "c", "d", "e"]
        )
        assert len(resp.criteria) == 0
        assert len(resp.summary_bullets) == 5

    def test_subjective_response_rejects_2_bullets(self):
        """SubjectiveResponse with 2 bullets raises ValidationError."""
        from app.models.scoring import SubjectiveResponse

        with pytest.raises(ValidationError):
            SubjectiveResponse(criteria=[], summary_bullets=["a", "b"])

    def test_subjective_response_rejects_6_bullets(self):
        """SubjectiveResponse with 6 bullets raises ValidationError."""
        from app.models.scoring import SubjectiveResponse

        with pytest.raises(ValidationError):
            SubjectiveResponse(
                criteria=[], summary_bullets=["a", "b", "c", "d", "e", "f"]
            )

    # --- BulletsOnlyResponse ---

    def test_valid_bullets_only_response(self):
        """BulletsOnlyResponse with 3 bullets validates."""
        from app.models.scoring import BulletsOnlyResponse

        resp = BulletsOnlyResponse(summary_bullets=["a", "b", "c"])
        assert len(resp.summary_bullets) == 3

    def test_bullets_only_rejects_2_bullets(self):
        """BulletsOnlyResponse with 2 bullets raises ValidationError."""
        from app.models.scoring import BulletsOnlyResponse

        with pytest.raises(ValidationError):
            BulletsOnlyResponse(summary_bullets=["a", "b"])

    def test_bullets_only_rejects_6_bullets(self):
        """BulletsOnlyResponse with 6 bullets raises ValidationError."""
        from app.models.scoring import BulletsOnlyResponse

        with pytest.raises(ValidationError):
            BulletsOnlyResponse(summary_bullets=["a", "b", "c", "d", "e", "f"])

    # --- CamelCase alias support ---

    def test_criterion_result_camel_case_alias(self):
        """SubjectiveCriterionResult supports camelCase aliases."""
        from app.models.scoring import SubjectiveCriterionResult

        # model_validate with camelCase keys
        result = SubjectiveCriterionResult.model_validate(
            {"criterion": "test", "fulfillment": 0.7, "reasoning": "good"}
        )
        assert result.criterion == "test"

    def test_subjective_response_camel_case_alias(self):
        """SubjectiveResponse supports camelCase alias for summaryBullets."""
        from app.models.scoring import SubjectiveResponse

        resp = SubjectiveResponse.model_validate(
            {
                "criteria": [],
                "summaryBullets": ["a", "b", "c"],
            }
        )
        assert resp.summary_bullets == ["a", "b", "c"]

    def test_bullets_only_response_camel_case_alias(self):
        """BulletsOnlyResponse supports camelCase alias for summaryBullets."""
        from app.models.scoring import BulletsOnlyResponse

        resp = BulletsOnlyResponse.model_validate(
            {"summaryBullets": ["a", "b", "c"]}
        )
        assert resp.summary_bullets == ["a", "b", "c"]


class TestPrompts:
    """Tests for build_system_prompt and build_bullets_system_prompt functions."""

    # --- build_system_prompt: preserved rules ---

    def test_system_prompt_contains_sale_rule(self):
        """build_system_prompt contains sale/rent price evaluation rule."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        prompt_lower = prompt.lower()
        assert "sale" in prompt_lower and "purchase price" in prompt_lower

    def test_system_prompt_contains_rent_rule(self):
        """build_system_prompt contains rent rule."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        prompt_lower = prompt.lower()
        assert "rent" in prompt_lower and "monthly rent" in prompt_lower

    def test_system_prompt_contains_language_rule(self):
        """build_system_prompt contains language rule with German."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "German (Deutsch)" in prompt or "preferred language" in prompt

    def test_system_prompt_contains_image_analysis(self):
        """build_system_prompt contains image analysis guidance."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        prompt_lower = prompt.lower()
        assert (
            "interior condition" in prompt_lower
            or "natural light" in prompt_lower
            or "photos" in prompt_lower
        )

    def test_system_prompt_contains_proximity_rule(self):
        """build_system_prompt contains proximity evaluation rule."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "Nearby Places Data (Verified)" in prompt

    # --- build_system_prompt: removed content ---

    def test_system_prompt_no_overall_score(self):
        """build_system_prompt does NOT contain overall_score."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        prompt_lower = prompt.lower()
        assert "overall_score" not in prompt_lower
        assert "overall score" not in prompt_lower

    def test_system_prompt_no_category_score(self):
        """build_system_prompt does NOT instruct category scoring."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        prompt_lower = prompt.lower()
        # Should not have "category" followed closely by "score" in scoring context
        assert "category score" not in prompt_lower
        assert "category-level score" not in prompt_lower

    # --- build_system_prompt: new subjective instructions ---

    def test_system_prompt_contains_fulfillment(self):
        """build_system_prompt instructs per-criterion fulfillment."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "fulfillment" in prompt.lower()

    def test_system_prompt_contains_scale(self):
        """build_system_prompt contains 0.0 and 1.0 fulfillment scale."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "0.0" in prompt
        assert "1.0" in prompt

    def test_system_prompt_contains_json_instruction(self):
        """build_system_prompt contains explicit JSON output format instruction."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "JSON" in prompt

    def test_system_prompt_contains_summary_bullets_field(self):
        """build_system_prompt contains summary_bullets field name in JSON schema."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "summary_bullets" in prompt

    # --- build_bullets_system_prompt ---

    def test_bullets_prompt_contains_language_rule(self):
        """build_bullets_system_prompt contains language rule."""
        from app.prompts.scoring import build_bullets_system_prompt

        prompt = build_bullets_system_prompt("de")
        assert "German (Deutsch)" in prompt

    def test_bullets_prompt_no_fulfillment(self):
        """build_bullets_system_prompt does NOT contain fulfillment or criteria."""
        from app.prompts.scoring import build_bullets_system_prompt

        prompt = build_bullets_system_prompt("de")
        prompt_lower = prompt.lower()
        assert "fulfillment" not in prompt_lower
        assert "criteria" not in prompt_lower

    def test_bullets_prompt_contains_bullet_instructions(self):
        """build_bullets_system_prompt contains bullet generation instructions."""
        from app.prompts.scoring import build_bullets_system_prompt

        prompt = build_bullets_system_prompt("de")
        prompt_lower = prompt.lower()
        assert "bullet" in prompt_lower or "summary" in prompt_lower

    def test_bullets_prompt_contains_json_instruction(self):
        """build_bullets_system_prompt contains explicit JSON output format instruction."""
        from app.prompts.scoring import build_bullets_system_prompt

        prompt = build_bullets_system_prompt("de")
        assert "JSON" in prompt

    # --- build_user_prompt closing instruction ---

    def test_user_prompt_no_5_categories(self):
        """build_user_prompt closing instruction no longer mentions 5 categories."""
        from app.models.listing import FlatfoxListing
        from app.models.preferences import UserPreferences
        from app.prompts.scoring import build_user_prompt

        listing = FlatfoxListing(
            pk=1,
            slug="test",
            url="/en/flat/test/1/",
            short_url="https://flatfox.ch/en/flat/1/",
            status="act",
            offer_type="RENT",
            object_category="APARTMENT",
            object_type="APARTMENT",
        )
        prefs = UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            features=[],
            importance={
                "location": "medium",
                "price": "medium",
                "size": "medium",
                "features": "medium",
                "condition": "medium",
            },
        )
        prompt = build_user_prompt(listing, prefs)
        assert "Score each of the 5 categories" not in prompt
