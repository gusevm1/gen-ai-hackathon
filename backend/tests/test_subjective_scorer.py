"""Tests for the two-path subjective scoring logic in claude.py.

Tests the OpenRouter-based ClaudeScorer that replaces the Anthropic SDK.
Uses mocked httpx POST responses to avoid real API calls.
"""

from __future__ import annotations

import ast
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.listing import FlatfoxListing
from app.models.preferences import (
    CriterionType,
    DynamicField,
    ImportanceLevel,
    UserPreferences,
)
from app.models.scoring import BulletsOnlyResponse, SubjectiveResponse
from app.services.deterministic_scorer import FulfillmentResult


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_LISTING = FlatfoxListing(
    pk=1788170,
    slug="platanenweg-7-4914-roggwil-be",
    url="/en/flat/platanenweg-7-4914-roggwil-be/1788170/",
    short_url="https://flatfox.ch/en/flat/1788170/",
    status="act",
    offer_type="RENT",
    object_category="APARTMENT",
    object_type="APARTMENT",
    rent_gross=1790,
    price_display=1790,
    description_title="Hier sind Sie auf der Sonnenseite",
    description="Lieben Sie Ruhe und Erholung?",
    surface_living=29,
    number_of_rooms="1.0",
    floor=1,
    street="Platanenweg 7",
    zipcode=4914,
    city="Roggwil BE",
    public_address="Platanenweg 7, 4914 Roggwil BE",
    latitude=47.245,
    longitude=7.818,
    state="BE",
)


def _make_prefs_with_subjective() -> UserPreferences:
    """Create preferences with 2 subjective DynamicFields."""
    return UserPreferences(
        location="Zurich",
        offer_type="RENT",
        budget_max=2500,
        language="de",
        dynamic_fields=[
            DynamicField(
                name="quiet neighborhood",
                value="no main road",
                importance=ImportanceLevel.HIGH,
                criterion_type=CriterionType.SUBJECTIVE,
            ),
            DynamicField(
                name="natural light",
                value="lots of windows",
                importance=ImportanceLevel.MEDIUM,
                criterion_type=CriterionType.SUBJECTIVE,
            ),
        ],
    )


def _make_prefs_no_subjective() -> UserPreferences:
    """Create preferences with only deterministic DynamicFields (no subjective)."""
    return UserPreferences(
        location="Zurich",
        offer_type="RENT",
        budget_max=2500,
        language="de",
        dynamic_fields=[
            DynamicField(
                name="near Bahnhof",
                value="500m",
                importance=ImportanceLevel.HIGH,
                criterion_type=CriterionType.DISTANCE,
            ),
            DynamicField(
                name="within budget",
                value="",
                importance=ImportanceLevel.CRITICAL,
                criterion_type=CriterionType.PRICE,
            ),
        ],
    )


def _make_prefs_empty_fields() -> UserPreferences:
    """Create preferences with no dynamic fields at all."""
    return UserPreferences(
        location="Zurich",
        offer_type="RENT",
        budget_max=2500,
        language="de",
        dynamic_fields=[],
    )


def _make_prefs_none_criterion_type() -> UserPreferences:
    """Create preferences with DynamicFields where criterion_type=None."""
    return UserPreferences(
        location="Zurich",
        offer_type="RENT",
        budget_max=2500,
        language="de",
        dynamic_fields=[
            DynamicField(
                name="cozy atmosphere",
                value="warm colors, nice layout",
                importance=ImportanceLevel.LOW,
                criterion_type=None,
            ),
        ],
    )


def _mock_subjective_response_json() -> dict:
    """Return JSON matching SubjectiveResponse shape with 2 criteria."""
    return {
        "criteria": [
            {
                "criterion": "quiet neighborhood",
                "fulfillment": 0.73,
                "reasoning": "Die Beschreibung erwahnt Ruhe und Erholung.",
            },
            {
                "criterion": "natural light",
                "fulfillment": 0.5,
                "reasoning": "Keine Angaben zu Fenstern im Inserat.",
            },
        ],
        "summary_bullets": [
            "CHF 1,790/Monat liegt im Budget von CHF 2,500",
            "Nur 29 qm Wohnflache - deutlich unter Durchschnitt",
            "Ruhige Lage in Roggwil BE, nicht in Zurich",
        ],
    }


def _mock_bullets_only_response_json() -> dict:
    """Return JSON matching BulletsOnlyResponse shape."""
    return {
        "summary_bullets": [
            "CHF 1,790/Monat liegt im Budget von CHF 2,500",
            "Nur 29 qm Wohnflache",
            "Standort Roggwil BE statt Zurich",
        ],
    }


def _make_mock_httpx_response(json_body: dict, status_code: int = 200) -> MagicMock:
    """Create a mock httpx.Response that returns the given JSON."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(json_body),
                }
            }
        ]
    }
    return mock_response


# ---------------------------------------------------------------------------
# TestFulfillmentRounding
# ---------------------------------------------------------------------------


class TestFulfillmentRounding:
    """Test _to_fulfillment_result() conversion and rounding logic."""

    def test_round_073_to_07(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.73, reasoning="test"
        )
        field = DynamicField(name="test", value="", importance=ImportanceLevel.HIGH)
        fr = _to_fulfillment_result(result, field)
        assert fr.fulfillment == 0.7

    def test_round_075_to_08(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.75, reasoning="test"
        )
        field = DynamicField(name="test", value="", importance=ImportanceLevel.MEDIUM)
        fr = _to_fulfillment_result(result, field)
        assert fr.fulfillment == 0.8

    def test_round_00_stays_00(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.0, reasoning="test"
        )
        field = DynamicField(name="test", value="", importance=ImportanceLevel.LOW)
        fr = _to_fulfillment_result(result, field)
        assert fr.fulfillment == 0.0

    def test_round_10_stays_10(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=1.0, reasoning="test"
        )
        field = DynamicField(name="test", value="", importance=ImportanceLevel.CRITICAL)
        fr = _to_fulfillment_result(result, field)
        assert fr.fulfillment == 1.0

    def test_preserves_importance(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.5, reasoning="some reason"
        )
        field = DynamicField(name="test", value="", importance=ImportanceLevel.CRITICAL)
        fr = _to_fulfillment_result(result, field)
        assert fr.importance == ImportanceLevel.CRITICAL

    def test_preserves_reasoning(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="test", fulfillment=0.5, reasoning="because reasons"
        )
        field = DynamicField(name="test", value="", importance=ImportanceLevel.MEDIUM)
        fr = _to_fulfillment_result(result, field)
        assert fr.reasoning == "because reasons"

    def test_preserves_criterion_name(self):
        from app.services.claude import _to_fulfillment_result
        from app.models.scoring import SubjectiveCriterionResult

        result = SubjectiveCriterionResult(
            criterion="quiet neighborhood", fulfillment=0.8, reasoning="test"
        )
        field = DynamicField(
            name="quiet neighborhood", value="", importance=ImportanceLevel.HIGH
        )
        fr = _to_fulfillment_result(result, field)
        assert fr.criterion_name == "quiet neighborhood"


# ---------------------------------------------------------------------------
# TestSubjectiveModel
# ---------------------------------------------------------------------------


class TestSubjectiveModel:
    """Test that SUBJECTIVE_MODEL defaults correctly and reads from env."""

    def test_default_model(self):
        # Import must set default to google/gemini-2.5-flash-lite
        from app.services.claude import SUBJECTIVE_MODEL

        assert SUBJECTIVE_MODEL == "google/gemini-2.5-flash-lite"

    def test_model_reads_from_env(self):
        with patch.dict(os.environ, {"SUBJECTIVE_MODEL": "test/custom-model"}):
            # Need to reimport to pick up env var change
            import importlib
            import app.services.claude as claude_mod

            importlib.reload(claude_mod)
            assert claude_mod.SUBJECTIVE_MODEL == "test/custom-model"

        # Clean up: reload with default
        import importlib
        import app.services.claude as claude_mod

        importlib.reload(claude_mod)


# ---------------------------------------------------------------------------
# TestScoreListing
# ---------------------------------------------------------------------------


class TestScoreListing:
    """Test score_listing() two-path logic with mocked OpenRouter calls."""

    @pytest.mark.asyncio
    async def test_combined_call_with_subjective_criteria(self):
        """With subjective criteria, makes one httpx POST returning combined response."""
        from app.services.claude import ClaudeScorer

        scorer = ClaudeScorer()
        mock_response = _make_mock_httpx_response(_mock_subjective_response_json())

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        scorer._client = mock_client

        prefs = _make_prefs_with_subjective()
        results, bullets = await scorer.score_listing(
            SAMPLE_LISTING, prefs, image_urls=None, nearby_places=None
        )

        # Exactly one POST call
        assert mock_client.post.call_count == 1

        # Check model in the POST payload
        call_kwargs = mock_client.post.call_args
        posted_json = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        assert posted_json["model"] is not None

        # Returns 2 FulfillmentResult entries
        assert len(results) == 2
        assert all(isinstance(r, FulfillmentResult) for r in results)

        # Returns 3+ bullets
        assert len(bullets) >= 3

        # Check fulfillment rounding (0.73 -> 0.7, 0.5 -> 0.5)
        assert results[0].fulfillment == 0.7
        assert results[1].fulfillment == 0.5

    @pytest.mark.asyncio
    async def test_bullets_only_when_no_subjective(self):
        """With no subjective fields, makes one httpx POST for bullets-only."""
        from app.services.claude import ClaudeScorer

        scorer = ClaudeScorer()
        mock_response = _make_mock_httpx_response(_mock_bullets_only_response_json())

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        scorer._client = mock_client

        prefs = _make_prefs_no_subjective()
        results, bullets = await scorer.score_listing(
            SAMPLE_LISTING, prefs, image_urls=None, nearby_places=None
        )

        # Exactly one POST call
        assert mock_client.post.call_count == 1

        # Empty results list (no subjective criteria)
        assert results == []

        # 3+ bullets
        assert len(bullets) >= 3

    @pytest.mark.asyncio
    async def test_bullets_only_when_no_dynamic_fields(self):
        """With empty dynamic_fields, makes one httpx POST for bullets-only."""
        from app.services.claude import ClaudeScorer

        scorer = ClaudeScorer()
        mock_response = _make_mock_httpx_response(_mock_bullets_only_response_json())

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        scorer._client = mock_client

        prefs = _make_prefs_empty_fields()
        results, bullets = await scorer.score_listing(
            SAMPLE_LISTING, prefs, image_urls=None, nearby_places=None
        )

        # Exactly one POST call
        assert mock_client.post.call_count == 1

        # Empty results list
        assert results == []

        # 3+ bullets
        assert len(bullets) >= 3

    @pytest.mark.asyncio
    async def test_none_criterion_type_treated_as_subjective(self):
        """DynamicField with criterion_type=None should take the combined call path."""
        from app.services.claude import ClaudeScorer

        scorer = ClaudeScorer()

        # Response for a combined call with 1 criterion
        combined_json = {
            "criteria": [
                {
                    "criterion": "cozy atmosphere",
                    "fulfillment": 0.6,
                    "reasoning": "Sieht gemutlich aus.",
                }
            ],
            "summary_bullets": [
                "Budget passt",
                "Kleine Wohnung",
                "Nicht in Zurich",
            ],
        }
        mock_response = _make_mock_httpx_response(combined_json)

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        scorer._client = mock_client

        prefs = _make_prefs_none_criterion_type()
        results, bullets = await scorer.score_listing(
            SAMPLE_LISTING, prefs, image_urls=None, nearby_places=None
        )

        # Combined path taken (non-empty results)
        assert len(results) == 1
        assert results[0].criterion_name == "cozy atmosphere"
        assert results[0].fulfillment == 0.6

    @pytest.mark.asyncio
    async def test_subjective_criteria_in_prompt(self):
        """Messages sent to OpenRouter include 'Subjective Criteria to Evaluate' section."""
        from app.services.claude import ClaudeScorer

        scorer = ClaudeScorer()
        mock_response = _make_mock_httpx_response(_mock_subjective_response_json())

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        scorer._client = mock_client

        prefs = _make_prefs_with_subjective()
        await scorer.score_listing(
            SAMPLE_LISTING, prefs, image_urls=None, nearby_places=None
        )

        # Extract the messages sent in the POST call
        call_kwargs = mock_client.post.call_args
        posted_json = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        messages = posted_json["messages"]

        # Find user message content
        user_msg = next(m for m in messages if m["role"] == "user")
        user_content = user_msg["content"]

        # Must contain the criteria section header
        assert "Subjective Criteria to Evaluate" in user_content

        # Must contain formatted criteria lines
        assert "quiet neighborhood (HIGH): no main road" in user_content
        assert "natural light (MEDIUM): lots of windows" in user_content

    def test_no_anthropic_imports(self):
        """claude.py must not import anthropic or AsyncAnthropic."""
        claude_path = Path(__file__).parent.parent / "app" / "services" / "claude.py"
        source = claude_path.read_text()
        tree = ast.parse(source)

        all_imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    all_imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                all_imports.append(node.module)

        import_string = " ".join(str(i) for i in all_imports)
        assert "anthropic" not in import_string, (
            f"claude.py still imports anthropic: {all_imports}"
        )
