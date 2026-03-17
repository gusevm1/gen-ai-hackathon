"""Tests for POST /chat endpoint.

Validates the chat endpoint: accepts ChatRequest with conversation history,
calls ConversationService, and returns ChatResponse with optional
extracted preferences. ConversationService is mocked throughout.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


# ---- Tests ----


@pytest.mark.asyncio
async def test_chat_endpoint_success():
    """POST /chat with valid request returns 200 with ChatResponse shape."""
    with patch("app.routers.chat.conversation_service") as mock_svc:
        mock_svc.chat = AsyncMock(return_value=("Hello! What kind of property are you looking for?", False, None))
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/chat",
                json={
                    "messages": [{"role": "user", "content": "Hi, I need an apartment"}],
                    "profile_name": "TestUser",
                },
            )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello! What kind of property are you looking for?"
    assert data["ready_to_summarize"] is False
    assert data["extracted_preferences"] is None


@pytest.mark.asyncio
async def test_chat_endpoint_with_preferences():
    """POST /chat returns extracted preferences when ready_to_summarize is True."""
    mapped_prefs = {
        "location": "Zurich",
        "offerType": "RENT",
        "objectCategory": "APARTMENT",
        "budgetMin": 2000,
        "budgetMax": 2500,
        "roomsMin": 3.0,
        "roomsMax": None,
    }
    with patch("app.routers.chat.conversation_service") as mock_svc:
        mock_svc.chat = AsyncMock(return_value=("Great, I have a good picture!", True, mapped_prefs))
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/chat",
                json={
                    "messages": [{"role": "user", "content": "3-room apartment in Zurich, 2000-2500 CHF"}],
                    "profile_name": "TestUser",
                },
            )
    assert response.status_code == 200
    data = response.json()
    assert data["ready_to_summarize"] is True
    assert isinstance(data["extracted_preferences"], dict)
    assert data["extracted_preferences"]["location"] == "Zurich"


@pytest.mark.asyncio
async def test_chat_endpoint_empty_messages():
    """POST /chat with empty messages list returns 422."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/chat",
            json={
                "messages": [],
                "profile_name": "TestUser",
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_endpoint_missing_profile_name():
    """POST /chat without profile_name returns 422."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/chat",
            json={
                "messages": [{"role": "user", "content": "hello"}],
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_endpoint_wrong_role_order():
    """POST /chat with two consecutive user messages returns 422 with alternation error."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/chat",
            json={
                "messages": [
                    {"role": "user", "content": "hello"},
                    {"role": "user", "content": "still here"},
                ],
                "profile_name": "TestUser",
            },
        )
    assert response.status_code == 422
    assert "alternate" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_chat_endpoint_service_error():
    """POST /chat when ConversationService raises returns 502."""
    with patch("app.routers.chat.conversation_service") as mock_svc:
        mock_svc.chat = AsyncMock(side_effect=Exception("Claude API error"))
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/chat",
                json={
                    "messages": [{"role": "user", "content": "hello"}],
                    "profile_name": "TestUser",
                },
            )
    assert response.status_code == 502
    assert "Chat failed" in response.json()["detail"]
