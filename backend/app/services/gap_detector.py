"""Gap detector — identifies scoring gaps that need LLM backfill.

When the deterministic scoring engine cannot answer a user preference
from the pre-computed ListingProfile data, it marks the checklist item
with `met=None` and a "[GAP]" prefix on the note.  This module finds
those items and packages them for the cheap-LLM backfill pipeline.
"""

from __future__ import annotations

import logging

from app.models.preferences import UserPreferences, DynamicField, ImportanceLevel
from app.models.listing_profile import ListingProfile
from app.models.scoring import ChecklistItem

logger = logging.getLogger(__name__)


def detect_gaps(
    checklist: list[ChecklistItem],
    preferences: UserPreferences,
) -> list[dict]:
    """Find checklist items that couldn't be answered from pre-computed data.

    A gap is identified when:
    - ``met`` is ``None``  (the deterministic engine could not decide)
    - ``note`` starts with ``"[GAP]"``

    For each gap the function tries to match the checklist criterion back
    to a ``DynamicField`` in the user's preferences so the importance
    level is preserved.  If no matching dynamic field is found, importance
    defaults to ``"medium"``.

    Args:
        checklist: Checklist items produced by the deterministic scorer.
        preferences: The user's preferences (used to look up importance).

    Returns:
        List of gap dicts, each containing:
        - ``field_name``  (str): The criterion / preference name.
        - ``field_value`` (str): The user's desired value for that field.
        - ``importance``  (str): Importance level (critical/high/medium/low).
    """
    # Build a lookup from dynamic field name -> DynamicField for fast matching
    dynamic_by_name: dict[str, DynamicField] = {
        df.name.strip().lower(): df for df in preferences.dynamic_fields
    }

    gaps: list[dict] = []
    for item in checklist:
        if item.met is not None:
            continue
        if not item.note.startswith("[GAP]"):
            continue

        criterion_lower = item.criterion.strip().lower()
        matched_field = dynamic_by_name.get(criterion_lower)

        if matched_field is not None:
            field_value = matched_field.value or matched_field.name
            importance = matched_field.importance.value
        else:
            # Fall back: criterion text is both name and value
            field_value = item.criterion
            importance = ImportanceLevel.MEDIUM.value

        gaps.append(
            {
                "field_name": item.criterion,
                "field_value": field_value,
                "importance": importance,
            }
        )

    logger.info("Detected %d gap(s) in checklist of %d items", len(gaps), len(checklist))
    return gaps
