# Phase 23 Research: Proximity Extraction & Apify Integration

**Researched:** 2026-03-27
**Domain:** Proximity requirement extraction, Apify Google Places, Supabase caching
**Confidence:** HIGH (all findings from direct codebase inspection)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROX-01 | System parses dynamic_fields from user preferences to identify place-based requirements | DynamicField model in preferences.py; _AMENITY_KEYWORDS regex in claude.py already identifies these |
| PROX-02 | Each extracted requirement includes query (string), radius_km (float, nullable), and importance level | DynamicField has `name`, `value`, `importance`; query is derived from field name/value; radius_km must be parsed from value text |
| PROX-03 | If no proximity requirements exist in dynamic_fields, Apify is never called and scoring proceeds normally | Gated by extraction function returning empty list |
| APIFY-01 | For each proximity requirement, system calls Apify Google Places actor with lat, lon, query, maxResults=5 | places.py already implements `search_nearby_places()` with exactly this signature |
| APIFY-02 | Response includes name, distance from listing, rating, review count, and address per result | places.py returns title, address, rating, reviews, category — distance field is missing and must be added |
| APIFY-03 | On Apify API failure, system falls back gracefully (treats as empty result, does not crash) | places.py already returns [] on any exception |
| CACHE-05 | Before calling Apify, system checks cache by (lat, lon, query, radius_km) | nearby_places_cache table exists with composite index on these four columns |
| CACHE-06 | On cache miss, Apify result is stored in nearby_places_cache before returning | supabase_service pattern shows how to insert; need new method in SupabaseService |
</phase_requirements>

---

## UserPreferences & dynamic_fields Structure

### Where it lives

`UserPreferences` is defined in `backend/app/models/preferences.py` (line 91). The `dynamic_fields` attribute is at line 135:

```python
dynamic_fields: list[DynamicField] = Field(default_factory=list)
```

### DynamicField schema

`DynamicField` (preferences.py, line 66) has three fields:

| Field | Type | Notes |
|-------|------|-------|
| `name` | `str` | The label the user typed (e.g. "near primary school", "Fitnessstudio") |
| `value` | `str` | Optional value text (defaults to `""`) |
| `importance` | `ImportanceLevel` | `critical` / `high` / `medium` / `low` |

Both `name` and `value` are free-text strings typed by the user. Proximity requirements live here — there is no dedicated `proximity_requirements` field. A field like `{"name": "near primary school", "value": "500m", "importance": "high"}` is a proximity requirement; `{"name": "balcony", "value": "", "importance": "medium"}` is not.

### How proximity is currently detected

`claude.py` (lines 36-85) already contains the detection logic used to decide whether to offer Claude the places tool:

```python
_AMENITY_KEYWORDS = re.compile(
    r"(?i)\b("
    r"school|schule|gym|fitnessstudio|fitness|supermarket|supermarkt|einkauf"
    r"|transport|öv|tram|bus|train|zug|bahn|bahnhof|station|haltestelle"
    r"|park|grünfläche|spielplatz|playground"
    r"|hospital|spital|krankenhaus|arzt|doctor|apotheke|pharmacy"
    r"|restaurant|café|cafe|bar|bakery|bäckerei"
    r"|kindergarten|kita|daycare|nursery|krippe"
    r"|university|universität|uni|library|bibliothek"
    r"|shop|laden|geschäft|mall|einkaufszentrum"
    r"|swimming|schwimmbad|pool|lake|see"
    r"|near|nearby|nähe|nah|walking|gehweite|fussdistanz|erreichbar"
    r"|close\s+to|in\s+der\s+nähe"
    r")\b"
)
```

`_has_location_criteria(preferences)` (line 77) iterates over `dynamic_fields`, concatenates `field.name + " " + field.value`, and returns `True` if the regex matches.

### What Phase 23 needs to do differently

Phase 22's approach: binary check (is there ANY proximity criteria?), then Claude decides what to search.

Phase 23's approach: deterministic extraction BEFORE calling Claude. For each matching dynamic_field, produce a structured `ProximityRequirement` with:
- `query`: derived from `field.name` (and optionally `field.value`) — the search string to pass to Apify
- `radius_km`: parsed from `field.value` if it contains a distance (e.g. "500m" → 0.5, "2km" → 2.0); default to 1.0 if absent
- `importance`: `field.importance` (already an `ImportanceLevel` enum)

### radius_km parsing from value text

Common user patterns: "500m", "1km", "2 km", "walking distance". Parsing strategy:
- Match `(\d+(?:\.\d+)?)\s*(m|km)` case-insensitively
- If unit is `m`: divide by 1000
- If unit is `km`: use as-is
- If no match: default to `1.0`
- Cap at `5.0` (matches the existing cap in `_execute_tool`)

---

## Apify Client Architecture

### Current Apify integration

Two Apify actors are already integrated, both in `backend/app/services/`:

| File | Actor | Function | Purpose |
|------|-------|----------|---------|
| `apify.py` | `gusevm1~homematch-geocoder` | `geocode_location()` | Geocode a text query to lat/lon |
| `places.py` | `compass~crawler-google-places` | `search_nearby_places()` | Find nearby POIs by lat/lon + query |

### HTTP call pattern

Both use the same Apify REST API pattern (`apify.py` line 33, `places.py` line 40):

```
POST https://api.apify.com/v2/acts/{actor_name}/run-sync-get-dataset-items?token={APIFY_TOKEN}
Content-Type: application/json
Body: { ...actor-specific input... }
```

`run-sync-get-dataset-items` blocks until the actor finishes and returns the dataset as a JSON array. This is the correct approach for synchronous use in the scoring pipeline.

### Google Places actor: `compass~crawler-google-places`

**Actor ID:** `compass~crawler-google-places`

**Current payload** (`places.py` lines 42-50):

```python
payload = {
    "searchStringsArray": [query],
    "customGeolocation": {
        "type": "Point",
        "coordinates": [longitude, latitude],  # GeoJSON order: lon first
        "radiusKm": radius_km,
    },
    "maxCrawledPlacesPerSearch": max_results,
}
```

**Current response fields extracted** (`places.py` lines 62-70):

```python
{
    "title": item.get("title", ""),
    "address": item.get("address", ""),
    "rating": item.get("totalScore"),
    "reviews": item.get("reviewsCount"),
    "category": item.get("categoryName", ""),
}
```

**Missing for APIFY-02:** `distance` from the listing. The actor does return a `location` object with `lat`/`lng` coordinates per result. Distance must be computed client-side using the Haversine formula (lat/lon of listing vs. lat/lon of result). This is NOT returned by the actor directly.

**Apify token:** `APIFY_TOKEN` env var (already consumed in both services). No changes needed.

**Timeout:** `places.py` uses `httpx.AsyncClient(timeout=90)` — 90 seconds. Appropriate for Apify sync runs.

**Failure handling:** `places.py` line 73-74 wraps everything in `except Exception` and returns `[]`. APIFY-03 is already satisfied by the existing implementation.

---

## ClaudeScorer Tool Architecture

### search_nearby_places: current role

`ClaudeScorer.score_listing()` (`claude.py` lines 125-240) runs an agentic loop where Claude can optionally call `search_nearby_places`. This is an AI-driven, non-deterministic approach: Claude decides what to search, when to search, and interprets results itself.

**Phase 23 makes this deterministic.** The plan is to:
1. Extract proximity requirements BEFORE calling Claude
2. Call Apify (with caching) for each requirement
3. Inject the results into Claude's context as pre-fetched data, rather than offering the tool

### PLACES_TOOL definition

`claude.py` lines 52-74:

```python
PLACES_TOOL = {
    "name": "search_nearby_places",
    "description": "...",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", ...},
            "radius_km": {"type": "number", "default": 1.0},
        },
        "required": ["query"],
    },
}
```

### Agentic loop

Lines 166-232: The loop runs up to `MAX_LOOP_ITERATIONS = 3` times. On the first iteration, if `use_tool` is True, the tool is offered. If Claude calls it, the result is appended to messages and `use_tool` is set to `False` (preventing further tool calls). Claude then responds with a final JSON output.

### How Phase 23 changes the tool call

**Option A (recommended):** Pre-fetch all proximity data deterministically. Pass results as a formatted text block injected into the user prompt (alongside the listing description). This removes the non-determinism entirely. The PLACES_TOOL is no longer offered, or the pre-fetched data supplements/replaces the tool call.

**Option B:** Keep the agentic loop, but populate the cache so that when Claude calls `search_nearby_places`, the tool result is served from cache rather than Apify.

**Recommendation:** Option A. It satisfies all requirements, avoids Claude making multiple costly API calls, and is far more predictable for scoring. The pre-fetched data can be injected via a modified `build_user_prompt()` call or a new parameter on `score_listing()`.

### Insertion point in scoring.py

The current pipeline (after Phase 22):

```
0. Cache check
1. Fetch listing
1a. Resolve coordinates (geocoding)
2. Parse preferences
3. Fetch page data (images + prices)
4. Price override
5. Score with Claude
6. Save analysis to Supabase
7. Return result
```

**Phase 23 insertion: between step 1a and step 5**, after coordinates are confirmed:

```
1b. Extract proximity requirements from dynamic_fields
1c. If proximity requirements exist and listing has coords:
      For each requirement:
        - Check nearby_places_cache
        - If miss: call Apify, write to cache
        - Collect results
1d. Pass pre-fetched proximity data to claude_scorer.score_listing()
```

In `scoring.py`, this is after line 87 (end of geocoding block) and before line 117 (`claude_scorer.score_listing()`).

---

## Supabase Client in Backend

### Client pattern

`SupabaseService` in `backend/app/services/supabase.py` is a synchronous client (supabase-py is sync). In FastAPI async endpoints, all calls are wrapped with `asyncio.to_thread()`.

Pattern used throughout `scoring.py`:

```python
await asyncio.to_thread(
    supabase_service.some_method,
    arg1, arg2, ...
)
```

### existing methods

| Method | Table | Operation |
|--------|-------|-----------|
| `get_analysis(user_id, profile_id, listing_id)` | `analyses` | SELECT with `.maybeSingle()` |
| `save_analysis(user_id, profile_id, listing_id, score_data)` | `analyses` | UPSERT |

### New methods needed for Phase 23

Two new methods on `SupabaseService`:

**`get_nearby_places_cache(lat, lon, query, radius_km)`:**
```python
# Query pattern (follows get_analysis)
result = (
    client.table("nearby_places_cache")
    .select("response_json")
    .eq("lat", lat)
    .eq("lon", lon)
    .eq("query", query)
    .eq("radius_km", radius_km)
    .gte("created_at", "now() - interval '30 days'")  # TTL filter
    .maybeSingle()
    .execute()
)
return result.data["response_json"] if result.data else None
```

**`save_nearby_places_cache(lat, lon, query, radius_km, results)`:**
```python
client.table("nearby_places_cache").insert({
    "lat": lat,
    "lon": lon,
    "query": query,
    "radius_km": radius_km,
    "response_json": results,  # list[dict] — supabase-py accepts this as JSONB
}).execute()
```

Note: `insert` not `upsert` because the cache can have multiple entries for the same key (only the freshest is read due to the TTL filter). Alternatively, use upsert with an explicit unique constraint — but that requires a migration change. Simple insert is fine for Phase 23.

### nearby_places_cache table (confirmed from migration 004)

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

Table exists in production (migration 004 was created in Phase 22). No additional migration needed.

---

## Recommended Approach

### New module: `backend/app/services/proximity.py`

All new logic should live here, keeping `scoring.py` clean and `claude.py` unchanged for now.

**Functions to add:**

```python
# 1. Structured type for an extracted requirement
class ProximityRequirement(BaseModel):
    query: str
    radius_km: float  # default 1.0, max 5.0
    importance: ImportanceLevel

# 2. Extract from dynamic_fields
def extract_proximity_requirements(
    preferences: UserPreferences,
) -> list[ProximityRequirement]:
    """Filter dynamic_fields to those matching _AMENITY_KEYWORDS.
    Parse radius_km from field.value. Return [] if none match (PROX-03)."""
    ...

# 3. Fetch with cache
async def fetch_nearby_places(
    lat: float,
    lon: float,
    requirement: ProximityRequirement,
) -> list[dict]:
    """CACHE-05: check cache first. CACHE-06: write on miss. APIFY-03: return [] on failure."""
    ...
```

### Modifications needed

**`backend/app/services/places.py`:**
- Add `location` dict to response mapping so distance can be computed
- Current response is missing `location.lat`/`location.lng` from actor output
- After adding location, compute Haversine distance in `fetch_nearby_places` (or expose raw lat/lon and compute in proximity.py)

**`backend/app/services/supabase.py`:**
- Add `get_nearby_places_cache(lat, lon, query, radius_km) -> list[dict] | None`
- Add `save_nearby_places_cache(lat, lon, query, radius_km, results: list[dict]) -> None`

**`backend/app/routers/scoring.py`:**
- After step 1a (geocoding), add step 1b: extract proximity requirements
- After step 1b, add step 1c: fetch nearby places (calls proximity.py)
- Pass `nearby_data` dict to `claude_scorer.score_listing()` or inject into prompt

**`backend/app/services/claude.py` (or `backend/app/prompts/scoring.py`):**
- Accept pre-fetched proximity data as parameter
- If data provided, inject as formatted text block into the user prompt instead of offering the tool
- OR: keep tool offering but have `_execute_tool` check the pre-fetched data first

### Prompt injection pattern (preferred)

The prompt builder is in `backend/app/prompts/scoring.py`. `build_user_prompt(listing, preferences)` is called at `claude.py` line 151. Adding an optional `nearby_data: dict[str, list[dict]] | None = None` parameter to `build_user_prompt()` allows the pre-fetched results to be appended to the prompt text without changing the tool infrastructure.

### Distance calculation (Haversine)

No library needed — formula is 10 lines of Python. Or use `math` stdlib:

```python
import math

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))
```

The actor returns `location` with `lat` and `lng` keys. This field must be extracted in `places.py`.

---

## Key Files

| File | Relevance | Key Lines |
|------|-----------|-----------|
| `backend/app/models/preferences.py` | `UserPreferences`, `DynamicField`, `ImportanceLevel` | Lines 37-135 |
| `backend/app/services/claude.py` | `_AMENITY_KEYWORDS`, `_has_location_criteria`, `ClaudeScorer.score_listing`, `_execute_tool` | Lines 36-102, 125-240 |
| `backend/app/services/places.py` | Google Places Apify actor call — current response shape | Lines 15-75 |
| `backend/app/services/apify.py` | Apify HTTP call pattern, `geocode_listing` | Lines 16-49, 83-109 |
| `backend/app/services/supabase.py` | `SupabaseService` — where new cache methods go | Lines 15-92 |
| `backend/app/routers/scoring.py` | Pipeline insertion point (after line 87, before line 117) | Lines 64-120 |
| `backend/app/prompts/scoring.py` | `build_user_prompt` — where proximity data can be injected | (inspect before modifying) |
| `supabase/migrations/004_add_nearby_places_cache.sql` | Confirmed table schema and index | Lines 1-17 |

---

## Risks & Pitfalls

### 1. Distance field is missing from current places.py response

APIFY-02 requires distance from listing per result. `places.py` currently does NOT include `location` data in the extracted fields. The actor DOES return `location.lat` and `location.lng`. These fields must be added to the extraction in `places.py`, and Haversine distance computed in the proximity service. If this is skipped, APIFY-02 fails silently.

### 2. Exact float matching for cache lookup

The cache key uses `(lat, lon, query, radius_km)` with exact equality. `lat` and `lon` come from the Flatfox API (or from geocoding). For a given listing, these values are stable (same API source each time). Float equality is safe here as long as both the cache write and cache read use values from the same source without transformation. Do NOT round coordinates before caching.

### 3. supabase-py is synchronous — must use asyncio.to_thread

All `SupabaseService` method calls must be wrapped in `asyncio.to_thread()` in async context (scoring router). Failing to do this will block the FastAPI event loop. The existing `get_analysis` and `save_analysis` calls in `scoring.py` already demonstrate the correct pattern.

### 4. Apify actor timeout under load

`search_nearby_places` uses a 90-second timeout per call. If a user has 5 proximity requirements and each takes 30 seconds, the scoring endpoint will take 150+ seconds. Consider calling multiple requirements concurrently with `asyncio.gather()` rather than sequentially.

### 5. PROX-03 gate must be checked before any Apify calls

If `extract_proximity_requirements()` returns an empty list, the code must skip ALL Apify calls. This gate must also short-circuit if `listing.latitude is None or listing.longitude is None` (coordinates unavailable). Without this gate, Apify is called unnecessarily, burning credits.

### 6. radius_km parsing from free-text value

User input is unpredictable. "500m", "500 m", "0.5km", "walking distance", "nearby" all need handling. The parser must default gracefully to `1.0` for any text it cannot parse. Test with edge cases: empty string, purely textual descriptions, very large values.

### 7. _AMENITY_KEYWORDS reuse vs. duplication

`_AMENITY_KEYWORDS` is currently defined in `claude.py` as a module-level private variable. The new `proximity.py` will need the same logic. Two options:
- Move `_AMENITY_KEYWORDS` and `_has_location_criteria` to `proximity.py` and import into `claude.py`
- Duplicate the regex in `proximity.py`

Moving is cleaner but changes `claude.py`. Duplication avoids touching `claude.py` but creates drift. The planner should decide; moving is recommended.

### 8. Cache TTL filter with Supabase raw SQL in filter

The `.gte("created_at", "now() - interval '30 days'")` pattern may not work as a literal string in supabase-py — it may be treated as a string comparison, not a SQL expression. The correct approach is to compute the threshold in Python:

```python
from datetime import datetime, timezone, timedelta
threshold = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
client.table("nearby_places_cache").select("response_json").eq(...).gte("created_at", threshold)
```

This is the safe pattern that supabase-py handles correctly.

---

## Sources

All findings from direct codebase inspection (HIGH confidence):

- `backend/app/models/preferences.py` — UserPreferences, DynamicField schema
- `backend/app/services/claude.py` — _AMENITY_KEYWORDS, _has_location_criteria, ClaudeScorer, PLACES_TOOL
- `backend/app/services/places.py` — Google Places Apify actor, response shape, failure handling
- `backend/app/services/apify.py` — Apify HTTP call pattern confirmed
- `backend/app/services/supabase.py` — SupabaseService client pattern, existing method signatures
- `backend/app/routers/scoring.py` — Full pipeline, insertion point confirmed (lines 87-117)
- `supabase/migrations/004_add_nearby_places_cache.sql` — Table schema confirmed
- `.planning/phases/22-database-coordinate-resolution/22-RESEARCH.md` — Phase 22 context and confirmed deliverables

No external sources required — all research is from codebase inspection.
