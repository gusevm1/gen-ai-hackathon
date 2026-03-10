"""Pydantic models for user preferences, mirroring the frontend Zod schema.

These models are consumed by the Phase 3 scoring pipeline when reading
preferences from Supabase. Field names use snake_case (Python convention)
while the frontend uses camelCase (TypeScript convention).
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class OfferType(str, Enum):
    """Property offer type matching Flatfox values."""

    RENT = "RENT"
    SALE = "SALE"


class ObjectCategory(str, Enum):
    """Property category matching Flatfox values plus ANY wildcard."""

    APARTMENT = "APARTMENT"
    HOUSE = "HOUSE"
    ANY = "ANY"


class Weights(BaseModel):
    """Category importance weights (0-100, default 50)."""

    location: int = Field(default=50, ge=0, le=100)
    price: int = Field(default=50, ge=0, le=100)
    size: int = Field(default=50, ge=0, le=100)
    features: int = Field(default=50, ge=0, le=100)
    condition: int = Field(default=50, ge=0, le=100)


class UserPreferences(BaseModel):
    """User property search preferences.

    Mirrors the frontend Zod preferencesSchema.
    Stored as JSONB in Supabase user_preferences table.
    """

    # Standard filters (PREF-01 through PREF-06)
    location: str = ""
    offer_type: OfferType = OfferType.RENT
    object_category: ObjectCategory = ObjectCategory.ANY
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    rooms_min: Optional[float] = None
    rooms_max: Optional[float] = None
    living_space_min: Optional[int] = None
    living_space_max: Optional[int] = None

    # Soft criteria (PREF-07 and PREF-08)
    soft_criteria: list[str] = Field(default_factory=list)
    selected_features: list[str] = Field(default_factory=list)

    # Weights (PREF-09)
    weights: Weights = Field(default_factory=Weights)
