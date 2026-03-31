"""Weighted aggregation engine with CRITICAL penalty for hybrid scoring.

Implements the scoring aggregation requirements:
- HA-01: Weighted average using IMPORTANCE_WEIGHT_MAP
- HA-02: None fulfillment values excluded from numerator and denominator
- HA-03: CRITICAL importance with fulfillment < 0.05 applies a 0.55x penalty
         per failed criterion (compounding), preserving score differentiation

Also provides to_criterion_result() to convert internal FulfillmentResult
to the API-facing CriterionResult model.
"""

from __future__ import annotations

from app.models.preferences import IMPORTANCE_WEIGHT_MAP, ImportanceLevel
from app.models.scoring import CriterionResult
from app.services.deterministic_scorer import FulfillmentResult

# Penalty multiplier applied per CRITICAL criterion that is near-zero.
# Two critical failures: 0.55 * 0.55 = 0.3025x — harsh but differentiating.
CRITICAL_FAIL_PENALTY = 0.55


def compute_weighted_score(results: list[FulfillmentResult]) -> tuple[int, str]:
    """Compute weighted overall score and match tier from fulfillment results.

    Args:
        results: List of per-criterion fulfillment results.

    Returns:
        Tuple of (overall_score 0-100, match_tier str).

    Scoring rules:
        - HA-01: score = round((sum(weight * fulfillment) / sum(weights)) * 100)
        - HA-02: Results with fulfillment=None are excluded from both sums
        - HA-03: Each CRITICAL criterion with fulfillment < 0.05 applies a
          compounding 0.55x penalty to the raw score
    """
    # HA-02: Filter to results with non-None fulfillment
    scored = [r for r in results if r.fulfillment is not None]

    if not scored:
        return (0, "poor")

    # HA-03: Count CRITICAL near-zero failures
    critical_fails = sum(
        1
        for r in scored
        if r.importance == ImportanceLevel.CRITICAL and r.fulfillment < 0.05
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

    # HA-03: Apply compounding penalty for CRITICAL failures
    if critical_fails > 0:
        penalized = round(raw_score * (CRITICAL_FAIL_PENALTY ** critical_fails))
        tier = _derive_tier(penalized)
        return (penalized, tier)

    tier = _derive_tier(raw_score)
    return (raw_score, tier)


def _derive_tier(score: int) -> str:
    """Map a numeric score to a match tier label."""
    if score >= 80:
        return "excellent"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "poor"


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
