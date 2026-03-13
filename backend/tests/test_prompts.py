"""Unit tests for prompt template generation.

Covers: EVAL-05 (language in prompt), prompt formatting, data handling,
        PREF-14 (importance levels, dealbreaker semantics in prompts).
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

    def test_system_prompt_includes_dealbreaker_rules(self):
        """System prompt contains DEALBREAKER RULES section with score-0 instructions."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "DEALBREAKER" in prompt
        assert "score" in prompt.lower() and "0" in prompt

    def test_system_prompt_includes_importance_levels(self):
        """System prompt contains IMPORTANCE LEVELS section with weight mapping."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "IMPORTANCE LEVELS" in prompt
        assert "critical=90" in prompt


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
            importance={"location": "high", "price": "critical", "size": "medium", "features": "low", "condition": "medium"},
            budget_dealbreaker=True,
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
        """build_user_prompt formats preferences (budget, features, soft criteria)."""
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

    def test_includes_all_importance_categories(self, full_listing, full_preferences):
        """build_user_prompt includes all 5 importance categories with level labels."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        # Should contain importance levels as uppercase labels
        assert "HIGH" in prompt
        assert "CRITICAL" in prompt
        assert "MEDIUM" in prompt
        assert "LOW" in prompt
        # All 5 categories present
        assert "Location" in prompt
        assert "Price" in prompt
        assert "Size" in prompt
        assert "Features" in prompt or "features" in prompt
        assert "Condition" in prompt

    def test_user_prompt_includes_dealbreaker_section(self, full_listing, full_preferences):
        """With budget_dealbreaker=True and budget_max=2500, prompt shows HARD LIMIT."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "DEALBREAKER" in prompt or "HARD LIMIT" in prompt
        assert "2,500" in prompt

    def test_user_prompt_omits_dealbreakers_when_none_active(self, full_listing):
        """With all dealbreakers=False, prompt does NOT contain HARD LIMIT."""
        from app.prompts.scoring import build_user_prompt

        prefs = UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            budget_min=1500,
            budget_max=2500,
            budget_dealbreaker=False,
            rooms_dealbreaker=False,
            living_space_dealbreaker=False,
            features=["balcony"],
            importance={"location": "high", "price": "high", "size": "medium", "features": "medium", "condition": "low"},
        )
        prompt = build_user_prompt(full_listing, prefs)
        assert "HARD LIMIT" not in prompt

    def test_user_prompt_includes_floor_preference(self, full_listing, full_preferences):
        """User prompt includes floor preference field."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "Floor preference" in prompt or "floor preference" in prompt

    def test_user_prompt_includes_availability(self, full_listing, full_preferences):
        """User prompt includes availability field."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "Availability" in prompt or "availability" in prompt

    def test_user_prompt_no_numeric_weights(self, full_listing, full_preferences):
        """User prompt does NOT contain old 'Category weights (0-100' format."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(full_listing, full_preferences)
        assert "Category weights (0-100" not in prompt

    def test_user_prompt_budget_dealbreaker_no_max_omits_line(self, full_listing):
        """When budget_dealbreaker=True but budget_max is None, skip that dealbreaker line."""
        from app.prompts.scoring import build_user_prompt

        prefs = UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            budget_dealbreaker=True,
            budget_max=None,
            features=[],
            importance={"location": "medium", "price": "medium", "size": "medium", "features": "medium", "condition": "medium"},
        )
        prompt = build_user_prompt(full_listing, prefs)
        # Should not have a budget dealbreaker line since no threshold
        assert "Budget max" not in prompt or "HARD LIMIT" not in prompt
