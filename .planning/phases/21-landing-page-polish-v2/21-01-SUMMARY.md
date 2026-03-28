---
phase: 21-landing-page-polish-v2
plan: 01
subsystem: ui
tags: [react, framer-motion, tailwind, vitest, translations]

# Dependency graph
requires:
  - phase: 20-landing-page-redesign
    provides: SectionHero, SectionSolution, translations.ts with all landing keys
provides:
  - 7-chip ScoreBadge-style hero with TIER_COLORS visual language (white/95 card, 40x40 score circle)
  - Updated landing_howit_overline EN/DE copy
  - section-hero.test.tsx with chip count and tier assertions
affects: [21-landing-page-polish-v2, landing-page, visual-identity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TIER_COLORS const defined locally in component (not shared across workspaces) to mirror extension ScoreBadge
    - data-testid on animated elements for testability in jsdom/vitest

key-files:
  created:
    - web/src/__tests__/section-hero.test.tsx
  modified:
    - web/src/components/landing/SectionHero.tsx
    - web/src/lib/translations.ts
    - web/src/__tests__/section-solution.test.tsx

key-decisions:
  - "TIER_COLORS copied verbatim into SectionHero.tsx as a local const — not importable across workspaces (web vs extension)"
  - "data-testid='hero-chip' added to each chip motion.div to enable jsdom querySelectorAll for chip count assertions"
  - "landing_howit_overline changed from 'How it works' to 'How to avoid this' to improve narrative flow from Problem to Solution"

patterns-established:
  - "ScoreBadge visual language: white/95 card + 40x40 tier-colored circle + tier label in tier color"
  - "TDD Wave 0 pattern: create failing test first, then implement to green"

requirements-completed:
  - LP-03
  - LP-06

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 21 Plan 01: Hero Chip Overhaul + Translation Fix Summary

**7 ScoreBadge-style hero chips with TIER_COLORS visual language (white/95 card, 40x40 tier-colored circles) replacing 4 dark-card chips; landing_howit_overline updated to "How to avoid this"**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-28T18:09:24Z
- **Completed:** 2026-03-28T18:13:00Z
- **Tasks:** 3 (Wave 0 + Task 1 + Task 2)
- **Files modified:** 4

## Accomplishments
- Created section-hero.test.tsx with 4 assertions (RED before Task 1, GREEN after)
- Replaced 4 dark-card chips with 7 ScoreBadge-style chips using TIER_COLORS (3 excellent, 2 good, 1 fair, 1 poor)
- Each chip now uses white/95 card background, 40x40 tier-colored score circle, and tier label
- Updated `landing_howit_overline` EN/DE values and fixed corresponding test assertion

## Task Commits

1. **Wave 0: Create section-hero.test.tsx** - `8f8767b` (test)
2. **Task 1: Overhaul SectionHero chips** - `cb86060` (feat)
3. **Task 2: Update translation overline + fix section-solution test** - `c6fc7f4` (feat)

## Files Created/Modified
- `web/src/__tests__/section-hero.test.tsx` - New test: 7 chips, tier distribution, no dark card regression guard
- `web/src/components/landing/SectionHero.tsx` - TIER_COLORS const, 7-chip CHIPS array, ScoreBadge-style chip rendering
- `web/src/lib/translations.ts` - landing_howit_overline EN/DE updated
- `web/src/__tests__/section-solution.test.tsx` - Updated overline assertion from 'How it works' to 'How to avoid this'

## Decisions Made
- TIER_COLORS defined as a local const in SectionHero.tsx (not imported) — mirrors extension ScoreBadge but avoids cross-workspace imports
- data-testid="hero-chip" added to animated chip divs to make them queryable in jsdom despite animation state

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (out of scope): `section-solution.test.tsx` had 2 failing tests (`renders features overline`, `renders feature 1 title`) caused by an uncommitted `SectionSolution.tsx` rewrite from Phase 20 that removed the Features block. These failures existed before 21-01 and are logged in `deferred-items.md`. Similarly, `chat-page.test.tsx` had 6 pre-existing failures unrelated to this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Hero chips now match the extension ScoreBadge visual language — immediate visual trust signal for visitors
- Solution overline now reads "How to avoid this" — improved narrative flow
- Ready for Phase 21-02 and 21-03 polish work

---
*Phase: 21-landing-page-polish-v2*
*Completed: 2026-03-28*
