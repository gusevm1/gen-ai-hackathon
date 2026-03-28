---
phase: 20-landing-page-redesign
plan: "03"
subsystem: landing-page
tags: [landing, animation, framer-motion, stagger, whileInView, tdd, sections]

requires:
  - phase: 20-landing-page-redesign plan 02
    provides: SectionHero, SectionGlobe, complete translation keys for all 5 sections

provides:
  - SectionProblem with FadeIn headline + StaggerGroup/StaggerItem 3-bullet reveal
  - SectionSolution with 3 step cards (Badge + label + body) + 3 feature cards, both staggered
  - SectionCTA with FadeIn centered layout and /auth CTA button
  - LandingPageContent 5-section orchestrator (Hero → Globe → Problem → Solution → CTA)

affects: [20-04, LandingPageContent]

tech-stack:
  added: []
  patterns:
    - stagger-custom-variants: "stepStaggerVariants typed as Variants with staggerChildren: 0.15 for deliberate step reveal"
    - stagger-whileInView: "StaggerGroup wraps card grids — whileInView triggers on scroll entry, once: true"
    - badge-step-number: "Badge component used with inline style for teal bg + bg-hero-bg text for step numbers"
    - card-grid-pattern: "grid grid-cols-1 md:grid-cols-3 gap-6 for both steps and features in SectionSolution"

key-files:
  created:
    - web/src/components/landing/SectionProblem.tsx
    - web/src/components/landing/SectionSolution.tsx
    - web/src/components/landing/SectionCTA.tsx
    - web/src/__tests__/section-problem.test.tsx
    - web/src/__tests__/section-solution.test.tsx
    - web/src/__tests__/section-cta.test.tsx
  modified:
    - web/src/components/landing/LandingPageContent.tsx
    - web/src/__tests__/landing-page.test.tsx

key-decisions:
  - "SectionSolution uses a single section element for both How It Works and Features blocks — cohesion over split"
  - "Badge step numbers use inline style for teal bg override — Tailwind's bg-hero-teal utility not available on Badge component directly"
  - "stepStaggerVariants defined as local Variants const (not imported from @/lib/motion) — staggerChildren 0.15 is specific to steps, not reusable"
  - "TDD RED committed before component files existed — verified import resolution failure confirms proper RED phase"

requirements-completed: [LP-01, LP-03, LP-04, LP-05, LP-06]

duration: 5min
completed: "2026-03-28"
---

# Phase 20 Plan 03: SectionProblem, SectionSolution, SectionCTA + 5-Section Orchestrator Summary

**Completed 5-section landing page by creating SectionProblem (staggered bullets), SectionSolution (step cards + feature grid, whileInView stagger), and SectionCTA (FadeIn centered /auth CTA), then rewrote LandingPageContent as the full orchestrator rendering all 5 sections in order.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T15:20:18Z
- **Completed:** 2026-03-28T15:25:27Z
- **Tasks:** 2 (TDD for both)
- **Files created:** 6 (3 components + 3 test files)
- **Files modified:** 2

## Accomplishments

- Created SectionProblem: FadeIn overline + headline, StaggerGroup/StaggerItem for 3 bullets with teal dash separators
- Created SectionSolution: How It Works block (3 step cards with Badge "01"/"02"/"03" + label + body text) + Features block (3-column feature card grid), both using StaggerGroup whileInView, steps with custom staggerChildren 0.15
- Created SectionCTA: min-h-[70vh] flex-centered section, FadeIn wrapper, all 4 CTA translation keys, Button render={<Link href="/auth" />} with teal styling
- Rewrote LandingPageContent: imports all 5 sections (Hero, Globe, Problem, Solution, CTA), renders in order with Navbar + Footer, no Chapter* references
- Added 'renders a CTA button linking to /auth' test to landing-page.test.tsx
- 18 new component tests + 3 landing-page tests pass; TypeScript compiles with zero errors

## Task Commits

1. **TDD RED: Failing tests for SectionProblem, SectionSolution, SectionCTA** - `05b7790` (test)
2. **Task 1: Create SectionProblem, SectionSolution, SectionCTA** - `aaecf3c` (feat)
3. **Task 2: Rewrite LandingPageContent and update tests** - `34ff592` (feat)

## Files Created/Modified

- `web/src/components/landing/SectionProblem.tsx` - Problem section with FadeIn + StaggerGroup 3-bullet reveal
- `web/src/components/landing/SectionSolution.tsx` - 3 step cards + 3 feature cards, staggered with whileInView
- `web/src/components/landing/SectionCTA.tsx` - FadeIn centered CTA section, /auth button
- `web/src/components/landing/LandingPageContent.tsx` - 5-section orchestrator (all 5 new sections)
- `web/src/__tests__/section-problem.test.tsx` - 4 tests for SectionProblem
- `web/src/__tests__/section-solution.test.tsx` - 8 tests for SectionSolution
- `web/src/__tests__/section-cta.test.tsx` - 6 tests for SectionCTA
- `web/src/__tests__/landing-page.test.tsx` - Added CTA /auth link test

## Decisions Made

- SectionSolution uses one section element for both "How It Works" and "Features" blocks — keeping them visually and structurally cohesive rather than splitting into two separate sections
- Badge step number styling uses inline `style` object to apply `var(--color-hero-teal)` as background — the Badge cva variants don't include hero-bg color tokens, and inline style is the established pattern from SectionHero
- Custom `stepStaggerVariants` (staggerChildren: 0.15) defined locally rather than added to `@/lib/motion` — it's specific to the 3-step reveal and not intended for reuse
- TDD RED was committed as a proper separate commit (05b7790) before implementation began, confirming import resolution failure as true RED phase

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- chat-page.test.tsx has 6 pre-existing test failures (confirmed pre-existing from Plan 02 Summary, unrelated to landing page work). These are out of scope.

## Next Phase Readiness

- All 5 landing sections complete and rendering in order
- Full test suite green (excluding pre-existing chat failures)
- TypeScript compiles with zero errors
- Landing page is functional end-to-end — ready for Phase 20-04 (polish / QA)

## Self-Check: PASSED

- SectionProblem.tsx: FOUND at web/src/components/landing/SectionProblem.tsx
- SectionSolution.tsx: FOUND at web/src/components/landing/SectionSolution.tsx
- SectionCTA.tsx: FOUND at web/src/components/landing/SectionCTA.tsx
- LandingPageContent.tsx: FOUND, imports all 5 sections
- 20-03-SUMMARY.md: FOUND at .planning/phases/20-landing-page-redesign/20-03-SUMMARY.md
- Commit 05b7790: TDD RED (test files)
- Commit aaecf3c: Task 1 (3 new components)
- Commit 34ff592: Task 2 (LandingPageContent + test update)

---
*Phase: 20-landing-page-redesign*
*Completed: 2026-03-28*
