"""Chat router for AI property advisor conversations.

Provides POST /chat endpoint that accepts conversation history,
calls Claude via ConversationService, and returns structured responses
with optional extracted preferences.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.chat import ChatRequest, ChatResponse
from app.services.conversation import conversation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message through the AI property advisor.

    Validates message alternation (must start with user, then alternate),
    calls ConversationService, and returns the response with optional
    extracted preferences.

    - 422: Invalid message order or missing required fields
    - 502: Claude API call failed
    """
    # Validate message alternation: first must be "user", roles must alternate
    for i, msg in enumerate(request.messages):
        expected_role = "user" if i % 2 == 0 else "assistant"
        if msg.role != expected_role:
            raise HTTPException(
                status_code=422,
                detail=f"Message {i} has role '{msg.role}', expected '{expected_role}'. Messages must alternate user/assistant starting with user.",
            )

    try:
        message, ready, prefs = await conversation_service.chat(
            [m.model_dump() for m in request.messages],
            request.profile_name,
            request.language,
        )
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=502, detail=f"Chat failed: {e}")

    return ChatResponse(
        message=message,
        ready_to_summarize=ready,
        extracted_preferences=prefs,
    )
