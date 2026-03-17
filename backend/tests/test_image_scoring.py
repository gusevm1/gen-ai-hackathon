"""Tests for image URL extraction from Flatfox listing detail pages.

Covers: EXT-04, EXT-05 (image analysis in scoring pipeline).

Tests:
- Image URL extraction from og:image meta tags and img srcset attributes
- Graceful fallback on HTTP errors
- URL deduplication
- Maximum 5 image limit for token cost control
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.flatfox import FlatfoxClient


# --- Sample HTML fixtures ---

LISTING_HTML_WITH_IMAGES = """
<!DOCTYPE html>
<html>
<head>
    <meta property="og:image" content="https://flatfox.ch/thumb/ff/2024/05/abc123.jpg?signature=sig1" />
    <meta property="og:title" content="Test Listing" />
</head>
<body>
    <div class="listing-gallery">
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img001.jpg?signature=sig2 320w, https://flatfox.ch/thumb/ff/2024/05/img001_large.jpg?signature=sig3 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img002.jpg?signature=sig4 320w, https://flatfox.ch/thumb/ff/2024/05/img002_large.jpg?signature=sig5 1024w" />
        <img src="https://flatfox.ch/media/uploads/2024/kitchen.jpg" />
    </div>
</body>
</html>
"""

LISTING_HTML_NO_IMAGES = """
<!DOCTYPE html>
<html>
<head>
    <meta property="og:title" content="Test Listing" />
</head>
<body>
    <div class="listing-details">
        <p>No images here.</p>
    </div>
</body>
</html>
"""

LISTING_HTML_MANY_IMAGES = """
<!DOCTYPE html>
<html>
<head>
    <meta property="og:image" content="https://flatfox.ch/thumb/ff/2024/05/og_img.jpg?signature=sig0" />
</head>
<body>
    <div class="listing-gallery">
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img01_large.jpg?sig=s1 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img02_large.jpg?sig=s2 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img03_large.jpg?sig=s3 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img04_large.jpg?sig=s4 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img05_large.jpg?sig=s5 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img06_large.jpg?sig=s6 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/img07_large.jpg?sig=s7 1024w" />
    </div>
</body>
</html>
"""

LISTING_HTML_DUPLICATE_IMAGES = """
<!DOCTYPE html>
<html>
<head>
    <meta property="og:image" content="https://flatfox.ch/thumb/ff/2024/05/same_img.jpg?signature=sig1" />
</head>
<body>
    <div class="listing-gallery">
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/same_img.jpg?signature=sig1 1024w" />
        <img srcset="https://flatfox.ch/thumb/ff/2024/05/other_img.jpg?signature=sig2 1024w" />
    </div>
</body>
</html>
"""


def _mock_response(html: str, status_code: int = 200) -> httpx.Response:
    """Create a mock httpx.Response with given HTML content."""
    return httpx.Response(
        status_code=status_code,
        text=html,
        request=httpx.Request("GET", "https://flatfox.ch/en/flat/test/123/"),
    )


@pytest.mark.asyncio
async def test_get_listing_page_data_extracts_images():
    """Test 1: get_listing_page_data returns PageData with image URLs."""
    client = FlatfoxClient()
    mock_resp = _mock_response(LISTING_HTML_WITH_IMAGES)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        page_data = await client.get_listing_page_data("test-slug", 123)

    urls = page_data.image_urls
    assert isinstance(urls, list)
    assert len(urls) > 0
    assert any("abc123" in url for url in urls)
    assert any("img001" in url for url in urls)
    assert any("img002" in url for url in urls)


@pytest.mark.asyncio
async def test_get_listing_page_data_empty_when_no_images():
    """Test 2: get_listing_page_data returns empty images when HTML has none."""
    client = FlatfoxClient()
    mock_resp = _mock_response(LISTING_HTML_NO_IMAGES)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        page_data = await client.get_listing_page_data("test-slug", 456)

    assert page_data.image_urls == []


@pytest.mark.asyncio
async def test_get_listing_page_data_empty_on_http_error():
    """Test 3: get_listing_page_data returns empty PageData on HTTP error."""
    client = FlatfoxClient()

    with patch(
        "httpx.AsyncClient.get",
        new_callable=AsyncMock,
        side_effect=httpx.HTTPStatusError(
            "Not found",
            request=httpx.Request("GET", "https://flatfox.ch/en/flat/test/999/"),
            response=httpx.Response(404),
        ),
    ):
        page_data = await client.get_listing_page_data("test-slug", 999)

    assert page_data.image_urls == []


@pytest.mark.asyncio
async def test_get_listing_page_data_empty_on_network_error():
    """get_listing_page_data returns empty PageData on network error."""
    client = FlatfoxClient()

    with patch(
        "httpx.AsyncClient.get",
        new_callable=AsyncMock,
        side_effect=httpx.ConnectError("Connection refused"),
    ):
        page_data = await client.get_listing_page_data("test-slug", 999)

    assert page_data.image_urls == []


@pytest.mark.asyncio
async def test_get_listing_page_data_deduplicates():
    """Test 4a: Image URLs are deduplicated."""
    client = FlatfoxClient()
    mock_resp = _mock_response(LISTING_HTML_DUPLICATE_IMAGES)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        page_data = await client.get_listing_page_data("test-slug", 789)

    urls = page_data.image_urls
    same_img_count = sum(1 for url in urls if "same_img" in url)
    assert same_img_count == 1
    assert any("other_img" in url for url in urls)
    assert len(urls) == 2


@pytest.mark.asyncio
async def test_get_listing_page_data_limited_to_5():
    """Test 4b: Image URLs are limited to max 5 (token cost control)."""
    client = FlatfoxClient()
    mock_resp = _mock_response(LISTING_HTML_MANY_IMAGES)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        page_data = await client.get_listing_page_data("test-slug", 101)

    assert len(page_data.image_urls) <= 5
