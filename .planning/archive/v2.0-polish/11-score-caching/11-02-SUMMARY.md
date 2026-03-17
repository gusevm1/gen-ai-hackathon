---
phase: 11-score-caching
plan: 02
subsystem: api
tags: [supabase, edge-function, caching, deno, nextjs, chrome-extension]

requires:
  - phase: 11-score-caching/01
    provides: "stale column on analyses table, backend upsert logic"
provides:
  - "Edge function cache check returning cached breakdown on hit"
  - "force_rescore bypass param flowing from extension through edge function"
  - "Preference-stale signal (X-HomeMatch-Pref-Stale header) from edge function to extension"
  - "Stale-marking on preference save in web app"
  - "ScoreResult interface with prefStale flag in extension API"
affects: [11-score-caching/03]

tech-stack:
  added: []
  patterns: ["Cache-aside with stale flag invalidation", "Response header signaling between edge function and extension"]

key-files:
  created: []
  modified:
    - supabase/functions/score-proxy/index.ts
    - web/src/app/(dashboard)/profiles/actions.ts
    - extension/src/lib/api.ts

key-decisions:
  - "Query fetches both stale and non-stale rows to distinguish miss reasons (no row vs stale row)"
  - "Edge function deployment skipped -- Supabase CLI not authenticated locally (same as 11-01)"

patterns-established:
  - "Cache-aside pattern: check analyses table before proxying to backend"
  - "X-HomeMatch-Cache header (hit/miss) for cache observability"
  - "X-HomeMatch-Pref-Stale header to signal stale-caused misses back to extension"

requirements-completed: [CACHE-01, CACHE-02]

duration: 2min
completed: 2026-03-17
---

# Phase 11 Plan 02: Cache Logic Summary

**Edge function cache-aside lookup with stale-aware invalidation, force_rescore bypass, and pref-stale signaling to extension**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T23:17:35Z
- **Completed:** 2026-03-16T23:19:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Edge function checks analyses table for cached non-stale result before proxying to backend (CACHE-01)
- Saving preferences marks all profile analyses as stale in web app (CACHE-02)
- Extension API supports force_rescore param and reads X-HomeMatch-Pref-Stale header
- New ScoreResult interface wraps ScoreResponse with prefStale boolean for UI consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cache check to edge function + force_rescore bypass + pref-stale signal header** - `96027b1` (feat)
2. **Task 2: Add stale-marking to saveProfilePreferences + update extension API** - `bf593e2` (feat)

## Files Created/Modified
- `supabase/functions/score-proxy/index.ts` - Cache check before backend proxy, force_rescore support, X-HomeMatch-Cache and X-HomeMatch-Pref-Stale headers
- `web/src/app/(dashboard)/profiles/actions.ts` - Stale-marking on preference save
- `extension/src/lib/api.ts` - ScoreResult interface, forceRescore param, prefStale from response header

## Decisions Made
- Query fetches both stale and non-stale rows (no `.eq("stale", false)`) so we can distinguish "no row" from "stale row" and signal the reason via X-HomeMatch-Pref-Stale header
- Edge function deployment skipped -- Supabase CLI not authenticated locally (consistent with 11-01 blocker)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Supabase CLI not authenticated for edge function deployment (pre-existing issue from 11-01, not new). Function code is committed and ready to deploy once CLI auth is resolved.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Cache logic complete, ready for 11-03 (UI stale badge + force re-score button in extension)
- Edge function deployment pending CLI authentication (can be deployed via Supabase dashboard or after `supabase login`)

---
*Phase: 11-score-caching*
*Completed: 2026-03-17*
