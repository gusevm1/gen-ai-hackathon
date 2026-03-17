"""Async HTTP client for Flatfox public API.

Uses httpx.AsyncClient with lazy initialization and singleton pattern.
The client fetches listing data from Flatfox's public API and parses
responses into Pydantic models.

Endpoint: GET /api/v1/public-listing/{pk}/
No authentication required.

Also provides image URL extraction and price scraping from listing
detail HTML pages. The Flatfox public API can return stale/incorrect
prices that differ from what the website displays, so we scrape the
actual displayed price from the HTML and override API values.
"""

import html as html_mod
import json
import logging
import re
from dataclasses import dataclass, field

import httpx

from app.models.listing import FlatfoxListing

logger = logging.getLogger(__name__)

# Max images to include in scoring prompt (token cost control:
# ~1334 tokens per 1000x1000 image, 5 images = ~6700 tokens)
MAX_LISTING_IMAGES = 5

FLATFOX_BASE_URL = "https://flatfox.ch/api/v1"


@dataclass
class WebPrices:
    """Prices scraped from Flatfox listing HTML page."""
    rent_gross: int | None = None
    rent_net: int | None = None
    rent_charges: int | None = None


@dataclass
class PageData:
    """Combined data extracted from a Flatfox listing HTML page."""
    image_urls: list[str] = field(default_factory=list)
    web_prices: WebPrices = field(default_factory=WebPrices)


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

    async def get_listing_page_data(self, slug: str, pk: int) -> "PageData":
        """Fetch listing detail HTML and extract images + displayed prices.

        The Flatfox public API can return stale prices that differ from
        what the website actually displays. This method scrapes the real
        displayed price from the HTML page and returns it alongside images.

        Args:
            slug: The listing URL slug (e.g., "platanenweg-7-4914-roggwil-be").
            pk: The listing primary key.

        Returns:
            PageData with image URLs and scraped web prices.
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as html_client:
                url = f"https://flatfox.ch/en/flat/{slug}/{pk}/"
                response = await html_client.get(url)
                response.raise_for_status()
                page_html = response.text

            images = self._parse_image_urls(page_html)
            prices = self._parse_web_prices(page_html)

            if prices.rent_gross is not None:
                logger.info(
                    "Listing %d: web price CHF %d (scraped from HTML)",
                    pk, prices.rent_gross,
                )

            return PageData(image_urls=images, web_prices=prices)

        except Exception:
            logger.debug(
                "Could not fetch page data for listing %s/%d -- falling back",
                slug, pk,
            )
            return PageData()

    @staticmethod
    def _parse_image_urls(html: str) -> list[str]:
        """Parse image URLs from listing detail HTML.

        Extracts from og:image meta tags and img srcset/src attributes.
        Deduplicates and limits to MAX_LISTING_IMAGES.
        """
        urls: list[str] = []
        seen: set[str] = set()

        def _add_url(url: str) -> None:
            """Add a URL if not already seen. Ensures HTTPS."""
            url = url.strip()
            if url.startswith("//"):
                url = "https:" + url
            elif url.startswith("http://"):
                url = url.replace("http://", "https://", 1)
            if url and url.startswith("https://") and url not in seen:
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

    @staticmethod
    def _parse_web_prices(page_html: str) -> WebPrices:
        """Extract displayed prices from Flatfox listing HTML.

        Uses two sources:
        1. data-ad-slot-keywords JSON (has reliable price_display)
        2. CHF text patterns for rent breakdown (gross/net/charges)
        """
        prices = WebPrices()

        # 1. Extract price_display from embedded ad-slot JSON
        ad_match = re.search(r'data-ad-slot-keywords="([^"]*)"', page_html)
        if ad_match:
            try:
                ad_data = json.loads(html_mod.unescape(ad_match.group(1)))
                pd = ad_data.get("price_display")
                if isinstance(pd, (int, float)) and pd > 0:
                    prices.rent_gross = int(pd)
            except (json.JSONDecodeError, ValueError):
                pass

        # 2. Extract breakdown from "CHF X'XXX per month" text patterns
        chf_pattern = re.compile(
            r"CHF\s*([\d',.]+)\s*(?:incl\.\s*utilities\s*)?per\s*month"
        )
        parsed: list[int] = []
        seen: set[int] = set()
        for m in chf_pattern.finditer(page_html):
            cleaned = m.group(1).replace("'", "").replace(",", "").strip()
            try:
                val = int(cleaned)
                if val > 0 and val not in seen:
                    seen.add(val)
                    parsed.append(val)
            except ValueError:
                pass

        # Assign breakdown: first=gross, second=net, third=charges
        if len(parsed) >= 3:
            prices.rent_gross = prices.rent_gross or parsed[0]
            prices.rent_net = parsed[1]
            prices.rent_charges = parsed[2]
        elif len(parsed) >= 1:
            prices.rent_gross = prices.rent_gross or parsed[0]

        return prices

    async def close(self) -> None:
        """Close the httpx client and release connections."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance used by routers and lifespan
flatfox_client = FlatfoxClient()
