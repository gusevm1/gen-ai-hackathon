"""Shared test fixtures for backend tests."""

import pytest
from httpx import AsyncClient, ASGITransport


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


# camelCase preferences in the new canonical format (Phase 7 schema)
SAMPLE_PREFERENCES_JSON = {
    "location": "Zurich",
    "offerType": "RENT",
    "objectCategory": "APARTMENT",
    "budgetMin": 1500,
    "budgetMax": 2500,
    "budgetDealbreaker": True,
    "roomsMin": 2.0,
    "roomsMax": 4.0,
    "roomsDealbreaker": False,
    "livingSpaceMin": 50,
    "livingSpaceMax": 100,
    "livingSpaceDealbreaker": False,
    "floorPreference": "any",
    "availability": "any",
    "features": ["balcony", "parking"],
    "softCriteria": ["near Bahnhof", "quiet neighborhood"],
    "dynamicFields": [
        {"name": "near Bahnhof", "value": "", "importance": "high"},
        {"name": "quiet neighborhood", "value": "no main road", "importance": "medium"},
    ],
    "importance": {
        "location": "high",
        "price": "critical",
        "size": "medium",
        "features": "low",
        "condition": "medium",
    },
    "language": "de",
}

# Legacy format (v1.0) — old schema with numeric weights and selectedFeatures.
# Kept for backward-compatibility tests.
LEGACY_PREFERENCES_JSON = {
    "location": "Zurich",
    "offerType": "RENT",
    "objectCategory": "APARTMENT",
    "budgetMin": 1500,
    "budgetMax": 2500,
    "roomsMin": 2.0,
    "roomsMax": 4.0,
    "livingSpaceMin": 50,
    "livingSpaceMax": 100,
    "softCriteria": ["near Bahnhof", "quiet neighborhood"],
    "selectedFeatures": ["balcony", "parking"],
    "weights": {
        "location": 80,
        "price": 70,
        "size": 60,
        "features": 50,
        "condition": 40,
    },
    "language": "de",
}

# Sample ScoreResponse dict matching the Pydantic model structure
SAMPLE_SCORE_RESPONSE = {
    "overall_score": 72,
    "match_tier": "good",
    "summary_bullets": [
        "CHF 1,790/month is well within your CHF 2,500 budget -- good value",
        "Only 29 sqm living space, significantly below your 50 sqm minimum -- major compromise",
        "Located in Roggwil BE, not in your preferred Zurich area -- location mismatch",
    ],
    "categories": [
        {
            "name": "location",
            "score": 30,
            "weight": 80,
            "reasoning": [
                "Roggwil BE is not in your preferred Zurich area",
                "Canton BE, not ZH as requested",
            ],
        },
        {
            "name": "price",
            "score": 90,
            "weight": 70,
            "reasoning": [
                "CHF 1,790/month gross is well within CHF 1,500-2,500 budget",
            ],
        },
        {
            "name": "size",
            "score": 40,
            "weight": 60,
            "reasoning": [
                "29 sqm is below your 50 sqm minimum",
                "1.0 rooms is below your 2.0 minimum",
            ],
        },
        {
            "name": "features",
            "score": 65,
            "weight": 50,
            "reasoning": [
                "Has garage and parking space",
                "Balcony/garden available",
                "Pets allowed",
            ],
        },
        {
            "name": "condition",
            "score": 75,
            "weight": 40,
            "reasoning": [
                "Built in 1963, renovated in 2019",
                "Recent renovation is positive",
            ],
        },
    ],
    "checklist": [
        {
            "criterion": "near Bahnhof",
            "met": None,
            "note": "Not specified in listing -- cannot determine proximity to station",
        },
        {
            "criterion": "quiet neighborhood",
            "met": None,
            "note": "Not specified in listing",
        },
        {
            "criterion": "balcony",
            "met": True,
            "note": "balconygarden attribute present",
        },
        {
            "criterion": "parking",
            "met": True,
            "note": "parkingspace attribute present",
        },
    ],
    "language": "de",
}


@pytest.fixture
async def async_client():
    """Provide an httpx AsyncClient for FastAPI endpoint tests."""
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_preferences_json():
    """Return camelCase preferences dict in new canonical format."""
    return SAMPLE_PREFERENCES_JSON.copy()


@pytest.fixture
def legacy_preferences_json():
    """Return camelCase preferences dict in legacy v1.0 format (weights + selectedFeatures)."""
    return LEGACY_PREFERENCES_JSON.copy()


@pytest.fixture
def sample_score_response():
    """Return a sample ScoreResponse dict."""
    import copy

    return copy.deepcopy(SAMPLE_SCORE_RESPONSE)


@pytest.fixture(autouse=True)
async def reset_flatfox_client():
    """Reset the singleton flatfox_client between tests to avoid stale event loop."""
    yield
    from app.services.flatfox import flatfox_client

    # Force close and reset so next test gets a fresh client
    if flatfox_client._client and not flatfox_client._client.is_closed:
        await flatfox_client._client.aclose()
    flatfox_client._client = None


# ---------------------------------------------------------------------------
# Chat / Conversation fixtures (Phase 15)
# ---------------------------------------------------------------------------

SAMPLE_CHAT_MESSAGES = [
    {"role": "user", "content": "I'm looking for a 3-room apartment in Zurich for 2000-2500 CHF"}
]

SAMPLE_CLAUDE_RESPONSE_WITH_PREFS = (
    "Great, I have a good picture of what you're looking for! Let me summarize your preferences.\n\n"
    '<preferences_ready>{"location": "Zurich", "offer_type": "rent", "object_types": ["apartment"], '
    '"min_rooms": 3.0, "max_rooms": null, "min_living_space": null, "max_living_space": null, '
    '"min_price": 2000, "max_price": 2500, "price_is_dealbreaker": false, '
    '"rooms_is_dealbreaker": false, "space_is_dealbreaker": false, '
    '"floor_preference": "any", "availability": "any", "features": [], '
    '"soft_criteria": [{"name": "quiet neighborhood", "value": "no traffic", "importance": "high"}, '
    '{"name": "near public transport", "value": "", "importance": "medium"}], '
    '"importance": {"location": "high", "price": "high", "size": "medium", '
    '"features": "medium", "condition": "medium"}}</preferences_ready>'
)

SAMPLE_CLAUDE_RESPONSE_NO_PREFS = (
    "That sounds great! Zurich is a wonderful city. "
    "Could you tell me a bit more about your budget range? "
    "Are you looking to rent or buy?"
)


@pytest.fixture
def sample_chat_messages():
    """Return sample chat messages for testing."""
    import copy
    return copy.deepcopy(SAMPLE_CHAT_MESSAGES)


@pytest.fixture
def sample_claude_response_with_prefs():
    """Return a sample Claude response containing <preferences_ready> sentinel."""
    return SAMPLE_CLAUDE_RESPONSE_WITH_PREFS


@pytest.fixture
def sample_claude_response_no_prefs():
    """Return a sample Claude response without the sentinel tag."""
    return SAMPLE_CLAUDE_RESPONSE_NO_PREFS
