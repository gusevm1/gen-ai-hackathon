"""Deterministic scoring module for the v5.0 hybrid scorer (Phase 28).

Implements formula-based scoring for five criterion types:
  DS-01: score_price    — exponential decay above budget
  DS-02: score_distance — exponential decay beyond target distance
  DS-03: score_size     — power decay below min, soft exp decay above max
  DS-04: score_binary_feature — alias-map lookup against listing attributes
  DS-05: score_proximity_quality — distance decay + rating bonus
  DS-06: synthesize_builtin_results — virtual entries for budget/rooms/living_space

All scorer functions return None for missing/unparseable data (never 0.0 as
a missing-data sentinel — that distinction is critical for weighted aggregation).
"""

import math
import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.models.listing import FlatfoxListing
from app.models.preferences import DynamicField, ImportanceLevel, UserPreferences


# ---------------------------------------------------------------------------
# FulfillmentResult model
# ---------------------------------------------------------------------------


class FulfillmentResult(BaseModel):
    """Result of evaluating a single criterion against a listing.

    fulfillment=None means data was unavailable — skip in aggregation.
    fulfillment=0.0 means the criterion is definitively not met.
    fulfillment=1.0 means the criterion is fully met.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    criterion_name: str
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    importance: ImportanceLevel
    reasoning: Optional[str] = None  # None for deterministic; Claude fills for subjective


# ---------------------------------------------------------------------------
# FEATURE_ALIAS_MAP
# Maps normalized user-facing terms (EN + German) → set of Flatfox attribute slugs
# ---------------------------------------------------------------------------

FEATURE_ALIAS_MAP: dict[str, set[str]] = {
    # Balcony / garden
    "balcony": {"balcony", "balconygarden"},
    "balkon": {"balcony", "balconygarden"},
    "balcony/garden": {"balcony", "balconygarden"},
    "terrasse": {"terrace", "balconygarden"},
    "terrace": {"terrace", "balconygarden"},
    "garden": {"garden", "balconygarden"},
    "garten": {"garden", "balconygarden"},
    # Parking
    "parking": {"parkingspace", "garage"},
    "parkplatz": {"parkingspace", "garage"},
    "parkierung": {"parkingspace", "garage"},
    "tiefgarage": {"underground_garage", "parkingspace"},
    "underground garage": {"underground_garage", "parkingspace"},
    "garage": {"garage"},
    # Pets
    "pets allowed": {"petsallowed"},
    "haustiere": {"petsallowed"},
    "haustiere erlaubt": {"petsallowed"},
    "pets": {"petsallowed"},
    # Lift / elevator
    "lift": {"lift"},
    "elevator": {"lift"},
    "aufzug": {"lift"},
    # Cellar / storage
    "cellar": {"cellar"},
    "keller": {"cellar"},
    "storage": {"cellar"},
    "lagerraum": {"cellar"},
    # Dishwasher
    "dishwasher": {"dishwasher"},
    "spuelmaschine": {"dishwasher"},
    "spülmaschine": {"dishwasher"},
    "geschirrspueler": {"dishwasher"},
    "geschirrspüler": {"dishwasher"},
    # Washing machine
    "washing machine": {"washingmachine"},
    "waschmaschine": {"washingmachine"},
    "washer": {"washingmachine"},
    # Furnished
    "furnished": {"furnished"},
    "moebliert": {"furnished"},
    "möbliert": {"furnished"},
    # New build
    "new build": {"neubau"},
    "neubau": {"neubau"},
    "newbuild": {"neubau"},
    # Wheelchair accessible
    "wheelchair": {"wheelchair"},
    "wheelchair accessible": {"wheelchair"},
    "rollstuhlgerecht": {"wheelchair"},
    # Cable / internet
    "cable": {"cable"},
    "kabel": {"cable"},
    "cable tv": {"cable"},
    # Minergie (Swiss energy standard)
    "minergie": {"minergie"},
    # Additional common amenities
    "pool": {"swimmingpool"},
    "schwimmbad": {"swimmingpool"},
    "swimmingpool": {"swimmingpool"},
    "sauna": {"sauna"},
    "fireplace": {"fireplace"},
    "cheminee": {"fireplace"},
    "kamin": {"fireplace"},
}

# Pre-compute all known slugs (union of all values) for unknown-term detection
_ALL_KNOWN_SLUGS: set[str] = set().union(*FEATURE_ALIAS_MAP.values())


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_DISTANCE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(km|m)\b", re.IGNORECASE)


def _parse_distance_km(value: str) -> Optional[float]:
    """Parse a distance string like '500m' or '1.5km' into kilometres.

    Returns None if the string cannot be parsed.
    """
    m = _DISTANCE_RE.search(value.strip())
    if not m:
        return None
    number = float(m.group(1))
    unit = m.group(2).lower()
    return number / 1000.0 if unit == "m" else number


def _resolve_slugs(term: str) -> Optional[set[str]]:
    """Resolve a user-facing feature term to Flatfox attribute slugs.

    Returns:
        A set of slugs if the term is recognized (alias or direct slug).
        None if the term is completely unrecognized.
    """
    normalized = term.strip().lower()
    if normalized in FEATURE_ALIAS_MAP:
        return FEATURE_ALIAS_MAP[normalized]
    if normalized in _ALL_KNOWN_SLUGS:
        return {normalized}  # direct slug, recognized
    return None  # truly unrecognized → skip


# ---------------------------------------------------------------------------
# DS-04: score_binary_feature
# ---------------------------------------------------------------------------


def score_binary_feature(
    field: DynamicField,
    listing: FlatfoxListing,
) -> Optional[float]:
    """Score presence/absence of a binary feature.

    Returns:
        1.0  — feature present in listing
        0.0  — feature recognized but absent from listing
        None — feature term unrecognized (skip in aggregation)
    """
    candidate_slugs = _resolve_slugs(field.name)
    if candidate_slugs is None:
        return None  # unrecognized term → skip

    listing_slugs = {attr.name.strip().lower() for attr in listing.attributes}
    return 1.0 if candidate_slugs & listing_slugs else 0.0


# ---------------------------------------------------------------------------
# DS-01: score_price
# ---------------------------------------------------------------------------


def score_price(
    field: DynamicField,
    listing: FlatfoxListing,
) -> Optional[float]:
    """Score listing price against budget.

    Formula: 1.0 if price <= budget, else exp(-2.5 * (price - budget) / budget)

    Returns None for missing/unparseable data.
    """
    price = listing.price_display
    if price is None:
        return None

    try:
        budget = float(field.value)
    except (ValueError, TypeError):
        return None

    if budget <= 0:
        return None

    if price <= budget:
        return 1.0

    return math.exp(-2.5 * (price - budget) / budget)


# ---------------------------------------------------------------------------
# DS-02: score_distance
# ---------------------------------------------------------------------------


def score_distance(
    field: DynamicField,
    listing: FlatfoxListing,
    actual_km: Optional[float],
) -> Optional[float]:
    """Score actual distance against target distance.

    Formula: 1.0 if actual <= target, else exp(-1.0 * (actual - target) / target)

    actual_km is pre-computed by the caller (Phase 31 proximity pipeline).
    Returns None for missing/unparseable data.
    """
    if actual_km is None:
        return None

    target_km = _parse_distance_km(field.value)
    if target_km is None or target_km <= 0:
        return None

    if actual_km <= target_km:
        return 1.0

    return math.exp(-1.0 * (actual_km - target_km) / target_km)


# ---------------------------------------------------------------------------
# DS-03: score_size
# ---------------------------------------------------------------------------


def score_size(
    field: DynamicField,
    listing: FlatfoxListing,
) -> Optional[float]:
    """Score listing surface_living against a minimum size constraint.

    Formula:
      - actual < target_min: (actual / target_min) ** 1.5   [power decay]
      - target_min <= actual: 1.0                            [at or above min]
      (No upper bound constraint — use synthesize_builtin_results for min+max)

    Returns None for missing/unparseable data.
    """
    try:
        target_min = float(field.value)
    except (ValueError, TypeError):
        return None

    if target_min <= 0:
        return None

    actual = listing.surface_living
    if actual is None:
        return None

    actual_f = float(actual)
    if actual_f < target_min:
        return (actual_f / target_min) ** 1.5

    return 1.0


# ---------------------------------------------------------------------------
# Internal: symmetric size scorer (used by synthesize_builtin_results)
# ---------------------------------------------------------------------------


def _score_size_symmetric(
    actual: Optional[float],
    target_min: float,
    target_max: Optional[float],
) -> Optional[float]:
    """Score a size value against min and optional max constraints.

    Formula:
      - actual < target_min: (actual / target_min) ** 1.5
      - target_min <= actual <= target_max (if max given): 1.0
      - actual > target_max: exp(-0.5 * (actual - target_max) / target_max)
      - no target_max: 1.0 for any actual >= target_min

    Returns None for missing or invalid inputs.
    """
    if actual is None or target_min <= 0:
        return None

    if actual < target_min:
        return (actual / target_min) ** 1.5

    if target_max is not None and actual > target_max:
        if target_max <= 0:
            return None
        return math.exp(-0.5 * (actual - target_max) / target_max)

    return 1.0


# ---------------------------------------------------------------------------
# DS-05: score_proximity_quality
# ---------------------------------------------------------------------------


def score_proximity_quality(
    field: DynamicField,
    listing: FlatfoxListing,
    proximity_data: dict[str, list[dict]],
) -> Optional[float]:
    """Score quality of nearby amenity (distance decay + rating bonus).

    Formula: min(1.0, exp(-1.0 * distance_km / radius_km) + rating_bonus)
    rating_bonus = min(0.2, (rating - 3.0) / 10.0) if rating >= 3.0 else 0.0

    proximity_data is keyed by field.name; built by Phase 31 proximity pipeline.
    Each entry is a dict: {"distance_km": float, "rating": float, "is_fallback": bool}

    Returns None if no proximity data found or radius is unparseable.
    """
    radius_km = _parse_distance_km(field.value)
    if radius_km is None or radius_km <= 0:
        return None

    # Try both the original field name and normalized lowercase
    entries = proximity_data.get(field.name) or proximity_data.get(field.name.strip().lower())
    if not entries:
        return None

    entry = entries[0]  # best match (Phase 31 orders by relevance)
    distance_km = entry.get("distance_km")
    if distance_km is None:
        return None

    rating = entry.get("rating") or 3.0  # default neutral rating if absent

    base_decay = math.exp(-1.0 * distance_km / radius_km)
    rating_bonus = min(0.2, (rating - 3.0) / 10.0) if rating >= 3.0 else 0.0

    return min(1.0, base_decay + rating_bonus)


# ---------------------------------------------------------------------------
# DS-06: synthesize_builtin_results
# ---------------------------------------------------------------------------


def synthesize_builtin_results(
    prefs: UserPreferences,
    listing: FlatfoxListing,
) -> list[FulfillmentResult]:
    """Generate FulfillmentResult entries for budget, rooms, and living_space.

    These are "virtual" criteria derived directly from UserPreferences structured
    fields — they do not require a DynamicField with criterion_type.

    Skips entries entirely when the preference value is None (budget_max=None
    means no budget preference was set — do not penalize).
    """
    results: list[FulfillmentResult] = []

    # --- Budget ---
    if prefs.budget_max is not None:
        importance = (
            ImportanceLevel.CRITICAL if prefs.budget_dealbreaker else ImportanceLevel.MEDIUM
        )
        price = listing.price_display
        if price is None:
            f: Optional[float] = None
        elif price <= prefs.budget_max:
            f = 1.0
        elif prefs.budget_max > 0:
            f = math.exp(-2.5 * (price - prefs.budget_max) / prefs.budget_max)
        else:
            f = None
        results.append(
            FulfillmentResult(criterion_name="budget", fulfillment=f, importance=importance)
        )

    # --- Rooms ---
    if prefs.rooms_min is not None:
        importance = (
            ImportanceLevel.CRITICAL if prefs.rooms_dealbreaker else ImportanceLevel.MEDIUM
        )
        try:
            actual_rooms: Optional[float] = (
                float(listing.number_of_rooms)
                if listing.number_of_rooms is not None
                else None
            )
        except (ValueError, TypeError):
            actual_rooms = None
        f = _score_size_symmetric(actual_rooms, prefs.rooms_min, prefs.rooms_max)
        results.append(
            FulfillmentResult(criterion_name="rooms", fulfillment=f, importance=importance)
        )

    # --- Living space ---
    if prefs.living_space_min is not None:
        importance = (
            ImportanceLevel.CRITICAL
            if prefs.living_space_dealbreaker
            else ImportanceLevel.MEDIUM
        )
        actual_space: Optional[float] = (
            float(listing.surface_living) if listing.surface_living is not None else None
        )
        f = _score_size_symmetric(
            actual_space,
            float(prefs.living_space_min),
            float(prefs.living_space_max) if prefs.living_space_max is not None else None,
        )
        results.append(
            FulfillmentResult(
                criterion_name="living_space", fulfillment=f, importance=importance
            )
        )

    return results
