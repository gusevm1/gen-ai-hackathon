"""Unit tests for scoring Pydantic models and UserPreferences camelCase support.

Covers: EVAL-02 (0-100 score + category breakdown), EVAL-03 (reasoning bullets).
"""

import pytest
from pydantic import ValidationError


class TestScoreResponse:
    """Tests for ScoreResponse model validation."""

    def test_valid_score_response(self):
        """ScoreResponse with valid data validates successfully."""
        from app.models.scoring import ScoreResponse, CategoryScore, ChecklistItem

        data = ScoreResponse(
            overall_score=75,
            match_tier="good",
            summary_bullets=[
                "Good location near Bahnhof",
                "Price is within budget",
                "Missing balcony feature",
            ],
            categories=[
                CategoryScore(
                    name="location",
                    score=85,
                    weight=80,
                    reasoning=["Close to city center", "Near public transport"],
                ),
                CategoryScore(
                    name="price",
                    score=70,
                    weight=70,
                    reasoning=["CHF 1,790 vs CHF 2,500 max -- within budget"],
                ),
                CategoryScore(
                    name="size",
                    score=60,
                    weight=60,
                    reasoning=["29 sqm is below preferred minimum"],
                ),
                CategoryScore(
                    name="features",
                    score=50,
                    weight=50,
                    reasoning=["Has garage and parking", "Missing balcony"],
                ),
                CategoryScore(
                    name="condition",
                    score=80,
                    weight=40,
                    reasoning=["Renovated in 2019", "Built in 1963"],
                ),
            ],
            checklist=[
                ChecklistItem(criterion="near Bahnhof", met=True, note="Located near station"),
                ChecklistItem(criterion="quiet neighborhood", met=None, note="Not specified in listing"),
            ],
            language="de",
        )
        assert data.overall_score == 75
        assert len(data.categories) == 5
        assert len(data.checklist) == 2

    def test_rejects_overall_score_below_zero(self):
        """ScoreResponse rejects overall_score outside 0-100 range (below)."""
        from app.models.scoring import ScoreResponse

        with pytest.raises(ValidationError):
            ScoreResponse(
                overall_score=-1,
                match_tier="poor",
                summary_bullets=["Bullet 1", "Bullet 2", "Bullet 3"],
                categories=[],
                checklist=[],
                language="de",
            )

    def test_rejects_overall_score_above_100(self):
        """ScoreResponse rejects overall_score outside 0-100 range (above)."""
        from app.models.scoring import ScoreResponse

        with pytest.raises(ValidationError):
            ScoreResponse(
                overall_score=101,
                match_tier="excellent",
                summary_bullets=["Bullet 1", "Bullet 2", "Bullet 3"],
                categories=[],
                checklist=[],
                language="de",
            )


class TestCategoryScore:
    """Tests for CategoryScore model."""

    def test_category_score_requires_all_fields(self):
        """CategoryScore requires name, score, weight, and reasoning."""
        from app.models.scoring import CategoryScore

        score = CategoryScore(
            name="location",
            score=85,
            weight=80,
            reasoning=["Close to city center"],
        )
        assert score.name == "location"
        assert score.score == 85
        assert score.weight == 80
        assert score.reasoning == ["Close to city center"]

    def test_category_score_rejects_invalid_score(self):
        """CategoryScore rejects score outside 0-100."""
        from app.models.scoring import CategoryScore

        with pytest.raises(ValidationError):
            CategoryScore(name="price", score=150, weight=50, reasoning=["Too high"])

    def test_category_score_rejects_invalid_weight(self):
        """CategoryScore rejects weight outside 0-100."""
        from app.models.scoring import CategoryScore

        with pytest.raises(ValidationError):
            CategoryScore(name="price", score=50, weight=-10, reasoning=["Negative weight"])


class TestChecklistItem:
    """Tests for ChecklistItem model."""

    def test_checklist_item_met_true(self):
        """ChecklistItem.met accepts True."""
        from app.models.scoring import ChecklistItem

        item = ChecklistItem(criterion="balcony", met=True, note="Has balcony")
        assert item.met is True

    def test_checklist_item_met_false(self):
        """ChecklistItem.met accepts False."""
        from app.models.scoring import ChecklistItem

        item = ChecklistItem(criterion="parking", met=False, note="No parking")
        assert item.met is False

    def test_checklist_item_met_none(self):
        """ChecklistItem.met accepts None (unknown)."""
        from app.models.scoring import ChecklistItem

        item = ChecklistItem(criterion="quiet", met=None, note="Not specified in listing")
        assert item.met is None


class TestSummaryBullets:
    """Tests for ScoreResponse.summary_bullets length validation."""

    def _make_response(self, bullets):
        from app.models.scoring import ScoreResponse

        return ScoreResponse(
            overall_score=50,
            match_tier="fair",
            summary_bullets=bullets,
            categories=[],
            checklist=[],
            language="de",
        )

    def test_accepts_3_bullets(self):
        """summary_bullets accepts exactly 3 items."""
        resp = self._make_response(["A", "B", "C"])
        assert len(resp.summary_bullets) == 3

    def test_accepts_5_bullets(self):
        """summary_bullets accepts exactly 5 items."""
        resp = self._make_response(["A", "B", "C", "D", "E"])
        assert len(resp.summary_bullets) == 5

    def test_rejects_fewer_than_3(self):
        """summary_bullets rejects fewer than 3 items."""
        with pytest.raises(ValidationError):
            self._make_response(["A", "B"])

    def test_rejects_more_than_5(self):
        """summary_bullets rejects more than 5 items."""
        with pytest.raises(ValidationError):
            self._make_response(["A", "B", "C", "D", "E", "F"])


class TestMatchTier:
    """Tests for ScoreResponse.match_tier validation."""

    def _make_response(self, tier):
        from app.models.scoring import ScoreResponse

        return ScoreResponse(
            overall_score=50,
            match_tier=tier,
            summary_bullets=["A", "B", "C"],
            categories=[],
            checklist=[],
            language="de",
        )

    def test_accepts_excellent(self):
        resp = self._make_response("excellent")
        assert resp.match_tier == "excellent"

    def test_accepts_good(self):
        resp = self._make_response("good")
        assert resp.match_tier == "good"

    def test_accepts_fair(self):
        resp = self._make_response("fair")
        assert resp.match_tier == "fair"

    def test_accepts_poor(self):
        resp = self._make_response("poor")
        assert resp.match_tier == "poor"


class TestUserPreferencesCamelCase:
    """Tests for UserPreferences camelCase JSONB parsing and language field."""

    def test_parses_camelcase_jsonb(self):
        """UserPreferences parses camelCase JSONB keys from Supabase."""
        from app.models.preferences import UserPreferences

        data = {
            "location": "Zurich",
            "offerType": "RENT",
            "objectCategory": "APARTMENT",
            "budgetMin": 1500,
            "budgetMax": 2500,
            "roomsMin": 2.0,
            "roomsMax": 4.0,
            "livingSpaceMin": 50,
            "livingSpaceMax": 100,
            "softCriteria": ["near Bahnhof"],
            "selectedFeatures": ["balcony"],
            "weights": {"location": 80, "price": 70, "size": 60, "features": 50, "condition": 40},
        }
        prefs = UserPreferences.model_validate(data)
        assert prefs.location == "Zurich"
        assert prefs.offer_type.value == "RENT"
        assert prefs.object_category.value == "APARTMENT"
        assert prefs.budget_min == 1500
        assert prefs.budget_max == 2500
        assert prefs.rooms_min == 2.0
        assert prefs.rooms_max == 4.0
        assert prefs.living_space_min == 50
        assert prefs.living_space_max == 100
        assert prefs.soft_criteria == ["near Bahnhof"]
        assert prefs.selected_features == ["balcony"]
        assert prefs.weights.location == 80

    def test_language_field_defaults_to_de(self):
        """UserPreferences has language field defaulting to 'de'."""
        from app.models.preferences import UserPreferences

        prefs = UserPreferences()
        assert prefs.language == "de"

    def test_language_field_accepts_custom_value(self):
        """UserPreferences language field accepts custom values."""
        from app.models.preferences import UserPreferences

        prefs = UserPreferences(language="fr")
        assert prefs.language == "fr"

    def test_still_accepts_snake_case(self):
        """UserPreferences still accepts snake_case keys (Python convention)."""
        from app.models.preferences import UserPreferences

        data = {
            "location": "Bern",
            "offer_type": "SALE",
            "budget_min": 500000,
        }
        prefs = UserPreferences.model_validate(data)
        assert prefs.offer_type.value == "SALE"
        assert prefs.budget_min == 500000
