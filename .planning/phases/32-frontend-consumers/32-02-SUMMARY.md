---
phase: 32-frontend-consumers
plan: 02
subsystem: ui
tags: [typescript, chrome-extension, react, scoring, badge]

# Dependency graph
requires:
  - phase: 31-hybrid-scorer
    provides: v2 ScoreResponse with schema_version, criteria_results, enrichment_status
provides:
  - CriterionResult TypeScript interface for per-criterion fulfillment display
  - ScoreResponse v2 optional fields (backward compatible with v1)
  - Grey beta badge variant for unenriched listings
  - Informational SummaryPanel for unavailable enrichment_status
affects: [32-frontend-consumers, extension-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive type extension with optional fields for backward compatibility"
    - "Early-return guard pattern for enrichment_status variant rendering"

key-files:
  created: []
  modified:
    - extension/src/types/scoring.ts
    - extension/src/entrypoints/content/components/ScoreBadge.tsx
    - extension/src/entrypoints/content/components/SummaryPanel.tsx
    - extension/src/__tests__/scoring-types.test.ts

key-decisions:
  - "All v2 fields optional on ScoreResponse to preserve v1 backward compatibility"
  - "Grey badge uses early-return before tierColor assignment to avoid TIER_COLORS lookup on unavailable"
  - "SummaryPanel unavailable state still shows summary_bullets if available under 'What we know' header"

patterns-established:
  - "Enrichment status guard: check score.enrichment_status === 'unavailable' before normal render path"

requirements-completed: [FE-03, FE-05]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 32 Plan 02: Extension v2 Types + Grey Beta Badge Summary

**v2 ScoreResponse types with CriterionResult interface and grey beta badge for unenriched listings in Chrome extension**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T15:51:06Z
- **Completed:** 2026-03-30T15:54:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended ScoreResponse with optional v2 fields (schema_version, criteria_results, enrichment_status) -- fully backward compatible
- Added CriterionResult interface matching backend scoring model
- Grey "--/Beta" badge renders for listings with enrichment_status=unavailable instead of misleading red "0/poor"
- SummaryPanel shows "Scoring Coming Soon" informational message with muted grey palette for unavailable listings
- All 39 extension tests pass, extension builds successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Update extension ScoreResponse types + tests for v2** - `f5ce87e` (feat)
2. **Task 2: Add grey beta badge + unavailable SummaryPanel state** - `47a0b64` (feat)

## Files Created/Modified
- `extension/src/types/scoring.ts` - Added CriterionResult interface, extended ScoreResponse with optional v2 fields
- `extension/src/__tests__/scoring-types.test.ts` - Added 3 v2 type shape tests (v2 sample, v1 backward compat, unavailable state)
- `extension/src/entrypoints/content/components/ScoreBadge.tsx` - Grey beta badge early-return for enrichment_status=unavailable
- `extension/src/entrypoints/content/components/SummaryPanel.tsx` - Informational "Scoring Coming Soon" panel for unavailable listings

## Decisions Made
- All v2 fields optional on ScoreResponse to preserve v1 backward compatibility -- cached v1 responses still type-check
- Grey badge uses early-return before tierColor assignment to avoid TIER_COLORS lookup on unavailable enrichment
- SummaryPanel unavailable state still renders summary_bullets (if any) under "What we know" header with grey dots
- Used snake_case field names matching existing extension conventions (criterion_name, enrichment_status)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Extension types ready for v2 ScoreResponse consumption from backend
- ScoreBadge and SummaryPanel handle all three enrichment_status values (available/fallback render normally, unavailable renders beta state)
- Ready for remaining Phase 32 plans (edge function cache updates, etc.)

---
*Phase: 32-frontend-consumers*
*Completed: 2026-03-30*
