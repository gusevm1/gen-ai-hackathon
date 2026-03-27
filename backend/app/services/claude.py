"""Async Claude API client for property scoring.

Uses AsyncAnthropic with messages.parse() for structured output.
Makes a single non-iterative call — proximity evaluation uses pre-fetched
data injected into the prompt rather than a runtime tool call.

Covers: EVAL-01 (Claude evaluates listing against preferences).
"""

from __future__ import annotations

import logging
import os

from anthropic import AsyncAnthropic

from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences
from app.models.scoring import ScoreResponse
from app.prompts.scoring import (
    build_image_content_blocks,
    build_system_prompt,
    build_user_prompt,
)

logger = logging.getLogger(__name__)

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")


class ClaudeScorer:
    """Async Claude API client for scoring listings against preferences.

    Uses messages.parse() with Pydantic model for guaranteed structured output.
    Makes a single non-iterative API call — proximity evaluation relies on
    pre-fetched data injected into the prompt.
    Lazy-initializes the AsyncAnthropic client on first use.
    """

    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        """Get or create the AsyncAnthropic client (lazy initialization).

        Reads ANTHROPIC_API_KEY from environment automatically.
        """
        if self._client is None:
            self._client = AsyncAnthropic()
        return self._client

    async def score_listing(
        self,
        listing: FlatfoxListing,
        preferences: UserPreferences,
        image_urls: list[str] | None = None,
        nearby_places: dict[str, list[dict]] | None = None,
    ) -> ScoreResponse:
        """Score a listing against user preferences using Claude.

        Makes a single structured API call — no tool use, no agentic loop.
        Proximity evaluation relies exclusively on data injected into the prompt
        by build_user_prompt() (added in Phase 24).

        Args:
            listing: The Flatfox listing to evaluate.
            preferences: The user's search preferences with weights.
            image_urls: Optional list of listing image URLs for visual analysis.
            nearby_places: Optional pre-fetched proximity data injected into the
                prompt as a verified data section. When None, proximity section
                is omitted.

        Returns:
            Validated ScoreResponse with category breakdown and summary.
        """
        client = self.get_client()

        # Build content blocks: images first (if any), then text prompt
        content: list[dict] = []
        content.extend(build_image_content_blocks(image_urls or []))
        content.append(
            {"type": "text", "text": build_user_prompt(listing, preferences, nearby_places=nearby_places)}
        )

        response = await client.messages.parse(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=build_system_prompt(preferences.language),
            messages=[{"role": "user", "content": content}],
            output_format=ScoreResponse,
        )

        return response.parsed_output

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.close()
            self._client = None


# Singleton instance used by routers and lifespan
claude_scorer = ClaudeScorer()
