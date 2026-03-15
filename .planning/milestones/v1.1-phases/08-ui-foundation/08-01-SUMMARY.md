---
phase: 08-ui-foundation
plan: 01
subsystem: ui
tags: [next-themes, shadcn, sidebar, dark-mode, route-groups, tailwind]

# Dependency graph
requires:
  - phase: 07-preferences-schema
    provides: canonical preferences schema with importance levels
provides:
  - next-themes ThemeProvider in root layout (attribute=class, system default)
  - shadcn sidebar, dropdown-menu, avatar, sheet, tooltip components
  - (dashboard) route group with SidebarProvider layout skeleton
  - Fixed dark mode CSS variant selector for Tailwind v4
  - use-mobile hook for responsive sidebar
affects: [08-02, 09-profile-management, 10-extension-ui]

# Tech tracking
tech-stack:
  added: [next-themes@0.4.6]
  patterns: [route-group-layout, theme-provider-wrapper, shadcn-base-nova]

key-files:
  created:
    - web/src/components/theme-provider.tsx
    - web/src/app/(dashboard)/layout.tsx
    - web/src/components/ui/sidebar.tsx
    - web/src/components/ui/sheet.tsx
    - web/src/components/ui/skeleton.tsx
    - web/src/hooks/use-mobile.ts
  modified:
    - web/src/app/layout.tsx
    - web/src/app/globals.css
    - web/package.json
    - web/src/components/preferences/weight-sliders.tsx
    - web/src/components/preferences/soft-criteria.tsx

key-decisions:
  - "defaultOpen={true} as static value for SidebarProvider (avoids Next.js 16 cookie-based blocking route error)"
  - "Importance level button group replaces numeric weight sliders (matches Phase 7 schema change)"

patterns-established:
  - "ThemeProvider wraps at root layout level, not per-page"
  - "Route group (dashboard) for sidebar pages, login page at / outside group"
  - "SidebarProvider + SidebarInset pattern for dashboard layout shell"

requirements-completed: [UI-03, UI-05]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 08 Plan 01: UI Foundation Dependencies & Route Structure Summary

**next-themes dark mode with ThemeProvider, shadcn sidebar/sheet/avatar/tooltip components, and (dashboard) route group with SidebarProvider skeleton**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T15:24:16Z
- **Completed:** 2026-03-13T15:28:36Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Installed next-themes and 5 shadcn components (sidebar, dropdown-menu, avatar, sheet, tooltip)
- Fixed dark mode CSS variant selector from `(&:is(.dark *))` to `(&:where(.dark, .dark *))` for correct dark styling on html element
- Created ThemeProvider client component wrapping next-themes with class attribute, system default, and transition suppression
- Restructured app into (dashboard) route group with SidebarProvider layout skeleton
- Moved dashboard and analysis pages into route group preserving all URLs

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and fix CSS dark variant** - `68307f2` (chore)
2. **Task 2: Create ThemeProvider and restructure into route groups** - `4c91d27` (feat)

## Files Created/Modified
- `web/src/components/theme-provider.tsx` - Client component wrapping next-themes ThemeProvider
- `web/src/app/(dashboard)/layout.tsx` - Dashboard layout with SidebarProvider skeleton
- `web/src/app/layout.tsx` - Root layout with ThemeProvider, updated metadata
- `web/src/app/globals.css` - Fixed dark variant selector for Tailwind v4
- `web/src/components/ui/sidebar.tsx` - shadcn sidebar component (generated)
- `web/src/components/ui/sheet.tsx` - shadcn sheet component (generated)
- `web/src/components/ui/dropdown-menu.tsx` - shadcn dropdown-menu component (existing, verified)
- `web/src/components/ui/avatar.tsx` - shadcn avatar component (existing, verified)
- `web/src/components/ui/tooltip.tsx` - shadcn tooltip component (existing, verified)
- `web/src/components/ui/skeleton.tsx` - shadcn skeleton component (sidebar dependency)
- `web/src/hooks/use-mobile.ts` - Mobile detection hook (sidebar dependency)
- `web/package.json` - Added next-themes dependency
- `web/pnpm-lock.yaml` - Lock file updated

## Decisions Made
- Used `defaultOpen={true}` as static prop for SidebarProvider instead of cookie-based state to avoid Next.js 16 blocking route error (shadcn-ui/ui#9189)
- Updated weight sliders to importance level button group to match Phase 7 schema change (critical/high/medium/low)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed selectedFeatures -> features field reference in soft-criteria.tsx**
- **Found during:** Task 2 (build verification)
- **Issue:** soft-criteria.tsx referenced `selectedFeatures` form field which was renamed to `features` in Phase 7 schema unification
- **Fix:** Changed all `form.watch('selectedFeatures')`, `form.getValues('selectedFeatures')`, and `form.setValue('selectedFeatures', ...)` to use `'features'`
- **Files modified:** `web/src/components/preferences/soft-criteria.tsx`
- **Verification:** Build passes, TypeScript compiles cleanly
- **Committed in:** 4c91d27 (Task 2 commit)

**2. [Rule 1 - Bug] Replaced numeric weight sliders with importance level selectors in weight-sliders.tsx**
- **Found during:** Task 2 (build verification)
- **Issue:** weight-sliders.tsx referenced `weights.*` form fields with numeric 0-100 sliders, but Phase 7 schema changed to `importance.*` with enum levels (critical/high/medium/low)
- **Fix:** Rewrote component to use `importance.*` fields with button-group selector for each level
- **Files modified:** `web/src/components/preferences/weight-sliders.tsx`, `web/src/components/preferences/preferences-form.tsx`
- **Verification:** Build passes, TypeScript compiles, all 38 existing tests pass
- **Committed in:** 4c91d27 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs from Phase 7 schema migration)
**Impact on plan:** Both fixes were necessary for the build to pass. Pre-existing type errors from Phase 7 schema changes that renamed `selectedFeatures` to `features` and replaced `weights` with `importance`. No scope creep.

## Issues Encountered
None beyond the pre-existing type errors documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ThemeProvider in root layout ready for dark mode toggle (Plan 02)
- SidebarProvider skeleton in (dashboard) layout ready for AppSidebar component (Plan 02)
- All shadcn components installed for sidebar navigation and user menu
- Route group structure established for all dashboard pages

---
*Phase: 08-ui-foundation*
*Completed: 2026-03-13*
