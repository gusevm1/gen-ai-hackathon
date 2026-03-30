---
phase: 31-hybrid-scorer-router-integration
plan: 01
subsystem: api
tags: [pydantic, scoring, weighted-aggregation, adapter-pattern]

# Dependency graph
requires:
  - phase: 28-deterministic-scoring-engine
    provides: "FulfillmentResult model, deterministic scorer functions"
  - phase: 30-database-infrastructure-prep
    provides: "listing_profiles table, migrations 005-007"
provides:
  - "CriterionResult model for per-criterion API response"
  - "ScoreResponse v2 with schema_version, criteria_results, enrichment_status"
  - "profile_adapter: ListingProfile -> FlatfoxListing conversion with type coercions"
  - "hybrid_scorer: weighted aggregation engine with CRITICAL override"
affects: [31-02, 31-03, 32-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [adapter-pattern, weighted-aggregation, critical-override-cap]

key-files:
  created:
    - backend/app/services/profile_adapter.py
    - backend/app/services/hybrid_scorer.py
  modified:
    - backend/app/models/scoring.py

key-decisions:
  - "summary_bullets max_length raised from 5 to 7 for flexibility"
  - "categories/checklist default to empty list for v2 (retained for v1 cache reads)"
  - "Pre-computed amenity data always has is_fallback=False in proximity_data format"

patterns-established:
  - "Adapter pattern: profile_adapter bridges ListingProfile to FlatfoxListing without modifying scorer"
  - "CRITICAL override: any critical criterion with fulfillment=0 caps score at 39 and forces poor tier"
  - "None exclusion: missing data criteria excluded from both numerator and denominator"

requirements-completed: [HA-01, HA-02, HA-03, HA-04, INT-03]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 31 Plan 01: Scoring Building Blocks Summary

**CriterionResult model, profile adapter (ListingProfile -> FlatfoxListing), and weighted aggregation engine with CRITICAL cap at 39**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T15:16:11Z
- **Completed:** 2026-03-30T15:18:10Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added CriterionResult model and ScoreResponse v2 fields (schema_version, criteria_results, enrichment_status) while preserving backward-compatible field names
- Created profile_adapter.py with correct type coercions: list[str] -> list[FlatfoxAttribute], float -> str rooms, sqm -> surface_living, canton -> state
- Created hybrid_scorer.py implementing HA-01 weighted average, HA-02 None exclusion, HA-03 CRITICAL zero cap at 39

## Task Commits

Each task was committed atomically:

1. **Task 1: Update ScoreResponse v2 model + add CriterionResult** - `ecc1550` (feat)
2. **Task 2: Create profile_adapter.py** - `46b203c` (feat)
3. **Task 3: Create hybrid_scorer.py** - `fd8cb4b` (feat)

**Plan metadata:** (pending) (docs: complete plan)

## Files Created/Modified
- `backend/app/models/scoring.py` - Added CriterionResult model, ScoreResponse v2 fields (schema_version=2, criteria_results, enrichment_status), categories/checklist default to empty list
- `backend/app/services/profile_adapter.py` - Adapter converting ListingProfile to FlatfoxListing with type coercions, and amenities to proximity_data format
- `backend/app/services/hybrid_scorer.py` - Weighted aggregation engine (compute_weighted_score) and FulfillmentResult -> CriterionResult converter (to_criterion_result)

## Decisions Made
- Raised summary_bullets max_length from 5 to 7 for flexibility (plan initially said keep min_length=3, max_length adjusted)
- Pre-computed amenity data always marked is_fallback=False since it comes from research agent, not fallback
- categories and checklist fields default to empty list rather than being required, for v2 backward compat

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three building blocks ready for import by the scoring router (Plan 02)
- CriterionResult importable from app.models.scoring
- adapt_profile_to_listing and adapt_profile_amenities importable from app.services.profile_adapter
- compute_weighted_score and to_criterion_result importable from app.services.hybrid_scorer

## Self-Check: PASSED

All 3 files verified present on disk. All 3 task commits verified in git log.

---
*Phase: 31-hybrid-scorer-router-integration*
*Completed: 2026-03-30*
