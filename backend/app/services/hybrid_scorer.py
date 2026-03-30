"""Weighted aggregation engine with CRITICAL override for hybrid scoring.

Implements the Phase 31 scoring aggregation requirements:
- HA-01: Weighted average using IMPORTANCE_WEIGHT_MAP
- HA-02: None fulfillment values excluded from numerator and denominator
- HA-03: CRITICAL importance with fulfillment=0 forces match_tier=poor, caps score at 39

Also provides to_criterion_result() to convert internal FulfillmentResult
to the API-facing CriterionResult model.
"""

from __future__ import annotations

from app.models.preferences import IMPORTANCE_WEIGHT_MAP, ImportanceLevel
from app.models.scoring import CriterionResult
from app.services.deterministic_scorer import FulfillmentResult


def compute_weighted_score(results: list[FulfillmentResult]) -> tuple[int, str]:
    """Compute weighted overall score and match tier from fulfillment results.

    Args:
        results: List of per-criterion fulfillment results.

    Returns:
        Tuple of (overall_score 0-100, match_tier str).

    Scoring rules:
        - HA-01: score = round((sum(weight * fulfillment) / sum(weights)) * 100)
        - HA-02: Results with fulfillment=None are excluded from both sums
        - HA-03: If any CRITICAL criterion has fulfillment=0.0, force tier="poor"
          and cap score at 39
    """
    # HA-02: Filter to results with non-None fulfillment
    scored = [r for r in results if r.fulfillment is not None]

    if not scored:
        return (0, "poor")

    # HA-03: Check for CRITICAL zero
    critical_zero = any(
        r.importance == ImportanceLevel.CRITICAL and r.fulfillment == 0.0
        for r in scored
    )

    # HA-01: Weighted average
    numerator = sum(
        IMPORTANCE_WEIGHT_MAP[r.importance] * r.fulfillment
        for r in scored
    )
    denominator = sum(
        IMPORTANCE_WEIGHT_MAP[r.importance]
        for r in scored
    )

    raw_score = round((numerator / denominator) * 100)

    # HA-03: CRITICAL override
    if critical_zero:
        capped_score = min(raw_score, 39)
        return (capped_score, "poor")

    # Derive tier from raw score
    if raw_score >= 80:
        tier = "excellent"
    elif raw_score >= 60:
        tier = "good"
    elif raw_score >= 40:
        tier = "fair"
    else:
        tier = "poor"

    return (raw_score, tier)


def to_criterion_result(fr: FulfillmentResult) -> CriterionResult:
    """Convert internal FulfillmentResult to API-facing CriterionResult.

    Args:
        fr: Internal fulfillment result from the deterministic scorer.

    Returns:
        CriterionResult with weight looked up from IMPORTANCE_WEIGHT_MAP.
    """
    return CriterionResult(
        criterion_name=fr.criterion_name,
        fulfillment=fr.fulfillment,
        importance=fr.importance.value,
        weight=IMPORTANCE_WEIGHT_MAP[fr.importance],
        reasoning=fr.reasoning,
    )
