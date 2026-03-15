"""Pydantic models for user preferences — canonical schema (Phase 7).

Defines the unified preferences schema shared across all layers:
- Frontend Zod schema (web/src/lib/schemas/preferences.ts)
- Backend Pydantic model (this file)
- Supabase JSONB storage

Key changes from v1.0:
- Numeric weights (0-100) replaced by ImportanceLevel enum (critical/high/medium/low)
- selectedFeatures renamed to features
- Added dealbreaker toggles, floorPreference, availability
- Backward-compatible validator migrates old-format JSONB automatically
"""

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


class OfferType(str, Enum):
    """Property offer type matching Flatfox values."""

    RENT = "RENT"
    SALE = "SALE"


class ObjectCategory(str, Enum):
    """Property category matching Flatfox values plus ANY wildcard."""

    APARTMENT = "APARTMENT"
    HOUSE = "HOUSE"
    ANY = "ANY"


class ImportanceLevel(str, Enum):
    """Scoring category importance level (replaces 0-100 numeric weights)."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Mapping from importance levels to numeric weights for internal scoring.
# Used by the scoring pipeline when a numeric weight is needed.
IMPORTANCE_WEIGHT_MAP: dict[ImportanceLevel, int] = {
    ImportanceLevel.CRITICAL: 90,
    ImportanceLevel.HIGH: 70,
    ImportanceLevel.MEDIUM: 50,
    ImportanceLevel.LOW: 30,
}


class Importance(BaseModel):
    """Category importance levels for the 5 scoring categories."""

    location: ImportanceLevel = ImportanceLevel.MEDIUM
    price: ImportanceLevel = ImportanceLevel.MEDIUM
    size: ImportanceLevel = ImportanceLevel.MEDIUM
    features: ImportanceLevel = ImportanceLevel.MEDIUM
    condition: ImportanceLevel = ImportanceLevel.MEDIUM


class DynamicField(BaseModel):
    """A single dynamic preference field with name, value, and importance level.

    Replaces plain-string softCriteria with structured objects that carry
    per-field importance for weighted scoring.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    name: str
    value: str = ""
    importance: ImportanceLevel = ImportanceLevel.MEDIUM

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        """Reject empty or whitespace-only names."""
        if not v or not v.strip():
            raise ValueError("DynamicField name must not be empty")
        return v


class UserPreferences(BaseModel):
    """User property search preferences — canonical schema.

    Mirrors the frontend Zod preferencesSchema.
    Stored as JSONB in Supabase profiles.preferences column.

    Accepts both camelCase (from Supabase JSONB) and snake_case keys
    via alias_generator + populate_by_name.

    Backward compatible: old-format JSONB with numeric weights and
    selectedFeatures is automatically migrated via model_validator.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )

    # Standard filters
    location: str = ""
    offer_type: OfferType = OfferType.RENT
    object_category: ObjectCategory = ObjectCategory.ANY
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    rooms_min: Optional[float] = None
    rooms_max: Optional[float] = None
    living_space_min: Optional[int] = None
    living_space_max: Optional[int] = None

    # Dealbreaker toggles — when True, violating the range yields score 0
    budget_dealbreaker: bool = False
    rooms_dealbreaker: bool = False
    living_space_dealbreaker: bool = False

    # Additional filters
    floor_preference: Literal["any", "ground", "not_ground"] = "any"
    availability: str = "any"
    features: list[str] = Field(default_factory=list)

    # Soft criteria (free text tags — legacy, migrated to dynamic_fields on load)
    soft_criteria: list[str] = Field(default_factory=list)

    # Dynamic fields with importance (replaces soft_criteria)
    dynamic_fields: list[DynamicField] = Field(default_factory=list)

    # Category importance (replaces weights)
    importance: Importance = Field(default_factory=Importance)

    # Language preference — tightened to Swiss national languages + English
    language: Literal["de", "en", "fr", "it"] = "de"

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_format(cls, data: dict) -> dict:
        """Migrate old-format JSONB (weights + selectedFeatures) to canonical format.

        Migration rules:
        - If 'weights' present but 'importance' absent: set importance to all-medium
          (do NOT numerically convert old weights — per user decision)
        - If 'selectedFeatures' present but 'features' absent: rename to 'features'
        - If 'selected_features' present but 'features' absent: rename to 'features'
        - If 'softCriteria' present but 'dynamicFields' absent: convert each
          soft criterion string to a DynamicField dict with importance='medium'
        - If 'soft_criteria' (snake_case) present but no dynamic fields: same

        The extra="ignore" config handles leftover keys like 'weights'.
        """
        if not isinstance(data, dict):
            return data

        # Migrate weights -> importance (default all medium)
        if "weights" in data and "importance" not in data:
            data["importance"] = {
                "location": "medium",
                "price": "medium",
                "size": "medium",
                "features": "medium",
                "condition": "medium",
            }

        # Migrate selectedFeatures -> features
        if "selectedFeatures" in data and "features" not in data:
            data["features"] = data["selectedFeatures"]

        # Migrate selected_features (snake_case) -> features
        if "selected_features" in data and "features" not in data:
            data["features"] = data["selected_features"]

        # Migrate softCriteria -> dynamicFields (only when dynamicFields absent)
        if "softCriteria" in data and "dynamicFields" not in data:
            soft = data.get("softCriteria", [])
            data["dynamicFields"] = [
                {"name": criterion, "value": "", "importance": "medium"}
                for criterion in soft
                if isinstance(criterion, str) and criterion.strip()
            ]

        # Also handle snake_case soft_criteria -> dynamicFields
        if (
            "soft_criteria" in data
            and "dynamic_fields" not in data
            and "dynamicFields" not in data
        ):
            soft = data.get("soft_criteria", [])
            data["dynamicFields"] = [
                {"name": criterion, "value": "", "importance": "medium"}
                for criterion in soft
                if isinstance(criterion, str) and criterion.strip()
            ]

        return data
