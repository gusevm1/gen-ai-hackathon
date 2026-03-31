---
phase: 36-state-aware-dashboard
plan: 01
subsystem: ui
tags: [next.js, server-component, supabase, dashboard, shadcn, translations]

# Dependency graph
requires:
  - phase: 35-navigation-ia
    provides: ExtensionInstallBanner, nav cleanup, OnboardingProvider
provides:
  - Server component DashboardPage that branches on profile count
  - NewUserDashboard client component with 3-step explainer
  - ProfileCreationChooser with AI-primary / manual-secondary visual differentiation
affects:
  - 36-02 (returning user dashboard — placeholder ready)
  - 39-handoffs (dashboard state patterns established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component fetching Supabase data then rendering conditional client components
    - Translation key parity enforced via TypeScript type check (EN/DE must match)

key-files:
  created:
    - web/src/components/dashboard/NewUserDashboard.tsx
  modified:
    - web/src/app/(dashboard)/dashboard/page.tsx
    - web/src/components/profile-creation-chooser.tsx
    - web/src/lib/translations.ts

key-decisions:
  - "Dashboard page is now a server component — client hooks moved to NewUserDashboard"
  - "Returning user placeholder left as <div> comment — Plan 02 will replace it"
  - "AI card uses border-primary (design token) not rose-500 — aligns with design system"
  - "Badge 'Recommended' is hardcoded English string — not translated (badge copy is branding)"

patterns-established:
  - "Server component page → conditional client component rendering pattern"
  - "All colors via design tokens (primary, muted-foreground) not hardcoded values"

requirements-completed: [DASH-01, DASH-02, DASH-03]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 36 Plan 01: State-Aware Dashboard Summary

**Server component DashboardPage with profile-count branching, 3-step new user explainer, and AI-primary/manual-secondary ProfileCreationChooser using design tokens**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T17:50:00Z
- **Completed:** 2026-03-31T17:58:00Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments
- Converted dashboard page from 'use client' client component to async server component that fetches Supabase profiles at request time
- Created NewUserDashboard with ExtensionInstallBanner, welcome heading, "Here's how it works" subtitle, 3 numbered steps, and ProfileCreationChooser
- Removed all rose-500 hardcoded colors from ProfileCreationChooser; AI card now uses primary token with Recommended badge, manual card uses outline styling
- Added 7 new translation keys (EN + DE) with full parity

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert dashboard page to server component with new user state** - `e8908bb` (feat)
2. **Task 2: Differentiate ProfileCreationChooser cards (AI primary, manual secondary)** - `819227b` (feat)

## Files Created/Modified
- `web/src/app/(dashboard)/dashboard/page.tsx` - Rewritten as async server component; profile fetch + conditional render
- `web/src/components/dashboard/NewUserDashboard.tsx` - New client component: banner + explainer + chooser + onboarding
- `web/src/components/profile-creation-chooser.tsx` - AI card primary styling + Recommended badge; manual card outline styling
- `web/src/lib/translations.ts` - Added dashboard_how_it_works, dashboard_step1-3_title/desc (EN + DE)

## Decisions Made
- Dashboard page is now a server component — all hooks (useState, useRouter, useOnboardingContext) moved into NewUserDashboard client component
- Returning user branch left as placeholder `<div>` — Plan 02 will replace it; allProfiles and activeProfile variables ready when needed
- "Recommended" badge copy is hardcoded English — not added to translation keys (it is branding copy, not UI text)
- Used design token `primary` throughout (no rose-500) per v6.0 design system alignment rules

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Two pre-existing TypeScript errors in unrelated files (`download-page.test.tsx` and `.next/dev/types/validator.ts`) — out of scope, not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server component foundation established for Plan 02 (returning user dashboard)
- ProfileCreationChooser updated globally — affects any page that imports it
- allProfiles / activeProfile variables exist in page.tsx, ready to pass to Plan 02 returning user component
- No blockers

---
*Phase: 36-state-aware-dashboard*
*Completed: 2026-03-31*
