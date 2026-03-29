---
phase: 27-data-model-criterion-classifier
plan: 03
subsystem: api
tags: [zod, typescript, next.js, server-actions, fastapi, preferences, criterion-classifier]

# Dependency graph
requires:
  - phase: 27-01
    provides: CriterionType enum + test_classifier scaffold on EC2 backend
  - phase: 27-02
    provides: /classify-criteria FastAPI endpoint deployed on EC2
provides:
  - criterionTypeSchema exported from preferences.ts with all 6 criterion type values
  - CriterionType TypeScript type inferred from schema
  - criterionType optional field on dynamicFieldSchema (backward compatible)
  - saveProfilePreferences enriches dynamic fields via /classify-criteria before Supabase write
  - createProfileWithPreferences enriches dynamic fields via /classify-criteria before Supabase insert
affects: [28-hybrid-scorer, 29-scoring-pipeline, 30-db-schema-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Silent-fail classification injection: try/catch wraps classify call so profile save never blocks on classifier errors"
    - "let validated pattern: const->let on Zod parse result to allow enrichment before DB write"
    - "EC2_API_URL server-only env var: no NEXT_PUBLIC_ prefix, safe for server actions"

key-files:
  created: []
  modified:
    - web/src/lib/schemas/preferences.ts
    - web/src/app/(dashboard)/profiles/actions.ts
    - web/src/__tests__/preferences-schema.test.ts

key-decisions:
  - "criterionTypeSchema is .optional() so existing JSONB records without criterionType still parse — backward compatibility preserved"
  - "Classification failures are silently caught — profile save must always succeed regardless of EC2 health"
  - "EC2_API_URL used without NEXT_PUBLIC_ prefix — server actions only, never exposed to client bundle"
  - "Cast res.json() as { dynamicFields: typeof validated.dynamicFields } to satisfy TypeScript strict mode"

patterns-established:
  - "classify-criteria injection pattern: guard with .length > 0, fetch, silent catch, reassign validated"

requirements-completed: [DM-02]

# Metrics
duration: 7min
completed: 2026-03-29
---

# Phase 27 Plan 03: Criterion Classifier Frontend Integration Summary

**criterionType Zod field + /classify-criteria injection in saveProfilePreferences and createProfileWithPreferences, enriching Supabase JSONB dynamic_fields at every profile save**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-29T22:33:35Z
- **Completed:** 2026-03-29T22:40:30Z
- **Tasks:** 2 (Task 1 used TDD: RED + GREEN commits)
- **Files modified:** 3

## Accomplishments
- Exported `criterionTypeSchema` (z.enum of all 6 values, optional) and `CriterionType` type from preferences.ts
- Added `criterionType` optional field to `dynamicFieldSchema` — existing records without it still parse
- Injected `/classify-criteria` fetch into `saveProfilePreferences` and `createProfileWithPreferences` with silent-fail error handling
- All 27 preferences-schema tests pass (7 new tests added for criterionType behavior)

## Task Commits

Each task was committed atomically:

1. **TDD RED: criterionType failing tests** - `a757eaf` (test)
2. **Task 1: Add criterionType to Zod dynamicFieldSchema** - `c001d58` (feat)
3. **Task 2: Inject /classify-criteria into server actions** - `f488eef` (feat)

_Note: Task 1 used TDD — RED commit (a757eaf) followed by GREEN commit (c001d58)_

## Files Created/Modified
- `web/src/lib/schemas/preferences.ts` - Added criterionTypeSchema, CriterionType type, criterionType field on dynamicFieldSchema
- `web/src/app/(dashboard)/profiles/actions.ts` - classify-criteria injection in saveProfilePreferences + createProfileWithPreferences
- `web/src/__tests__/preferences-schema.test.ts` - 7 new tests for criterionType schema behavior

## Decisions Made
- `criterionTypeSchema` is `.optional()` — backward compatibility with existing Supabase JSONB records that lack the field
- `res.json()` cast to `{ dynamicFields: typeof validated.dynamicFields }` to satisfy TypeScript strict mode without loosening types
- Did not modify `createProfile` (uses empty defaults, no dynamic fields) or `updateProfilesLanguage` (partial patch, not full save)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures in 4 unrelated test files (`chat-page`, `landing-page`, `section-cta`, `section-solution`) were present before this plan and are out of scope. All preferences-schema tests pass.

## User Setup Required

None - `EC2_API_URL` must already be set in Vercel env vars (backend was deployed in Phase 27-02). No new environment variables required.

## Next Phase Readiness

- DM-02 fully closed: criterion types now stored in Supabase JSONB `dynamic_fields` at every profile save
- Phase 28+ hybrid scorer can read `criterionType` from dynamic field objects without additional work
- Classifier failure path is tested and non-blocking — scorer gracefully handles fields where `criterionType` is undefined (missing data = skip criterion)

---
*Phase: 27-data-model-criterion-classifier*
*Completed: 2026-03-29*
