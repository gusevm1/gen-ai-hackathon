---
phase: 27-data-model-criterion-classifier
plan: 02
subsystem: api
tags: [anthropic, fastapi, pydantic, classifier, criterion-type, haiku]

# Dependency graph
requires:
  - phase: 27-01
    provides: CriterionType enum, DynamicField model with Optional[criterion_type], test_classifier scaffold
provides:
  - CriterionClassifier service with batched Claude classification via messages.parse()
  - POST /classify-criteria FastAPI endpoint registered in app
  - async_client test fixture in conftest.py
affects: [phase-31-hybrid-scorer, any code consuming DynamicField criterion_type]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy-init AsyncAnthropic singleton (mirrors ClaudeScorer pattern)"
    - "Single batched messages.parse() call with structured output for all fields"
    - "Unmatched names default to SUBJECTIVE via dict.get() fallback"
    - "response_model_by_alias=True on router endpoint for camelCase JSON serialization"

key-files:
  created:
    - backend/app/services/classifier.py
    - backend/app/routers/classifier.py
  modified:
    - backend/app/main.py
    - backend/tests/conftest.py

key-decisions:
  - "CLASSIFIER_MODEL defaults to claude-haiku-4-5-20251001 (via CLASSIFIER_MODEL env var), separate from CLAUDE_MODEL"
  - "Empty fields list returns immediately without calling Claude (guard in classify_fields)"
  - "Unmatched criterion names default to CriterionType.SUBJECTIVE (safe fallback, not error)"
  - "New DynamicField instances returned (not mutated in-place) for clean data flow"

patterns-established:
  - "Classifier prompt instructs Claude to return names EXACTLY as provided, preventing mismatches"
  - "ClassificationResponse pydantic model used as response_format for structured output"

requirements-completed: [DM-02]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 27 Plan 02: CriterionClassifier Service & Endpoint Summary

**CriterionClassifier service classifying DynamicFields via single batched claude-haiku messages.parse() call, with POST /classify-criteria FastAPI endpoint returning camelCase-serialized enriched fields**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T22:33:21Z
- **Completed:** 2026-03-29T22:41:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- CriterionClassifier service with lazy-init AsyncAnthropic, batched classification, and SUBJECTIVE fallback for unmatched names
- POST /classify-criteria endpoint registered in FastAPI, accepting/returning camelCase DynamicField JSON
- async_client fixture added to conftest.py enabling all endpoint tests
- All 5 test_classifier.py tests pass; zero regressions in non-integration suite

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement CriterionClassifier service** - `262f354` (feat)
2. **Task 2: POST /classify-criteria router + main.py + conftest** - `a91c1c3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `backend/app/services/classifier.py` - CriterionClassifier class, CLASSIFIER_MODEL constant, CriterionClassification/ClassificationResponse pydantic models, criterion_classifier singleton
- `backend/app/routers/classifier.py` - POST /classify-criteria FastAPI router with ClassifyRequest/ClassifyResponse
- `backend/app/main.py` - Added classifier import and app.include_router(classifier.router)
- `backend/tests/conftest.py` - Added async_client fixture (AsyncClient over ASGITransport)

## Decisions Made
- `CLASSIFIER_MODEL` uses its own env var (`CLASSIFIER_MODEL`) separate from `CLAUDE_MODEL`, allowing independent model selection for classification vs scoring
- Returned list uses new DynamicField instances rather than mutating inputs — cleaner and consistent with Pydantic immutability patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Python 3.11 venv not present locally; used `/opt/homebrew/opt/python@3.11/bin/python3.11` with globally installed packages. Pre-existing test failures (5 tests in chat/scoring) confirmed as baseline failures not caused by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DM-02 fulfilled: criterion_type classification service and endpoint are operational
- Phase 28 (DB migration) and Phase 31 (hybrid scorer) can now consume criterion_classifier
- No blockers

---
*Phase: 27-data-model-criterion-classifier*
*Completed: 2026-03-29*
