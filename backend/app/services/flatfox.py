"""Async HTTP client for Flatfox public API.

Uses httpx.AsyncClient with lazy initialization and singleton pattern.
The client fetches listing data from Flatfox's public API and parses
responses into Pydantic models.

Endpoint: GET /api/v1/public-listing/{pk}/
No authentication required.
"""

import httpx

from app.models.listing import FlatfoxListing

FLATFOX_BASE_URL = "https://flatfox.ch/api/v1"


class FlatfoxClient:
    """Async HTTP client for Flatfox public listing API."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def get_client(self) -> httpx.AsyncClient:
        """Get or create the httpx AsyncClient (lazy initialization)."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=FLATFOX_BASE_URL,
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self._client

    async def get_listing(self, pk: int) -> FlatfoxListing:
        """Fetch and parse a single listing by primary key.

        Args:
            pk: The Flatfox listing primary key.

        Returns:
            Parsed FlatfoxListing model.

        Raises:
            httpx.HTTPStatusError: If the API returns a non-2xx status.
            httpx.RequestError: If the request fails (network error, timeout).
        """
        client = await self.get_client()
        response = await client.get(f"/public-listing/{pk}/")
        response.raise_for_status()
        return FlatfoxListing.model_validate(response.json())

    async def close(self) -> None:
        """Close the httpx client and release connections."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance used by routers and lifespan
flatfox_client = FlatfoxClient()
