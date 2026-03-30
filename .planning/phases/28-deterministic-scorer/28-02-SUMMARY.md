---
phase: 28-deterministic-scorer
plan: 02
subsystem: backend/scoring
tags: [deterministic-scorer, tdd, pydantic, scoring, python]
dependency_graph:
  requires:
    - 28-01 (test scaffold — created inline as deviation Rule 3)
  provides:
    - backend/app/services/deterministic_scorer.py (FulfillmentResult, FEATURE_ALIAS_MAP, 5 scorer functions, 1 synthesizer)
  affects:
    - Phase 31 (Hybrid Scorer) — will import from this module
tech_stack:
  added: []
  patterns:
    - exponential decay scoring (exp(-k * overshoot/target))
    - power decay scoring for size below minimum
    - alias map pattern for German/English term resolution
    - None-as-skip sentinel (never 0.0 for missing data)
key_files:
  created:
    - backend/app/services/deterministic_scorer.py
    - backend/tests/test_deterministic_scorer.py
  modified: []
decisions:
  - score_size(field, listing) uses only min constraint from field.value; symmetric min+max handled in synthesize_builtin_results which reads UserPreferences directly
  - FEATURE_ALIAS_MAP pre-computes _ALL_KNOWN_SLUGS union at module load for O(1) unknown-term detection
  - score_binary_feature returns None only for truly unrecognized terms (not in alias map AND not a known slug)
  - All test classes created in same commit as implementation (28-01 test scaffold was never executed; created inline as Rule 3 blocking fix)
metrics:
  duration: 4 minutes
  completed: "2026-03-30"
  tasks_completed: 3
  files_changed: 2
---

# Phase 28 Plan 02: Deterministic Scorer Implementation Summary

Implemented `backend/app/services/deterministic_scorer.py` — the complete standalone deterministic scoring module. All 41 tests across 6 test classes pass GREEN.

## What Was Built

FulfillmentResult Pydantic model + FEATURE_ALIAS_MAP (40+ EN/German entries) + five typed scorer functions + built-in preference synthesizer for the v5.0 hybrid scoring architecture.

## Exports

```python
from app.services.deterministic_scorer import (
    FulfillmentResult,        # Pydantic model: criterion_name, fulfillment [0,1], importance
    FEATURE_ALIAS_MAP,        # dict[str, set[str]]: 40+ term → Flatfox slug mappings
    score_price,              # DS-01: exp(-2.5 * overshoot/budget)
    score_distance,           # DS-02: exp(-1.0 * overshoot/target_km)
    score_size,               # DS-03: power decay below min, 1.0 above
    score_binary_feature,     # DS-04: alias map lookup → 1.0/0.0/None
    score_proximity_quality,  # DS-05: distance decay + rating bonus
    synthesize_builtin_results,  # DS-06: virtual budget/rooms/living_space entries
)
```

## Scoring Formulas

| Criterion | Formula | Constant |
|-----------|---------|----------|
| Price above budget | `exp(-2.5 * (price-budget)/budget)` | k=2.5 |
| Distance beyond target | `exp(-1.0 * (actual-target)/target)` | k=1.0 |
| Size below minimum | `(actual/min)^1.5` | power=1.5 |
| Size above maximum | `exp(-0.5 * (actual-max)/max)` | k=0.5 (softer) |
| Proximity quality | `min(1.0, exp(-1.0 * dist/radius) + rating_bonus)` | rating_bonus≤0.2 |

## Key Design Decisions

1. **None-as-skip sentinel**: All scorer functions return `None` for missing/unparseable data — never `0.0`. This is critical for the weighted aggregation in Phase 31 (missing data must be skipped, not penalized).

2. **FEATURE_ALIAS_MAP**: 40+ entries covering EN + German synonyms. Pre-computes `_ALL_KNOWN_SLUGS` at module load for efficient unknown-term detection. Unknown terms (not in alias map AND not a known slug) return `None` (skip).

3. **score_size vs _score_size_symmetric**: `score_size(field, listing)` is the public API — uses only `field.value` as target_min (no upper bound). `_score_size_symmetric(actual, min, max)` is the internal helper used by `synthesize_builtin_results` which has access to both `rooms_max` and `living_space_max` from `UserPreferences`.

## Test Results

```
41 passed in 0.12s
```

All 6 test classes:
- TestPriceScorer: 6 tests PASSED
- TestDistanceScorer: 6 tests PASSED
- TestSizeScorer: 6 tests PASSED
- TestBinaryFeatureScorer: 8 tests PASSED
- TestProximityQualityScorer: 5 tests PASSED
- TestBuiltinSynthesizer: 10 tests PASSED

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 28-01 (test scaffold) was never executed**

- **Found during:** Task 1 TDD RED phase
- **Issue:** `test_deterministic_scorer.py` did not exist — Plan 28-02 depends on it for TDD workflow
- **Fix:** Created test file inline with all 6 test classes and 41 test methods as part of Task 1 RED phase, confirmed ImportError (RED), then implemented GREEN
- **Files modified:** `backend/tests/test_deterministic_scorer.py` (created)
- **Commit:** 76a788a

**2. [Scope note] 5 pre-existing test failures in full suite**

- `test_chat_endpoint.py`, `test_conversation.py`, `test_score_endpoint.py` have 5 failing tests
- Confirmed pre-existing (fail without my changes, caused by Anthropic API key not set in test env and save_analysis mock mismatch from a prior change)
- Deferred to separate tracking — out of scope for this plan

## Self-Check: PASSED

- `backend/app/services/deterministic_scorer.py` exists: FOUND
- `backend/tests/test_deterministic_scorer.py` exists: FOUND
- Commit 76a788a exists: FOUND
- All 41 tests pass: CONFIRMED
