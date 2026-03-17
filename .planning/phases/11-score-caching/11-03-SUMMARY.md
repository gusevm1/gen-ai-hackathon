---
phase: 11-score-caching
plan: 03
subsystem: ui
tags: [react, chrome-extension, long-press, stale-ux, fab, caching]

# Dependency graph
requires:
  - phase: 11-02
    provides: scoreListings API with forceRescore param and prefStale callback signal
provides:
  - FAB long-press force re-score interaction with circular progress ring
  - Preference-stale and profile-switch distinct visual states on badges and panels
  - End-to-end stale detection wired from edge function header to UI components
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pointer events (onPointerDown/Up/Leave) for cross-device long-press detection"
    - "SVG strokeDashoffset circular progress ring animation"
    - "staleReasonRef pattern for distinguishing stale causes in React"

key-files:
  created: []
  modified:
    - extension/src/entrypoints/content/components/Fab.tsx
    - extension/src/entrypoints/content/App.tsx
    - extension/src/entrypoints/content/components/ScoreBadge.tsx
    - extension/src/entrypoints/content/components/SummaryPanel.tsx

key-decisions:
  - "FAB restyled with brand teal color, house icon, black circular dial, and hover tooltip for discoverability"
  - "Long-press auto-fires at 2s completion rather than requiring release"
  - "Preference-stale uses greyed-out (opacity-50 grayscale) vs profile-switch amber ring for visual distinction"

patterns-established:
  - "Pointer event long-press: onPointerDown starts timer, onPointerUp fires click if not long-pressed, onPointerLeave cancels"
  - "staleReasonRef tracks cause of staleness for component-level branching"

requirements-completed: [CACHE-03]

# Metrics
duration: 8min
completed: 2026-03-17
---

# Phase 11 Plan 03: Re-score UX Summary

**FAB long-press force re-score with 2s circular progress ring, plus preference-stale greyed-out badge and profile-switch amber ring visual states**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-17T06:00:00Z
- **Completed:** 2026-03-17T06:08:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments

- FAB supports 2-second long-press with animated circular progress ring that auto-fires force re-score
- Regular tap unchanged -- uses cached scores
- Preference-changed stale scores show greyed-out badge with warning icon and "Preferences changed" banner
- Profile-switch stale keeps existing amber ring styling with "Scores may be outdated" banner
- FAB restyled with brand teal color, house icon, black circular dial, hover tooltip, and badge reset on hard rescore
- Full caching flow verified end-to-end by user

## Task Commits

Each task was committed atomically:

1. **Task 1: Add long-press interaction to FAB with circular progress ring** - `3d15bf3` (feat)
2. **Task 2: Add preference-stale visual state to ScoreBadge and SummaryPanel** - `f2ade0b` (feat)
3. **Extra: Restyle FAB with brand color, house icon, black dial, hover tooltip** - `587e60f` (feat)
4. **Task 3: Verify full caching flow end-to-end** - human-verify checkpoint, approved

## Files Created/Modified

- `extension/src/entrypoints/content/components/Fab.tsx` - Long-press detection, circular progress ring, brand restyling with house icon and tooltip
- `extension/src/entrypoints/content/App.tsx` - handleScore forceRescore param, handleForceRescore callback, staleReasonRef, prefStale detection from API callback
- `extension/src/entrypoints/content/components/ScoreBadge.tsx` - staleReason prop, greyed-out preference-stale style, amber profile-switch style
- `extension/src/entrypoints/content/components/SummaryPanel.tsx` - staleReason prop, distinct warning banners for each stale type

## Decisions Made

- FAB restyled beyond plan scope to improve discoverability (brand teal, house icon, black dial, hover tooltip)
- Long-press auto-fires on 2s completion rather than requiring pointer release -- more intuitive UX
- Badge count resets to 0 on force re-score to provide visual feedback that fresh scoring is happening

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Enhancement] FAB restyling for discoverability**
- **Found during:** After Task 2 (user feedback)
- **Issue:** Default FAB appearance lacked brand identity and affordance for long-press
- **Fix:** Added brand teal color, house icon, black circular dial, hover tooltip explaining long-press, badge reset on hard rescore
- **Files modified:** extension/src/entrypoints/content/components/Fab.tsx, extension/src/entrypoints/content/App.tsx
- **Verification:** Extension builds, visual inspection approved
- **Committed in:** 587e60f

---

**Total deviations:** 1 enhancement (UI polish)
**Impact on plan:** Improvement to UX discoverability. No scope creep beyond plan goals.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 (Score Caching) is fully complete
- All 3 plans delivered: stale column + upsert (11-01), cache logic + stale marking (11-02), re-score UX (11-03)
- Edge function deployment still pending Supabase CLI auth (blocker from 11-01/11-02)
- Ready to proceed to Phase 12

---
*Phase: 11-score-caching*
*Completed: 2026-03-17*
