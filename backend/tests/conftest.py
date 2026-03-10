"""Shared test fixtures for backend tests."""

import pytest


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "integration: marks tests that hit external APIs (deselect with '-m \"not integration\"')",
    )


# Verified Flatfox API response for pk=1788170 (fetched 2026-03-10)
SAMPLE_LISTING_JSON = {
    "pk": 1788170,
    "slug": "platanenweg-7-4914-roggwil-be",
    "url": "/en/flat/platanenweg-7-4914-roggwil-be/1788170/",
    "short_url": "https://flatfox.ch/en/flat/1788170/",
    "status": "act",
    "offer_type": "RENT",
    "object_category": "APARTMENT",
    "object_type": "APARTMENT",
    "rent_net": 1540,
    "rent_charges": 250,
    "rent_gross": 1790,
    "price_display": 1790,
    "price_display_type": "TOTAL",
    "price_unit": "monthly",
    "short_title": None,
    "public_title": None,
    "pitch_title": None,
    "description_title": "Hier sind Sie auf der Sonnenseite",
    "description": "Lieben Sie Ruhe und Erholung?",
    "surface_living": 29,
    "surface_property": None,
    "surface_usable": None,
    "number_of_rooms": "1.0",
    "floor": 1,
    "street": "Platanenweg 7",
    "zipcode": 4914,
    "city": "Roggwil BE",
    "public_address": "Platanenweg 7, 4914 Roggwil BE",
    "latitude": 47.24511562,
    "longitude": 7.818068100000001,
    "state": "BE",
    "country": "CH",
    "attributes": [
        {"name": "garage"},
        {"name": "balconygarden"},
        {"name": "parkingspace"},
        {"name": "petsallowed"},
        {"name": "cable"},
    ],
    "is_furnished": False,
    "is_temporary": False,
    "year_built": 1963,
    "year_renovated": 2019,
    "moving_date_type": "imm",
    "moving_date": None,
    "published": "2024-11-15T09:00:00Z",
    "created": "2024-11-14T14:30:00Z",
    "cover_image": 32540859,
    "images": [32540859, 32540860, 32540861],
    "documents": [],
    "video_url": None,
    "tour_url": None,
    "agency": {
        "name": "Test Agency",
        "name_2": None,
        "street": "Main St 1",
        "zipcode": "4914",
        "city": "Roggwil",
        "country": "CH",
        "logo": {
            "url": "https://flatfox.ch/media/agency/logo.png",
            "url_org_logo_m": None,
        },
    },
    "reserved": False,
}

# Minimal listing with only required fields, all optionals missing
MINIMAL_LISTING_JSON = {
    "pk": 9999999,
    "slug": "test-minimal",
    "url": "/en/flat/test-minimal/9999999/",
    "short_url": "https://flatfox.ch/en/flat/9999999/",
    "status": "act",
    "offer_type": "RENT",
    "object_category": "APARTMENT",
    "object_type": "APARTMENT",
}


@pytest.fixture
def sample_listing_json():
    """Return a full sample Flatfox listing JSON."""
    return SAMPLE_LISTING_JSON.copy()


@pytest.fixture
def minimal_listing_json():
    """Return a minimal Flatfox listing JSON with only required fields."""
    return MINIMAL_LISTING_JSON.copy()


@pytest.fixture(autouse=True)
async def reset_flatfox_client():
    """Reset the singleton flatfox_client between tests to avoid stale event loop."""
    yield
    from app.services.flatfox import flatfox_client

    # Force close and reset so next test gets a fresh client
    if flatfox_client._client and not flatfox_client._client.is_closed:
        await flatfox_client._client.aclose()
    flatfox_client._client = None
