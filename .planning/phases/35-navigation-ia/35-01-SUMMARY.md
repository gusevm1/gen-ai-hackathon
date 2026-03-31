---
phase: 35-navigation-ia
plan: 01
subsystem: ui
tags: [next.js, react, navigation, translations, onboarding]

# Dependency graph
requires: []
provides:
  - Updated top navbar with 5 items: Home, New Profile (sparkles), Profiles, Analyses, Settings
  - nav_new_profile translation key in EN and DE
  - ExtensionInstallBanner component with conditional render logic
  - Dashboard page wired to show extension install banner for non-installed users
affects: [36-dashboard, 38-onboarding-rebuild, 40-page-redesigns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Banner component reads onboarding state directly via useOnboardingContext — no prop drilling needed
    - Translation keys retained even when nav item removed (nav_ai_search, nav_download kept in translations.ts)

key-files:
  created:
    - web/src/components/ExtensionInstallBanner.tsx
  modified:
    - web/src/components/top-navbar.tsx
    - web/src/lib/translations.ts
    - web/src/app/(dashboard)/dashboard/page.tsx

key-decisions:
  - "Kept nav_ai_search and nav_download translation keys to avoid breaking the EN/DE key parity check"
  - "Banner reads onboarding state via useOnboardingContext directly — self-contained, no props needed"
  - "URL for New Profile nav item stays /ai-search; only the display label key changes"

patterns-established:
  - "Self-contained banner pattern: component owns its own visibility logic via context hook"

requirements-completed: [NAV-01, NAV-02, NAV-03]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 35 Plan 01: Navigation IA Cleanup Summary

**Top navbar trimmed to 5 items (New Profile replaces AI-Powered Search, Download removed) and contextual extension install banner added to dashboard for users with onboarding_step < 3**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-31T00:24:47Z
- **Completed:** 2026-03-31T00:27:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Renamed "AI-Powered Search" nav item to "New Profile" (nav_new_profile key, URL stays /ai-search)
- Removed "Download" entry from primary navigation (navItems array trimmed from 6 to 5 items)
- Added nav_new_profile translation key in both EN ('New Profile') and DE ('Neues Profil')
- Created ExtensionInstallBanner component with conditional render: shows only when onboarding_step < 3, onboarding_completed=false, onboarding_active=false
- Wired ExtensionInstallBanner as first element in dashboard/page.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename nav item and remove Download; add nav_new_profile translation key** - `ba2a890` (feat)
2. **Task 2: Create ExtensionInstallBanner and wire into dashboard page** - `4fbdc7c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/src/components/top-navbar.tsx` - Replaced nav_ai_search with nav_new_profile, removed nav_download entry, removed Download import
- `web/src/lib/translations.ts` - Added nav_new_profile key to EN and DE blocks
- `web/src/components/ExtensionInstallBanner.tsx` - New component; conditionally renders install prompt linking to /download
- `web/src/app/(dashboard)/dashboard/page.tsx` - Imports and renders ExtensionInstallBanner as first child

## Decisions Made

- Kept `nav_ai_search` and `nav_download` translation keys in translations.ts to avoid breaking the EN/DE key parity TypeScript check (`_DeHasAllEnKeys`). Only the navItems array entry was removed, not the translation keys.
- Banner is self-contained — reads onboarding state directly via `useOnboardingContext`, no props needed from parent.
- The `/ai-search` URL is preserved for the New Profile nav item; only the display label changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors unrelated to this plan (missing `download/page.js` module reference in `.next/dev/types/validator.ts` and a test file import) were present before changes and are out of scope. No new errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Navigation IA cleanup complete; Phase 35 foundation established
- ExtensionInstallBanner pattern can be referenced by Phase 36 (Dashboard) for similar contextual nudge components
- nav_ai_search and nav_download translation keys remain and can be cleaned up in a future pass if confirmed unused

---
*Phase: 35-navigation-ia*
*Completed: 2026-03-31*
