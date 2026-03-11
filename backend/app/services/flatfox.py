"""Async HTTP client for Flatfox public API.

Uses httpx.AsyncClient with lazy initialization and singleton pattern.
The client fetches listing data from Flatfox's public API and parses
responses into Pydantic models.

Endpoint: GET /api/v1/public-listing/{pk}/
No authentication required.

Also provides image URL extraction from listing detail HTML pages
for the image-enhanced scoring pipeline.
"""

import logging
import re

import httpx

from app.models.listing import FlatfoxListing

logger = logging.getLogger(__name__)

# Max images to include in scoring prompt (token cost control:
# ~1334 tokens per 1000x1000 image, 5 images = ~6700 tokens)
MAX_LISTING_IMAGES = 5

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

    async def get_listing_image_urls(self, slug: str, pk: int) -> list[str]:
        """Extract image URLs from a Flatfox listing detail HTML page.

        Fetches the listing detail page and parses image URLs from:
        1. <meta property="og:image"> tags (main listing image)
        2. <img> tags with src/srcset containing /thumb/ or /media/ paths

        For srcset, selects the highest resolution variant. Deduplicates URLs
        and limits to MAX_LISTING_IMAGES to control Claude token costs.

        Args:
            slug: The listing URL slug (e.g., "platanenweg-7-4914-roggwil-be").
            pk: The listing primary key.

        Returns:
            List of image URLs (empty list on any error -- graceful fallback).
        """
        try:
            # Use a separate httpx client for HTML page (not the API client
            # which has base_url set to the API path and JSON Accept header)
            async with httpx.AsyncClient(timeout=15.0) as html_client:
                url = f"https://flatfox.ch/en/flat/{slug}/{pk}/"
                response = await html_client.get(url)
                response.raise_for_status()
                html = response.text

            return self._parse_image_urls(html)

        except Exception:
            logger.debug(
                "Could not fetch images for listing %s/%d -- falling back to text-only",
                slug,
                pk,
            )
            return []

    @staticmethod
    def _parse_image_urls(html: str) -> list[str]:
        """Parse image URLs from listing detail HTML.

        Extracts from og:image meta tags and img srcset/src attributes.
        Deduplicates and limits to MAX_LISTING_IMAGES.
        """
        urls: list[str] = []
        seen: set[str] = set()

        def _add_url(url: str) -> None:
            """Add a URL if not already seen."""
            url = url.strip()
            if url and url not in seen:
                seen.add(url)
                urls.append(url)

        # 1. Extract og:image meta tags
        og_pattern = re.compile(
            r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
            re.IGNORECASE,
        )
        for match in og_pattern.finditer(html):
            _add_url(match.group(1))

        # 2. Extract img srcset attributes (take highest resolution variant)
        srcset_pattern = re.compile(
            r'<img\s[^>]*srcset=["\']([^"\']+)["\']', re.IGNORECASE
        )
        for match in srcset_pattern.finditer(html):
            srcset_value = match.group(1)
            # srcset format: "url1 320w, url2 1024w" -- take the last (highest res)
            candidates = [
                part.strip().split()[0]
                for part in srcset_value.split(",")
                if part.strip()
            ]
            # Filter to Flatfox image paths only
            flatfox_candidates = [
                c for c in candidates if "/thumb/" in c or "/media/" in c
            ]
            if flatfox_candidates:
                _add_url(flatfox_candidates[-1])  # Last = highest resolution

        # 3. Extract img src attributes with /thumb/ or /media/ paths
        src_pattern = re.compile(
            r'<img\s[^>]*src=["\']([^"\']*(?:/thumb/|/media/)[^"\']*)["\']',
            re.IGNORECASE,
        )
        for match in src_pattern.finditer(html):
            _add_url(match.group(1))

        # Limit to MAX_LISTING_IMAGES
        return urls[:MAX_LISTING_IMAGES]

    async def close(self) -> None:
        """Close the httpx client and release connections."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance used by routers and lifespan
flatfox_client = FlatfoxClient()
