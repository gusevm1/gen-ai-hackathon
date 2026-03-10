"""Tests for Pydantic listing and preferences models (RED phase - should fail until models exist)."""

from tests.conftest import SAMPLE_LISTING_JSON, MINIMAL_LISTING_JSON


class TestFlatfoxListingModel:
    """Test FlatfoxListing Pydantic model parsing."""

    def test_parse_full_listing(self):
        """Full Flatfox API response parses without errors, key fields are correct."""
        from app.models.listing import FlatfoxListing

        listing = FlatfoxListing.model_validate(SAMPLE_LISTING_JSON)
        assert listing.pk == 1788170
        assert listing.offer_type == "RENT"
        assert listing.rent_gross == 1790
        assert listing.number_of_rooms == "1.0"
        assert len(listing.attributes) == 5

    def test_parse_minimal_listing(self):
        """Minimal listing with only required fields parses; optionals default to None."""
        from app.models.listing import FlatfoxListing

        listing = FlatfoxListing.model_validate(MINIMAL_LISTING_JSON)
        assert listing.pk == 9999999
        assert listing.rent_gross is None
        assert listing.rent_net is None
        assert listing.number_of_rooms is None
        assert listing.surface_living is None
        assert listing.city is None
        assert listing.latitude is None
        assert listing.attributes == []

    def test_attribute_names(self):
        """Attributes parse as FlatfoxAttribute objects with .name property."""
        from app.models.listing import FlatfoxListing

        listing = FlatfoxListing.model_validate(SAMPLE_LISTING_JSON)
        assert listing.attributes[0].name == "garage"
        assert listing.attributes[1].name == "balconygarden"

    def test_coordinates(self):
        """Latitude and longitude are floats."""
        from app.models.listing import FlatfoxListing

        listing = FlatfoxListing.model_validate(SAMPLE_LISTING_JSON)
        assert isinstance(listing.latitude, float)
        assert isinstance(listing.longitude, float)
        assert listing.latitude == pytest.approx(47.24511562)
        assert listing.longitude == pytest.approx(7.818068100000001)


class TestUserPreferencesModel:
    """Test UserPreferences Pydantic model defaults."""

    def test_preferences_defaults(self):
        """UserPreferences() has offer_type RENT, all weights 50."""
        from app.models.preferences import UserPreferences, OfferType

        prefs = UserPreferences()
        assert prefs.offer_type == OfferType.RENT
        assert prefs.weights.location == 50
        assert prefs.weights.price == 50
        assert prefs.weights.size == 50
        assert prefs.weights.features == 50
        assert prefs.weights.condition == 50

    def test_preferences_custom_values(self):
        """UserPreferences can be created with custom values."""
        from app.models.preferences import UserPreferences, OfferType, ObjectCategory

        prefs = UserPreferences(
            location="Zurich",
            offer_type=OfferType.SALE,
            object_category=ObjectCategory.HOUSE,
            budget_min=500000,
            budget_max=1000000,
        )
        assert prefs.location == "Zurich"
        assert prefs.offer_type == OfferType.SALE
        assert prefs.object_category == ObjectCategory.HOUSE
        assert prefs.budget_min == 500000
        assert prefs.budget_max == 1000000


# Need to import pytest for approx
import pytest
