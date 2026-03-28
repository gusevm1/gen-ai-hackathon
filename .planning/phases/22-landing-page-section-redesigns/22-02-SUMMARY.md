---
phase: 22-landing-page-section-redesigns
plan: "02"
subsystem: ui
tags: [framer-motion, react, tailwind, animation, landing-page, testing]

# Dependency graph
requires: []
provides:
  - Redesigned SectionProblem with card-style elevated items (rounded-2xl, bg, border)
  - x-axis slide-in animation per ProblemItem (x: -60 → 0) using useInView
  - Decorative background number spans removed (PROB-01)
  - data-testid="problem-item" on each card for stable test selection (PROB-02)
  - Number badge enlarged from 36px to 44px (PROB-03)
  - Container gap upgraded from space-y-0 to space-y-4
affects: [landing-page, section-problem, visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "x: isInView ? 0 : -60 slide-in via useInView (no initial prop needed)"
    - "Card elevation via backgroundColor + border inline style, not Tailwind bg-* classes"
    - "jsdom normalizes hsl() to rgba() — PROB-03 test checks both forms"
    - "data-testid selectors preferred over className selectors for stable test queries"

key-files:
  created: []
  modified:
    - web/src/components/landing/SectionProblem.tsx
    - web/src/__tests__/section-problem.test.tsx

key-decisions:
  - "x slide-in uses no initial prop — Framer Motion uses animate value at mount (isInView=false means x=-60 on first render for below-fold content)"
  - "PROB-03 test accepts both hsl() and rgba() forms since jsdom normalizes CSS color values"
  - "Removed decorative aria-hidden bg spans entirely — no longer needed with card elevation style"

patterns-established:
  - "x-axis slide-in: animate={{ x: isInView ? 0 : -60 }} without initial prop — consistent with established useInView pattern"
  - "Card style: backgroundColor hsl() + border inline style (jsdom normalizes, so tests check rgba equivalent)"

requirements-completed: [PROB-01, PROB-02, PROB-03]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 22 Plan 02: SectionProblem Redesign Summary

**ProblemItem redesigned from plain border-b list to elevated card (rounded-2xl, hsl bg, border) with x: -60→0 slide-in animation and no decorative background number spans**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T20:25:00Z
- **Completed:** 2026-03-28T20:33:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed decorative aria-hidden background number spans (PROB-01) — cards feel cleaner without the overlapping large numbers
- Added x: isInView ? 0 : -60 slide-in animation per card (PROB-02) — scroll-driven motion polish
- Elevated card design with `hsl(0 0% 100% / 0.03)` background and explicit border (PROB-03)
- Number badge enlarged 36px → 44px with `text-sm` for stronger visual hierarchy
- Container gap changed from `space-y-0` to `space-y-4` so cards have visible breathing room
- Added `data-testid="problem-item"` for stable test selection, replacing fragile `.py-12` selector

## Task Commits

Each task was committed atomically:

1. **Task 1: Update test file with PROB-01/02/03 assertions (TDD RED)** - `4f3a9c7` (test)
2. **Task 2: Redesign ProblemItem — card bg, x slide-in, no decorative spans (TDD GREEN)** - `2696a6e` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks have RED commit (test) followed by GREEN commit (feat)_

## Files Created/Modified
- `web/src/components/landing/SectionProblem.tsx` - Redesigned ProblemItem with elevated card, x slide-in, no decorative spans; container uses space-y-4
- `web/src/__tests__/section-problem.test.tsx` - Updated selector from .py-12 to data-testid; added PROB-01 (no aria-hidden span), PROB-03 (card bg); fixed "renders 3 bullet points" broken by decorative span removal

## Decisions Made
- No `initial` prop added for x — Framer Motion derives start state from `animate` value when `isInView=false`, consistent with existing pattern from STATE.md
- PROB-03 test accepts both `hsl()` and `rgba()` forms because jsdom normalizes CSS color values during render
- Decorative background spans removed entirely (not repurposed) — card elevation provides sufficient visual hierarchy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken "renders 3 bullet points" test**
- **Found during:** Task 2 (implementing SectionProblem redesign)
- **Issue:** The existing "renders 3 bullet points" test counted `span` elements, which included the 3 aria-hidden decorative spans (01, 02, 03). Removing those spans (PROB-01) dropped the span count to 0, breaking this test.
- **Fix:** Updated test to use `[data-testid="problem-item"]` selector instead of counting spans — semantically correct and aligned with data-testid pattern.
- **Files modified:** `web/src/__tests__/section-problem.test.tsx`
- **Verification:** All 7 section-problem tests pass green
- **Committed in:** `2696a6e` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed PROB-03 test to handle jsdom color normalization**
- **Found during:** Task 2 verification
- **Issue:** Test asserted `container.innerHTML.toContain('hsl(0 0% 100% / 0.03)')` but jsdom normalizes this to `rgba(255, 255, 255, 0.03)` in the rendered HTML.
- **Fix:** Updated test to accept either form: `html.includes('hsl(...)') || html.includes('rgba(255, 255, 255, 0.03)')`.
- **Files modified:** `web/src/__tests__/section-problem.test.tsx`
- **Verification:** PROB-03 test passes green
- **Committed in:** `2696a6e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs caused by our own changes)
**Impact on plan:** Both fixes were necessary for test correctness. No scope creep.

## Issues Encountered
- Pre-existing test failures in `chat-page.test.tsx`, `section-cta.test.tsx`, `section-solution.test.tsx` — these are out-of-scope and were not touched. They existed before this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SectionProblem redesign complete, cards visually elevated with slide-in animation
- Pattern established: `x: isInView ? 0 : -60` without `initial` prop works correctly for below-fold scroll animations
- Ready for 22-03 (SectionSolution and SectionCTA redesigns)

---
*Phase: 22-landing-page-section-redesigns*
*Completed: 2026-03-28*
