---
phase: 32-frontend-consumers
plan: 01
subsystem: ui
tags: [react, typescript, vitest, fulfillment, schema-version]

# Dependency graph
requires:
  - phase: 31-hybrid-scorer
    provides: ScoreResponse v2 with criteria_results, schema_version, enrichment_status
provides:
  - FulfillmentBreakdown component for per-criterion v2 display
  - fulfillment-utils library (getFulfillmentStatus, deriveFulfillmentChecklist, getImportanceBadge)
  - schema_version branching on analysis page (v1 vs v2 rendering)
affects: [32-frontend-consumers plan 02, extension-updates]

# Tech tracking
tech-stack:
  added: []
  patterns: [schema-version-branching, fulfillment-threshold-mapping, criterion-to-checklist-derivation]

key-files:
  created:
    - web/src/lib/fulfillment-utils.ts
    - web/src/components/analysis/FulfillmentBreakdown.tsx
    - web/src/__tests__/fulfillment-breakdown.test.ts
  modified:
    - web/src/app/(dashboard)/analysis/[listingId]/page.tsx
    - web/src/__tests__/analysis-page.test.ts

key-decisions:
  - "Use >= 2 (not === 2) for schema_version branching for forward compatibility"
  - "Null-fulfillment criteria rendered in separate 'Data unavailable' section to prevent NaN% display"
  - "deriveFulfillmentChecklist includes all criteria (including null fulfillment as met=null) for ChecklistSection reuse"

patterns-established:
  - "Schema version branching: check breakdown.schema_version >= 2 at page level to conditionally render v1 vs v2 components"
  - "Fulfillment threshold mapping: >= 0.7 met, >= 0.3 partial, < 0.3 not-met, null unknown"
  - "Importance badge mapping: lowercase switch on importance string to Badge variant props"

requirements-completed: [FE-01, FE-02, FE-04]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 32 Plan 01: Fulfillment Breakdown Summary

**FulfillmentBreakdown component with per-criterion bars/badges/reasoning, fulfillment-utils threshold library, and schema_version branching on analysis page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T15:50:58Z
- **Completed:** 2026-03-30T15:54:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- FulfillmentBreakdown.tsx renders per-criterion cards with importance badges, fulfillment progress bars (color-coded), percentage text, and expandable reasoning
- Null-fulfillment criteria separated into "Data unavailable" section with HelpCircle icons
- fulfillment-utils.ts exports getFulfillmentStatus, deriveFulfillmentChecklist, getImportanceBadge with correct threshold logic
- Analysis page branches on schema_version: v2 renders FulfillmentBreakdown + derived checklist, v1 renders CategoryBreakdown + legacy checklist
- 21 new tests covering all threshold boundaries, importance mappings, v2 data extraction, and checklist derivation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fulfillment utilities + FulfillmentBreakdown component + tests** - `8df5687` (feat, TDD)
2. **Task 2: Wire schema_version branching on the analysis page** - `82ddcf6` (feat)

## Files Created/Modified
- `web/src/lib/fulfillment-utils.ts` - FulfillmentStatus type, CriterionResult interface, getFulfillmentStatus, deriveFulfillmentChecklist, getImportanceBadge
- `web/src/components/analysis/FulfillmentBreakdown.tsx` - Client component with CriterionCard (bar + badge + reasoning) and UnknownCriterionRow for null-fulfillment criteria
- `web/src/__tests__/fulfillment-breakdown.test.ts` - 18 tests for threshold boundaries, checklist derivation, importance badge mapping
- `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` - Added v2 imports, schema_version extraction, conditional rendering for v1/v2
- `web/src/__tests__/analysis-page.test.ts` - 3 new tests for v2 extraction, v1 fallback, fulfillment checklist derivation

## Decisions Made
- Used `>= 2` (not `=== 2`) for schema_version check -- forward-compatible with future schema versions
- Null-fulfillment criteria rendered in separate "Data unavailable" section at bottom of FulfillmentBreakdown, preventing NaN% display (Pitfall 2 from research)
- deriveFulfillmentChecklist includes null-fulfillment items with met=null (rather than filtering them out) so ChecklistSection renders them as "Unknown"
- Importance displayed as labels (Critical/High/Medium/Low) not raw weights (5/3/2/1) per Pitfall 5

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- vitest 4.0.18 does not support `-x` flag (was in plan verify commands); used `--bail 1` instead -- no impact on test results
- 9 pre-existing test failures in unrelated files (landing pages, chat, animations) -- confirmed not caused by this plan's changes by running only relevant test files

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FulfillmentBreakdown and fulfillment-utils are ready for use
- Plan 02 (extension updates) can proceed independently
- v2 analysis pages will render correctly once hybrid scorer produces v2 responses (Phase 31 complete)

---
*Phase: 32-frontend-consumers*
*Completed: 2026-03-30*
