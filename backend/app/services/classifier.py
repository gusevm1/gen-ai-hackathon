"""CriterionClassifier service — classifies DynamicField criteria via a batched Claude call.

Uses a single `messages.parse()` call to classify all fields at once.
Unmatched criterion names default to CriterionType.SUBJECTIVE.
"""

import os

from anthropic import AsyncAnthropic
from pydantic import BaseModel

from app.models.preferences import CriterionType, DynamicField

CLASSIFIER_MODEL = os.environ.get("CLASSIFIER_MODEL", "claude-haiku-4-5-20251001")

CRITERION_TYPES_DESCRIPTION = """
- distance: travel distance/time to a specific location (e.g. "within 10 min of work", "500m from school")
- price: rent or purchase price relative to a budget (e.g. "under 2000 CHF", "max 500k")
- size: physical size of the property in m² or rooms (e.g. "at least 80m²", "3+ rooms")
- binary_feature: a yes/no feature the property either has or doesn't (e.g. "has balcony", "parking", "pets allowed")
- proximity_quality: quality or rating of a nearby amenity, not just distance (e.g. "good schools nearby", "park with nice views")
- subjective: anything qualitative that requires judgment (e.g. "quiet neighborhood", "modern interior", "bright apartment")
"""


class CriterionClassification(BaseModel):
    """Single criterion classification result."""

    criterion: str
    criterion_type: CriterionType


class ClassificationResponse(BaseModel):
    """Batched classification response from Claude."""

    classifications: list[CriterionClassification]


def build_classifier_prompt(fields: list[DynamicField]) -> str:
    """Build the batched classification prompt for Claude."""
    criteria_lines = "\n".join(
        f"- name: {f.name!r}, value: {f.value!r}, importance: {f.importance.value}"
        for f in fields
    )
    return (
        f"You are a property search criterion classifier.\n\n"
        f"Classify each of the following criteria into one of these types:\n"
        f"{CRITERION_TYPES_DESCRIPTION}\n\n"
        f"Criteria to classify:\n{criteria_lines}\n\n"
        f"Rules:\n"
        f"- Return each criterion name EXACTLY as provided (character for character).\n"
        f"- If ambiguous, use subjective.\n"
        f"- Never invent criterion names.\n"
        f"- Classify every criterion listed above."
    )


class CriterionClassifier:
    """Classifies DynamicField criteria using a single batched Claude call."""

    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        """Lazy-init AsyncAnthropic client."""
        if self._client is None:
            self._client = AsyncAnthropic()
        return self._client

    async def classify_fields(self, fields: list[DynamicField]) -> list[DynamicField]:
        """Classify all fields in a single batched Claude call.

        Empty input returns immediately without calling Claude.
        Fields whose criterion name Claude doesn't match default to SUBJECTIVE.
        """
        if not fields:
            return fields

        client = self.get_client()
        result = await client.messages.parse(
            model=CLASSIFIER_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": build_classifier_prompt(fields)}],
            response_format=ClassificationResponse,
        )

        # Build lookup from criterion name -> criterion_type
        lookup: dict[str, CriterionType] = {
            c.criterion: c.criterion_type for c in result.parsed.classifications
        }

        # Return new DynamicField instances with criterion_type populated
        return [
            DynamicField(
                name=field.name,
                value=field.value,
                importance=field.importance,
                criterion_type=lookup.get(field.name, CriterionType.SUBJECTIVE),
            )
            for field in fields
        ]


# Module-level singleton
criterion_classifier = CriterionClassifier()
