"""Integration tests for the scoring service with mocked OpenRouter and Supabase.

Covers: EVAL-01 (scorer evaluates listing), EVAL-04 (missing data handling),
        EVAL-05 (language in prompt). All external APIs are mocked.

Updated for Phase 29: ClaudeScorer now uses OpenRouter httpx calls instead
of Anthropic SDK messages.parse(). Tests mock httpx POST responses.
"""

import copy
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences
from app.services.deterministic_scorer import FulfillmentResult
from tests.conftest import (
    MINIMAL_LISTING_JSON,
    SAMPLE_LISTING_JSON,
    SAMPLE_PREFERENCES_JSON,
    SAMPLE_SCORE_RESPONSE,
)


def _make_mock_httpx_response(json_body: dict) -> MagicMock:
    """Create a mock httpx.Response that wraps json_body in OpenRouter format."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps(json_body)}}]
    }
    return mock_response


# Default mock response for subjective scoring (preferences have dynamic_fields
# with criterion_type=None which are treated as subjective)
_MOCK_SUBJECTIVE_JSON = {
    "criteria": [
        {"criterion": "near Bahnhof", "fulfillment": 0.3, "reasoning": "Weit entfernt"},
        {"criterion": "quiet neighborhood", "fulfillment": 0.8, "reasoning": "Ruhige Lage"},
    ],
    "summary_bullets": [
        "CHF 1,790/month is well within your CHF 2,500 budget",
        "Only 29 sqm living space, significantly below your 50 sqm minimum",
        "Located in Roggwil BE, not in your preferred Zurich area",
    ],
}

# Bullets-only mock for preferences without subjective criteria
_MOCK_BULLETS_JSON = {
    "summary_bullets": [
        "CHF 1,790/month is well within your CHF 2,500 budget",
        "Only 29 sqm living space",
        "Located in Roggwil BE",
    ],
}


class TestClaudeScorer:
    """Tests for ClaudeScorer.score_listing with mocked OpenRouter API."""

    @pytest.fixture(autouse=True)
    def reset_claude_client(self):
        """Reset ClaudeScorer singleton between tests."""
        from app.services.claude import claude_scorer

        claude_scorer._client = None
        yield
        claude_scorer._client = None

    @pytest.fixture
    def listing(self):
        return FlatfoxListing.model_validate(SAMPLE_LISTING_JSON)

    @pytest.fixture
    def minimal_listing(self):
        return FlatfoxListing.model_validate(MINIMAL_LISTING_JSON)

    @pytest.fixture
    def preferences(self):
        return UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)

    @pytest.mark.asyncio
    async def test_score_listing_returns_valid_response(
        self, listing, preferences
    ):
        """score_listing with mocked OpenRouter returns (results, bullets) tuple."""
        from app.services.claude import claude_scorer

        # SAMPLE_PREFERENCES has dynamic_fields with criterion_type=None -> subjective path
        mock_response = _make_mock_httpx_response(_MOCK_SUBJECTIVE_JSON)
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        claude_scorer._client = mock_client

        results, bullets = await claude_scorer.score_listing(listing, preferences)

        assert isinstance(results, list)
        assert len(results) == 2
        assert all(isinstance(r, FulfillmentResult) for r in results)
        assert len(bullets) >= 3

    @pytest.mark.asyncio
    async def test_score_listing_passes_correct_model(
        self, listing, preferences
    ):
        """score_listing sends correct model to OpenRouter."""
        from app.services.claude import claude_scorer, SUBJECTIVE_MODEL

        mock_response = _make_mock_httpx_response(_MOCK_SUBJECTIVE_JSON)
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        claude_scorer._client = mock_client

        await claude_scorer.score_listing(listing, preferences)

        call_kwargs = mock_client.post.call_args
        posted_json = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        assert posted_json["model"] == SUBJECTIVE_MODEL

    @pytest.mark.asyncio
    async def test_score_listing_with_minimal_listing(
        self, minimal_listing, preferences
    ):
        """score_listing with minimal listing (missing most fields) does not crash."""
        from app.services.claude import claude_scorer

        mock_response = _make_mock_httpx_response(_MOCK_SUBJECTIVE_JSON)
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        claude_scorer._client = mock_client

        results, bullets = await claude_scorer.score_listing(minimal_listing, preferences)

        assert isinstance(results, list)
        assert isinstance(bullets, list)
        # Verify the user prompt was built without error (None fields handled)
        call_kwargs = mock_client.post.call_args
        posted_json = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        user_msg = next(m for m in posted_json["messages"] if m["role"] == "user")
        assert "Not specified" in user_msg["content"]

    @pytest.mark.asyncio
    async def test_score_listing_french_language(
        self, listing
    ):
        """score_listing with language='fr' passes French system prompt to OpenRouter."""
        from app.services.claude import claude_scorer

        french_prefs = UserPreferences.model_validate(
            {**SAMPLE_PREFERENCES_JSON, "language": "fr"}
        )

        mock_response = _make_mock_httpx_response(_MOCK_SUBJECTIVE_JSON)
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        claude_scorer._client = mock_client

        await claude_scorer.score_listing(listing, french_prefs)

        call_kwargs = mock_client.post.call_args
        posted_json = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        system_msg = next(m for m in posted_json["messages"] if m["role"] == "system")
        assert "French" in system_msg["content"]


class TestSupabaseService:
    """Tests for SupabaseService with mocked Supabase client."""

    @pytest.fixture(autouse=True)
    def reset_supabase_client(self):
        """Reset SupabaseService singleton between tests."""
        from app.services.supabase import supabase_service

        supabase_service._client = None
        yield
        supabase_service._client = None

    def test_save_analysis_calls_upsert(self):
        """save_analysis calls upsert with correct structure."""
        from app.services.supabase import supabase_service

        mock_execute = MagicMock()

        mock_upsert = MagicMock()
        mock_upsert.execute.return_value = mock_execute

        mock_table = MagicMock()
        mock_table.upsert.return_value = mock_upsert

        mock_client = MagicMock()
        mock_client.table.return_value = mock_table

        score_data = copy.deepcopy(SAMPLE_SCORE_RESPONSE)

        with patch.object(supabase_service, "get_client", return_value=mock_client):
            supabase_service.save_analysis(
                user_id="test-user-uuid",
                profile_id="test-profile-uuid",
                listing_id="1788170",
                score_data=score_data,
            )

        # Verify upsert was called with on_conflict for 3-column constraint
        mock_client.table.assert_called_with("analyses")
        upsert_call = mock_table.upsert.call_args
        upsert_data = upsert_call[0][0]
        upsert_kwargs = upsert_call[1]

        assert upsert_data["user_id"] == "test-user-uuid"
        assert upsert_data["profile_id"] == "test-profile-uuid"
        assert upsert_data["listing_id"] == "1788170"
        assert upsert_data["score"] == 72
        assert upsert_data["breakdown"] == score_data
        assert isinstance(upsert_data["summary"], str)
        assert "CHF 1,790" in upsert_data["summary"]
        assert upsert_kwargs["on_conflict"] == "user_id,listing_id,profile_id"
