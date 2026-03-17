---
phase: 11-score-caching
plan: 01
subsystem: database
tags: [postgres, supabase, cache-invalidation, migrations]

# Dependency graph
requires: []
provides:
  - stale boolean column on analyses table
  - partial index idx_analyses_cache_lookup for non-stale lookups
  - backend upsert clears stale flag on every score write
affects: [11-02, 11-03, score-proxy, extension-cache]

# Tech tracking
tech-stack:
  added: []
  patterns: [stale-flag cache invalidation]

key-files:
  created:
    - supabase/migrations/003_add_stale_column.sql
  modified:
    - backend/app/services/supabase.py

key-decisions:
  - "Migration not applied to production -- Supabase CLI not authenticated in local env. Must apply via Supabase dashboard SQL editor or after push to main."

patterns-established:
  - "Stale flag pattern: boolean column with default false, cleared on write, set true on invalidation"

requirements-completed: [CACHE-01, CACHE-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 11 Plan 01: Stale Column & Backend Upsert Summary

**Added stale boolean column to analyses table with partial index, and updated backend save_analysis to clear stale flag on every score write**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T23:13:01Z
- **Completed:** 2026-03-16T23:15:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created migration 003_add_stale_column.sql adding stale boolean (default false) to analyses table
- Added partial index idx_analyses_cache_lookup for efficient non-stale row lookups
- Updated backend save_analysis upsert to include "stale": False on every write

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration adding stale column to analyses table** - `2df1063` (feat)
2. **Task 2: Update backend save_analysis to clear stale flag on upsert** - `663ce75` (feat)

## Files Created/Modified
- `supabase/migrations/003_add_stale_column.sql` - ALTER TABLE adds stale column, CREATE INDEX for cache lookup
- `backend/app/services/supabase.py` - Added "stale": False to upsert dict in save_analysis

## Decisions Made
- Migration file created but not applied to production -- Supabase CLI lacks authentication in local environment. Migration must be applied via Supabase dashboard SQL editor or via `npx supabase db push` after authenticating.

## Deviations from Plan

None - plan executed exactly as written (code changes). Migration application to production deferred due to missing Supabase CLI authentication.

## Issues Encountered
- Supabase CLI not authenticated locally (no access token). Migration file is correct but needs manual application via Supabase SQL editor or after `supabase login`.

## User Setup Required

**Migration must be applied to production.** Run the following SQL in the Supabase SQL Editor (Dashboard > SQL Editor):

```sql
alter table analyses add column stale boolean not null default false;

create index idx_analyses_cache_lookup
  on analyses (user_id, listing_id, profile_id)
  where (stale = false);
```

Or authenticate the Supabase CLI and run `npx supabase db push --linked`.

## Next Phase Readiness
- Stale column schema and backend write path ready for plans 11-02 (cache read/stale-marking) and 11-03 (proxy integration)
- Migration must be applied before downstream plans can function in production

---
*Phase: 11-score-caching*
*Completed: 2026-03-17*
