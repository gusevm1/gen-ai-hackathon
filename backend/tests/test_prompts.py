"""Unit tests for prompt template generation.

Covers: EVAL-05 (language in prompt), prompt formatting, data handling.
"""

import pytest
from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences


class TestBuildSystemPrompt:
    """Tests for build_system_prompt function."""

    def test_german_prompt(self):
        """build_system_prompt('de') returns prompt containing 'German'."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "German" in prompt
        assert "evaluation" in prompt.lower() or "evaluat" in prompt.lower()

    def test_french_prompt(self):
        """build_system_prompt('fr') returns prompt containing 'French'."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("fr")
        assert "French" in prompt

    def test_default_language_is_german(self):
        """build_system_prompt with no arg defaults to 'de' (German)."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt()
        assert "German" in prompt


class TestBuildUserPrompt:
    """Tests for build_user_prompt function."""

    @pytest.fixture
    def full_listing(self):
        return FlatfoxListing(
            pk=1788170,
            slug="test-listing",
            url="/en/flat/test/1788170/",
            short_url="https://flatfox.ch/en/flat/1788170/",
            status="act",
            offer_type="RENT",
            object_category="APARTMENT",
            object_type="APARTMENT",
            rent_net=1540,
            rent_charges=250,
            rent_gross=1790,
            price_display=1790,
            description_title="Sunny Apartment",
            description="A beautiful sunny apartment in the heart of Zurich.",
            surface_living=65,
            number_of_rooms="3.5",
            floor=2,
            street="Bahnhofstrasse 1",
            zipcode=8001,
            city="Zurich",
            public_address="Bahnhofstrasse 1, 8001 Zurich",
            state="ZH",
        )

    @pytest.fixture
    def full_preferences(self):
        return UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            budget_min=1500,
            budget_max=2500,
            rooms_min=2.0,
            rooms_max=4.0,
            living_space_min=50,
            living_space_max=100,
            soft_criteria=["near Bahnhof", "quiet neighborhood"],
            features=["balcony", "parking"],
            importance={"location": "high", "price": "high", "size": "medium", "features": "medium", "condition": "low"},
        )

    @pytest.fixture
    def minimal_listing(self):
        return FlatfoxListing(
            pk=9999999,
            slug="test-minimal",
            url="/en/flat/test-minimal/9999999/",
            short_url="https://flatfox.ch/en/flat/9999999/",
            status="act",
            offer_type="RENT",
            object_category="APARTMENT",
            object_type="APARTMENT",
        )

    def test_formats_listing_fields(self, full_listing, full_preferences):
        """build_user_prompt formats listing fields (address, price, rooms)."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "Bahnhofstrasse 1, 8001 Zurich" in prompt
        assert "1,790" in prompt or "1790" in prompt
        assert "3.5" in prompt

    def test_formats_preferences(self, full_listing, full_preferences):
        """build_user_prompt formats preferences (budget, weights, soft criteria)."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "1,500" in prompt or "1500" in prompt
        assert "2,500" in prompt or "2500" in prompt
        assert "near Bahnhof" in prompt
        assert "quiet neighborhood" in prompt
        assert "balcony" in prompt
        assert "parking" in prompt

    def test_truncates_long_description(self, full_preferences):
        """build_user_prompt truncates description to ~2000 chars."""
        from app.prompts.scoring import build_user_prompt

        listing = FlatfoxListing(
            pk=1,
            slug="long-desc",
            url="/en/flat/long/1/",
            short_url="https://flatfox.ch/en/flat/1/",
            status="act",
            offer_type="RENT",
            object_category="APARTMENT",
            object_type="APARTMENT",
            description="A" * 5000,
        )
        prompt = build_user_prompt(listing, full_preferences)
        # The description in the prompt should be truncated
        assert "A" * 5000 not in prompt
        # But some portion should be present
        assert "A" * 100 in prompt

    def test_handles_none_fields(self, minimal_listing, full_preferences):
        """build_user_prompt handles None/missing fields gracefully (shows 'Not specified')."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(minimal_listing, full_preferences)
        assert "Not specified" in prompt
        # Should NOT crash with None fields
        assert prompt  # Non-empty

    def test_includes_all_weight_categories(self, full_listing, full_preferences):
        """build_user_prompt includes all 5 weight categories from preferences."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "Location" in prompt or "location" in prompt
        assert "Price" in prompt or "price" in prompt
        assert "Size" in prompt or "size" in prompt
        assert "Features" in prompt or "features" in prompt
        assert "Condition" in prompt or "condition" in prompt
