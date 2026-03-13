"""Unit tests for the canonical UserPreferences Pydantic model.

Tests both new-format and legacy-format JSONB parsing, defaults,
backward compatibility, and the IMPORTANCE_WEIGHT_MAP.
"""

import pytest
from pydantic import ValidationError

from app.models.preferences import (
    IMPORTANCE_WEIGHT_MAP,
    Importance,
    ImportanceLevel,
    UserPreferences,
)
from tests.conftest import LEGACY_PREFERENCES_JSON, SAMPLE_PREFERENCES_JSON


class TestParseNewFormat:
    """Tests for parsing new canonical preferences format."""

    def test_parse_new_format(self):
        """New-format JSONB with importance levels parses correctly."""
        prefs = UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)

        assert prefs.location == "Zurich"
        assert prefs.importance.location == ImportanceLevel.HIGH
        assert prefs.importance.price == ImportanceLevel.CRITICAL
        assert prefs.importance.size == ImportanceLevel.MEDIUM
        assert prefs.importance.features == ImportanceLevel.LOW
        assert prefs.importance.condition == ImportanceLevel.MEDIUM
        assert prefs.features == ["balcony", "parking"]
        assert prefs.budget_dealbreaker is True
        assert prefs.rooms_dealbreaker is False
        assert prefs.living_space_dealbreaker is False
        assert prefs.floor_preference == "any"
        assert prefs.availability == "any"

    def test_round_trips_all_fields(self):
        """All new-format fields round-trip through model_validate."""
        prefs = UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)

        assert prefs.offer_type.value == "RENT"
        assert prefs.object_category.value == "APARTMENT"
        assert prefs.budget_min == 1500
        assert prefs.budget_max == 2500
        assert prefs.rooms_min == 2.0
        assert prefs.rooms_max == 4.0
        assert prefs.living_space_min == 50
        assert prefs.living_space_max == 100
        assert prefs.soft_criteria == ["near Bahnhof", "quiet neighborhood"]
        assert prefs.language == "de"


class TestParseLegacyFormat:
    """Tests for backward-compatible parsing of old-format JSONB."""

    def test_parse_legacy_format(self):
        """Old-format JSONB (weights + selectedFeatures) parses without error."""
        prefs = UserPreferences.model_validate(LEGACY_PREFERENCES_JSON)

        # importance defaults to all medium (old weights are NOT numerically converted)
        assert prefs.importance.location == ImportanceLevel.MEDIUM
        assert prefs.importance.price == ImportanceLevel.MEDIUM
        assert prefs.importance.size == ImportanceLevel.MEDIUM
        assert prefs.importance.features == ImportanceLevel.MEDIUM
        assert prefs.importance.condition == ImportanceLevel.MEDIUM

        # selectedFeatures migrated to features
        assert prefs.features == ["balcony", "parking"]

        # dealbreakers default to false (not present in old format)
        assert prefs.budget_dealbreaker is False
        assert prefs.rooms_dealbreaker is False
        assert prefs.living_space_dealbreaker is False

    def test_legacy_standard_fields_preserved(self):
        """Standard filter fields from legacy format are preserved."""
        prefs = UserPreferences.model_validate(LEGACY_PREFERENCES_JSON)

        assert prefs.location == "Zurich"
        assert prefs.offer_type.value == "RENT"
        assert prefs.budget_min == 1500
        assert prefs.budget_max == 2500
        assert prefs.rooms_min == 2.0
        assert prefs.rooms_max == 4.0


class TestDefaults:
    """Tests for default values when parsing empty or minimal dicts."""

    def test_parse_empty_dict(self):
        """Empty dict parses with all defaults."""
        prefs = UserPreferences.model_validate({})

        assert prefs.location == ""
        assert prefs.offer_type.value == "RENT"
        assert prefs.object_category.value == "ANY"
        assert prefs.budget_min is None
        assert prefs.budget_max is None
        assert prefs.rooms_min is None
        assert prefs.rooms_max is None
        assert prefs.living_space_min is None
        assert prefs.living_space_max is None
        assert prefs.soft_criteria == []
        assert prefs.features == []
        assert prefs.budget_dealbreaker is False
        assert prefs.rooms_dealbreaker is False
        assert prefs.living_space_dealbreaker is False
        assert prefs.floor_preference == "any"
        assert prefs.availability == "any"
        assert prefs.language == "de"
        assert prefs.importance.location == ImportanceLevel.MEDIUM
        assert prefs.importance.price == ImportanceLevel.MEDIUM
        assert prefs.importance.size == ImportanceLevel.MEDIUM
        assert prefs.importance.features == ImportanceLevel.MEDIUM
        assert prefs.importance.condition == ImportanceLevel.MEDIUM

    def test_extra_fields_ignored(self):
        """Extra unknown fields in JSONB are silently ignored."""
        data = {
            "weights": {"location": 80, "price": 70, "size": 60, "features": 50, "condition": 40},
            "unknownField": 123,
            "anotherWeirdField": "hello",
        }
        # Should not raise
        prefs = UserPreferences.model_validate(data)
        assert prefs.location == ""  # default


class TestImportanceWeightMap:
    """Tests for the IMPORTANCE_WEIGHT_MAP constant."""

    def test_importance_weight_map_values(self):
        """IMPORTANCE_WEIGHT_MAP maps critical=90, high=70, medium=50, low=30."""
        assert IMPORTANCE_WEIGHT_MAP[ImportanceLevel.CRITICAL] == 90
        assert IMPORTANCE_WEIGHT_MAP[ImportanceLevel.HIGH] == 70
        assert IMPORTANCE_WEIGHT_MAP[ImportanceLevel.MEDIUM] == 50
        assert IMPORTANCE_WEIGHT_MAP[ImportanceLevel.LOW] == 30

    def test_importance_weight_map_covers_all_levels(self):
        """IMPORTANCE_WEIGHT_MAP has an entry for every ImportanceLevel."""
        for level in ImportanceLevel:
            assert level in IMPORTANCE_WEIGHT_MAP


class TestCamelCaseAliases:
    """Tests for camelCase alias parsing from Supabase JSONB."""

    def test_camel_case_aliases(self):
        """Parse camelCase keys -> correct snake_case fields."""
        data = {
            "budgetMin": 2000,
            "budgetMax": 3000,
            "roomsMin": 2.5,
            "roomsMax": 4.5,
            "livingSpaceMin": 60,
            "livingSpaceMax": 120,
            "budgetDealbreaker": True,
            "roomsDealbreaker": True,
            "livingSpaceDealbreaker": False,
            "floorPreference": "ground",
            "offerType": "SALE",
            "objectCategory": "HOUSE",
        }
        prefs = UserPreferences.model_validate(data)

        assert prefs.budget_min == 2000
        assert prefs.budget_max == 3000
        assert prefs.rooms_min == 2.5
        assert prefs.rooms_max == 4.5
        assert prefs.living_space_min == 60
        assert prefs.living_space_max == 120
        assert prefs.budget_dealbreaker is True
        assert prefs.rooms_dealbreaker is True
        assert prefs.living_space_dealbreaker is False
        assert prefs.floor_preference == "ground"
        assert prefs.offer_type.value == "SALE"
        assert prefs.object_category.value == "HOUSE"


class TestLanguageLiteral:
    """Tests for the language field (Literal type)."""

    def test_language_accepts_valid_values(self):
        """Language field accepts de, en, fr, it."""
        for lang in ["de", "en", "fr", "it"]:
            prefs = UserPreferences(language=lang)
            assert prefs.language == lang

    def test_language_rejects_invalid_value(self):
        """Language field rejects invalid values."""
        with pytest.raises(ValidationError):
            UserPreferences(language="es")
