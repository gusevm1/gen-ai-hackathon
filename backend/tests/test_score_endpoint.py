"""Tests for POST /score endpoint.

Validates the scoring pipeline endpoint: accepts ScoreRequest,
orchestrates Flatfox fetch -> Claude scoring -> save analysis with profile_id,
and returns ScoreResponse. All external services are mocked.
"""

import copy
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.listing import FlatfoxListing
from app.models.scoring import ScoreResponse
from app.services.flatfox import PageData, WebPrices

from tests.conftest import SAMPLE_LISTING_JSON, SAMPLE_PREFERENCES_JSON, SAMPLE_SCORE_RESPONSE


# ---- Fixtures ----


@pytest.fixture
def mock_flatfox():
    """Mock flatfox_client.get_listing and get_listing_page_data."""
    listing = FlatfoxListing.model_validate(SAMPLE_LISTING_JSON)
    with patch("app.routers.scoring.flatfox_client") as mock:
        mock.get_listing = AsyncMock(return_value=listing)
        mock.get_listing_page_data = AsyncMock(return_value=PageData())
        yield mock


@pytest.fixture
def mock_supabase():
    """Mock supabase_service.save_analysis (get_preferences removed -- no longer called)."""
    with patch("app.routers.scoring.supabase_service") as mock:
        mock.save_analysis = MagicMock(return_value=None)
        yield mock


@pytest.fixture
def mock_claude():
    """Mock claude_scorer.score_listing to return a valid ScoreResponse."""
    score = ScoreResponse.model_validate(SAMPLE_SCORE_RESPONSE)
    with patch("app.routers.scoring.claude_scorer") as mock:
        mock.score_listing = AsyncMock(return_value=score)
        yield mock


# ---- Tests ----


@pytest.mark.asyncio
async def test_score_success(mock_flatfox, mock_supabase, mock_claude):
    """POST /score with valid listing_id + user_id + profile_id + preferences returns 200."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/score",
            json={
                "listing_id": 1788170,
                "user_id": "test-user-uuid",
                "profile_id": "test-profile-uuid",
                "preferences": copy.deepcopy(SAMPLE_PREFERENCES_JSON),
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 72
    assert data["match_tier"] == "good"
    assert len(data["summary_bullets"]) == 3
    assert len(data["categories"]) == 5
    assert len(data["checklist"]) == 4
    assert data["language"] == "de"


@pytest.mark.asyncio
async def test_score_saves_analysis(mock_flatfox, mock_supabase, mock_claude):
    """POST /score saves analysis to Supabase with profile_id after successful scoring."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/score",
            json={
                "listing_id": 1788170,
                "user_id": "test-user-uuid",
                "profile_id": "test-profile-uuid",
                "preferences": copy.deepcopy(SAMPLE_PREFERENCES_JSON),
            },
        )
    assert response.status_code == 200
    # Verify save_analysis was called with 4 args including profile_id
    mock_supabase.save_analysis.assert_called_once_with(
        "test-user-uuid",
        "test-profile-uuid",
        "1788170",
        mock_claude.score_listing.return_value.model_dump(),
    )


@pytest.mark.asyncio
async def test_score_missing_profile(mock_flatfox, mock_supabase, mock_claude):
    """POST /score without profile_id returns 422 validation error."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/score",
            json={
                "listing_id": 1788170,
                "user_id": "test-user-uuid",
                "preferences": copy.deepcopy(SAMPLE_PREFERENCES_JSON),
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_score_missing_preferences(mock_flatfox, mock_supabase, mock_claude):
    """POST /score without preferences returns 422 validation error."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/score",
            json={
                "listing_id": 1788170,
                "user_id": "test-user-uuid",
                "profile_id": "test-profile-uuid",
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_score_listing_not_found(mock_supabase, mock_claude):
    """POST /score with invalid listing_id (Flatfox 404) returns 502 with error detail."""
    with patch("app.routers.scoring.flatfox_client") as mock_ff:
        mock_ff.get_listing = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "Not Found",
                request=httpx.Request("GET", "http://test"),
                response=httpx.Response(404),
            )
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/score",
                json={
                    "listing_id": 999999,
                    "user_id": "test-user-uuid",
                    "profile_id": "test-profile-uuid",
                    "preferences": copy.deepcopy(SAMPLE_PREFERENCES_JSON),
                },
            )
    assert response.status_code == 502
    assert "Could not fetch listing" in response.json()["detail"]


@pytest.mark.asyncio
async def test_score_claude_failure(mock_flatfox, mock_supabase):
    """POST /score when Claude scoring fails returns 502 with error detail."""
    with patch("app.routers.scoring.claude_scorer") as mock_cl:
        mock_cl.score_listing = AsyncMock(
            side_effect=Exception("API rate limit exceeded")
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/score",
                json={
                    "listing_id": 1788170,
                    "user_id": "test-user-uuid",
                    "profile_id": "test-profile-uuid",
                    "preferences": copy.deepcopy(SAMPLE_PREFERENCES_JSON),
                },
            )
    assert response.status_code == 502
    assert "Scoring failed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_health_still_works():
    """GET /health still returns 200 (existing endpoint unbroken)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "homematch-api"
