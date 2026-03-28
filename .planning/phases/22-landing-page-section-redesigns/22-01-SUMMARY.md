---
phase: 22-landing-page-section-redesigns
plan: 01
subsystem: ui
tags: [react, framer-motion, tailwind, testing, vitest, landing-page, extension]

# Dependency graph
requires: []
provides:
  - Hero section without stats row (2,400+, <3s, Free metrics removed)
  - CTA button centered on its own line at all viewports (no sm:flex-row)
  - Unified poor tier color #ef4444 (red) in both SectionHero and extension TIER_COLORS
  - HERO-01/02/03 test coverage in section-hero.test.tsx
affects: [22-landing-page-section-redesigns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSDOM hex→rgb normalization: test for rgb() equivalent when checking inline styles in JSDOM"
    - "TDD: RED commit (failing tests) then GREEN commit (implementation + test fix)"

key-files:
  created: []
  modified:
    - web/src/components/landing/SectionHero.tsx
    - extension/src/types/scoring.ts
    - web/src/__tests__/section-hero.test.tsx

key-decisions:
  - "HERO-03 test checks rgb(239, 68, 68) not #ef4444 — JSDOM normalizes hex colors to rgb() in inline styles"
  - "Poor tier unified to red (#ef4444) across landing page and extension for consistent traffic-light semantics"
  - "Stats row removal is purely subtractive — no replacement content needed"

patterns-established:
  - "TDD pattern: write RED tests first, commit, then implement GREEN"
  - "JSDOM inline style testing: always check rgb() form, not hex, for backgroundColor assertions"

requirements-completed: [HERO-01, HERO-02, HERO-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 22 Plan 01: Hero Section Cleanup Summary

**Stats row removed, CTA centered with flex-col, and poor tier color unified to #ef4444 across landing and extension**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-28T19:24:55Z
- **Completed:** 2026-03-28T19:26:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Removed stats row (2,400+ listings, <3s, Free) from hero section for cleaner fold
- CTA wrapper changed from `flex-col sm:flex-row` to `flex-col` — button always centered regardless of viewport
- Added `text-center` to the "Free · No credit card" subtext span for consistent centering
- TIER_COLORS.poor.bg changed from gray (#6b7280) to red (#ef4444) in both SectionHero.tsx and extension/src/types/scoring.ts
- Updated JSDoc in extension scoring.ts to reflect traffic-light system (was "NOT traffic light")
- Added 3 new test assertions (HERO-01/02/03) with TDD RED→GREEN flow; all 7 section-hero tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add HERO-01/02/03 test assertions (RED)** - `cad9170` (test)
2. **Task 2: Apply hero changes + tier color unification (GREEN)** - `d02b7f0` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD RED committed first (cad9170), then GREEN implementation + test fix committed together (d02b7f0)_

## Files Created/Modified
- `web/src/components/landing/SectionHero.tsx` - TIER_COLORS.poor.bg #ef4444, CTA flex-col only, stats row deleted
- `extension/src/types/scoring.ts` - TIER_COLORS.poor.bg #ef4444, JSDoc updated to traffic-light description
- `web/src/__tests__/section-hero.test.tsx` - Added HERO-01, HERO-02, HERO-03 test assertions

## Decisions Made
- HERO-03 test checks `rgb(239, 68, 68)` instead of the hex `#ef4444` because JSDOM normalizes hex colors in inline styles to rgb() form. The plan specified checking for `ef4444` substring, but JSDOM rendered `background-color: rgb(239, 68, 68)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HERO-03 test assertion updated from hex to JSDOM-normalized rgb**
- **Found during:** Task 2 (implementation → test run)
- **Issue:** The plan's HERO-03 test checked for string `ef4444` in innerHTML, but JSDOM normalizes `#ef4444` to `rgb(239, 68, 68)` in inline style attributes. Test was still RED after the color change was applied.
- **Fix:** Updated the test assertion to check for `rgb(239, 68, 68)` instead of `ef4444`
- **Files modified:** web/src/__tests__/section-hero.test.tsx
- **Verification:** All 7 section-hero tests pass green after fix
- **Committed in:** d02b7f0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test assertion bug)
**Impact on plan:** Necessary fix — test assertion matched production behavior exactly. No scope creep.

## Issues Encountered
- Pre-existing test failures in `chat-page.test.tsx`, `section-cta.test.tsx`, and `section-solution.test.tsx` were observed in the full suite run. These are out-of-scope for this plan (not caused by these changes) and were not touched.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hero section is clean and test-covered (HERO-01/02/03)
- Extension TIER_COLORS.poor.bg unified with landing page
- Ready for 22-02 (next section redesign in the phase)
- Pre-existing test failures in section-cta and section-solution should be addressed before merging to main

---
*Phase: 22-landing-page-section-redesigns*
*Completed: 2026-03-28*
