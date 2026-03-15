---
phase: 08-ui-foundation
plan: 02
subsystem: ui
tags: [sidebar, navbar, dark-mode, theme-toggle, shadcn, 21st-dev, shimmer-button, supabase-auth]

# Dependency graph
requires:
  - phase: 08-ui-foundation-01
    provides: ThemeProvider, shadcn sidebar/dropdown-menu/avatar components, (dashboard) route group
provides:
  - Horizontal top navbar with navigation links (Preferences, Profiles, Analyses, Settings)
  - ThemeToggle component for dark/light mode switching
  - NavUser avatar dropdown with email display and sign-out
  - ProfileSwitcher placeholder dropdown showing "Meine Suche"
  - Dashboard layout with server-side auth guard
  - Placeholder pages for /profiles, /analyses, /settings
  - ShimmerButton 21st.dev component integration
  - Test stubs for all UI requirements (sidebar, navbar, theme toggle, 21st.dev)
affects: [09-profile-management, 10-extension-ui]

# Tech tracking
tech-stack:
  added: [@testing-library/react@16.3.2, @testing-library/jest-dom, shimmer-button (magicui via 21st.dev)]
  patterns: [top-navbar-layout, server-component-auth-guard, research-first-component-integration]

key-files:
  created:
    - web/src/components/top-navbar.tsx
    - web/src/components/theme-toggle.tsx
    - web/src/components/nav-user.tsx
    - web/src/components/profile-switcher.tsx
    - web/src/components/ui/shimmer-button.tsx
    - web/src/app/(dashboard)/profiles/page.tsx
    - web/src/app/(dashboard)/analyses/page.tsx
    - web/src/app/(dashboard)/settings/page.tsx
    - web/src/__tests__/sidebar.test.tsx
    - web/src/__tests__/navbar.test.tsx
    - web/src/__tests__/theme-toggle.test.tsx
    - web/src/__tests__/twenty-first-component.test.tsx
  modified:
    - web/src/app/(dashboard)/layout.tsx
    - web/src/components/app-sidebar.tsx
    - web/src/app/globals.css
    - web/package.json

key-decisions:
  - "Horizontal top navbar replaces sidebar layout (user preference after visual review)"
  - "Dashboard renamed to Preferences in navigation (reflects actual page content)"
  - "DropdownMenuLabel must be wrapped in DropdownMenuGroup to avoid Base UI crash"
  - "ShimmerButton from magicui (21st.dev) chosen after research-first evaluation (12k+ GitHub stars)"

patterns-established:
  - "Top navbar with logo, nav links, and right-aligned controls (profile switcher, theme toggle, user menu)"
  - "Server component layout with Supabase auth guard redirecting unauthenticated users to /"
  - "Research-first 21st.dev integration: check GitHub quality before installing via registry URL"

requirements-completed: [UI-01, UI-02]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 08 Plan 02: UI Layout Shell Summary

**Horizontal top navbar with navigation, dark/light theme toggle, user avatar menu with sign-out, "Meine Suche" profile placeholder, and ShimmerButton from 21st.dev**

## Performance

- **Duration:** ~5 min (automated tasks) + visual review
- **Started:** 2026-03-13T15:31:34Z
- **Completed:** 2026-03-13
- **Tasks:** 4 (3 automated + 1 human verification)
- **Files modified:** 17

## Accomplishments
- Built complete SaaS layout shell with horizontal top navbar, theme toggle, user menu, and profile placeholder
- Initially built sidebar layout, then replaced with horizontal top navbar after user visual review approved the simpler approach
- Integrated ShimmerButton from magicui via 21st.dev registry after research-first quality evaluation
- Created test stubs for all UI components -- 14 new assertions across 4 test files, all 52 tests passing
- Dashboard layout uses server-side auth guard via Supabase getUser()

## Task Commits

Each task was committed atomically:

1. **Task 1: Build sidebar, navbar, theme toggle, user menu, and placeholder pages** - `e017974` (feat)
2. **Task 2: Integrate 21st.dev shimmer-button via research-first workflow** - `2e8a070` (feat)
3. **Task 3: Create test stubs for all UI requirements** - `746a04d` (test)
4. **Task 4: Visual verification** - approved by user, with post-checkpoint changes:
   - `266cc1f` (fix) - Fix avatar dropdown crash and add sidebar collapse button
   - `c952b6c` (refactor) - Replace sidebar with horizontal top navbar
   - `b53a889` (refactor) - Rename Dashboard to Preferences in top nav

## Files Created/Modified
- `web/src/components/top-navbar.tsx` - Horizontal navigation with 4 items (Preferences, Profiles, Analyses, Settings) and active state detection
- `web/src/components/theme-toggle.tsx` - Dark/light mode toggle with hydration-safe mounted state and Sun/Moon icon transitions
- `web/src/components/nav-user.tsx` - Avatar dropdown with email display and Supabase sign-out (DropdownMenuLabel wrapped in DropdownMenuGroup)
- `web/src/components/profile-switcher.tsx` - Placeholder dropdown showing "Meine Suche" (wired to real data in Phase 9)
- `web/src/components/app-sidebar.tsx` - Original sidebar component (superseded by top-navbar but retained)
- `web/src/components/ui/shimmer-button.tsx` - 21st.dev component from magicui registry
- `web/src/app/(dashboard)/layout.tsx` - Dashboard layout with auth guard, top navbar header
- `web/src/app/(dashboard)/profiles/page.tsx` - Placeholder page with ShimmerButton CTA
- `web/src/app/(dashboard)/analyses/page.tsx` - Placeholder analyses page
- `web/src/app/(dashboard)/settings/page.tsx` - Placeholder settings page
- `web/src/__tests__/sidebar.test.tsx` - 4 tests: nav items, hrefs, brand name, active state
- `web/src/__tests__/navbar.test.tsx` - 4 tests: NavUser email/trigger, ProfileSwitcher text/button
- `web/src/__tests__/theme-toggle.test.tsx` - 3 tests: button render, light->dark, dark->light
- `web/src/__tests__/twenty-first-component.test.tsx` - 3 tests: render, button element, custom props
- `web/src/app/globals.css` - Added shimmer-button keyframe animations

## Decisions Made
- **Horizontal top navbar replaces sidebar:** User reviewed the sidebar layout visually and preferred a simpler horizontal top navbar. The sidebar component (app-sidebar.tsx) is retained but the layout now uses TopNavbar instead of SidebarProvider/AppSidebar.
- **"Dashboard" renamed to "Preferences":** The /dashboard page actually shows the preferences form, so the nav label was changed to "Preferences" for clarity.
- **DropdownMenuLabel wrapped in DropdownMenuGroup:** Base UI's Menu component requires GroupLabel to be inside a Group -- without this wrapper the avatar dropdown crashed on open.
- **ShimmerButton from magicui chosen:** Research-first evaluation found magicui has 12k+ GitHub stars, active maintenance, React 19 compatibility, and self-contained implementation with no external dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed avatar dropdown crash**
- **Found during:** Task 4 (visual verification)
- **Issue:** DropdownMenuLabel was not wrapped in DropdownMenuGroup, causing Base UI Menu component to crash when opening the user avatar dropdown
- **Fix:** Wrapped DropdownMenuLabel in DropdownMenuGroup in nav-user.tsx
- **Files modified:** `web/src/components/nav-user.tsx`
- **Committed in:** `266cc1f`

**2. [Rule 4 - User decision] Sidebar replaced with horizontal top navbar**
- **Found during:** Task 4 (visual verification)
- **Issue:** User reviewed the sidebar layout and preferred a horizontal top navbar instead
- **Fix:** Created top-navbar.tsx, rewrote layout.tsx to remove SidebarProvider/AppSidebar and use sticky top header with TopNavbar
- **Files modified:** `web/src/components/top-navbar.tsx`, `web/src/app/(dashboard)/layout.tsx`
- **Committed in:** `c952b6c`

**3. [Rule 1 - Bug] Dashboard renamed to Preferences**
- **Found during:** Task 4 (visual verification)
- **Issue:** Navigation showed "Dashboard" but the page at /dashboard is actually the preferences form
- **Fix:** Changed nav item title from "Dashboard" to "Preferences" in top-navbar.tsx
- **Files modified:** `web/src/components/top-navbar.tsx`
- **Committed in:** `b53a889`

---

**Total deviations:** 3 (1 bug fix, 1 user-directed layout change, 1 naming fix)
**Impact on plan:** Sidebar-to-navbar change was a user design decision during visual review. Bug fixes were necessary for correct behavior. No scope creep.

## Issues Encountered
- 21st.dev registry returned 500 errors for some components (designali-in/theme-toggle, ibelick/theme-toggle) but magicui/shimmer-button installed successfully
- jsdom missing window.matchMedia for sidebar tests -- added polyfill in test setup

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Layout shell complete with auth guard, navigation, theme toggle, and user menu
- ProfileSwitcher placeholder ready for Phase 9 to wire to real profile data
- Placeholder pages at /profiles, /analyses, /settings ready for Phase 9 to build inside
- All 52 tests passing (7 test files)

## Self-Check: PASSED

All 14 key files verified present. All 6 commit hashes verified in git log.

---
*Phase: 08-ui-foundation*
*Completed: 2026-03-13*
