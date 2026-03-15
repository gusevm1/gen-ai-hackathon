---
phase: 10-extension-profile-switcher
plan: 03
subsystem: ui
tags: [react, shadow-dom, tailwind, wxt, profile-switching, stale-detection]

# Dependency graph
requires:
  - phase: 10-extension-profile-switcher (plan 01)
    provides: activeProfileStorage with .watch() for cross-context profile change detection
provides:
  - Stale badge detection when active profile changes mid-session
  - Polished badge/panel/FAB/skeleton visual design for demo-ready extension UI
  - Profile name attribution in SummaryPanel
  - Stale warning banner in SummaryPanel
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ref-based stale flag for Shadow DOM re-renders (isStaleRef synced with isStale state)"
    - "Profile change watcher via activeProfileStorage.watch() in content script"
    - "Re-score all listings (not just new) when stale flag is set"

key-files:
  created: []
  modified:
    - extension/src/entrypoints/content/App.tsx
    - extension/src/entrypoints/content/components/ScoreBadge.tsx
    - extension/src/entrypoints/content/components/SummaryPanel.tsx
    - extension/src/entrypoints/content/components/Fab.tsx
    - extension/src/entrypoints/content/components/LoadingSkeleton.tsx

key-decisions:
  - "isStaleRef + isStale state dual-track: ref for synchronous shadow root re-renders, state for React lifecycle"
  - "Re-score all listings when stale (not just unscored) to ensure all badges reflect new profile"
  - "Profile name tracked via profileNameRef updated in both mount effect and storage watcher"

patterns-established:
  - "Stale indicator pattern: amber ring + opacity reduction + absolute '!' badge on score badges"
  - "Backdrop blur (bg-white/95 backdrop-blur-sm) for polished card appearance in shadow DOM"

requirements-completed: [EXT-11, EXT-12, EXT-13]

# Metrics
duration: 12min
completed: 2026-03-15
---

# Phase 10 Plan 03: Content Script Stale Detection + Visual Polish Summary

**Stale badge detection via activeProfileStorage.watch() with amber indicators, plus polished badge/panel/FAB design with backdrop blur, improved typography, and profile attribution**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-15T11:32:39Z
- **Completed:** 2026-03-15T11:45:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Content script watches activeProfileStorage for profile changes and marks existing badges stale with amber "!" indicator
- Re-scoring after profile switch clears stale state and re-scores all listings (not just new ones)
- ScoreBadge polished: larger score circle (40px), better shadows, backdrop blur, stale indicator support
- SummaryPanel polished: backdrop blur, rounded-xl, emerald bullet dots, profile name attribution, stale warning banner, arrow link icon
- FAB polished: upgraded shadows (shadow-xl/2xl), hover ring effect, larger scored count badge
- LoadingSkeleton: softer gray-100/200 colors, rounded-xl, matches new badge dimensions (100x40)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stale badge detection and health check to content script App** - `ae4d965` (feat)
2. **Task 2: Polish badge, panel, FAB, and skeleton visual design** - `d2d83aa` (feat)

## Files Created/Modified
- `extension/src/entrypoints/content/App.tsx` - Added stale tracking (isStaleRef, scoredProfileIdRef, profileNameRef), activeProfileStorage.watch(), re-score-all-when-stale logic, passes isStale/profileName to badge components
- `extension/src/entrypoints/content/components/ScoreBadge.tsx` - Added isStale prop, amber ring/opacity/indicator when stale, polished sizes and typography
- `extension/src/entrypoints/content/components/SummaryPanel.tsx` - Added isStale/profileName props, stale warning banner, backdrop blur, emerald bullets, arrow link, max-w-sm
- `extension/src/entrypoints/content/components/Fab.tsx` - Upgraded shadows, added hover ring, backdrop-blur on error tooltip, larger count badge
- `extension/src/entrypoints/content/components/LoadingSkeleton.tsx` - Softer colors, rounded-xl, 100x40 dimensions

## Decisions Made
- Used dual isStaleRef + isStale state pattern: ref for immediate shadow root re-renders (avoids stale closures), state for React lifecycle awareness
- When stale, re-score ALL listings (not just unscored) so every badge reflects the new profile
- Profile name tracked via profileNameRef, updated both on mount and when storage watcher fires
- Emerald color palette (bg-emerald-400 bullets, text-emerald-600 links) consistent with web app design language

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in `profile-schema.test.ts` ("accepts an array of strings") -- unrelated to this plan's changes, out of scope per deviation rules

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Content script stale detection and visual polish complete
- Extension builds successfully (973 kB total)
- All plan-related tests pass (stale-badge.test.ts: 3/3)
- Ready for end-to-end testing: load extension, score listings, switch profile in popup, verify stale indicators, re-score to clear

## Self-Check: PASSED

All 5 modified files verified on disk. Both task commits (ae4d965, d2d83aa) verified in git log.

---
*Phase: 10-extension-profile-switcher*
*Completed: 2026-03-15*
