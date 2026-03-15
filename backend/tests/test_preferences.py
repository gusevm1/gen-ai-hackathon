"""Unit tests for the canonical UserPreferences Pydantic model.

Tests both new-format and legacy-format JSONB parsing, defaults,
backward compatibility, and the IMPORTANCE_WEIGHT_MAP.
"""

import pytest
from pydantic import ValidationError

from app.models.preferences import (
    IMPORTANCE_WEIGHT_MAP,
    DynamicField,
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


class TestDynamicFields:
    """Tests for the DynamicField model and dynamicFields on UserPreferences."""

    def test_dynamic_field_parses_from_camel_case(self):
        """DynamicField with name/value/importance parses correctly from camelCase JSON."""
        data = {"name": "near Bahnhof", "value": "within 500m", "importance": "high"}
        field = DynamicField.model_validate(data)

        assert field.name == "near Bahnhof"
        assert field.value == "within 500m"
        assert field.importance == ImportanceLevel.HIGH

    def test_user_preferences_with_dynamic_fields(self):
        """UserPreferences with dynamicFields array parses and round-trips."""
        data = {
            "dynamicFields": [
                {"name": "near Bahnhof", "value": "", "importance": "high"},
                {"name": "quiet neighborhood", "value": "no main road", "importance": "medium"},
            ]
        }
        prefs = UserPreferences.model_validate(data)

        assert len(prefs.dynamic_fields) == 2
        assert prefs.dynamic_fields[0].name == "near Bahnhof"
        assert prefs.dynamic_fields[0].value == ""
        assert prefs.dynamic_fields[0].importance == ImportanceLevel.HIGH
        assert prefs.dynamic_fields[1].name == "quiet neighborhood"
        assert prefs.dynamic_fields[1].value == "no main road"
        assert prefs.dynamic_fields[1].importance == ImportanceLevel.MEDIUM

    def test_empty_dict_produces_empty_dynamic_fields(self):
        """Empty dict parse produces dynamic_fields=[] (default)."""
        prefs = UserPreferences.model_validate({})
        assert prefs.dynamic_fields == []

    def test_dynamic_field_rejects_empty_name(self):
        """DynamicField rejects empty name (min length validation)."""
        with pytest.raises(ValidationError):
            DynamicField.model_validate({"name": "", "importance": "medium"})

    def test_dynamic_field_rejects_invalid_importance(self):
        """DynamicField rejects invalid importance level."""
        with pytest.raises(ValidationError):
            DynamicField.model_validate({"name": "test", "importance": "urgent"})

    def test_dynamic_field_defaults(self):
        """DynamicField defaults value to '' and importance to 'medium'."""
        field = DynamicField.model_validate({"name": "test criterion"})

        assert field.value == ""
        assert field.importance == ImportanceLevel.MEDIUM

    def test_sample_preferences_json_with_dynamic_fields(self):
        """SAMPLE_PREFERENCES_JSON (updated with dynamicFields) parses correctly."""
        prefs = UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)

        assert len(prefs.dynamic_fields) == 2
        assert prefs.dynamic_fields[0].name == "near Bahnhof"
        assert prefs.dynamic_fields[0].importance == ImportanceLevel.HIGH
        assert prefs.dynamic_fields[1].name == "quiet neighborhood"
        assert prefs.dynamic_fields[1].importance == ImportanceLevel.MEDIUM


class TestSoftCriteriaMigration:
    """Tests for softCriteria -> dynamicFields migration in model_validator."""

    def test_soft_criteria_migrates_to_dynamic_fields(self):
        """JSONB with softCriteria but no dynamicFields auto-migrates."""
        data = {
            "softCriteria": ["near Bahnhof", "quiet neighborhood"],
        }
        prefs = UserPreferences.model_validate(data)

        assert len(prefs.dynamic_fields) == 2
        assert prefs.dynamic_fields[0].name == "near Bahnhof"
        assert prefs.dynamic_fields[0].value == ""
        assert prefs.dynamic_fields[0].importance == ImportanceLevel.MEDIUM
        assert prefs.dynamic_fields[1].name == "quiet neighborhood"
        assert prefs.dynamic_fields[1].value == ""
        assert prefs.dynamic_fields[1].importance == ImportanceLevel.MEDIUM

    def test_both_soft_criteria_and_dynamic_fields_preserves_dynamic(self):
        """JSONB with both softCriteria and dynamicFields preserves dynamicFields."""
        data = {
            "softCriteria": ["old criterion"],
            "dynamicFields": [
                {"name": "new criterion", "value": "details", "importance": "high"},
            ],
        }
        prefs = UserPreferences.model_validate(data)

        # dynamicFields preserved, softCriteria NOT migrated (no double migration)
        assert len(prefs.dynamic_fields) == 1
        assert prefs.dynamic_fields[0].name == "new criterion"
        assert prefs.dynamic_fields[0].importance == ImportanceLevel.HIGH

    def test_snake_case_soft_criteria_migrates(self):
        """JSONB with soft_criteria (snake_case) also migrates correctly."""
        data = {
            "soft_criteria": ["near Bahnhof", "quiet area"],
        }
        prefs = UserPreferences.model_validate(data)

        assert len(prefs.dynamic_fields) == 2
        assert prefs.dynamic_fields[0].name == "near Bahnhof"
        assert prefs.dynamic_fields[1].name == "quiet area"

    def test_legacy_json_migrates_soft_criteria(self):
        """LEGACY_PREFERENCES_JSON (softCriteria only) auto-migrates to dynamicFields."""
        prefs = UserPreferences.model_validate(LEGACY_PREFERENCES_JSON)

        assert len(prefs.dynamic_fields) == 2
        assert prefs.dynamic_fields[0].name == "near Bahnhof"
        assert prefs.dynamic_fields[0].importance == ImportanceLevel.MEDIUM
        assert prefs.dynamic_fields[1].name == "quiet neighborhood"
        assert prefs.dynamic_fields[1].importance == ImportanceLevel.MEDIUM

    def test_migration_filters_empty_strings(self):
        """Migration filters out empty strings from softCriteria."""
        data = {
            "softCriteria": ["near Bahnhof", "", "  ", "quiet area"],
        }
        prefs = UserPreferences.model_validate(data)

        assert len(prefs.dynamic_fields) == 2
        assert prefs.dynamic_fields[0].name == "near Bahnhof"
        assert prefs.dynamic_fields[1].name == "quiet area"

    def test_existing_tests_still_pass(self):
        """Verify SAMPLE_PREFERENCES_JSON and LEGACY_PREFERENCES_JSON still parse."""
        # SAMPLE_PREFERENCES_JSON -- should parse without error
        prefs_sample = UserPreferences.model_validate(SAMPLE_PREFERENCES_JSON)
        assert prefs_sample.location == "Zurich"

        # LEGACY_PREFERENCES_JSON -- should parse without error (with migration)
        prefs_legacy = UserPreferences.model_validate(LEGACY_PREFERENCES_JSON)
        assert prefs_legacy.location == "Zurich"
        assert prefs_legacy.features == ["balcony", "parking"]
