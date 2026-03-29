"""Unit tests for POST /classify-criteria endpoint and CriterionClassifier service.

Wave 0 scaffold: tests written before implementation exists (RED state).
Plan 02 makes these tests GREEN by implementing the router and service.

Note: The `async_client` fixture is not yet defined in conftest.py.
Plan 02 will add it when the classifier router is implemented.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.models.preferences import CriterionType, DynamicField, ImportanceLevel


class TestClassifyEndpoint:
    """Tests for POST /classify-criteria FastAPI endpoint."""

    async def test_classify_endpoint_success(self, async_client: AsyncClient):
        """Returns 200 with enriched dynamic_fields for valid input."""
        payload = {
            "dynamicFields": [
                {"name": "near gym", "value": "within 500m", "importance": "high"},
                {"name": "max rent", "value": "2000 CHF", "importance": "critical"},
            ]
        }
        # Mock the classifier service so no real Claude call is made
        mock_fields = [
            DynamicField(name="near gym", value="within 500m", importance=ImportanceLevel.HIGH, criterion_type=CriterionType.DISTANCE),
            DynamicField(name="max rent", value="2000 CHF", importance=ImportanceLevel.CRITICAL, criterion_type=CriterionType.PRICE),
        ]
        with patch("app.routers.classifier.criterion_classifier.classify_fields", new=AsyncMock(return_value=mock_fields)):
            response = await async_client.post("/classify-criteria", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "dynamicFields" in data
        assert len(data["dynamicFields"]) == 2
        assert data["dynamicFields"][0]["criterionType"] == "distance"
        assert data["dynamicFields"][1]["criterionType"] == "price"

    async def test_classify_empty_fields(self, async_client: AsyncClient):
        """Returns 200 with empty list when dynamic_fields is empty."""
        payload = {"dynamicFields": []}
        with patch("app.routers.classifier.criterion_classifier.classify_fields", new=AsyncMock(return_value=[])):
            response = await async_client.post("/classify-criteria", json=payload)
        assert response.status_code == 200
        assert response.json()["dynamicFields"] == []


class TestCriterionClassifierService:
    """Unit tests for CriterionClassifier.classify_fields()."""

    async def test_classify_defaults_unmatched(self):
        """Fields whose name Claude doesn't match default to CriterionType.SUBJECTIVE."""
        from app.services.classifier import CriterionClassifier
        from app.models.preferences import CriterionType, DynamicField, ImportanceLevel

        classifier = CriterionClassifier()
        fields = [DynamicField(name="some odd criterion", importance=ImportanceLevel.MEDIUM)]

        # Mock messages.parse to return a classification with a DIFFERENT criterion name
        mock_result = MagicMock()
        mock_result.classifications = []  # empty — no match

        mock_client = MagicMock()
        mock_client.messages.parse = AsyncMock(return_value=mock_result)

        with patch.object(classifier, "get_client", return_value=mock_client):
            result = await classifier.classify_fields(fields)

        assert len(result) == 1
        assert result[0].criterion_type == CriterionType.SUBJECTIVE

    async def test_classify_returns_empty_for_empty_input(self):
        """classify_fields([]) returns [] without calling Claude."""
        from app.services.classifier import CriterionClassifier

        classifier = CriterionClassifier()
        result = await classifier.classify_fields([])
        assert result == []

    async def test_classify_haiku_model_used(self):
        """classify_fields() calls AsyncAnthropic.messages.parse with haiku model."""
        from app.services.classifier import CriterionClassifier, CLASSIFIER_MODEL
        assert "haiku" in CLASSIFIER_MODEL
