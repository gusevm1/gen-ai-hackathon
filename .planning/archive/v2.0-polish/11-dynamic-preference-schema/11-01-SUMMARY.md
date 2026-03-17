---
phase: 11-dynamic-preference-schema
plan: 01
subsystem: api, database
tags: [pydantic, zod, schema, migration, preferences, dynamicFields]

# Dependency graph
requires:
  - phase: 07-schema-unification
    provides: UserPreferences Pydantic model, preferencesSchema Zod schema, ImportanceLevel enum, model_validator migration pattern
provides:
  - DynamicField Pydantic model with name/value/importance fields and camelCase alias support
  - DynamicField Zod schema (dynamicFieldSchema) with validation
  - dynamic_fields field on UserPreferences (not silently dropped by extra="ignore")
  - dynamicFields field on preferencesSchema with default []
  - migratePreferences() function for pre-parse softCriteria -> dynamicFields conversion
  - model_validator migration from softCriteria -> dynamicFields (Pydantic)
  - Comprehensive test coverage for DynamicField parsing, validation, and migration
affects: [11-02 scoring prompt, 12 chat-preference-discovery, preferences UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DynamicField type pattern: name/value/importance triple with camelCase aliases"
    - "Pre-parse migration pattern: migratePreferences() called before schema.parse() at load points"
    - "model_validator extension: softCriteria -> dynamicFields migration alongside existing weights/selectedFeatures migration"

key-files:
  created: []
  modified:
    - backend/app/models/preferences.py
    - backend/tests/conftest.py
    - backend/tests/test_preferences.py
    - web/src/lib/schemas/preferences.ts
    - web/src/__tests__/preferences-schema.test.ts

key-decisions:
  - "Keep softCriteria field in both schemas for backward compatibility; migration adds dynamicFields alongside it"
  - "Use pre-parse migratePreferences() function (web) rather than Zod transform to avoid default/transform ordering issues"
  - "DynamicField name field rejects empty strings via field_validator (Pydantic) and z.string().min(1) (Zod)"

patterns-established:
  - "DynamicField schema pattern: consistent name/value/importance structure across Pydantic and Zod"
  - "Migration-at-load pattern: web uses migratePreferences() before parse; backend uses model_validator"

requirements-completed: [SCHM-01, SCHM-02, SCHM-03, SCHM-05]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 11 Plan 01: Dynamic Preference Schema Summary

**DynamicField type in both Pydantic and Zod with name/value/importance fields, backward-compatible softCriteria migration, and 22 new tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T13:32:55Z
- **Completed:** 2026-03-15T13:37:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- DynamicField Pydantic model with name, value, importance fields, camelCase alias support, and empty-name rejection
- DynamicField Zod schema with matching validation, defaults, and exported DynamicField type
- Backward-compatible migration: softCriteria strings auto-convert to dynamicFields in both Pydantic (model_validator) and Zod (migratePreferences function)
- 22 new tests (13 backend + 9 web) covering parsing, validation, defaults, migration, and backward compatibility

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: DynamicField Pydantic model + migration + backend tests**
   - `84fb92e` (test: RED - failing tests for DynamicField)
   - `f62a777` (feat: GREEN - DynamicField model, migration, conftest update)
2. **Task 2: DynamicField Zod schema + migratePreferences + web tests**
   - `e70ac18` (test: RED - failing tests for dynamicFieldSchema and migratePreferences)
   - `02ce126` (feat: GREEN - dynamicFieldSchema, DynamicField type, migratePreferences)

## Files Created/Modified
- `backend/app/models/preferences.py` - Added DynamicField BaseModel, dynamic_fields field on UserPreferences, extended migrate_legacy_format for softCriteria -> dynamicFields
- `backend/tests/conftest.py` - Added dynamicFields sample data to SAMPLE_PREFERENCES_JSON
- `backend/tests/test_preferences.py` - Added TestDynamicFields and TestSoftCriteriaMigration test classes (13 new tests)
- `web/src/lib/schemas/preferences.ts` - Added dynamicFieldSchema, DynamicField type, dynamicFields field, migratePreferences function
- `web/src/__tests__/preferences-schema.test.ts` - Added dynamicFields and migratePreferences describe blocks (9 new tests)

## Decisions Made
- Kept softCriteria field in both schemas for backward compatibility rather than removing it; migration adds dynamicFields alongside it
- Used a standalone migratePreferences() function (web-side) rather than Zod transform to avoid the Zod 4 default/transform ordering pitfall identified in research
- DynamicField rejects empty names at validation time (field_validator in Pydantic, z.string().min(1) in Zod) rather than silently filtering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DynamicField types ready for Plan 02 (scoring prompt rendering with importance-weighted dynamic fields)
- migratePreferences function available for UI integration in future plans
- All existing tests continue to pass (89 backend, 63 web) confirming backward compatibility

## Self-Check: PASSED

All 5 modified files exist. All 4 task commits verified (84fb92e, f62a777, e70ac18, 02ce126).

---
*Phase: 11-dynamic-preference-schema*
*Completed: 2026-03-15*
