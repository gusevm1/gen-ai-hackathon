---
phase: 35-navigation-ia
plan: 02
subsystem: ui
tags: [nextjs, settings, navigation, download, extension]

# Dependency graph
requires: []
provides:
  - "Download Extension section on Settings page with Link to /download"
  - "Discoverable path to extension download after removal from primary nav"
affects: [35-navigation-ia, 36-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [Use Link + buttonVariants() for styled links instead of Button asChild (base-ui Button lacks asChild)]

key-files:
  created: []
  modified:
    - web/src/app/(dashboard)/settings/page.tsx

key-decisions:
  - "Used Link + buttonVariants() instead of Button asChild because the project's base-ui Button does not support asChild prop"

patterns-established:
  - "Pattern: Style Next.js Link as a button using buttonVariants() import from button.tsx instead of asChild"

requirements-completed: [NAV-04]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 35 Plan 02: Add Download Extension Section to Settings Summary

**Settings page extended with a localized Download Extension section containing an icon button linking to /download, replacing the removed nav entry**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T00:00:00Z
- **Completed:** 2026-03-31T00:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Settings page now contains a "Download Extension" heading, localized subtitle, and a button-styled link to /download
- Reused existing translation keys (download_title, download_subtitle, download_btn) — no new keys required
- Language section remains intact above the new section
- TypeScript compiles cleanly with no errors introduced by this change

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Download Extension section to Settings page** - `a70718a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `web/src/app/(dashboard)/settings/page.tsx` - Added Download Extension section with heading, subtitle, and Link styled as button

## Decisions Made
- Used `Link + buttonVariants()` instead of `Button asChild` — the project's Button component is built on `@base-ui/react/button` which does not expose an `asChild` prop. Importing `buttonVariants` and applying it as a className on a Next.js `Link` achieves identical visual result with correct TypeScript types.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced Button asChild with Link + buttonVariants()**
- **Found during:** Task 1 (Add Download Extension section)
- **Issue:** Plan specified `<Button asChild>` but the project's Button (base-ui-based) does not support `asChild`, causing a TypeScript error
- **Fix:** Imported `buttonVariants` from `@/components/ui/button` and applied it as `className` on the Next.js `<Link>` directly
- **Files modified:** `web/src/app/(dashboard)/settings/page.tsx`
- **Verification:** `npx tsc --noEmit` shows no errors in settings page
- **Committed in:** a70718a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug: incorrect component API usage)
**Impact on plan:** Fix was necessary for TypeScript correctness. Visual and functional outcome is identical to the plan's intent.

## Issues Encountered
- Pre-existing build failure unrelated to this plan: `/auth` page pre-rendering fails because `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set in the local environment. TypeScript compilation itself passes cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Settings page now provides the canonical discovery path for the extension download
- Ready to continue with remaining Phase 35 navigation plans

---
*Phase: 35-navigation-ia*
*Completed: 2026-03-31*
