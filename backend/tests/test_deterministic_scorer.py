"""Tests for deterministic scoring module (Phase 28).

Covers all six criterion types:
  DS-01: score_price
  DS-02: score_distance
  DS-03: score_size
  DS-04: score_binary_feature
  DS-05: score_proximity_quality
  DS-06: synthesize_builtin_results (built-in preference synthesizer)
"""

import math
from typing import Optional

import pytest

from app.services.deterministic_scorer import (
    FEATURE_ALIAS_MAP,
    FulfillmentResult,
    score_binary_feature,
    score_distance,
    score_price,
    score_proximity_quality,
    score_size,
    synthesize_builtin_results,
)
from app.models.preferences import (
    DynamicField,
    ImportanceLevel,
    UserPreferences,
)
from app.models.listing import FlatfoxAttribute, FlatfoxListing


# ---------------------------------------------------------------------------
# Helper factory functions
# ---------------------------------------------------------------------------


def make_field(
    name: str,
    value: str = "",
    importance: ImportanceLevel = ImportanceLevel.MEDIUM,
) -> DynamicField:
    """Create a DynamicField with minimal boilerplate."""
    return DynamicField(name=name, value=value, importance=importance)


def make_listing(
    price: Optional[int] = None,
    surface: Optional[int] = None,
    rooms: Optional[str] = None,
    attribute_names: Optional[list[str]] = None,
) -> FlatfoxListing:
    """Create a FlatfoxListing with the given values and minimal required fields."""
    attrs = (
        [FlatfoxAttribute(name=n) for n in attribute_names]
        if attribute_names is not None
        else []
    )
    return FlatfoxListing(
        pk=1,
        slug="test-listing",
        url="/en/flat/test-listing/1/",
        short_url="https://flatfox.ch/en/flat/1/",
        status="act",
        offer_type="RENT",
        object_category="APARTMENT",
        object_type="APARTMENT",
        price_display=price,
        surface_living=surface,
        number_of_rooms=rooms,
        attributes=attrs,
    )


def make_prefs(
    budget_max: Optional[int] = None,
    budget_dealbreaker: bool = False,
    rooms_min: Optional[float] = None,
    rooms_max: Optional[float] = None,
    rooms_dealbreaker: bool = False,
    living_space_min: Optional[int] = None,
    living_space_max: Optional[int] = None,
    living_space_dealbreaker: bool = False,
) -> UserPreferences:
    """Create a UserPreferences instance."""
    return UserPreferences(
        budget_max=budget_max,
        budget_dealbreaker=budget_dealbreaker,
        rooms_min=rooms_min,
        rooms_max=rooms_max,
        rooms_dealbreaker=rooms_dealbreaker,
        living_space_min=living_space_min,
        living_space_max=living_space_max,
        living_space_dealbreaker=living_space_dealbreaker,
    )


# ---------------------------------------------------------------------------
# DS-01: TestPriceScorer
# ---------------------------------------------------------------------------


class TestPriceScorer:
    """DS-01: score_price — exponential decay above budget, 1.0 at/under."""

    def test_price_at_budget_returns_one(self):
        field = make_field(name="budget", value="2000")
        listing = make_listing(price=2000)
        assert score_price(field, listing) == 1.0

    def test_price_below_budget_returns_one(self):
        field = make_field(name="budget", value="2000")
        listing = make_listing(price=1800)
        assert score_price(field, listing) == 1.0

    def test_price_above_budget_exponential_decay(self):
        field = make_field(name="budget", value="2000")
        listing = make_listing(price=2500)
        expected = math.exp(-2.5 * 500 / 2000)
        assert score_price(field, listing) == pytest.approx(expected, abs=0.001)

    def test_missing_price_returns_none(self):
        field = make_field(name="budget", value="2000")
        listing = make_listing(price=None)
        assert score_price(field, listing) is None

    def test_unparseable_budget_returns_none(self):
        field = make_field(name="budget", value="not_a_number")
        listing = make_listing(price=1800)
        assert score_price(field, listing) is None

    def test_zero_budget_returns_none(self):
        field = make_field(name="budget", value="0")
        listing = make_listing(price=1800)
        assert score_price(field, listing) is None


# ---------------------------------------------------------------------------
# DS-02: TestDistanceScorer
# ---------------------------------------------------------------------------


class TestDistanceScorer:
    """DS-02: score_distance — exponential decay beyond target distance."""

    def test_distance_under_target_returns_one(self):
        field = make_field(name="work", value="500m")
        listing = make_listing()
        assert score_distance(field, listing, actual_km=0.3) == 1.0

    def test_distance_at_target_returns_one(self):
        field = make_field(name="work", value="500m")
        listing = make_listing()
        assert score_distance(field, listing, actual_km=0.5) == 1.0

    def test_distance_above_target_exponential_decay(self):
        field = make_field(name="work", value="500m")
        listing = make_listing()
        expected = math.exp(-1.0 * 0.3 / 0.5)
        assert score_distance(field, listing, actual_km=0.8) == pytest.approx(expected, abs=0.001)

    def test_missing_actual_distance_returns_none(self):
        field = make_field(name="work", value="500m")
        listing = make_listing()
        assert score_distance(field, listing, actual_km=None) is None

    def test_unparseable_target_distance_returns_none(self):
        field = make_field(name="work", value="not_a_distance")
        listing = make_listing()
        assert score_distance(field, listing, actual_km=0.5) is None

    def test_distance_km_unit_parses_correctly(self):
        field = make_field(name="work", value="1km")
        listing = make_listing()
        # actual=0.5km, target=1km → 0.5 < 1 → 1.0
        assert score_distance(field, listing, actual_km=0.5) == 1.0


# ---------------------------------------------------------------------------
# DS-03: TestSizeScorer
# ---------------------------------------------------------------------------


class TestSizeScorer:
    """DS-03: score_size — power decay below min, 1.0 in range, soft exp above max."""

    def test_below_min_returns_power_decay(self):
        field = make_field(name="living_space", value="60")
        listing = make_listing(surface=45)
        expected = (45 / 60) ** 1.5
        assert score_size(field, listing) == pytest.approx(expected, abs=0.001)

    def test_at_min_returns_one(self):
        field = make_field(name="living_space", value="60")
        listing = make_listing(surface=60)
        assert score_size(field, listing) == 1.0

    def test_above_min_no_max_returns_one(self):
        field = make_field(name="living_space", value="60")
        listing = make_listing(surface=200)
        assert score_size(field, listing) == 1.0

    def test_missing_surface_returns_none(self):
        field = make_field(name="living_space", value="60")
        listing = make_listing(surface=None)
        assert score_size(field, listing) is None

    def test_zero_min_returns_none(self):
        field = make_field(name="living_space", value="0")
        listing = make_listing(surface=60)
        assert score_size(field, listing) is None

    def test_unparseable_min_returns_none(self):
        field = make_field(name="living_space", value="bad")
        listing = make_listing(surface=60)
        assert score_size(field, listing) is None


# ---------------------------------------------------------------------------
# DS-04: TestBinaryFeatureScorer
# ---------------------------------------------------------------------------


class TestBinaryFeatureScorer:
    """DS-04: score_binary_feature — alias map + German synonyms + unknown terms."""

    def test_english_alias_match_returns_one(self):
        field = make_field(name="balcony")
        listing = make_listing(attribute_names=["balconygarden"])
        assert score_binary_feature(field, listing) == 1.0

    def test_german_alias_match_returns_one(self):
        field = make_field(name="balkon")
        listing = make_listing(attribute_names=["balconygarden"])
        assert score_binary_feature(field, listing) == 1.0

    def test_known_feature_absent_returns_zero(self):
        field = make_field(name="lift")
        listing = make_listing(attribute_names=["balconygarden", "parkingspace"])
        assert score_binary_feature(field, listing) == 0.0

    def test_unknown_feature_returns_none(self):
        field = make_field(name="totally_unknown_xyz")
        listing = make_listing(attribute_names=["balconygarden"])
        assert score_binary_feature(field, listing) is None

    def test_compound_slug_alias_match(self):
        field = make_field(name="parking")
        listing = make_listing(attribute_names=["parkingspace"])
        assert score_binary_feature(field, listing) == 1.0

    def test_case_insensitive_match(self):
        field = make_field(name="BALCONY")
        listing = make_listing(attribute_names=["balconygarden"])
        assert score_binary_feature(field, listing) == 1.0

    def test_whitespace_stripped_from_term(self):
        field = make_field(name="  balcony  ")
        listing = make_listing(attribute_names=["balconygarden"])
        assert score_binary_feature(field, listing) == 1.0

    def test_pets_german_alias(self):
        field = make_field(name="haustiere")
        listing = make_listing(attribute_names=["petsallowed"])
        assert score_binary_feature(field, listing) == 1.0


# ---------------------------------------------------------------------------
# DS-05: TestProximityQualityScorer
# ---------------------------------------------------------------------------


class TestProximityQualityScorer:
    """DS-05: score_proximity_quality — distance decay + rating bonus."""

    def make_proximity_data(
        self,
        field_name: str,
        distance_km: float,
        rating: float = 4.0,
        is_fallback: bool = False,
    ) -> dict:
        """Build proximity_data dict as Phase 31 would construct it."""
        return {
            field_name: [
                {
                    "distance_km": distance_km,
                    "rating": rating,
                    "is_fallback": is_fallback,
                }
            ]
        }

    def test_close_high_rated_returns_high_score(self):
        field = make_field(name="restaurant", value="500m")
        listing = make_listing()
        proximity_data = self.make_proximity_data("restaurant", distance_km=0.1, rating=4.5)
        result = score_proximity_quality(field, listing, proximity_data)
        assert result is not None
        assert 0.0 <= result <= 1.0
        assert result > 0.8  # very close, highly rated

    def test_score_is_float_in_range(self):
        field = make_field(name="park", value="1km")
        listing = make_listing()
        proximity_data = self.make_proximity_data("park", distance_km=0.5, rating=3.5)
        result = score_proximity_quality(field, listing, proximity_data)
        assert result is not None
        assert 0.0 <= result <= 1.0

    def test_no_entry_returns_none(self):
        field = make_field(name="gym", value="1km")
        listing = make_listing()
        proximity_data = {}  # no data for this field
        assert score_proximity_quality(field, listing, proximity_data) is None

    def test_fallback_entry_still_returns_score(self):
        field = make_field(name="school", value="1km")
        listing = make_listing()
        proximity_data = self.make_proximity_data(
            "school", distance_km=1.2, rating=3.0, is_fallback=True
        )
        result = score_proximity_quality(field, listing, proximity_data)
        assert result is not None
        assert 0.0 <= result <= 1.0

    def test_unparseable_radius_returns_none(self):
        field = make_field(name="school", value="not_a_distance")
        listing = make_listing()
        proximity_data = self.make_proximity_data("school", distance_km=0.5)
        assert score_proximity_quality(field, listing, proximity_data) is None


# ---------------------------------------------------------------------------
# DS-06: TestBuiltinSynthesizer
# ---------------------------------------------------------------------------


class TestBuiltinSynthesizer:
    """DS-06: synthesize_builtin_results — virtual entries for budget/rooms/living_space."""

    def test_budget_dealbreaker_uses_critical_importance(self):
        prefs = make_prefs(budget_max=2000, budget_dealbreaker=True)
        listing = make_listing(price=1800)
        results = synthesize_builtin_results(prefs, listing)
        budget_entry = next((r for r in results if r.criterion_name == "budget"), None)
        assert budget_entry is not None
        assert budget_entry.importance == ImportanceLevel.CRITICAL

    def test_budget_no_dealbreaker_uses_medium_importance(self):
        prefs = make_prefs(budget_max=2000, budget_dealbreaker=False)
        listing = make_listing(price=1800)
        results = synthesize_builtin_results(prefs, listing)
        budget_entry = next((r for r in results if r.criterion_name == "budget"), None)
        assert budget_entry is not None
        assert budget_entry.importance == ImportanceLevel.MEDIUM

    def test_budget_none_skips_entry(self):
        prefs = make_prefs(budget_max=None)
        listing = make_listing(price=1800)
        results = synthesize_builtin_results(prefs, listing)
        criterion_names = [r.criterion_name for r in results]
        assert "budget" not in criterion_names

    def test_missing_price_produces_none_fulfillment(self):
        prefs = make_prefs(budget_max=2000)
        listing = make_listing(price=None)
        results = synthesize_builtin_results(prefs, listing)
        budget_entry = next((r for r in results if r.criterion_name == "budget"), None)
        assert budget_entry is not None
        assert budget_entry.fulfillment is None

    def test_rooms_min_produces_rooms_entry(self):
        prefs = make_prefs(rooms_min=2.0)
        listing = make_listing(rooms="3.5")
        results = synthesize_builtin_results(prefs, listing)
        rooms_entry = next((r for r in results if r.criterion_name == "rooms"), None)
        assert rooms_entry is not None
        assert rooms_entry.fulfillment == 1.0  # 3.5 >= 2.0 → in range

    def test_rooms_min_none_skips_entry(self):
        prefs = make_prefs(rooms_min=None)
        listing = make_listing(rooms="2.5")
        results = synthesize_builtin_results(prefs, listing)
        criterion_names = [r.criterion_name for r in results]
        assert "rooms" not in criterion_names

    def test_living_space_min_produces_entry(self):
        prefs = make_prefs(living_space_min=60)
        listing = make_listing(surface=80)
        results = synthesize_builtin_results(prefs, listing)
        ls_entry = next((r for r in results if r.criterion_name == "living_space"), None)
        assert ls_entry is not None
        assert ls_entry.fulfillment == 1.0  # 80 >= 60 → 1.0

    def test_complete_prefs_produces_up_to_three_entries(self):
        prefs = make_prefs(
            budget_max=2000,
            rooms_min=2.0,
            living_space_min=60,
        )
        listing = make_listing(price=1800, surface=80, rooms="3.0")
        results = synthesize_builtin_results(prefs, listing)
        names = {r.criterion_name for r in results}
        assert names == {"budget", "rooms", "living_space"}

    def test_fulfillment_result_none_is_valid(self):
        """FulfillmentResult with fulfillment=None must be valid (missing-data sentinel)."""
        result = FulfillmentResult(
            criterion_name="budget",
            fulfillment=None,
            importance=ImportanceLevel.MEDIUM,
        )
        assert result.fulfillment is None

    def test_fulfillment_result_rejects_out_of_range(self):
        """FulfillmentResult with fulfillment > 1.0 must raise ValidationError."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            FulfillmentResult(
                criterion_name="budget",
                fulfillment=1.5,
                importance=ImportanceLevel.MEDIUM,
            )
