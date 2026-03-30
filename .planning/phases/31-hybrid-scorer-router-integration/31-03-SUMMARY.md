---
phase: 31-hybrid-scorer-router-integration
plan: 03
subsystem: database
tags: [supabase, edge-function, cache, schema-version, deno]

# Dependency graph
requires:
  - phase: 31-01
    provides: "ScoreResponse v2 model with schema_version=2 field"
provides:
  - "Backend cache gating on schema_version >= 2 in get_analysis"
  - "Edge function cache gating on schema_version >= 2 in score-proxy"
  - "Deployed score-proxy edge function with v2 cache check"
affects: [31-02, scoring-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: ["schema_version cache gating for breaking score format changes"]

key-files:
  created: []
  modified:
    - backend/app/services/supabase.py
    - supabase/functions/score-proxy/index.ts

key-decisions:
  - "Default schema_version to 0 when missing (treats all v1 entries as stale)"

patterns-established:
  - "Cache version gating: both cache layers (backend Python + edge function) must gate on schema_version for breaking changes"

requirements-completed: [DB-02]

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 31 Plan 03: Schema Version Cache Gating Summary

**schema_version >= 2 cache gating in both backend get_analysis and Supabase edge function score-proxy, preventing stale v1 scores from being served**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-30T15:20:41Z
- **Completed:** 2026-03-30T15:21:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Backend `get_analysis()` now returns None for v1 cache entries (missing or schema_version < 2), forcing re-score
- Edge function `score-proxy` cache check gates on `cached.breakdown?.schema_version ?? 0 >= 2` before returning cached response
- Edge function deployed to Supabase production (project mlhtozdtiorkemamzjjc)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schema_version check to backend get_analysis** - `23d70e3` (feat)
2. **Task 2: Add schema_version check to edge function cache + deploy** - `6ed2687` (feat)

## Files Created/Modified
- `backend/app/services/supabase.py` - Added schema_version >= 2 check in get_analysis before returning cached breakdown
- `supabase/functions/score-proxy/index.ts` - Added schema_version >= 2 check in cache hit block with nullish coalescing fallback

## Decisions Made
- Default schema_version to 0 when missing -- treats all legacy v1 entries as stale (consistent across both Python and TypeScript layers)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both cache layers now enforce v2 schema requirement
- Combined with Plan 01 (scoring building blocks) and Plan 02 (router integration), Phase 31 delivers the full hybrid scoring pipeline
- Stale v1 cache entries will trigger re-scoring through the new hybrid pipeline once Plan 02 is deployed

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 31-hybrid-scorer-router-integration*
*Completed: 2026-03-30*
