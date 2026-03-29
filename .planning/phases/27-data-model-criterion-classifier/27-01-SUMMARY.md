---
phase: 27-data-model-criterion-classifier
plan: "01"
subsystem: backend/models
tags: [data-model, criterion-type, tdd, preferences, scoring]
dependency_graph:
  requires: []
  provides:
    - CriterionType enum in app.models.preferences
    - criterion_type field on DynamicField
    - v5.0 IMPORTANCE_WEIGHT_MAP (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1)
    - test_classifier.py scaffold (Wave 0 for Plan 02)
  affects:
    - backend/app/services/classifier.py (Plan 02 implementation target)
    - backend/app/routers/classifier.py (Plan 02 implementation target)
    - Phase 28+ scoring pipeline (criterion type routing)
    - Phase 31 weighted aggregation formula
tech_stack:
  added: []
  patterns:
    - "CriterionType(str, Enum) with 6 routing values for v5.0 hybrid scorer"
    - "Optional[CriterionType] = None for backward-compatible DynamicField extension"
    - "TDD Wave 0 scaffold: test file precedes implementation"
key_files:
  created:
    - backend/tests/test_classifier.py
  modified:
    - backend/app/models/preferences.py
    - backend/tests/test_preferences.py
decisions:
  - "CriterionType enum values use snake_case member names matching string values (BINARY_FEATURE='binary_feature') for natural Python usage"
  - "criterion_type is Optional to maintain backward compatibility with existing DynamicField records in Supabase JSONB"
  - "IMPORTANCE_WEIGHT_MAP updated from 90/70/50/30 to 5/3/2/1 (v5.0 weighted aggregation scale)"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
  tests_added: 5
  tests_passed: 29
---

# Phase 27 Plan 01: Data Model & Criterion Type Enum Summary

**One-liner:** CriterionType enum with 6 routing values added to DynamicField, IMPORTANCE_WEIGHT_MAP updated to v5.0 scale (5/3/2/1), and test_classifier.py scaffold created for Plan 02.

## What Was Built

### Task 1: CriterionType enum + DynamicField update + weight scale (TDD)

**RED phase:** Updated `test_preferences.py` to import `CriterionType`, changed `TestImportanceWeightMap` assertions from 90/70/50/30 to 5/3/2/1, and added `TestCriterionType` class with 5 new tests. Tests failed with ImportError as expected.

**GREEN phase:** Updated `preferences.py` with:
- `CriterionType(str, Enum)` with 6 values: `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective`
- `criterion_type: Optional[CriterionType] = None` on `DynamicField` (backward compatible)
- `IMPORTANCE_WEIGHT_MAP` updated to v5.0 scale: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1

All 29 tests pass (24 pre-existing + 5 new).

### Task 2: test_classifier.py scaffold (Wave 0 for Plan 02)

Created `backend/tests/test_classifier.py` with:
- `TestClassifyEndpoint`: 2 tests for the `POST /classify-criteria` endpoint
- `TestCriterionClassifierService`: 3 tests for `CriterionClassifier.classify_fields()`

Tests are intentionally RED (ImportError on `app.services.classifier` and `app.routers.classifier` which don't exist yet). Plan 02 makes these GREEN by implementing the router and service. The `async_client` fixture is not yet in `conftest.py` — Plan 02 will add it.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
# CriterionType importable with all 6 values
[<CriterionType.DISTANCE: 'distance'>, <CriterionType.PRICE: 'price'>, <CriterionType.SIZE: 'size'>, <CriterionType.BINARY_FEATURE: 'binary_feature'>, <CriterionType.PROXIMITY_QUALITY: 'proximity_quality'>, <CriterionType.SUBJECTIVE: 'subjective'>]

# DynamicField(name='test').criterion_type is None
None

# IMPORTANCE_WEIGHT_MAP v5.0 values
{<ImportanceLevel.CRITICAL: 'critical'>: 5, <ImportanceLevel.HIGH: 'high'>: 3, <ImportanceLevel.MEDIUM: 'medium'>: 2, <ImportanceLevel.LOW: 'low'>: 1}

# test_preferences.py
29 passed, 30 warnings in 0.08s
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 41a9b4c | feat(27-01): add CriterionType enum, criterion_type field, v5.0 weight scale |
| 2 | 729bc1f | test(27-01): create test_classifier.py scaffold (Wave 0 for Plan 02) |

## Self-Check: PASSED

- backend/app/models/preferences.py: FOUND
- backend/tests/test_preferences.py: FOUND
- backend/tests/test_classifier.py: FOUND
- commit 41a9b4c: FOUND
- commit 729bc1f: FOUND
