---
phase: 23-proximity-extraction-apify-integration
verified: 2026-03-27T23:27:55Z
status: passed
score: 5/5 must-haves verified
---

# Phase 23: Proximity Extraction & Apify Integration — Verification Report

**Phase Goal:** System identifies what places the user cares about, fetches verified nearby data from Google Places via Apify, and caches results to avoid duplicate API calls.
**Verified:** 2026-03-27T23:27:55Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | System extracts place-based requirements (query, radius_km, importance) from user preferences dynamic_fields | VERIFIED | `proximity.py:62-85` — `extract_proximity_requirements` iterates `dynamic_fields`, regex-matches against `_AMENITY_KEYWORDS`, produces `ProximityRequirement(query, radius_km, importance)` |
| 2 | When no proximity requirements exist, Apify is never called and scoring proceeds normally | VERIFIED | `proximity.py:185-188` — `fetch_all_proximity_data` returns `{}` immediately when `requirements` is empty; scoring router (`scoring.py:93-112`) wraps the call and passes `nearby_data={}` forward |
| 3 | For each proximity requirement, Apify returns nearby places with name, distance, rating, review count, and address | VERIFIED | `places.py:76-87` returns `{title, address, rating, reviews, location}`; `proximity.py:145-153` maps to `{name, address, rating, review_count, distance_km}` with Haversine distance computed from `location.lat/lng` |
| 4 | Apify results are cached by (lat, lon, query, radius_km) — duplicate requests return cached data without API call | VERIFIED | `supabase.py:90-121` — `get_nearby_places_cache` queries on all four columns with 7-day TTL; `save_nearby_places_cache` inserts all four as key columns; `proximity.py:103-121` checks cache before calling Apify |
| 5 | On Apify failure, system treats result as empty and scoring continues without crashing | VERIFIED | `places.py:88-90` — bare `except Exception` catches all failures and returns `[]`; `scoring.py:108-112` — additional outer try/except logs and continues without raising |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/services/proximity.py` | Proximity extraction + Apify fetch-with-cache pipeline | VERIFIED | 195 lines; `extract_proximity_requirements`, `fetch_nearby_places`, `fetch_all_proximity_data` all substantive |
| `backend/app/services/places.py` | Apify Google Places actor client | VERIFIED | 91 lines; full HTTP client with payload, error handling, result mapping |
| `backend/app/services/supabase.py` | Cache read/write methods | VERIFIED | `get_nearby_places_cache` (lines 90-121) and `save_nearby_places_cache` (lines 123-152) substantive |
| `backend/app/routers/scoring.py` | Proximity integration wired into scoring pipeline | VERIFIED | Lines 93-112 call `fetch_all_proximity_data`; result injected into `score_data` at line 159 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scoring.py` | `proximity.py:fetch_all_proximity_data` | import + call at line 98 | WIRED | Import at line 24; called conditionally on coordinates present |
| `proximity.py` | `places.py:search_nearby_places` | import + call at line 124 | WIRED | Import at line 23; called after cache miss |
| `proximity.py` | `supabase.py:get_nearby_places_cache` | asyncio.to_thread at line 104 | WIRED | Cache checked before Apify call |
| `proximity.py` | `supabase.py:save_nearby_places_cache` | asyncio.to_thread at line 157 | WIRED | Cache written after Apify results processed |
| `proximity.py` | `places.py:haversine_km` | import + call at line 142 | WIRED | Import at line 23; called per result to compute distance_km |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| PROX-01 | Extract proximity requirements from dynamic_fields | SATISFIED | `proximity.py:62-85` — `extract_proximity_requirements` |
| PROX-02 | ProximityRequirement has query, radius_km, importance | SATISFIED | `proximity.py:38-43` — `ProximityRequirement` Pydantic model |
| PROX-03 | When no requirements, skip all Apify calls | SATISFIED | `proximity.py:185-188` — early return `{}` |
| APIFY-01 | Call Apify Google Places actor for each requirement | SATISFIED | `places.py:29-90` — `search_nearby_places` posts to `compass~crawler-google-places` |
| APIFY-02 | Compute Haversine distance for each result | SATISFIED | `proximity.py:136-144` — distance computed from `location.lat/lng` |
| APIFY-03 | On failure, return empty list and continue | SATISFIED | `places.py:88-90` — `except Exception: return []` |
| CACHE-05 | Check nearby_places_cache before calling Apify | SATISFIED | `proximity.py:103-121` — cache check first; hit returns immediately |
| CACHE-06 | Write Apify results to cache after fetch | SATISFIED | `proximity.py:155-166` — fire-and-forget cache write |

### Anti-Patterns Found

No blocker or warning anti-patterns found.

Notes:
- `save_nearby_places_cache` uses insert (not upsert) intentionally — multiple entries per key are allowed; `get_nearby_places_cache` reads only the most recent within TTL. This is a deliberate design choice documented in the code comment.
- Cache write failure is swallowed with a warning log (line 165-166 of `proximity.py`) — this is correct behavior per APIFY-03/CACHE-06 (fire-and-forget, never fail scoring).
- `distance_km` is `None` when `location` is absent in the Apify response — this is handled gracefully with an `if isinstance(location, dict)` guard.

### Human Verification Required

None — all success criteria are verifiable from static code analysis.

### Gaps Summary

No gaps. All five success criteria are fully implemented and wired end-to-end:

1. `extract_proximity_requirements` in `proximity.py` correctly filters `dynamic_fields` using the shared `_AMENITY_KEYWORDS` regex from `claude.py`, producing typed `ProximityRequirement` objects.
2. The early-return guard in `fetch_all_proximity_data` ensures Apify is never called when no amenity fields exist.
3. `places.py` maps Apify response fields to the expected schema, and `proximity.py` adds Haversine distance.
4. The (lat, lon, query, radius_km) cache key is consistent between read and write paths in `supabase.py`.
5. Exception handling exists at both the Apify layer (`places.py`) and the scoring router (`scoring.py`), ensuring no crash path.

---

_Verified: 2026-03-27T23:27:55Z_
_Verifier: Claude (gsd-verifier)_
