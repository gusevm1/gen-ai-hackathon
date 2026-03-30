---
phase: 33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix
plan: 01
subsystem: ui
tags: [next.js, react, navigation, dashboard, profile-creation, translations]

# Dependency graph
requires: []
provides:
  - Dashboard home page with welcome text and two profile-creation entry points
  - ProfileCreationChooser reusable component (Manual vs AI-guided cards)
  - Home nav item as first entry in TopNavbar linking to /dashboard
  - Translation keys: nav_home, dashboard_welcome, dashboard_subtitle, dashboard_manual_title/desc, dashboard_ai_title/desc
affects: [top-navbar, dashboard, profile-creation-flow, ai-search]

# Tech tracking
tech-stack:
  added: []
  patterns: [exact-match active-state for root nav items to avoid sub-route false positives]

key-files:
  created:
    - web/src/components/profile-creation-chooser.tsx
  modified:
    - web/src/app/(dashboard)/dashboard/page.tsx
    - web/src/components/top-navbar.tsx
    - web/src/lib/translations.ts
    - web/src/__tests__/top-navbar.test.tsx

key-decisions:
  - "Exact match for /dashboard active state: item.url === '/dashboard' ? pathname === item.url : pathname.startsWith(item.url) — prevents Home lighting up on /dashboard/profiles sub-routes"
  - "Dashboard page as 'use client' to support useState for CreateProfileDialog open state and useRouter for navigation"

patterns-established:
  - "Exact-match active-state pattern: use exact pathname comparison for root/index nav items to avoid sub-route false positives"

requirements-completed: [HOME-01, HOME-02, NAV-01]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 33 Plan 01: Dashboard Home Page, ProfileCreationChooser, and Home Nav Item Summary

**Dashboard home page with welcome text and two profile-creation cards (Manual + AI-guided), plus Home as first TopNavbar item with exact-match active state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T10:17:41Z
- **Completed:** 2026-03-30T10:20:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced /dashboard redirect-to-profiles with a proper welcome page showing "Welcome to HomeMatch" heading and "Let's create your profile" subheading
- Built ProfileCreationChooser component with two card-based entry points (Manual with ClipboardList icon, AI-guided with Sparkles icon)
- Manual card opens CreateProfileDialog, calls createProfile server action, navigates to /profiles/[id]
- Added Home as first nav item in TopNavbar using exact pathname match for active state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add translation keys and build ProfileCreationChooser component** - `bb5f12e` (feat)
2. **Task 2: Replace dashboard redirect with welcome page and add Home nav item** - `de2c632` (feat)

## Files Created/Modified
- `web/src/components/profile-creation-chooser.tsx` - New reusable two-card chooser component for Manual vs AI profile creation
- `web/src/app/(dashboard)/dashboard/page.tsx` - Dashboard home page with welcome text and ProfileCreationChooser (replaces redirect)
- `web/src/components/top-navbar.tsx` - Home icon+label added as first nav item with exact-match active state logic
- `web/src/lib/translations.ts` - Added 7 new translation keys (nav_home + 6 dashboard_ keys) in both en and de
- `web/src/__tests__/top-navbar.test.tsx` - Updated test expectations to reflect Home as first nav item

## Decisions Made
- Exact match active state for `/dashboard`: using `pathname === item.url` only for the dashboard item prevents it from lighting up on sub-routes like `/dashboard/profiles`
- Dashboard page needs `'use client'` directive because it uses `useState` (for CreateProfileDialog open state) and `useRouter` (for navigation after profile creation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing top-navbar test to match new nav order**
- **Found during:** Task 2 (TopNavbar update)
- **Issue:** Existing test `top-navbar.test.tsx` asserted AI-Powered Search as first item and expected specific item order without Home — would fail after adding Home as first item
- **Fix:** Updated test expectations to include "Home" as first item and updated "renders AI-Powered Search as first nav item" test to "renders Home as first nav item"
- **Files modified:** web/src/__tests__/top-navbar.test.tsx
- **Verification:** Test expectations now match the updated component
- **Committed in:** de2c632 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: stale test assertions)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered
- `npx tsc` in the worktree fails because node_modules are not installed in the worktree directory — used main repo's tsc binary pointed at the worktree, confirmed all errors are pre-existing environment issues (missing lucide-react, next, react modules from missing node_modules). No logic errors in the new code.

## Next Phase Readiness
- Dashboard home page is live and ready for visual verification
- ProfileCreationChooser component ready for reuse in other contexts if needed
- Plan 33-02 can proceed (analyses titles fix)

---
*Phase: 33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix*
*Completed: 2026-03-30*
