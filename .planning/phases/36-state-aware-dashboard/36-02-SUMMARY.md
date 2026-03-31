---
phase: 36-state-aware-dashboard
plan: 02
subsystem: ui
tags: [next.js, react, shadcn, supabase, dashboard, top-matches, analyses]

# Dependency graph
requires:
  - phase: 36-01
    provides: server component dashboard page with allProfiles/activeProfile variables and NewUserDashboard client component
provides:
  - ReturningUserDashboard orchestrator showing active profile card, top matches, and recent analyses
  - ActiveProfileCard with profile name, criteria summary, last-used date, switch dropdown, + New CTA, Open Flatfox CTA
  - TopMatchesSummary with client-side fetch, skeleton loading, and 3 compact cards
  - TopMatchSummaryCard presentational component
  - RecentAnalysesSummary rendering 3 most recent analyses (hides if empty)
  - AnalysisSummaryCard presentational component
  - NewProfileModal wrapping ProfileCreationChooser in a Dialog
  - 11 EN/DE translation key pairs for returning user dashboard
affects: [36-03, 39-handoffs, 40-page-redesigns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side fetch with useEffect + activeProfileId dependency for reactive data refresh on profile switch"
    - "buttonVariants() for anchor tags styled as buttons (avoids asChild which base-ui Button doesn't support)"
    - "DropdownMenuTrigger with render= prop (base-ui pattern, not asChild)"

key-files:
  created:
    - web/src/components/dashboard/ActiveProfileCard.tsx
    - web/src/components/dashboard/NewProfileModal.tsx
    - web/src/components/dashboard/TopMatchesSummary.tsx
    - web/src/components/dashboard/TopMatchSummaryCard.tsx
    - web/src/components/dashboard/RecentAnalysesSummary.tsx
    - web/src/components/dashboard/AnalysisSummaryCard.tsx
    - web/src/components/dashboard/ReturningUserDashboard.tsx
  modified:
    - web/src/app/(dashboard)/dashboard/page.tsx
    - web/src/lib/translations.ts

key-decisions:
  - "Use buttonVariants() for anchor-as-button pattern -- base-ui Button does not support asChild prop"
  - "TopMatchesSummary silently fails on API error (no error UI on dashboard) -- dashboard should not break if top-matches unavailable"
  - "RecentAnalysesSummary returns null when analyses.length === 0 (hides section entirely per CONTEXT.md)"
  - "TopMatchesSummary re-fetches on activeProfileId change via useEffect dependency array"

patterns-established:
  - "Dashboard sections: each section is a standalone component with its own heading and View all link"
  - "Score circle pattern: h-10 w-10 rounded-full with TIER_COLORS map (excellent=emerald, good=blue, fair=amber, poor=gray)"

requirements-completed: [DASH-04, DASH-05, DASH-06, DASH-07]

# Metrics
duration: 18min
completed: 2026-03-31
---

# Phase 36 Plan 02: Returning User Dashboard Summary

**Returning user home base with active profile card (switch/new/Flatfox CTA), client-side top matches (3 compact cards with skeleton), and server-fetched recent analyses (3 cards, hidden if empty)**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-31T18:10:45Z
- **Completed:** 2026-03-31T18:28:30Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Returning users (1+ profiles) now see a full home base dashboard instead of a placeholder div
- ActiveProfileCard displays profile name, criteria summary (location/rooms/budget/category), last-used date with Switch dropdown and Open Flatfox primary CTA
- TopMatchesSummary fetches /api/top-matches client-side with skeleton loading state and re-fetches when active profile changes
- RecentAnalysesSummary renders 3 most recent analyses from server-fetched data; hides entirely if no analyses
- NewProfileModal wraps ProfileCreationChooser (AI + Manual paths) in a Shadcn Dialog accessible from the + New button

## Task Commits

Each task was committed atomically:

1. **Task 1: ActiveProfileCard + NewProfileModal + profile switching** - `ce8586a` (feat)
2. **Task 2: TopMatchesSummary + RecentAnalysesSummary + ReturningUserDashboard wiring** - `8d18883` (feat)

**Plan metadata:** committed below (docs)

## Files Created/Modified
- `web/src/components/dashboard/ActiveProfileCard.tsx` - Profile card with criteria summary, switch dropdown, + New button, Open Flatfox CTA
- `web/src/components/dashboard/NewProfileModal.tsx` - Dialog wrapping ProfileCreationChooser for AI/manual new profile
- `web/src/components/dashboard/TopMatchSummaryCard.tsx` - Compact rank/score/tier/address card linking to /top-matches
- `web/src/components/dashboard/TopMatchesSummary.tsx` - Client-side fetch component with skeleton loading and 3-card display
- `web/src/components/dashboard/AnalysisSummaryCard.tsx` - Compact score/tier card linking to /analyses
- `web/src/components/dashboard/RecentAnalysesSummary.tsx` - 3 most recent analyses, hides when empty
- `web/src/components/dashboard/ReturningUserDashboard.tsx` - Orchestrator layout with max-w-4xl and space-y-8
- `web/src/app/(dashboard)/dashboard/page.tsx` - Fetches recentAnalyses and renders ReturningUserDashboard
- `web/src/lib/translations.ts` - 11 new EN/DE key pairs for returning user dashboard

## Decisions Made
- Used `buttonVariants()` for the Open Flatfox anchor-as-button -- base-ui Button doesn't support `asChild` prop (discovered during TypeScript check)
- `TopMatchesSummary` silently fails on API error rather than showing error UI -- dashboard shouldn't break if top-matches API is unavailable
- `RecentAnalysesSummary` returns null when empty per CONTEXT.md spec (Phase 39 handles empty states)
- `activeProfileId` used as useEffect dependency in TopMatchesSummary so it re-fetches when profile switches trigger server revalidation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced Button asChild with buttonVariants() for anchor tag**
- **Found during:** Task 1 (ActiveProfileCard Open Flatfox CTA)
- **Issue:** base-ui Button component doesn't support `asChild` prop -- TypeScript error on compile
- **Fix:** Used `buttonVariants()` CVA helper to apply button styles directly to an `<a>` element
- **Files modified:** web/src/components/dashboard/ActiveProfileCard.tsx
- **Verification:** TypeScript check passes
- **Committed in:** ce8586a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix to match project's base-ui component pattern. No scope creep.

## Issues Encountered
- base-ui Button has no `asChild` support -- resolved by using `buttonVariants()` pattern (same as base-ui docs)
- DropdownMenuTrigger uses `render=` prop (not `asChild`) per base-ui pattern -- already handled correctly by referencing existing ProfileSwitcher component

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Returning user dashboard is complete with all specified sections
- Plan 36-03 (if any) or Phase 37 (Design System) can proceed
- Profile switching triggers full server revalidation via setActiveProfile which calls revalidatePath
- TopMatchesSummary re-fetches on activeProfileId change, but only after a full page reload due to server revalidation pattern

---
*Phase: 36-state-aware-dashboard*
*Completed: 2026-03-31*
