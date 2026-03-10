"""Integration tests for the scoring service with mocked Claude and Supabase.

Covers: EVAL-01 (Claude evaluates listing), EVAL-04 (missing data handling),
        EVAL-05 (language in prompt). All external APIs are mocked.
"""

import copy
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences
from app.models.scoring import ScoreResponse
from tests.conftest import (
    MINIMAL_LISTING_JSON,
    SAMPLE_LISTING_JSON,
    SAMPLE_PREFERENCES_JSON,
    SAMPLE_SCORE_RESPONSE,
)


class TestClaudeScorer:
    """Tests for ClaudeScorer.score_listing with mocked Claude API."""

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

    @pytest.fixture
    def mock_score_response(self):
        return ScoreResponse.model_validate(copy.deepcopy(SAMPLE_SCORE_RESPONSE))

    @pytest.mark.asyncio
    async def test_score_listing_returns_valid_response(
        self, listing, preferences, mock_score_response
    ):
        """score_listing with mocked Claude returns valid ScoreResponse with 5 categories."""
        from app.services.claude import claude_scorer

        mock_parsed = MagicMock()
        mock_parsed.parsed_output = mock_score_response

        mock_client = AsyncMock()
        mock_client.messages.parse = AsyncMock(return_value=mock_parsed)

        with patch.object(claude_scorer, "get_client", return_value=mock_client):
            result = await claude_scorer.score_listing(listing, preferences)

        assert isinstance(result, ScoreResponse)
        assert len(result.categories) == 5
        assert result.overall_score == 72
        assert result.match_tier == "good"

    @pytest.mark.asyncio
    async def test_score_listing_passes_correct_params(
        self, listing, preferences, mock_score_response
    ):
        """score_listing passes correct model, max_tokens, system prompt, and output_format."""
        from app.services.claude import claude_scorer, CLAUDE_MODEL

        mock_parsed = MagicMock()
        mock_parsed.parsed_output = mock_score_response

        mock_client = AsyncMock()
        mock_client.messages.parse = AsyncMock(return_value=mock_parsed)

        with patch.object(claude_scorer, "get_client", return_value=mock_client):
            await claude_scorer.score_listing(listing, preferences)

        call_kwargs = mock_client.messages.parse.call_args
        assert call_kwargs.kwargs["model"] == CLAUDE_MODEL
        assert call_kwargs.kwargs["max_tokens"] == 4096
        assert call_kwargs.kwargs["output_format"] == ScoreResponse
        assert "German" in call_kwargs.kwargs["system"]

    @pytest.mark.asyncio
    async def test_score_listing_with_minimal_listing(
        self, minimal_listing, preferences, mock_score_response
    ):
        """score_listing with minimal listing (missing most fields) does not crash."""
        from app.services.claude import claude_scorer

        mock_parsed = MagicMock()
        mock_parsed.parsed_output = mock_score_response

        mock_client = AsyncMock()
        mock_client.messages.parse = AsyncMock(return_value=mock_parsed)

        with patch.object(claude_scorer, "get_client", return_value=mock_client):
            result = await claude_scorer.score_listing(minimal_listing, preferences)

        assert isinstance(result, ScoreResponse)
        # Verify the user prompt was built without error (None fields handled)
        user_msg = mock_client.messages.parse.call_args.kwargs["messages"][0]["content"]
        assert "Not specified" in user_msg

    @pytest.mark.asyncio
    async def test_score_listing_french_language(
        self, listing, mock_score_response
    ):
        """score_listing with language='fr' passes French system prompt to Claude."""
        from app.services.claude import claude_scorer

        french_prefs = UserPreferences.model_validate(
            {**SAMPLE_PREFERENCES_JSON, "language": "fr"}
        )

        mock_parsed = MagicMock()
        mock_parsed.parsed_output = mock_score_response

        mock_client = AsyncMock()
        mock_client.messages.parse = AsyncMock(return_value=mock_parsed)

        with patch.object(claude_scorer, "get_client", return_value=mock_client):
            await claude_scorer.score_listing(listing, french_prefs)

        system_prompt = mock_client.messages.parse.call_args.kwargs["system"]
        assert "French" in system_prompt


class TestSupabaseService:
    """Tests for SupabaseService with mocked Supabase client."""

    @pytest.fixture(autouse=True)
    def reset_supabase_client(self):
        """Reset SupabaseService singleton between tests."""
        from app.services.supabase import supabase_service

        supabase_service._client = None
        yield
        supabase_service._client = None

    def test_get_preferences_returns_dict(self):
        """get_preferences returns dict that UserPreferences can validate."""
        from app.services.supabase import supabase_service

        # Build the mock chain: table().select().eq().single().execute()
        mock_execute = MagicMock()
        mock_execute.data = {"preferences": copy.deepcopy(SAMPLE_PREFERENCES_JSON)}

        mock_single = MagicMock()
        mock_single.execute.return_value = mock_execute

        mock_eq = MagicMock()
        mock_eq.single.return_value = mock_single

        mock_select = MagicMock()
        mock_select.eq.return_value = mock_eq

        mock_table = MagicMock()
        mock_table.select.return_value = mock_select

        mock_client = MagicMock()
        mock_client.table.return_value = mock_table

        with patch.object(supabase_service, "get_client", return_value=mock_client):
            result = supabase_service.get_preferences("test-user-uuid")

        assert isinstance(result, dict)
        assert result["offerType"] == "RENT"
        assert result["budgetMin"] == 1500

        # Verify the result can be validated by UserPreferences
        prefs = UserPreferences.model_validate(result)
        assert prefs.offer_type.value == "RENT"
        assert prefs.budget_min == 1500

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
                listing_id="1788170",
                score_data=score_data,
            )

        # Verify upsert was called
        mock_client.table.assert_called_with("analyses")
        upsert_call = mock_table.upsert.call_args
        upsert_data = upsert_call[0][0]

        assert upsert_data["user_id"] == "test-user-uuid"
        assert upsert_data["listing_id"] == "1788170"
        assert upsert_data["score"] == 72
        assert upsert_data["breakdown"] == score_data
        assert isinstance(upsert_data["summary"], str)
        assert "CHF 1,790" in upsert_data["summary"]
