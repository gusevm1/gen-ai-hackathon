"""Async Claude API client for property scoring.

Uses AsyncAnthropic with messages.parse() for structured output.
Follows the singleton pattern established by FlatfoxClient.

Covers: EVAL-01 (Claude evaluates listing against preferences).
"""

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

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")


class ClaudeScorer:
    """Async Claude API client for scoring listings against preferences.

    Uses messages.parse() with Pydantic model for guaranteed structured output.
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
    ) -> ScoreResponse:
        """Score a listing against user preferences using Claude.

        Builds a multi-modal prompt with optional image content blocks
        alongside the text evaluation prompt. When image_urls are provided,
        Claude evaluates property photos for condition, views, and interior
        quality. Without images, scoring falls back to text-only evaluation.

        Args:
            listing: The Flatfox listing to evaluate.
            preferences: The user's search preferences with weights.
            image_urls: Optional list of listing image URLs for visual analysis.

        Returns:
            Validated ScoreResponse with category breakdown and summary.
        """
        client = self.get_client()

        # Build content blocks: images first (if any), then text prompt
        content: list[dict] = []
        content.extend(build_image_content_blocks(image_urls or []))
        content.append(
            {"type": "text", "text": build_user_prompt(listing, preferences)}
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
