---
phase: 07-preferences-schema-unification
plan: 01
subsystem: api
tags: [zod, pydantic, schema, preferences, importance-levels, backward-compat]

# Dependency graph
requires:
  - phase: 05-db-schema-migration
    provides: profiles table with preferences JSONB column
provides:
  - Canonical Zod preferences schema with importance levels, dealbreakers, features
  - Canonical Pydantic UserPreferences model with backward-compatible JSONB parsing
  - ImportanceLevel enum and IMPORTANCE_WEIGHT_MAP for scoring pipeline
  - LEGACY_PREFERENCES_JSON fixture for backward-compat testing
affects: [07-02-prompt-update, 08-layout-navigation, 09-preferences-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [model_validator for legacy JSONB migration, importance enum over numeric weights]

key-files:
  created:
    - backend/tests/test_preferences.py
  modified:
    - web/src/lib/schemas/preferences.ts
    - web/src/__tests__/preferences-schema.test.ts
    - backend/app/models/preferences.py
    - backend/app/prompts/scoring.py
    - backend/tests/conftest.py
    - backend/tests/test_listing_model.py
    - backend/tests/test_prompts.py
    - backend/tests/test_scoring_models.py

key-decisions:
  - "Importance levels default to medium when migrating old-format JSONB (no numeric weight conversion)"
  - "Bridge fix for scoring prompt to use new field names (features, importance via WEIGHT_MAP) pending Plan 02 full rewrite"
  - "extra=ignore on Pydantic model to silently drop old weights/selectedFeatures keys"

patterns-established:
  - "model_validator(mode=before) for JSONB backward compatibility migrations"
  - "ImportanceLevel enum with IMPORTANCE_WEIGHT_MAP for numeric conversion when needed"
  - "LEGACY_PREFERENCES_JSON fixture alongside SAMPLE_PREFERENCES_JSON for dual-format testing"

requirements-completed: [PREF-13]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 7 Plan 01: Canonical Preferences Schema Summary

**Unified Zod + Pydantic preferences schema with importance levels, dealbreaker toggles, and backward-compatible legacy JSONB migration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T14:45:27Z
- **Completed:** 2026-03-13T14:50:10Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Canonical Zod schema with importance levels (critical/high/medium/low), dealbreaker booleans, floorPreference, availability, and features array -- replacing numeric weights and selectedFeatures
- Pydantic UserPreferences model mirroring Zod schema field-for-field with camelCase aliasing and model_validator for automatic legacy JSONB migration
- All 68 backend tests and 38 web tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite Zod canonical schema + update web tests** - `d977e30` (feat)
2. **Task 2: Rewrite Pydantic model + create model tests + update conftest fixtures** - `6237467` (feat)

_Both tasks followed TDD flow: RED (failing tests) -> GREEN (implementation) -> verify._

## Files Created/Modified
- `web/src/lib/schemas/preferences.ts` - Canonical Zod schema with importanceLevelSchema, importanceSchema, preferencesSchema
- `web/src/__tests__/preferences-schema.test.ts` - 10 tests covering defaults, round-trips, validation, partial importance
- `backend/app/models/preferences.py` - Pydantic model with ImportanceLevel enum, Importance model, IMPORTANCE_WEIGHT_MAP, UserPreferences with migrate_legacy_format validator
- `backend/app/prompts/scoring.py` - Bridge fix: use features and IMPORTANCE_WEIGHT_MAP instead of removed fields
- `backend/tests/conftest.py` - New-format SAMPLE_PREFERENCES_JSON + LEGACY_PREFERENCES_JSON fixture
- `backend/tests/test_preferences.py` - 11 new tests for model parsing, legacy compat, defaults, aliases, language literal
- `backend/tests/test_listing_model.py` - Updated defaults test to use ImportanceLevel instead of weights
- `backend/tests/test_prompts.py` - Updated fixture to use features and importance instead of selected_features and weights
- `backend/tests/test_scoring_models.py` - Updated camelCase parsing test to use new format

## Decisions Made
- **No numeric weight conversion for legacy data:** Old weights (0-100 ints) are NOT converted to importance levels. All categories default to "medium" when migrating, as agreed with user. This avoids arbitrary mapping thresholds.
- **Bridge fix for scoring prompt:** Updated scoring.py to use `prefs.features` and `IMPORTANCE_WEIGHT_MAP[prefs.importance.X]` instead of removed `prefs.selected_features` and `prefs.weights.X`. Plan 02 will do the full prompt rewrite with dealbreaker semantics.
- **extra="ignore" on Pydantic model:** Silently drops unknown keys (weights, selectedFeatures) after the validator migrates what it can. No validation errors for old-format data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated scoring.py to use new field names**
- **Found during:** Task 2 (Pydantic model rewrite)
- **Issue:** scoring.py references `prefs.selected_features` and `prefs.weights.X` which no longer exist after model rewrite. This caused test_prompts.py and test_scoring.py to fail.
- **Fix:** Updated scoring.py to use `prefs.features` and `IMPORTANCE_WEIGHT_MAP[prefs.importance.X]` for the prompt template. This is a bridge fix; Plan 02 will do the full prompt rewrite.
- **Files modified:** backend/app/prompts/scoring.py
- **Verification:** All 68 backend tests pass
- **Committed in:** 6237467 (Task 2 commit)

**2. [Rule 1 - Bug] Updated existing tests referencing removed fields**
- **Found during:** Task 2 (Pydantic model rewrite)
- **Issue:** test_listing_model.py, test_prompts.py, test_scoring_models.py referenced `weights` and `selected_features` fields that no longer exist.
- **Fix:** Updated test fixtures and assertions to use `importance` and `features` fields.
- **Files modified:** backend/tests/test_listing_model.py, backend/tests/test_prompts.py, backend/tests/test_scoring_models.py
- **Verification:** All 68 backend tests pass
- **Committed in:** 6237467 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes were necessary for correctness. Scoring prompt bridge fix keeps existing functionality working while Plan 02 handles the full prompt rewrite. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Canonical schema defined in both Zod and Pydantic, ready for Plan 02 (Claude prompt update with importance levels and dealbreaker semantics)
- LEGACY_PREFERENCES_JSON fixture available for any future backward-compat testing
- Web app UI components (weight-sliders.tsx, soft-criteria.tsx) still reference old schema fields -- Phase 9 will rebuild these

## Self-Check: PASSED

All 9 modified/created files verified on disk. Both task commits (d977e30, 6237467) verified in git log.

---
*Phase: 07-preferences-schema-unification*
*Completed: 2026-03-13*
