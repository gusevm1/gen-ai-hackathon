---
phase: 23-proximity-extraction-apify-integration
plan: 01
subsystem: api
tags: [apify, google-places, supabase, proximity, haversine, caching, fastapi]

# Dependency graph
requires:
  - phase: 22-database-coordinate-resolution
    provides: geocode_listing() in apify.py, step 1a coordinate resolution in scoring.py, nearby_places_cache table in Supabase
provides:
  - haversine_km() utility in places.py
  - location (lat/lng) extraction from Apify results in places.py
  - proximity.py: ProximityRequirement model, extract_proximity_requirements(), fetch_nearby_places(), fetch_all_proximity_data()
  - SupabaseService.get_nearby_places_cache() and save_nearby_places_cache()
  - scoring.py step 1b/1c: proximity pre-fetch wired between geocoding and Claude scoring
  - nearby_places persisted in analyses.breakdown JSONB for Phase 24 consumption
affects: [24-prompt-injection, phase-24, claude-scoring, proximity-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - cache-before-network: check Supabase cache before every Apify call; write on miss
    - graceful-degradation: all proximity errors swallowed with logging; scoring never blocked
    - concurrent-fetch: asyncio.gather() for parallel Apify calls across requirements
    - conditional-pipeline: proximity fetch entirely skipped when no matching dynamic_fields
    - asyncio-to-thread: supabase-py sync calls wrapped in asyncio.to_thread() for async routers

key-files:
  created:
    - backend/app/services/proximity.py
  modified:
    - backend/app/services/places.py
    - backend/app/services/supabase.py
    - backend/app/routers/scoring.py

key-decisions:
  - "Import _AMENITY_KEYWORDS from claude.py into proximity.py to avoid duplication without touching claude.py prompts"
  - "Cache TTL computed in Python as datetime.now(timezone.utc) - timedelta(days=7) — supabase-py does not evaluate raw SQL strings"
  - "nearby_places stored in analyses.breakdown JSONB (not ScoreResponse schema) so Phase 24 can read it without API changes"
  - "Distance computed in proximity.py after Apify response, not inside search_nearby_places() — keeps places.py agnostic of listing coordinates"

patterns-established:
  - "Pattern: Proximity pipeline is a pure pre-fetch step — inserts data, never blocks scoring"
  - "Pattern: Each external call (cache read, Apify, cache write) independently try/excepted to prevent cascade failures"

requirements-completed: [PROX-01, PROX-02, PROX-03, APIFY-01, APIFY-02, APIFY-03, CACHE-05, CACHE-06]

# Metrics
duration: 6min
completed: 2026-03-27
---

# Phase 23 Plan 01: Proximity Extraction & Apify Integration Summary

**Deterministic nearby-place pre-fetch pipeline: regex extracts proximity requirements from dynamic_fields, checks Supabase cache (7-day TTL), calls Apify Google Places on miss, computes Haversine distance per result, persists to cache and analyses.breakdown**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-27T23:20:19Z
- **Completed:** 2026-03-27T23:26:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 new + 3 modified)

## Accomplishments

- Created `proximity.py` with complete fetch-with-cache pipeline — `ProximityRequirement` model, `_parse_radius_km()` handling m/km suffixes, `extract_proximity_requirements()` via `_AMENITY_KEYWORDS`, `fetch_nearby_places()` with cache-check/Apify/distance/cache-write, `fetch_all_proximity_data()` with `asyncio.gather()` concurrency
- Updated `places.py` with `haversine_km()` utility and `location` field extraction from Apify results, enabling distance computation in `proximity.py`
- Added `get_nearby_places_cache()` and `save_nearby_places_cache()` to `SupabaseService` with Python-computed TTL (supabase-py compatible)
- Wired step 1b/1c into `scoring.py` between geocoding (step 1a) and Claude scoring (step 5); `nearby_places` attached to `score_data` before Supabase save for Phase 24 consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Add location extraction and haversine_km to places.py** - `35c0ae5` (feat)
2. **Task 2: Create proximity.py** - `017dd10` (feat)
3. **Task 3: Add cache methods to SupabaseService and wire scoring.py** - `af56ec0` (feat)

## Files Created/Modified

- `backend/app/services/places.py` - Added `haversine_km()` function and `location` key in Apify result dicts; replaced unused `import json` with `import math`
- `backend/app/services/proximity.py` - New module: ProximityRequirement, extraction, fetch-with-cache, concurrent gather
- `backend/app/services/supabase.py` - Added `get_nearby_places_cache()` and `save_nearby_places_cache()` to SupabaseService
- `backend/app/routers/scoring.py` - Imported `fetch_all_proximity_data`; added step 1b/1c proximity block; attached `nearby_places` to `score_data`

## Decisions Made

- Import `_AMENITY_KEYWORDS` from `claude.py` instead of duplicating the regex — avoids touching claude.py prompt logic prematurely (Phase 24 concern)
- Cache TTL implemented as Python datetime arithmetic rather than raw SQL string — `supabase-py` treats `.gte()` string arguments as literals, not SQL expressions
- `nearby_places` injected into `analyses.breakdown` JSONB rather than `ScoreResponse` schema — Phase 24 reads it from stored breakdown without requiring API/schema changes
- Distance computation deferred to `proximity.py` instead of `places.py` — `search_nearby_places()` is a general search utility that shouldn't know about listing coordinates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Local Python 3.9 cannot import `supabase.py` due to `dict | None` union syntax (Python 3.10+). EC2 runs Python 3.10 so this is not a production issue. Verification was done via `ast.parse()` for syntax checking and direct logic testing that bypasses the 3.9-incompatible module.

## User Setup Required

None - no external service configuration required. The `nearby_places_cache` table was created in Phase 22 (migration 004). Note: migration 004 was pending manual application to production as of Phase 22 — if not yet applied, cache writes will fail silently (graceful degradation) and Apify will be called on every request until the table exists.

## Next Phase Readiness

- Phase 24 (prompt injection) can read `nearby_places` from `analyses.breakdown["nearby_places"]` — it is populated for any listing with coordinates and proximity-matching dynamic_fields
- `ProximityRequirement.importance` is available for Phase 24 to weight nearby places in the Claude prompt
- All Apify errors degrade gracefully — Phase 24 must handle the case where `nearby_places` is absent or empty

---
*Phase: 23-proximity-extraction-apify-integration*
*Completed: 2026-03-27*
