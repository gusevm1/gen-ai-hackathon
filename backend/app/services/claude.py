"""Async Claude API client for property scoring.

Uses AsyncAnthropic with messages.parse() for structured output.
Supports an optional search_nearby_places tool for proximity-based criteria.
Follows the singleton pattern established by FlatfoxClient.

Covers: EVAL-01 (Claude evaluates listing against preferences).
"""

from __future__ import annotations

import json
import logging
import os
import re

from anthropic import AsyncAnthropic

from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences
from app.models.scoring import ScoreResponse
from app.prompts.scoring import (
    build_image_content_blocks,
    build_system_prompt,
    build_user_prompt,
)
from app.services.places import search_nearby_places

logger = logging.getLogger(__name__)

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

MAX_LOOP_ITERATIONS = 3

PLACES_TOOL = {
    "name": "search_nearby_places",
    "description": (
        "Search for nearby points of interest (schools, gyms, supermarkets, "
        "transit stops, parks, etc.) around the listing's location. "
        "Returns up to 5 results with name, address, rating, and category."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "What to search for (e.g. 'primary school', 'gym', 'supermarket', 'tram stop')",
            },
            "radius_km": {
                "type": "number",
                "description": "Search radius in km (default 1.0, max 5.0)",
                "default": 1.0,
            },
        },
        "required": ["query"],
    },
}


def _has_location_criteria(preferences: UserPreferences) -> bool:
    """Check if any dynamic field mentions amenity/proximity keywords."""
    if not preferences.dynamic_fields:
        return False
    for field in preferences.dynamic_fields:
        text = f"{field.name} {field.value}"
        if _AMENITY_KEYWORDS.search(text):
            return True
    return False


async def _execute_tool(
    tool_name: str, tool_input: dict, latitude: float, longitude: float
) -> str:
    """Execute a tool call and return JSON string result."""
    if tool_name == "search_nearby_places":
        query = tool_input.get("query", "")
        radius_km = min(tool_input.get("radius_km", 1.0), 5.0)
        results = await search_nearby_places(
            query=query,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )
        return json.dumps(results)
    return json.dumps({"error": f"Unknown tool: {tool_name}"})


class ClaudeScorer:
    """Async Claude API client for scoring listings against preferences.

    Uses messages.parse() with Pydantic model for guaranteed structured output.
    Supports an optional search_nearby_places tool for proximity-based criteria.
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

        When the listing has coordinates and preferences mention amenity/proximity
        criteria, Claude is given a search_nearby_places tool it can optionally
        call (max 1 tool call per scoring run).

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

        messages = [{"role": "user", "content": content}]

        # Decide whether to offer the places tool
        has_coords = listing.latitude is not None and listing.longitude is not None
        has_criteria = _has_location_criteria(preferences)
        use_tool = has_coords and has_criteria

        if use_tool:
            logger.info(
                "Offering search_nearby_places tool for listing %s", listing.pk
            )

        # Agentic loop (max 1 tool call, capped at MAX_LOOP_ITERATIONS)
        for iteration in range(MAX_LOOP_ITERATIONS):
            api_kwargs: dict = {
                "model": CLAUDE_MODEL,
                "max_tokens": 4096,
                "system": build_system_prompt(preferences.language),
                "messages": messages,
                "output_format": ScoreResponse,
            }

            # Only offer tools on the first iteration
            if use_tool and iteration == 0:
                api_kwargs["tools"] = [PLACES_TOOL]
                api_kwargs["tool_choice"] = {"type": "auto"}

            response = await client.messages.parse(**api_kwargs)

            # If Claude produced a final answer, return it
            if response.stop_reason == "end_turn":
                return response.parsed_output

            # If Claude wants to use a tool, execute it and continue
            if response.stop_reason == "tool_use":
                # Find the tool_use block
                tool_use_block = None
                for block in response.content:
                    if block.type == "tool_use":
                        tool_use_block = block
                        break

                if tool_use_block is None:
                    # Shouldn't happen, but fall back to parsing
                    logger.warning("tool_use stop_reason but no tool_use block found")
                    return response.parsed_output

                logger.info(
                    "Claude called tool %s with input %s",
                    tool_use_block.name,
                    tool_use_block.input,
                )

                # Execute the tool
                result = await _execute_tool(
                    tool_use_block.name,
                    tool_use_block.input,
                    listing.latitude,
                    listing.longitude,
                )

                # Append assistant message + tool result, continue loop
                messages.append({"role": "assistant", "content": response.content})
                messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use_block.id,
                                "content": result,
                            }
                        ],
                    }
                )

                # Don't offer tools again (forces final JSON response on next iteration)
                use_tool = False
                continue

            # Any other stop reason — try to return parsed output
            logger.warning("Unexpected stop_reason: %s", response.stop_reason)
            return response.parsed_output

        # If we exhaust iterations, return the last response
        logger.warning("Exhausted %d loop iterations", MAX_LOOP_ITERATIONS)
        return response.parsed_output

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None:
            await self._client.close()
            self._client = None


# Singleton instance used by routers and lifespan
claude_scorer = ClaudeScorer()
