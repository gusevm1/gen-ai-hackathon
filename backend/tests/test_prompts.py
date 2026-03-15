"""Unit tests for prompt template generation.

Covers: EVAL-05 (language in prompt), prompt formatting, data handling,
        PREF-14 (importance levels, dealbreaker semantics in prompts),
        SCHM-04 (dynamic fields with importance weighting in prompts).
"""

import pytest
from app.models.listing import FlatfoxListing
from app.models.preferences import DynamicField, UserPreferences


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


class TestDynamicFieldsPrompt:
    """Tests for dynamic fields rendering in scoring prompts (SCHM-04)."""

    @pytest.fixture
    def listing(self):
        return FlatfoxListing(
            pk=1,
            slug="test",
            url="/en/flat/test/1/",
            short_url="https://flatfox.ch/en/flat/1/",
            status="act",
            offer_type="RENT",
            object_category="APARTMENT",
            object_type="APARTMENT",
            rent_gross=1800,
            number_of_rooms="3.5",
            description="Test listing",
        )

    @pytest.fixture
    def prefs_with_dynamic_fields(self):
        return UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            budget_max=2500,
            features=["balcony"],
            importance={
                "location": "high",
                "price": "critical",
                "size": "medium",
                "features": "low",
                "condition": "medium",
            },
            dynamic_fields=[
                DynamicField(name="Near train station", value="within 500m", importance="critical"),
                DynamicField(name="Quiet neighborhood", value="", importance="high"),
                DynamicField(name="Good school district", value="", importance="medium"),
                DynamicField(name="Nice view", value="mountain view preferred", importance="low"),
            ],
        )

    @pytest.fixture
    def prefs_no_dynamic_fields(self):
        """Preferences with soft_criteria but no dynamic_fields (backward compat)."""
        return UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            soft_criteria=["near Bahnhof", "quiet neighborhood"],
            features=["balcony"],
            importance={
                "location": "medium",
                "price": "medium",
                "size": "medium",
                "features": "medium",
                "condition": "medium",
            },
        )

    def test_dynamic_fields_shows_custom_criteria_header(self, listing, prefs_with_dynamic_fields):
        """Prompt with dynamic fields shows 'Custom Criteria (by importance):' section."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "Custom Criteria (by importance):" in prompt

    def test_critical_importance_label(self, listing, prefs_with_dynamic_fields):
        """Critical-importance field appears under 'CRITICAL (must have):' label."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "CRITICAL (must have):" in prompt
        assert "Near train station" in prompt

    def test_high_importance_label(self, listing, prefs_with_dynamic_fields):
        """High-importance field appears under 'HIGH (strongly preferred):' label."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "HIGH (strongly preferred):" in prompt
        assert "Quiet neighborhood" in prompt

    def test_medium_importance_label(self, listing, prefs_with_dynamic_fields):
        """Medium-importance field appears under 'MEDIUM (nice to have):' label."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "MEDIUM (nice to have):" in prompt
        assert "Good school district" in prompt

    def test_low_importance_label(self, listing, prefs_with_dynamic_fields):
        """Low-importance field appears under 'LOW (minor preference):' label."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "LOW (minor preference):" in prompt
        assert "Nice view" in prompt

    def test_dynamic_field_with_value_renders_name_colon_value(self, listing, prefs_with_dynamic_fields):
        """Dynamic field with value renders as 'name: value'."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "Near train station: within 500m" in prompt

    def test_dynamic_field_without_value_renders_name_only(self, listing, prefs_with_dynamic_fields):
        """Dynamic field without value renders as just 'name'."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        # "Quiet neighborhood" has no value, should appear without colon
        # Check it appears but NOT with a trailing ": "
        assert "Quiet neighborhood" in prompt
        # Ensure "Quiet neighborhood:" is NOT in the prompt (no trailing colon for empty value)
        lines = prompt.split("\n")
        quiet_lines = [l for l in lines if "Quiet neighborhood" in l]
        assert len(quiet_lines) > 0
        for line in quiet_lines:
            # Should be "- Quiet neighborhood" not "- Quiet neighborhood: "
            assert "Quiet neighborhood:" not in line

    def test_empty_dynamic_fields_no_custom_criteria_section(self, listing):
        """Empty dynamic_fields produces no Custom Criteria section."""
        from app.prompts.scoring import build_user_prompt

        prefs = UserPreferences(
            location="Zurich",
            offer_type="RENT",
            object_category="APARTMENT",
            dynamic_fields=[],
            features=[],
            importance={
                "location": "medium",
                "price": "medium",
                "size": "medium",
                "features": "medium",
                "condition": "medium",
            },
        )
        prompt = build_user_prompt(listing, prefs)
        assert "Custom Criteria" not in prompt

    def test_system_prompt_references_custom_criterion(self):
        """System prompt references 'custom criterion' instead of 'soft criterion'."""
        from app.prompts.scoring import build_system_prompt

        prompt = build_system_prompt("de")
        assert "custom criterion" in prompt or "custom criteria" in prompt

    def test_prompt_no_soft_criteria_line_when_dynamic_fields_exist(self, listing, prefs_with_dynamic_fields):
        """Prompt no longer contains 'Soft criteria:' line when dynamic fields exist."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_with_dynamic_fields)
        assert "Soft criteria:" not in prompt

    def test_backward_compat_soft_criteria_when_no_dynamic_fields(self, listing, prefs_no_dynamic_fields):
        """Existing soft_criteria still render when dynamic_fields is empty."""
        from app.prompts.scoring import build_user_prompt

        prompt = build_user_prompt(listing, prefs_no_dynamic_fields)
        assert "near Bahnhof" in prompt
        assert "quiet neighborhood" in prompt
