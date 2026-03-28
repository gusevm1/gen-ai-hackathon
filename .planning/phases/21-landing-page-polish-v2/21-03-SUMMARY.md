---
phase: 21-landing-page-polish-v2
plan: 03
subsystem: ui
tags: [framer-motion, landing-page, animation, tailwind, css-variables]

# Dependency graph
requires:
  - phase: 21-landing-page-polish-v2
    provides: "21-01 overline copy update for landing_howit_overline (test dependency)"
provides:
  - "Enlarged MockBrowser demo in SectionSolution (max-w-2xl, height 360)"
  - "Bigger step cards in SectionSolution (px-6 py-6, text-base label, text-sm body)"
  - "Gradient bridge divider between SectionSolution and SectionCTA in LandingPageContent"
  - "Radial teal glow overlay in SectionCTA"
  - "SectionCTA with motion.div replacing FadeIn (viewport once:false, scroll-retriggerable)"
affects: [21-landing-page-polish-v2, landing-page, SectionSolution, SectionCTA, LandingPageContent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gradient bridge divider as standalone div in LandingPageContent (keeps sections self-contained)"
    - "Tailwind color classes replaced with inline CSS variable styles for consistency across sections"
    - "viewport: { once: false } for scroll-retriggerable animations in landing CTA"

key-files:
  created: []
  modified:
    - web/src/components/landing/SectionSolution.tsx
    - web/src/components/landing/SectionCTA.tsx
    - web/src/components/landing/LandingPageContent.tsx
    - web/src/__tests__/section-solution.test.tsx

key-decisions:
  - "Gradient bridge divider placed in LandingPageContent between sections (not inside either section) to keep components self-contained"
  - "SectionCTA FadeIn replaced with inline motion.div using viewport: { once: false, amount: 0.3 } for scroll-retriggerable animation"
  - "Tailwind bg-hero-bg / text-hero-fg / bg-hero-teal replaced with inline CSS variable styles in SectionCTA — consistent with other landing sections"
  - "Stale section-solution tests for removed features (Built for Swiss renters, AI match scoring) removed — these referenced 20-03 content no longer in component"

patterns-established:
  - "Gradient bridge: linear-gradient(to bottom, transparent 0%, hsl(teal / 0.07) 50%, transparent 100%) at height 100 — cinematic section transition"
  - "Radial glow: radial-gradient(ellipse 60% 40% at 50% 50%, hsl(teal / 0.09) 0%, transparent 70%) as absolute inset overlay"

requirements-completed: [LP-03, LP-06]

# Metrics
duration: 12min
completed: 2026-03-28
---

# Phase 21 Plan 03: Solution + CTA Visual Polish Summary

**Enlarged MockBrowser (max-w-2xl, height 360) with bigger step cards, teal gradient bridge between sections, and scroll-retriggerable CTA with radial glow replacing FadeIn**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-28T18:15:39Z
- **Completed:** 2026-03-28T18:27:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SectionSolution browser demo wrapper enlarged to max-w-2xl with content height raised to 360px, making the animated demo dominate as the product proof
- Step cards upgraded to px-6 py-6 padding with text-base label and text-sm body for more substantial, readable cards
- Gradient bridge div (100px, teal wash) inserted in LandingPageContent between SectionSolution and SectionCTA for cinematic section transition
- SectionCTA completely modernized: FadeIn removed, motion.div with once:false added, radial glow overlay added, all Tailwind color classes replaced with CSS variable inline styles for consistency

## Task Commits

Each task was committed atomically:

1. **Task 1: Enlarge browser demo and step cards in SectionSolution** - `7180bd6` (feat)
2. **Task 2: Gradient divider + radial glow CTA + once:false animation** - `8de5acc` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `web/src/components/landing/SectionSolution.tsx` - Browser wrapper max-w-lg → max-w-2xl, content height 280 → 360, step card px-5 py-4 → px-6 py-6, label text-sm → text-base, body text-xs → text-sm
- `web/src/components/landing/SectionCTA.tsx` - FadeIn removed, motion.div with viewport once:false, radial glow overlay, CSS variable inline styles
- `web/src/components/landing/LandingPageContent.tsx` - Gradient bridge div inserted between SectionSolution and SectionCTA
- `web/src/__tests__/section-solution.test.tsx` - Removed 2 stale test cases for features no longer in the component

## Decisions Made
- Placed gradient bridge in LandingPageContent rather than inside either section component — keeps each section self-contained and testable in isolation
- Replaced `bg-hero-bg` / `text-hero-fg` / `bg-hero-teal` Tailwind classes in SectionCTA with inline CSS variable styles (`var(--color-hero-bg)` etc.) to match the pattern used in SectionSolution and SectionProblem
- `once: false` on the motion.div viewport so the CTA animation re-fires when user scrolls back up — consistent with SectionSolution which also uses once:false

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale test cases for removed features in section-solution.test.tsx**
- **Found during:** Task 1 (section-solution test verification)
- **Issue:** Two test cases (`renders features overline` — "Built for Swiss renters", `renders feature 1 title` — "AI match scoring") referenced a Features block that was removed from SectionSolution in plan 20-03. These tests were pre-existing failures blocking the "all tests pass" criterion.
- **Fix:** Removed the two stale test cases; remaining 6 tests all pass and cover actual component content
- **Files modified:** web/src/__tests__/section-solution.test.tsx
- **Verification:** `npx vitest run src/__tests__/section-solution.test.tsx` — 6 passed, 0 failed
- **Committed in:** 7180bd6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - stale test cleanup)
**Impact on plan:** Necessary for plan's success criterion ("all section-solution tests pass"). No scope creep.

## Issues Encountered
- chat-page.test.tsx has 6 pre-existing failing tests (unrelated to landing page — those tests use a deprecated placeholder text). Out of scope per deviation rules, logged to deferred-items.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Solution section is now the visual centerpiece with enlarged browser demo
- CTA has cinematic gradient bridge entrance and scroll-retriggerable animation
- Ready for phase 21 QA / visual review pass
- Pre-existing chat-page.test.tsx failures need separate investigation

---
*Phase: 21-landing-page-polish-v2*
*Completed: 2026-03-28*
