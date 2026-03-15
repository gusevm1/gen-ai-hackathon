---
phase: 11-dynamic-preference-schema
plan: 02
subsystem: api, ui
tags: [scoring-prompt, dynamic-fields, importance-weighting, react-hook-form, useFieldArray, migration]

# Dependency graph
requires:
  - phase: 11-01
    provides: DynamicField Pydantic model, DynamicField Zod schema, migratePreferences function, dynamicFields field on both schemas
provides:
  - Importance-grouped dynamic fields rendering in Claude scoring prompt (_format_dynamic_fields_section)
  - DynamicFieldsSection React component with useFieldArray for add/edit/remove
  - Updated PreferencesForm using DynamicFieldsSection instead of SoftCriteriaSection
  - migratePreferences wired at all profile load call sites
  - Profile summary includes dynamic fields count and critical field highlights
affects: [12 chat-preference-discovery, scoring pipeline, preferences UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Importance-grouped prompt rendering: fields grouped by CRITICAL/HIGH/MEDIUM/LOW with descriptive labels"
    - "useFieldArray pattern: DynamicFieldsSection uses react-hook-form useFieldArray for structured array management"
    - "Migration-at-load wiring: migratePreferences() called before preferencesSchema.parse() at all read paths"

key-files:
  created:
    - web/src/components/preferences/dynamic-fields-section.tsx
  modified:
    - backend/app/prompts/scoring.py
    - backend/tests/test_prompts.py
    - web/src/components/preferences/preferences-form.tsx
    - web/src/lib/profile-summary.ts
    - web/src/app/(dashboard)/profiles/[profileId]/page.tsx
    - web/src/app/(dashboard)/dashboard/actions.ts

key-decisions:
  - "Use conditional rendering in build_user_prompt: dynamic fields section when present, fallback to soft_criteria line when absent"
  - "System prompt uses 'custom criterion' (not 'soft criterion') to match new dynamic fields terminology"
  - "useFieldArray for DynamicFieldsSection rather than manual array manipulation (more robust, proper key tracking)"

patterns-established:
  - "Importance-grouped prompt pattern: _format_dynamic_fields_section groups by CRITICAL > HIGH > MEDIUM > LOW with descriptive labels"
  - "Dynamic fields UI pattern: useFieldArray with name/value/importance inputs per row"

requirements-completed: [SCHM-04, SCHM-01]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 11 Plan 02: Dynamic Fields Prompt & UI Summary

**Importance-weighted dynamic fields in Claude scoring prompt with DynamicFieldsSection UI component replacing soft criteria**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T13:40:13Z
- **Completed:** 2026-03-15T13:43:44Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Claude scoring prompt renders dynamic fields grouped by importance (CRITICAL/HIGH/MEDIUM/LOW) with descriptive labels
- DynamicFieldsSection component with useFieldArray for structured add/edit/remove of criteria with importance dropdowns
- migratePreferences wired at all profile load call sites ensuring backward-compatible softCriteria migration
- Profile summary shows dynamic fields count, names, and highlights critical fields

## Task Commits

Each task was committed atomically (TDD for Task 1):

1. **Task 1: Update scoring prompt to render dynamic fields with importance weighting**
   - `f7a0945` (test: RED - 11 failing tests for dynamic fields in scoring prompt)
   - `144afaf` (feat: GREEN - _format_dynamic_fields_section, updated build_user_prompt and build_system_prompt)
2. **Task 2: Replace SoftCriteriaSection with DynamicFieldsSection + wire migration**
   - `37bbab6` (feat: DynamicFieldsSection component, updated form, profile summary, migration wiring)

## Files Created/Modified
- `backend/app/prompts/scoring.py` - Added _format_dynamic_fields_section() with importance grouping, updated build_user_prompt to use dynamic fields with soft criteria fallback, system prompt says "custom criterion"
- `backend/tests/test_prompts.py` - Added TestDynamicFieldsPrompt class with 11 tests for importance-grouped rendering, backward compat, and system prompt reference
- `web/src/components/preferences/dynamic-fields-section.tsx` - New DynamicFieldsSection component using useFieldArray with name, value, importance inputs and add/remove controls
- `web/src/components/preferences/preferences-form.tsx` - Replaced SoftCriteriaSection with DynamicFieldsSection, updated accordion value and trigger text
- `web/src/lib/profile-summary.ts` - Added dynamic fields to summary (count, first 2 names, critical field highlights)
- `web/src/app/(dashboard)/profiles/[profileId]/page.tsx` - Wired migratePreferences before preferencesSchema.parse
- `web/src/app/(dashboard)/dashboard/actions.ts` - Wired migratePreferences before preferencesSchema.parse in loadPreferences

## Decisions Made
- Used conditional rendering in build_user_prompt: shows dynamic fields section when present, falls back to soft_criteria line for backward compatibility with profiles that haven't been migrated yet
- Changed system prompt to use "custom criterion" terminology to match the new dynamic fields framing
- Used useFieldArray from react-hook-form for DynamicFieldsSection (proper key tracking, append/remove helpers) rather than manual array manipulation like SoftCriteriaSection used

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dynamic fields fully integrated: schema (Plan 01) + prompt + UI (Plan 02)
- Phase 11 complete -- ready for Phase 12 (chat-preference-discovery)
- All existing tests continue to pass (100 backend, 63 web) confirming backward compatibility

## Self-Check: PASSED

All 7 files verified present. All 3 task commits verified (f7a0945, 144afaf, 37bbab6).

---
*Phase: 11-dynamic-preference-schema*
*Completed: 2026-03-15*
