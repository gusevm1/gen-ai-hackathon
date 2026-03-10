"""Integration and endpoint tests for Flatfox API client and listings router."""

import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_listing_real_api():
    """Integration test: fetch a real listing from Flatfox."""
    from app.services.flatfox import FlatfoxClient

    client = FlatfoxClient()
    try:
        listing = await client.get_listing(1788170)
        assert listing.pk == 1788170
        assert listing.offer_type in ("RENT", "SALE")
        assert listing.city is not None
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_listings_endpoint():
    """Test GET /listings/{pk} returns structured listing data via ASGI transport."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/listings/1788170")
        assert response.status_code == 200
        data = response.json()
        assert data["pk"] == 1788170
        assert "offer_type" in data
        assert "attributes" in data


@pytest.mark.asyncio
async def test_listing_not_found():
    """Test that a nonexistent listing returns 404 or 502."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/listings/999999999")
        assert response.status_code in (404, 502)


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test that health endpoint still works after adding listings router."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "homematch-api"
