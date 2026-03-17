"""Conversation service for AI chat with Claude.

Handles multi-turn conversations, parses the <preferences_ready> sentinel tag,
and maps extracted preferences to UserPreferences-compatible format.

Follows the singleton pattern established by ClaudeScorer.
"""

from __future__ import annotations

import json
import os
import re
from typing import Optional

from anthropic import AsyncAnthropic

from app.prompts.conversation import build_conversation_system_prompt

CHAT_MODEL = os.environ.get("CHAT_MODEL", "claude-sonnet-4-6")

PREFS_PATTERN = re.compile(
    r"<preferences_ready>\s*(.*?)\s*</preferences_ready>", re.DOTALL
)


def parse_preferences_ready(text: str) -> tuple[bool, dict | None]:
    """Parse the <preferences_ready> sentinel tag from Claude's response.

    Returns:
        (True, prefs_dict) if valid JSON found inside sentinel tag.
        (False, None) if no tag or malformed JSON.
    """
    match = PREFS_PATTERN.search(text)
    if not match:
        return False, None
    try:
        prefs = json.loads(match.group(1))
        return True, prefs
    except (json.JSONDecodeError, ValueError):
        return False, None


def strip_preferences_tag(text: str) -> str:
    """Remove the <preferences_ready>...</preferences_ready> block from text."""
    return PREFS_PATTERN.sub("", text).strip()


def map_extracted_to_user_preferences(extracted: dict) -> dict:
    """Map Claude's extracted preference fields to UserPreferences-compatible camelCase dict.

    Claude outputs snake_case keys with its own naming conventions.
    This function translates to the camelCase schema expected by UserPreferences.
    """
    # Offer type mapping
    offer_type_raw = extracted.get("offer_type", "rent")
    offer_type = "SALE" if offer_type_raw == "buy" else "RENT"

    # Object category mapping
    object_types = extracted.get("object_types", [])
    object_types_lower = [t.lower() for t in object_types] if object_types else []
    if "house" in object_types_lower:
        object_category = "HOUSE"
    elif "apartment" in object_types_lower or "studio" in object_types_lower:
        object_category = "APARTMENT"
    else:
        object_category = "ANY"

    mapped = {
        "location": extracted.get("location", ""),
        "offerType": offer_type,
        "objectCategory": object_category,
        "budgetMin": extracted.get("min_price"),
        "budgetMax": extracted.get("max_price"),
        "roomsMin": extracted.get("min_rooms"),
        "roomsMax": extracted.get("max_rooms"),
        "livingSpaceMin": extracted.get("min_living_space"),
        "livingSpaceMax": extracted.get("max_living_space"),
        "budgetDealbreaker": extracted.get("price_is_dealbreaker", False),
        "roomsDealbreaker": extracted.get("rooms_is_dealbreaker", False),
        "livingSpaceDealbreaker": extracted.get("space_is_dealbreaker", False),
        "floorPreference": extracted.get("floor_preference", "any"),
        "availability": extracted.get("availability", "any"),
        "features": extracted.get("features", []),
        "softCriteria": extracted.get("soft_criteria", []),
        "importance": extracted.get("importance", {}),
    }

    return mapped


class ConversationService:
    """Async Claude API client for multi-turn property advisor conversations.

    Uses lazy-initialized AsyncAnthropic singleton (same pattern as ClaudeScorer).
    """

    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        """Get or create the AsyncAnthropic client (lazy initialization)."""
        if self._client is None:
            self._client = AsyncAnthropic()
        return self._client

    async def chat(
        self, messages: list[dict], profile_name: str
    ) -> tuple[str, bool, dict | None]:
        """Send conversation to Claude and parse the response.

        Args:
            messages: List of {"role": "user"|"assistant", "content": str} dicts.
            profile_name: User's profile name for personalization.

        Returns:
            Tuple of (response_text, ready_to_summarize, mapped_preferences_or_none).
        """
        client = self.get_client()
        system_prompt = build_conversation_system_prompt(profile_name=profile_name)

        response = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
        )

        raw_text = response.content[0].text

        ready, extracted = parse_preferences_ready(raw_text)
        mapped_prefs = None
        if ready and extracted:
            mapped_prefs = map_extracted_to_user_preferences(extracted)

        clean_text = strip_preferences_tag(raw_text) if ready else raw_text

        return clean_text, ready, mapped_prefs

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.close()
            self._client = None


# Singleton instance used by routers and lifespan
conversation_service = ConversationService()
