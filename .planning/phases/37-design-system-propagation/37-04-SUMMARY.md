---
phase: 37-design-system-propagation
plan: 04
subsystem: ui
tags: [nextjs, framer-motion, tailwind, stagger-animation, hover-lift, server-component, client-component]

# Dependency graph
requires:
  - phase: 37-03
    provides: StaggerGroup animate prop + dashboard/profile on-mount animations
  - phase: 37-02
    provides: tier color palette (teal/green/amber/red) used in AnalysesGrid
provides:
  - AnalysesGrid client component with StaggerGroup animate="visible" on-mount animation
  - Hover lift effect (hover:-translate-y-1 hover:shadow-lg) on all 5 interactive card types
  - Server/client component split for analyses page (page.tsx stays server, animation in AnalysesGrid)
affects: [design-system, analyses, dashboard, top-matches, profiles]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component extracts client animation wrapper to maintain server-side data fetching
    - Map<string,string> serialized as Record<string,string> at server/client boundary
    - StaggerGroup animate="visible" for on-mount grid animations
    - Consistent hover:-translate-y-1 hover:shadow-lg lift across all card types

key-files:
  created:
    - web/src/components/analyses/AnalysesGrid.tsx
  modified:
    - web/src/app/(dashboard)/analyses/page.tsx
    - web/src/components/dashboard/AnalysisSummaryCard.tsx
    - web/src/components/dashboard/TopMatchSummaryCard.tsx
    - web/src/components/profiles/profile-card.tsx
    - web/src/components/top-matches/TopMatchCard.tsx

key-decisions:
  - "Map<string,string> converted to Record<string,string> before passing to AnalysesGrid — Map is not serializable across server/client boundary"
  - "TIER_STYLES, getTierFromScore, formatDate moved to AnalysesGrid.tsx (client) alongside the rendering logic that uses them"
  - "analyses/page.tsx empty state check kept in server component — AnalysesGrid only rendered when data exists"

patterns-established:
  - "Pattern: Extract client animation component from server page — server component keeps data fetching, client component owns motion"
  - "Pattern: Pass lang as prop from server to client for i18n — avoids duplicate cookie reads on client"

requirements-completed: [DS-02, DS-04]

# Metrics
duration: 4min
completed: 2026-03-31
---

# Phase 37 Plan 04: Design System Propagation — Analyses Animation + Hover Lift Summary

**Animated analyses card grid via server/client split (AnalysesGrid.tsx with StaggerGroup) and consistent hover:-translate-y-1 lift on all 5 card types completing DS-04**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T20:45:48Z
- **Completed:** 2026-03-31T20:49:45Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `AnalysesGrid.tsx` as "use client" component wrapping grid in `StaggerGroup animate="visible"` with `StaggerItem` per card
- Updated `analyses/page.tsx` to remain a server component — passes serializable `Record<string,string>` profileMap and `lang` to AnalysesGrid
- Applied `hover:-translate-y-1 hover:shadow-lg` to all 5 card types: AnalysisSummaryCard, TopMatchSummaryCard, profile-card, TopMatchCard, and analyses cards in AnalysesGrid

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract AnalysesGrid client component and animate analyses page** - `8d323e7` (feat)
2. **Task 2: Apply hover lift to all 5 card types (DS-04)** - `6af6993` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/src/components/analyses/AnalysesGrid.tsx` - New "use client" component: StaggerGroup animate grid, card rendering with tier logic
- `web/src/app/(dashboard)/analyses/page.tsx` - Removed inline card grid; imports AnalysesGrid; Map → Record conversion
- `web/src/components/dashboard/AnalysisSummaryCard.tsx` - hover:shadow-md → hover:-translate-y-1 hover:shadow-lg
- `web/src/components/dashboard/TopMatchSummaryCard.tsx` - hover:shadow-md → hover:-translate-y-1 hover:shadow-lg
- `web/src/components/profiles/profile-card.tsx` - hover:shadow-md → hover:-translate-y-1 hover:shadow-lg
- `web/src/components/top-matches/TopMatchCard.tsx` - append hover:-translate-y-1 hover:shadow-lg

## Decisions Made

- `Map<string,string>` converted to `Record<string,string>` before passing to AnalysesGrid — Map is not serializable across the server/client boundary in Next.js
- TIER_STYLES, getTierFromScore, formatDate helper functions moved to AnalysesGrid.tsx alongside the rendering logic that uses them
- Empty state check (`!analyses || analyses.length === 0`) kept in server component per plan spec — AnalysesGrid only rendered when data exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (20 of 226 tests) were present before this plan and remain unchanged after — confirmed via stash comparison. Failures are in tier-color, nav, and CTA tests from earlier phases. No new test failures introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DS-01 through DS-04 all complete: rose→primary token (DS-01), tier color palette (DS-03), FadeIn/StaggerGroup animate prop (DS-03), analyses grid animation (DS-02), hover lift on all cards (DS-04)
- Phase 37 (Design System Propagation) is fully complete
- Phase 38 (Onboarding Rebuild with Shadcn) ready to proceed

---
*Phase: 37-design-system-propagation*
*Completed: 2026-03-31*
