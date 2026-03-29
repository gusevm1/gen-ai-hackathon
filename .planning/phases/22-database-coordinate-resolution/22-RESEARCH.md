# Phase 22 Research: Database & Coordinate Resolution

**Researched:** 2026-03-27
**Domain:** Supabase schema migrations, geocoding, scoring pipeline integration
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Current Scoring Pipeline

The scoring pipeline lives in `backend/app/routers/scoring.py` and follows this order:

1. **Cache check** (lines 41-52): Calls `supabase_service.get_analysis()` — if a non-stale cached result exists and `force_rescore=False`, returns immediately.
2. **Fetch listing** (lines 54-61): `flatfox_client.get_listing(listing_id)` → returns a `FlatfoxListing` Pydantic model.
3. **Parse preferences** (line 64): Validates `ScoreRequest.preferences` dict into `UserPreferences`.
4. **Fetch page data** (lines 67-68): HTML scrape for images and prices.
5. **Price override** (lines 74-87): Overwrites API-returned prices with web-scraped values for RENT listings.
6. **Score with Claude** (lines 90-98): `claude_scorer.score_listing(listing, preferences, image_urls)`.
7. **Save to Supabase** (lines 101-115): Fires `supabase_service.save_analysis()` (fire-and-forget).
8. **Return** `ScoreResponse`.

The `ClaudeScorer.score_listing()` method (`backend/app/services/claude.py`, lines 157-159) already contains the coordinate gate:

```python
has_coords = listing.latitude is not None and listing.longitude is not None
has_criteria = _has_location_criteria(preferences)
use_tool = has_coords and has_criteria
```

If `has_coords` is `False`, the `search_nearby_places` tool is never offered to Claude and proximity evaluation is silently skipped. This already satisfies COORD-03 (no crash when coordinates missing) for the places tool — but **there is no geocoding attempt** when `latitude`/`longitude` are `None`. That is the gap this phase closes.

**Entry point for COORD-01/02/03:** Between steps 2 and 3 in `scoring.py` (after the listing is fetched, before scoring begins).

---

## Listing Data Structure

`FlatfoxListing` (`backend/app/models/listing.py`, lines 38-110):

| Field | Type | Notes |
|-------|------|-------|
| `pk` | `int` | Listing primary key |
| `slug` | `str` | URL slug |
| `latitude` | `Optional[float]` | Line 83 — can be `None` |
| `longitude` | `Optional[float]` | Line 84 — can be `None` |
| `street` | `Optional[str]` | Line 79 |
| `zipcode` | `Optional[int]` | Line 80 |
| `city` | `Optional[str]` | Line 81 |
| `public_address` | `Optional[str]` | Line 82 — full formatted address |
| `state` | `Optional[str]` | Canton code, e.g. "ZH" |
| `country` | `Optional[str]` | "CH" |

**Key finding:** The Flatfox API *does* return `latitude` and `longitude` as top-level fields on the listing object. They are optional floats that may be `None`. No changes to `FlatfoxListing` are needed for this phase.

**Geocoding input:** When coordinates are missing, the best geocoding query can be constructed from `public_address` (preferred), or composed as `f"{street}, {zipcode} {city}, Switzerland"`.

---

## Existing Geocoding Code

There are **two geocoding paths already in the codebase**:

### Path 1: Apify homematch-geocoder actor (`backend/app/services/apify.py`)

- Function: `geocode_location(query, country_code="ch") -> dict | None`
- Calls the `gusevm1~homematch-geocoder` Apify actor synchronously via `run-sync-get-dataset-items`
- Returns dict with keys: `query`, `lat`, `lon`, `displayName`, `boundingBox`
- Requires `APIFY_TOKEN` env var; if missing, falls back automatically to Nominatim
- Timeout: 30 seconds

### Path 2: Nominatim direct fallback (`backend/app/services/apify.py`, lines 46-74)

- Function: `_nominatim_fallback(query, country_code="ch") -> dict | None`
- Direct `GET https://nominatim.openstreetmap.org/search` with `?q=...&format=json&limit=1&countrycodes=ch`
- User-Agent: `HomeMatch/1.0` (present — Nominatim requires this)
- Returns same dict shape: `lat`, `lon`, `displayName`, `boundingBox`
- Timeout: 10 seconds

Both functions are already used in `backend/app/routers/geocoding.py` for the `/geocode` endpoint (bounding box resolution for the user's preferred location filter). They return lat/lon which is exactly what is needed for listing coordinate resolution.

**`geocode_location` already returns `lat` and `lon`** — these can be written directly to `listing.latitude` and `listing.longitude` before passing to `claude_scorer`.

---

## Supabase Schema Management

**Migration pattern:** Sequential numbered SQL files in `supabase/migrations/`:

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Initial tables (user_preferences, analyses) |
| `002_profiles_schema.sql` | Multi-profile support (profiles + analyses with profile_id FK) |
| `003_add_stale_column.sql` | Added `stale boolean` to analyses |

**How migrations are applied:** Manually via `npx supabase db push` or applied directly in Supabase Studio SQL editor. There is no ORM or Alembic. New schema changes = new numbered `.sql` file.

**Next migration number:** `004_add_nearby_places_cache.sql`

**Existing tables in production:**
- `profiles` — user profiles with JSONB preferences
- `analyses` — scored listing results with `breakdown` JSONB
- `user_preferences` — deprecated but kept

**RLS pattern:** All tables have RLS enabled with per-user policies. The `nearby_places_cache` table is a shared infrastructure cache (not user-owned data), so it should NOT have RLS or should use a permissive policy allowing the service role to read/write freely. The FastAPI backend uses the `service_role` key (bypasses RLS), so RLS policies for this table are optional — but best practice is to disable RLS or add an explicit policy.

---

## nearby_places_cache Table Design

The requirement specifies: `(id, lat, lon, query, radius_km, response_json, created_at)`

Recommended SQL:

```sql
create table if not exists nearby_places_cache (
  id          uuid default gen_random_uuid() primary key,
  lat         double precision not null,
  lon         double precision not null,
  query       text not null,
  radius_km   double precision not null,
  response_json jsonb not null default '[]',
  created_at  timestamptz default now() not null
);
```

**Cache lookup key:** `(lat, lon, query, radius_km)` — an index on these four columns enables fast cache hits. Exact lat/lon matching works here because coordinates come from the same source (Flatfox API), so floating-point equality is stable for a given listing.

**Index:**
```sql
create index idx_nearby_places_cache_lookup
  on nearby_places_cache (lat, lon, query, radius_km);
```

**TTL strategy:** Cache entries can be considered stale after N days. The simplest approach: when reading, filter on `created_at > now() - interval '30 days'`. No need for a background job in this phase.

**RLS:** The service role bypasses RLS. No need for user-specific policies. Either disable RLS or leave it off (no `alter table ... enable row level security` needed).

---

## Geocoding Options

| Option | Latency | Cost | Reliability | Recommendation |
|--------|---------|------|-------------|----------------|
| Apify homematch-geocoder | ~5-15s | Apify credits | Depends on APIFY_TOKEN | Use if token present |
| Nominatim direct | ~1-3s | Free | Rate-limited (1 req/s) | Fallback (already used) |

**Recommendation:** Reuse `geocode_location()` from `backend/app/services/apify.py` directly. It already implements the Apify-first, Nominatim-fallback pattern and returns `lat`/`lon`. No new geocoding code is needed.

**Nominatim rate limit:** 1 request per second. Since geocoding only happens when `latitude` is `None`, and listings typically come with coordinates from Flatfox, this path is rare in production. Rate limiting is not a concern for this phase.

**Address construction for geocoding:** Use `listing.public_address` if not None, otherwise compose `f"{listing.street}, {listing.zipcode} {listing.city}, Switzerland"`. Fall back to `f"{listing.zipcode} {listing.city}, Switzerland"` if street is also missing.

---

## Recommended Approach

### Step 1: Create migration `004_add_nearby_places_cache.sql`

```sql
-- 004_add_nearby_places_cache.sql
-- Phase 22: Database & Coordinate Resolution - Cache table for proximity searches

create table if not exists nearby_places_cache (
  id            uuid default gen_random_uuid() primary key,
  lat           double precision not null,
  lon           double precision not null,
  query         text not null,
  radius_km     double precision not null,
  response_json jsonb not null default '[]',
  created_at    timestamptz default now() not null
);

create index idx_nearby_places_cache_lookup
  on nearby_places_cache (lat, lon, query, radius_km);
```

Apply with: `npx supabase db push` or directly in Supabase Studio SQL editor.

### Step 2: Add coordinate resolution logic in `scoring.py`

After step 2 (listing fetch) and before step 5 (Claude scoring), insert:

```python
# Resolve coordinates if missing (COORD-01/02/03)
if listing.latitude is None or listing.longitude is None:
    geo = await geocode_listing(listing)
    if geo:
        listing.latitude = geo["lat"]
        listing.longitude = geo["lon"]
    # If geocoding fails, latitude/longitude remain None.
    # ClaudeScorer already handles this: use_tool = has_coords and has_criteria
    # so proximity evaluation is skipped without crashing. (COORD-03 satisfied)
```

### Step 3: Add `geocode_listing()` helper

Add a thin helper to `backend/app/services/apify.py` (or a new `backend/app/services/geocoding.py`):

```python
async def geocode_listing(listing: FlatfoxListing) -> dict | None:
    """Attempt to geocode a listing using its address fields.
    Returns dict with 'lat', 'lon' or None if geocoding fails."""
    query = (
        listing.public_address
        or (f"{listing.street}, {listing.zipcode} {listing.city}, Switzerland"
            if listing.street and listing.city else None)
        or (f"{listing.zipcode} {listing.city}, Switzerland"
            if listing.city else None)
    )
    if not query:
        return None
    return await geocode_location(query)
```

### Step 4: Wire the import in `scoring.py`

```python
from app.services.apify import geocode_listing
```

### What does NOT need to change

- `FlatfoxListing` model — already has `latitude: Optional[float]` and `longitude: Optional[float]`
- `ClaudeScorer.score_listing()` — already handles `None` coordinates gracefully
- `places.py` — no changes needed in this phase
- `supabase.py` — no changes needed (nearby_places_cache writes happen in places.py in a future phase)

---

## Key Files

| File | Relevance | Key Lines |
|------|-----------|-----------|
| `backend/app/routers/scoring.py` | Main pipeline — where geocoding step is inserted | Lines 54-98 (pipeline steps 1-5) |
| `backend/app/services/claude.py` | Coordinate gate for places tool | Lines 157-159 (`has_coords` check) |
| `backend/app/models/listing.py` | `FlatfoxListing` model | Lines 83-84 (`latitude`, `longitude`) |
| `backend/app/services/apify.py` | Existing geocoding — `geocode_location()` + Nominatim fallback | Lines 14-74 |
| `backend/app/routers/geocoding.py` | Shows how `geocode_location()` is called | Lines 32-82 |
| `backend/app/services/places.py` | Nearby places via Apify (takes lat/lon) | Lines 15-75 |
| `backend/app/services/supabase.py` | DB client pattern — service_role key | Lines 15-92 |
| `supabase/migrations/003_add_stale_column.sql` | Most recent migration — follow this naming convention | All |

---

## Risks & Pitfalls

### 1. FlatfoxListing is a Pydantic model — mutation works but is non-obvious
`listing.latitude = geo["lat"]` mutates the Pydantic model instance in place. By default Pydantic v2 models are mutable unless `model_config = ConfigDict(frozen=True)`. The current `FlatfoxListing` has no `frozen=True`, so mutation is safe. Verify this holds if the model is ever made frozen.

### 2. Nominatim rate limit (1 req/s)
If many listings are scored in rapid succession with missing coordinates, Nominatim 429 errors may surface. The existing `_nominatim_fallback` swallows exceptions and returns `None` (line 72-73), so this will manifest as COORD-03 behavior (skip proximity, no crash) rather than an error. Acceptable for this phase.

### 3. Geocoding adds latency to the scoring path
Apify geocoder can take 5-15 seconds. This only triggers when `latitude is None`, which should be rare for Flatfox listings (they typically include coordinates). Monitor logs for frequency. If it becomes a performance concern, a listing-coordinate cache in Supabase can be added in a later phase.

### 4. `geocode_location` returns a bounding box response, not just a point
The return dict from `geocode_location` contains `lat`, `lon`, `displayName`, `boundingBox`. Only `lat` and `lon` are needed here. The caller must index into `result["lat"]` and `result["lon"]` — a missing key would raise `KeyError`. Add a guard: `if geo and "lat" in geo and "lon" in geo`.

### 5. Migration must be applied to production, not just local
The `supabase/migrations/` folder tracks schema history but there is no automatic CI migration step. The migration must be manually applied to the linked Supabase project using `npx supabase db push --linked` or via Supabase Studio. Document this in the plan's verification checklist.

### 6. `nearby_places_cache` is not yet used by `places.py`
This phase only creates the table. The actual cache read/write logic in `places.py` is out of scope (future phase). Ensure the plan is clear that the table creation is infrastructure-only in phase 22.

---

## Sources

All findings from direct codebase inspection (HIGH confidence):

- `backend/app/routers/scoring.py` — full pipeline
- `backend/app/services/claude.py` — coordinate gate logic
- `backend/app/models/listing.py` — FlatfoxListing schema
- `backend/app/services/apify.py` — existing geocode_location + Nominatim
- `backend/app/services/places.py` — Apify places search
- `backend/app/services/supabase.py` — DB client pattern
- `supabase/migrations/001-003_*.sql` — full schema history
- `backend/app/main.py` — router registration and lifespan

No external sources required — all research is from codebase inspection.
