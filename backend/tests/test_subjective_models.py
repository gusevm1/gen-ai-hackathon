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
