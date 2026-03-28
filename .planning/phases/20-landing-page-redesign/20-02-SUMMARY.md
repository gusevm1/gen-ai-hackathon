---
phase: 20-landing-page-redesign
plan: "02"
subsystem: landing-page
tags: [landing, animation, framer-motion, motion-react, svg, pathLength, whileInView, scroll-triggered]

requires:
  - phase: 20-landing-page-redesign plan 01
    provides: translation keys for 5-section landing page structure

provides:
  - SectionHero with mount-time staggered animation and CTA to /auth
  - SectionGlobe with SVG pathLength draw-in and Switzerland teal highlight
  - Clean translations.ts with full 5-section key set (EN + DE)
  - Deleted all 8 old Chapter/IsometricHome files

affects: [20-03, 20-04, 20-05, LandingPageContent]

tech-stack:
  added: []
  patterns:
    - mount-time-animation: "Hero uses animate (not whileInView) for above-the-fold content"
    - svg-pathLength-draw: "Stroked SVG elements use pathLength: 0 → 1 variant draw-in"
    - fill-transition: "Polygon fill color transitions via variants (not pathLength — no stroke)"
    - typed-variants: "EMPTY_VARIANTS: Variants = {} pattern for reduced-motion ternary"

key-files:
  created:
    - web/src/components/landing/SectionHero.tsx
    - web/src/components/landing/SectionGlobe.tsx
  modified:
    - web/src/lib/translations.ts
    - web/src/__tests__/landing-translations.test.ts
    - web/src/components/landing/LandingPageContent.tsx
  deleted:
    - web/src/components/landing/ChapterHook.tsx
    - web/src/components/landing/ChapterSwitzerland.tsx
    - web/src/components/landing/ChapterProblem.tsx
    - web/src/components/landing/ChapterMechanism.tsx
    - web/src/components/landing/ChapterScore.tsx
    - web/src/components/landing/ChapterDream.tsx
    - web/src/components/landing/ChapterCTA.tsx
    - web/src/components/landing/IsometricHome.tsx

key-decisions:
  - "Plan 01 code was never committed — translations updated as part of Plan 02 (Rule 3 deviation)"
  - "EMPTY_VARIANTS constant typed as Variants from motion/react to fix union type inference for reduced-motion ternary"
  - "LandingPageContent stubbed with SectionHero + SectionGlobe immediately to unblock landing-page.test.tsx (Rule 3)"
  - "Switzerland polygon uses fill color transition (not pathLength) — polygon is filled, no stroke"

requirements-completed: [LP-01, LP-02, LP-05]

duration: 18min
completed: "2026-03-28"
---

# Phase 20 Plan 02: Delete Chapter Files + Create SectionHero and SectionGlobe Summary

**Replaced 7-chapter sticky-parallax architecture with two scroll-triggered section components: SectionHero (mount-time staggered animation) and SectionGlobe (SVG pathLength draw-in + Switzerland teal fill transition), with complete EN/DE translation key set for all 5 landing sections.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-28T16:10:00Z
- **Completed:** 2026-03-28T16:16:00Z
- **Tasks:** 2 (+ 1 deviation fix)
- **Files modified:** 13 (8 deleted, 3 created, 2 updated)

## Accomplishments

- Deleted all 8 Chapter/IsometricHome files that comprised the old sticky-parallax architecture
- Updated translations.ts: replaced 19 old chapter keys with 35 new 5-section keys (EN + DE), TypeScript `_DeHasAllEnKeys` guard passes
- Created SectionHero with mount-time animation (not whileInView), all 4 hero translation keys, Button render prop → /auth
- Created SectionGlobe with pathLength draw-in on all stroked SVG elements, fill color transition on Switzerland polygon, glow ring draw-in, FadeIn text wrapper — all with useReducedMotion fallback
- All 66 landing-translations tests pass; TypeScript compiles clean (zero errors)

## Task Commits

1. **Task 1: Delete old Chapter files and update translations** - `8b94781` (chore)
2. **Task 2: Create SectionHero and SectionGlobe** - `5a6db1d` (feat)
3. **Deviation fix: Stub LandingPageContent** - `6f5706f` (fix)

## Files Created/Modified

- `web/src/components/landing/SectionHero.tsx` - Hero section with mount-time staggered animation, CTA linking to /auth
- `web/src/components/landing/SectionGlobe.tsx` - SVG globe with pathLength draw-in, Switzerland teal highlight, text via FadeIn
- `web/src/lib/translations.ts` - Complete 5-section key set (35 keys EN + 35 keys DE), old chapter keys removed
- `web/src/__tests__/landing-translations.test.ts` - Added landing_globe_headline and landing_globe_body to LANDING_KEYS array
- `web/src/components/landing/LandingPageContent.tsx` - Stubbed to import SectionHero + SectionGlobe (Chapter imports removed)

## Decisions Made

- Used `const EMPTY_VARIANTS: Variants = {}` typed constant for the reduced-motion ternary in SectionGlobe — TypeScript cannot infer `{}` as assignable to `Variants` in a conditional expression without explicit typing.
- Switzerland polygon uses fill/opacity transition per RESEARCH.md Pitfall 4 — pathLength only affects strokes, and the polygon has fill but no stroke attribute.
- LandingPageContent was stubbed immediately (not deferred to Plan 03) to avoid landing-page.test.tsx resolution errors causing test failures from unrelated code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated translations.ts with 5-section key set**
- **Found during:** Pre-execution discovery (Task 2 would fail without translation keys)
- **Issue:** Plan 01 code was never committed to the branch — translations.ts still contained old 7-chapter keys. SectionHero and SectionGlobe reference `landing_hero_overline`, `landing_hero_headline` etc. which did not exist.
- **Fix:** Replaced old chapter keys with full 5-section key set (EN + DE), added globe keys to landing-translations.test.ts
- **Files modified:** web/src/lib/translations.ts, web/src/__tests__/landing-translations.test.ts
- **Verification:** `npm test -- --run landing-translations` — 66 tests pass
- **Committed in:** 8b94781 (Task 1 commit)

**2. [Rule 3 - Blocking] Stubbed LandingPageContent to remove deleted Chapter imports**
- **Found during:** After Task 1 (file deletion)
- **Issue:** landing-page.test.tsx imports LandingPageContent, which still imported all 7 deleted Chapter files — test suite failed with import resolution errors
- **Fix:** Replaced Chapter imports in LandingPageContent.tsx with SectionHero and SectionGlobe — makes test compile and provides a working (though partial) orchestrator
- **Files modified:** web/src/components/landing/LandingPageContent.tsx
- **Verification:** `npm test -- --run landing-page` — 2 tests pass
- **Committed in:** 6f5706f (deviation fix commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking)
**Impact on plan:** Both fixes were necessary for correctness. No scope creep — Plan 01 work folded into Plan 02 as a prerequisite fix, LandingPageContent stub is intentionally minimal pending Plan 03 rewrite.

## Issues Encountered

- chat-page.test.tsx has 6 pre-existing test failures (unrelated to landing page work — verified by checking before/after our changes). These are out of scope.

## Next Phase Readiness

- SectionHero and SectionGlobe are complete, TypeScript-clean, and ready to use
- LandingPageContent currently renders only Hero + Globe sections — Plan 03 will add SectionProblem, SectionSolution, SectionCTA
- Translation keys for all 5 sections are complete and tested — Plan 03 can proceed immediately

---
*Phase: 20-landing-page-redesign*
*Completed: 2026-03-28*
