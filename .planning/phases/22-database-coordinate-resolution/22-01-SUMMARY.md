---
phase: 22-database-coordinate-resolution
plan: 01
subsystem: database
tags: [postgres, supabase, migration, geocoding, apify, nominatim, fastapi]

requires:
  - phase: 21-proximity-pipeline-design
    provides: geocode_location() function in apify.py, FlatfoxListing with lat/lon fields

provides:
  - nearby_places_cache migration SQL (004) ready to apply via Supabase Studio
  - geocode_listing() helper in apify.py builds address queries from FlatfoxListing fields
  - Coordinate resolution block in scoring.py between listing fetch and preferences parse

affects:
  - 23-proximity-cache: reads/writes nearby_places_cache table (table created here)
  - 24-prompt-injection: receives listings with resolved coordinates

tech-stack:
  added: []
  patterns:
    - "TYPE_CHECKING guard for circular-safe imports in apify.py"
    - "Graceful geocoding degradation: failure never propagates to caller (COORD-03)"
    - "In-place Pydantic model mutation for coordinate resolution (model is not frozen)"

key-files:
  created:
    - supabase/migrations/004_add_nearby_places_cache.sql
  modified:
    - backend/app/services/apify.py
    - backend/app/routers/scoring.py

key-decisions:
  - "Migration file created but DB push requires Supabase personal access token (sbp_...) or DB password — apply via Studio SQL editor"
  - "TYPE_CHECKING guard prevents circular import between apify.py and listing.py at module load time"
  - "Coordinate resolution placed at step 1a (after listing fetch, before preferences parse) to ensure ClaudeScorer sees resolved coordinates"
  - "try/except around geocode_listing() call satisfies COORD-03 unconditionally — no geocoding exception can reach the 502 handler"

requirements-completed: [CACHE-04, COORD-01, COORD-02, COORD-03]

duration: 40min
completed: 2026-03-27
---

# Phase 22 Plan 01: Cache Table & Coordinate Resolution Summary

**nearby_places_cache migration SQL written, geocode_listing() added to apify.py, and coordinate resolution wired into scoring.py between listing fetch and preferences parse**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-03-27T22:31:00Z
- **Completed:** 2026-03-27T23:10:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created migration, 2 modified backend)

## Accomplishments

- Created `supabase/migrations/004_add_nearby_places_cache.sql` with correct schema and composite lookup index
- Added `geocode_listing()` async helper to `apify.py` with 3-level address priority (public_address > street+city > city-only)
- Wired coordinate resolution into `scoring.py` at step 1a with full graceful degradation (missing coords, geocoding failure, unexpected exception all handled without crashing scoring)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create nearby_places_cache migration** - `a425e40` (feat)
2. **Task 2: Add geocode_listing() and wire coordinate resolution** - `3a07ba3` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified

- `supabase/migrations/004_add_nearby_places_cache.sql` - DDL for nearby_places_cache table with (lat, lon, query, radius_km) composite index
- `backend/app/services/apify.py` - Added TYPE_CHECKING import guard and geocode_listing() async helper
- `backend/app/routers/scoring.py` - Added geocode_listing import and step 1a coordinate resolution block

## Decisions Made

- TYPE_CHECKING guard used for FlatfoxListing import in apify.py to avoid circular import at module load time (listing.py imports from other modules, keeping it deferred is safe since only the type annotation needs it)
- Coordinate block positioned between step 1 (listing fetch) and step 2 (preferences parse) — this ensures claude_scorer always receives the most up-to-date coordinates before scoring
- Mutation of listing.latitude/longitude directly is valid because FlatfoxListing model_config has no `frozen=True`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Migration not applied to DB**: `npx supabase db push --linked` requires a Supabase personal access token (format: `sbp_...`) which was not available in any stored credentials on this machine. The migration FILE is correct and ready to apply.

**Resolution**: The plan explicitly provides a fallback for this case — apply the SQL directly via Supabase Studio SQL editor at:
`https://supabase.com/dashboard/project/mlhtozdtiorkemamzjjc/sql/new`

Copy the contents of `supabase/migrations/004_add_nearby_places_cache.sql` and run it in Studio. The SQL uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` so it is safe to run multiple times.

## User Setup Required

**One manual step required:** Apply the migration to Supabase.

1. Go to: https://supabase.com/dashboard/project/mlhtozdtiorkemamzjjc/sql/new
2. Paste and run the contents of `supabase/migrations/004_add_nearby_places_cache.sql`:

```sql
create table if not exists nearby_places_cache (
  id            uuid             default gen_random_uuid() primary key,
  lat           double precision not null,
  lon           double precision not null,
  query         text             not null,
  radius_km     double precision not null,
  response_json jsonb            not null default '[]',
  created_at    timestamptz      default now() not null
);

create index if not exists idx_nearby_places_cache_lookup
  on nearby_places_cache (lat, lon, query, radius_km);
```

3. Verify: Run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nearby_places_cache' ORDER BY ordinal_position;`

## Next Phase Readiness

- Phase 23 (proximity cache read/write logic) requires the nearby_places_cache table to exist — apply the migration above first
- Coordinate resolution is live on the next backend deployment; listings without coordinates will now attempt geocoding before scoring
- geocode_listing() and the coordinate block are production-ready and do not depend on the table existing

## Self-Check: PASSED

All files found:
- supabase/migrations/004_add_nearby_places_cache.sql: FOUND
- backend/app/services/apify.py: FOUND
- backend/app/routers/scoring.py: FOUND
- .planning/phases/22-database-coordinate-resolution/22-01-SUMMARY.md: FOUND

All commits found:
- a425e40 (Task 1: migration SQL): FOUND
- 3a07ba3 (Task 2: geocode_listing + scoring wiring): FOUND

---
*Phase: 22-database-coordinate-resolution*
*Completed: 2026-03-27*
