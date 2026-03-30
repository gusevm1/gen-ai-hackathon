---
phase: 33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix
plan: 02
subsystem: ui+backend
tags: [next.js, react, profile-creation, dashboard, routing, backend, scoring]

# Dependency graph
requires: ["33-01"]
provides:
  - ProfileCreationChooser wired into profile list (chooser dialog on '+ New Profile')
  - Download page inside (dashboard) route group with TopNavbar visible
  - Backend English-first title priority (short_title over description_title)
affects: [profile-list, download-page, scoring-pipeline, analyses-titles]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dialog wrapping ProfileCreationChooser for chooser-then-name-dialog flow
    - Dashboard route group membership for automatic layout wrapping

key-files:
  created:
    - web/src/app/(dashboard)/download/page.tsx
  modified:
    - web/src/components/profiles/profile-list.tsx
    - backend/app/routers/scoring.py
  deleted:
    - web/src/app/download/page.tsx

key-decisions:
  - "chooserOpen state separate from createOpen: chooser dialog opens first, Manual card then opens name dialog — avoids two dialogs open simultaneously"
  - "Delete old web/src/app/download/page.tsx entirely: route group membership requires no duplicate, dashboard layout provides navigation automatically"
  - "short_title first in title priority: Flatfox short_title is clean English (e.g. '4 rooms apartment'), description_title is typically German"

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 33 Plan 02: Profile Creation Flow, Download Page Nav, and Analyses Titles Fix Summary

**ProfileCreationChooser wired into profiles page, download page moved into dashboard layout for full nav, backend title priority fixed to prefer English short_title**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T10:22:24Z
- **Completed:** 2026-03-30T10:26:15Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 1 deleted, 1 modified in web; 1 modified in backend)

## Accomplishments

- Replaced direct CreateProfileDialog open on "+ New Profile" with a two-step flow: chooser dialog first (Manual vs AI cards), then name dialog for Manual or /ai-search navigation for AI
- Moved download page from standalone `/app/download/` into `/(dashboard)/download/` route group — TopNavbar, Home icon, and all nav items now visible at /download
- Fixed backend listing_title field priority from `description_title OR public_title OR short_title` to `short_title OR pitch_title OR public_title OR description_title` — new analyses will display clean English titles

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire ProfileCreationChooser into profile list '+ New Profile'** - `756797c` (feat)
2. **Task 2: Move download page into dashboard layout and fix English title priority** - `4e8ce0f` (feat)

## Files Created/Modified

- `web/src/components/profiles/profile-list.tsx` - Added chooserOpen state, Dialog+ProfileCreationChooser, both buttons now open chooser first
- `web/src/app/(dashboard)/download/page.tsx` - New dashboard-routed download page without standalone header/wrapper
- `web/src/app/download/page.tsx` - DELETED (standalone page replaced by dashboard route group version)
- `backend/app/routers/scoring.py` - Title priority changed to English-first: short_title > pitch_title > public_title > description_title

## Decisions Made

- Separate `chooserOpen` state from `createOpen`: prevents both dialogs appearing simultaneously; chooser closes, then name dialog opens
- Full deletion of `web/src/app/download/page.tsx`: no redirect needed because the dashboard layout's nav links point to `/download` which Next.js now resolves to the `(dashboard)/download/page.tsx`
- `short_title` prioritized over `description_title`: in Flatfox data, `short_title` contains clean English apartment descriptions; `description_title` tends to be German marketing copy

## Deviations from Plan

None - plan executed exactly as written.

---

## Self-Check

- [x] `web/src/components/profiles/profile-list.tsx` modified with ProfileCreationChooser
- [x] `web/src/app/(dashboard)/download/page.tsx` created (76 lines, > 50 min_lines requirement)
- [x] `web/src/app/download/page.tsx` deleted
- [x] `backend/app/routers/scoring.py` contains `short_title` as first priority
- [x] `ProfileCreationChooser` imported in profile-list.tsx
- [x] TypeScript: no new errors introduced (pre-existing motion/react module errors unchanged)
- [x] Python: syntax valid

## Self-Check: PASSED

---
*Phase: 33-dashboard-home-nav-polish-profile-creation-flow-and-analyses-titles-fix*
*Completed: 2026-03-30*
