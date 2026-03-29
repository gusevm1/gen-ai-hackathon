---
phase: 22-landing-page-section-redesigns
plan: 03
subsystem: ui
tags: [react, framer-motion, tailwind, tdd, vitest, landing-page]

requires:
  - phase: 22-landing-page-section-redesigns
    provides: SectionSolution and SectionCTA components established in prior plans

provides:
  - scoreColor helper function with three-tier green/yellow/red scoring (>=80 green, 60-79 yellow, <60 red)
  - AnimatedScore refactored to use scoreColor instead of binary isHigh flag
  - SceneAnalysis overall score badge using scoreColor(94) green colors
  - SectionSolution browser demo enlarged to max-w-3xl
  - Step cards with px-8/py-8 padding and text-lg labels
  - SectionCTA h2 as motion.h2 with useInView + spring.gentle entrance animation
  - CTA h2 font size clamp(2.5rem, 6vw, 4.5rem)
  - CTA radial glow enlarged to 80%/60% ellipse at 0.13 opacity
  - CTA Button with teal glow boxShadow

affects:
  - 22-landing-page-section-redesigns
  - any future plan touching SectionSolution or SectionCTA scoring display

tech-stack:
  added: []
  patterns:
    - "scoreColor(score) helper: three-tier color object { bg, color, border } for score badges"
    - "useInView + animate prop pattern for per-element spring entrance (not whileInView)"
    - "AnimatePresence mocked in tests to allow immediate scene navigation without exit blocking"
    - "jsdom normalizes hex colors to rgb() in inline styles — test assertions must use rgb values"

key-files:
  created:
    - web/src/__tests__/section-solution.test.tsx (new SOLN-01/03 assertions)
    - web/src/__tests__/section-cta.test.tsx (new CTA-01/03 assertions)
  modified:
    - web/src/components/landing/SectionSolution.tsx
    - web/src/components/landing/SectionCTA.tsx

key-decisions:
  - "scoreColor helper uses three tiers: green #10b981 for >=80, yellow #f59e0b for 60-79, red #ef4444 for <60"
  - "CTA h2 extracted as separate motion.h2 with useInView + spring.gentle, distinct from outer motion.div whileInView"
  - "SOLN-03 test mocks AnimatePresence to allow immediate scene navigation since AnimatePresence mode=wait blocks new scene mount in jsdom"
  - "SOLN-03 test checks for rgb(16, 185, 129) not #10b981 because jsdom normalizes hex colors to rgb in inline styles"

patterns-established:
  - "scoreColor pattern: define a scoreColor(n) helper returning { bg, color, border } HSL objects for reusable tier-based badge styling"
  - "useInView animate pattern: use headlineRef + useInView + animate={headlineInView ? target : initial} for per-element spring entrance"

requirements-completed: [SOLN-01, SOLN-02, SOLN-03, SOLN-04, CTA-01, CTA-02, CTA-03]

duration: 5min
completed: 2026-03-28
---

# Phase 22 Plan 03: Solution Section Enlargement + CTA Dramatic Entrance Summary

**scoreColor three-tier helper (green/yellow/red) replaces binary isHigh in AnimatedScore/SceneAnalysis, browser demo enlarged to max-w-3xl with bigger step cards, and CTA h2 gets a spring.gentle useInView entrance at clamp(2.5rem, 6vw, 4.5rem)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T19:25:08Z
- **Completed:** 2026-03-28T19:30:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced binary score coloring with a three-tier `scoreColor()` helper: green (#10b981) for >=80, yellow (#f59e0b) for 60-79, red (#ef4444) for <60
- Enlarged SectionSolution browser demo to `max-w-3xl` and step cards to `px-8 py-8` with `text-lg` labels
- Extracted SectionCTA `h2` as `motion.h2` with `useInView` + `spring.gentle` transition for commanding spring entrance from `y:60`
- Added teal glow `boxShadow` to CTA button and enlarged radial glow background to `80% 60%` ellipse

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SOLN-01/03 and CTA-01/03 test assertions (RED)** - `c9a4037` (test)
2. **Task 2: Implement Solution enlargement + tier colors, and CTA dramatic entrance** - `083c8f2` (feat)

**Plan metadata:** _(see final commit below)_

_Note: TDD tasks have separate RED commit (Task 1) and GREEN implementation commit (Task 2)_

## Files Created/Modified

- `web/src/components/landing/SectionSolution.tsx` - Added `scoreColor` helper, refactored `AnimatedScore`, updated `SceneAnalysis` badge, `max-w-3xl`, `px-8 py-8`, `text-lg`
- `web/src/components/landing/SectionCTA.tsx` - Added `useRef`/`useInView`/`useReducedMotion`, extracted `motion.h2` with spring entrance, enlarged glow, button boxShadow
- `web/src/__tests__/section-solution.test.tsx` - Added SOLN-01 (max-w-3xl), SOLN-03 (green score color); mocks `AnimatePresence` for scene navigation
- `web/src/__tests__/section-cta.test.tsx` - Added CTA-01 (clamp font size), CTA-03 (boxShadow)

## Decisions Made

- Used `useInView` + `animate` prop pattern (not `whileInView`) for the CTA headline — avoids Framer Motion conflict when the parent already uses `whileInView`
- `scoreColor()` returns HSL color objects consistently across `AnimatedScore` and `SceneAnalysis`, creating a single source of truth for badge colors
- SOLN-03 test mocks `AnimatePresence` to render all children immediately — necessary because `AnimatePresence mode="wait"` blocks new scene mount until exit animation completes (which never fires in jsdom)
- SOLN-03 test asserts `rgb(16, 185, 129)` (not `#10b981`) — jsdom normalizes hex inline style values to `rgb()` format

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion used wrong color format and lacked scene navigation**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** Plan's SOLN-03 test asserted `container.innerHTML.toContain('#10b981')` but (a) jsdom normalizes hex to rgb in inline styles, and (b) `SceneAnalysis` is only mounted when scene=2 which requires `AnimatePresence` to complete its exit animation (never fires in jsdom)
- **Fix:** Mocked `AnimatePresence` to pass-through children, used `fireEvent.click` to navigate to scene 2, and asserted `rgb(16, 185, 129)` instead of `#10b981`
- **Files modified:** `web/src/__tests__/section-solution.test.tsx`
- **Verification:** All 8 section-solution tests pass GREEN
- **Committed in:** `083c8f2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test assertion bug)
**Impact on plan:** Test accurately verifies the same behavior described in the plan. No scope creep.

## Issues Encountered

- `chat-page.test.tsx` has 6 pre-existing failures unrelated to this plan (confirmed by checking on baseline before changes)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All SOLN-01 through SOLN-04 and CTA-01 through CTA-03 requirements implemented and verified
- `scoreColor` helper is available for future plans that need consistent tier-based score badge styling
- Full test suite: 16/16 section-solution and section-cta tests pass; pre-existing chat-page failures unchanged

---
*Phase: 22-landing-page-section-redesigns*
*Completed: 2026-03-28*
