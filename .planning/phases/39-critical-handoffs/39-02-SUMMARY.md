---
phase: 39-critical-handoffs
plan: 02
subsystem: ui
tags: [react, tailwind, empty-state, cta, flatfox, analyses, filter-bar]

requires:
  - phase: 39-critical-handoffs
    provides: Test scaffolds for HND-03/HND-04 in critical-handoffs.test.tsx
  - phase: 37-design-system-propagation
    provides: buttonVariants pattern, AnalysesGrid client component extraction
provides:
  - Analyses empty state with "Open Flatfox" primary CTA and "Download Extension" secondary link
  - Conditional filter bar rendering based on analysisCount prop
affects: [40-page-redesigns]

tech-stack:
  added: []
  patterns:
    - "Server component anchor-as-button using buttonVariants() with lucide icons"
    - "analysisCount prop for conditional child component rendering"

key-files:
  created: []
  modified:
    - web/src/app/(dashboard)/analyses/page.tsx
    - web/src/components/analyses/analyses-filter-bar.tsx
    - web/src/__tests__/critical-handoffs.test.tsx

key-decisions:
  - "Hardcoded English CTA text ('Open Flatfox', 'Download Extension') per Phase 38 precedent for test compatibility"
  - "Used buttonVariants() for anchor-as-button pattern since analyses page is a server component"
  - "Removed @ts-expect-error from HND-03/HND-04 tests since analysisCount prop now exists"

patterns-established:
  - "Empty state CTA pattern: primary action links to external service, secondary links to download page"

requirements-completed: [HND-03, HND-04]

duration: 3min
completed: 2026-04-01
---

# Phase 39 Plan 02: Analyses Empty State CTAs Summary

**Analyses empty state enhanced with Flatfox CTA and extension download link, filter bar hidden when no analyses exist**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T06:09:42Z
- **Completed:** 2026-04-01T06:23:03Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added "Open Flatfox" primary CTA button linking to flatfox.ch/en/search/ in analyses empty state
- Added "Download Extension" outline button linking to /download in analyses empty state
- Added analysisCount prop to AnalysesFilterBar with conditional null return when 0 analyses
- All 5 HND-03/HND-04 tests passing GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Analyses empty state CTAs and conditional filter bar** - `d274d31` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `web/src/app/(dashboard)/analyses/page.tsx` - Enhanced empty state with Flatfox CTA and Download link using buttonVariants
- `web/src/components/analyses/analyses-filter-bar.tsx` - Added analysisCount prop, conditional null return when 0
- `web/src/__tests__/critical-handoffs.test.tsx` - Removed @ts-expect-error comments for now-valid analysisCount prop

## Decisions Made
- Hardcoded English CTA text ('Open Flatfox', 'Download Extension') per Phase 38 precedent for test compatibility
- Used buttonVariants() for anchor-as-button pattern since analyses page is a server component (cannot use client Button)
- Removed @ts-expect-error from HND-03/HND-04 tests since analysisCount prop now exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed @ts-expect-error from test file**
- **Found during:** Task 1
- **Issue:** Tests had @ts-expect-error for analysisCount prop which now exists; TypeScript would error on unused expect-error directives
- **Fix:** Removed both @ts-expect-error comments from critical-handoffs.test.tsx
- **Files modified:** web/src/__tests__/critical-handoffs.test.tsx
- **Verification:** Tests pass without TypeScript errors
- **Committed in:** d274d31 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary cleanup for test correctness. No scope creep.

## Issues Encountered
- Linter reverted initial edits (file caching); resolved by using Write tool for complete file rewrites

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HND-01 through HND-04 all complete, Phase 39 ready for completion
- Analyses page empty state provides clear user guidance toward next actions
- Filter bar correctly hidden when irrelevant (0 analyses)

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 39-critical-handoffs*
*Completed: 2026-04-01*
