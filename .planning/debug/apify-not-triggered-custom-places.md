---
status: investigating
trigger: "apify-not-triggered-for-custom-place-criteria"
created: 2026-04-01T00:00:00Z
updated: 2026-04-01T10:00:00Z
---

## Current Focus

hypothesis: CONFIRMED (regression) -- Apify account exhausted credits. Every call to compass~crawler-google-places returns HTTP 402 Payment Required. The code fix from the previous session is intact and correct. The regression is NOT from a code change -- it is from the Apify account running out of compute units after the fix was verified.
test: Checked EC2 backend logs (/tmp/backend.log)
expecting: If 402 appears in logs for every Apify batch call, hypothesis is confirmed
next_action: User must top up Apify credits at console.apify.com. No code change needed.

## REGRESSION INVESTIGATION

hypothesis: CONFIRMED -- Three root causes identified and fixed (prior session):
  1. Profile adapter mapped profile.address to listing.street but NOT listing.public_address. geocode_listing constructed redundant queries like "Brauerstrasse 29, 8004 Zurich, 8004 Zurich, Switzerland" which fail in Nominatim.
  2. geocode_listing returned dicts with lat=None/lon=None (key check passed, value check missing), causing TypeError in caller, silently skipping Apify.
  3. top-matches Phase B ran 5 concurrent Apify calls, overwhelming rate limits. Some calls failed silently, leaving those listings without McDonald's/Starbucks data.
test: End-to-end top-matches scoring for profile 4fd96c9d with force_refresh=true
expecting: All 5 top matches should find McDonald's and Starbucks nearby
next_action: Await human verification that the fix works in their real workflow.

## Symptoms

expected: When a user specifies criteria like "McDonald's within 1km" or "Starbucks nearby" that are not found in listing text or pre-analyzed data, the Apify agent should be triggered to look up Google Places and return actual proximity data for those specific named places.
actual: The LLM scoring produces messages like "The listing does not mention any nearby McDonald's or Starbucks locations" and "There are no McDonald's or Starbucks locations found within the specified radii in the verified nearby places data" and "No McDonald's or Starbucks were found nearby, failing to meet these medium-importance criteria."
errors: No explicit error — just wrong analysis output. Also: _get_cached_top_matches crash in backend logs (AttributeError: 'NoneType' object has no attribute 'data' on line 686).
reproduction: Create scoring request with criteria containing named places like McDonald's or Starbucks. Run score generation. Observe the analysis messages.
started: Was working in old pipeline (ALLOW_CLAUDE_FALLBACK=true). Now broken with new pipeline (ALLOW_CLAUDE_FALLBACK=false).

## Eliminated

- hypothesis: _AMENITY_KEYWORDS regex in proximity.py missing keywords
  evidence: proximity.py is ONLY used in _fallback_claude_pipeline which is disabled (ALLOW_CLAUDE_FALLBACK=false). The happy path uses search_nearby_places_batch directly, bypassing keyword filtering entirely. The keyword fix in c9e07dc was correct but irrelevant for the new pipeline.
  timestamp: 2026-04-01

- hypothesis: On-demand Apify code not deployed
  evidence: EC2 at commit 3cc7216 (same as local), git status clean, scoring.py on EC2 has subjective_lookup_fields, all_apify_fields, and On-demand Apify log lines.
  timestamp: 2026-04-01

- hypothesis: APIFY_TOKEN not set
  evidence: Previously verified in prior debug session (token present in .env)
  timestamp: 2026-04-01

## Evidence

- timestamp: 2026-04-01
  checked: ALLOW_CLAUDE_FALLBACK env var on EC2
  found: ALLOW_CLAUDE_FALLBACK=false
  implication: The _fallback_claude_pipeline (which uses proximity.py keyword matching) is NEVER executed. Only _score_with_profile runs.

- timestamp: 2026-04-01
  checked: _score_with_profile on-demand Apify code path (scoring.py lines 253-366)
  found: Code correctly collects gap_fields (DISTANCE/PROXIMITY_QUALITY with no pre-analyzed data) and subjective_lookup_fields (SUBJECTIVE fields not in proximity_data). Both are sent to search_nearby_places_batch. Results are injected into proximity_data for the LLM.
  implication: The code structure is correct. If Apify returns results, they WILL reach the LLM.

- timestamp: 2026-04-01
  checked: STANDARD_AMENITIES in listing_analyzer.py
  found: Only generic categories (supermarket, public transport, school, gym, restaurant, park, hospital, pharmacy, kindergarten). No brand-specific entries (McDonald's, Starbucks).
  implication: Custom named-place criteria will never be in pre-analyzed data, so they MUST go through on-demand Apify.

- timestamp: 2026-04-01
  checked: Backend logs on EC2 (/tmp/backend.log)
  found: _get_cached_top_matches crash: AttributeError 'NoneType' object has no attribute 'data' at line 563/686. Server crashed with 500 on /score/top-matches.
  implication: If user is hitting top-matches endpoint, it crashes BEFORE on-demand Apify can run. This would explain why no Apify data reaches the LLM.

- timestamp: 2026-04-01
  checked: _get_cached_top_matches code (scoring.py line 669-698)
  found: Uses maybe_single().execute() which can return None, then checks `if not result or not result.data` — but if execute() returns None (not a response object), accessing .data crashes.
  implication: Secondary bug — the top-matches endpoint may be crashing, but the individual /score endpoint should still work.

- timestamp: 2026-04-01
  checked: listing_profiles table — latitude/longitude columns
  found: 185 out of 188 profiles have NULL lat/lon. Only 3 profiles have coordinates (listing_ids 33819, 51159, 65440 — all old IDs).
  implication: has_coords is False for 98% of profiles → on-demand Apify block is skipped entirely → no custom named-place criteria can be evaluated.

- timestamp: 2026-04-01
  checked: Profiles WITHOUT coordinates DO have amenities data (7 categories each with distances)
  found: Profile 85793237 has amenities like {park: Zurichhorn Park at 0.6 km} but lat=None, lon=None. Category names differ from current STANDARD_AMENITIES (dining vs restaurant, fitness vs gym).
  implication: Coordinates WERE available at analysis time (from Flatfox API), amenities were fetched, but profiles were saved with NULL coords. Likely the Flatfox API returned coords at analysis time, but those older profiles were created by a previous version of the code.

- timestamp: 2026-04-01
  checked: _fallback_claude_pipeline geocoding logic (scoring.py lines 421-441)
  found: The fallback pipeline has geocoding: if listing.latitude/longitude is None, it calls geocode_listing() to get coords from address. This is MISSING from _score_with_profile.
  implication: The happy path (_score_with_profile) has no geocoding fallback, so profiles without coords simply skip all proximity lookups.

- timestamp: 2026-04-01T06:00
  checked: Backend logs after geocoding fix deploy (860a9ff)
  found: /score/top-matches returning 200 but logs show server was restarted. Old instance had crashed at _get_cached_top_matches. New instance running fine.
  implication: The _get_cached_top_matches crash was from old code. Current code has the fix.

- timestamp: 2026-04-01T06:10
  checked: Cached top_matches_cache for profile 4fd96c9d (computed after geocoding fix)
  found: 1/5 listings had McDonald's/Starbucks data (listing 85914510, which already had coordinates). 4/5 showed "not found" in LLM reasoning.
  implication: Geocoding fix alone was insufficient. Even for listings that were successfully geocoded, Apify data wasn't reaching the LLM for most listings.

- timestamp: 2026-04-01T06:15
  checked: geocode_listing return value when Apify geocoder returns {"lat": None, "lon": None}
  found: The check `"lat" in result` passes even when value is None. float(None) raises TypeError caught by outer except, silently aborting Apify block.
  implication: Geocoding appeared to work (no error logged) but actually failed silently for some addresses.

- timestamp: 2026-04-01T06:20
  checked: Profile adapter public_address mapping
  found: profile.address was only mapped to listing.street, NOT listing.public_address. geocode_listing constructs "{street}, {zipcode} {city}" which doubles up the address.
  implication: Root cause of geocoding failures: redundant addresses like "Brauerstr 29, 8004 Zurich, 8004 Zurich, Switzerland" fail in both Apify geocoder and Nominatim.

- timestamp: 2026-04-01T06:30
  checked: Apify search_nearby_places_batch directly for specific listings
  found: McDonald's and Starbucks ARE returned when Apify is called directly for any of the 5 top-match locations. But during concurrent top-matches scoring, some calls fail silently.
  implication: Concurrency issue: 5 parallel Apify calls overwhelm rate limits. Semaphore needed.

- timestamp: 2026-04-01T06:50
  checked: End-to-end test after all three fixes (f6bce37, e68f8a3)
  found: ALL 5 top matches now find McDonald's (0.26-2.40 km) and Starbucks (0.17-4.98 km). Previously 4/5 showed "not found".
  implication: The three fixes together resolve the issue completely.

- timestamp: 2026-04-01T10:00
  checked: EC2 git state after regression reported
  found: EC2 is at commit 8cc83e5 (one commit AHEAD of e68f8a3, a guard for empty preferences). git status clean. Code is correct and current.
  implication: Regression is NOT from a code rollback or missing deploy.

- timestamp: 2026-04-01T10:00
  checked: EC2 backend logs (/tmp/backend.log) — all recent Apify calls
  found: 69 occurrences of "Apify batch places search failed: Client error '402 Payment Required'" for url compass~crawler-google-places. EVERY single Apify Places call is failing with 402. The search_nearby_places_batch function catches the exception and returns empty dicts for all queries, so the LLM receives no place data and reports "not found".
  implication: ROOT CAUSE of regression — Apify account has run out of compute credits. The 402 means "payment required / quota exceeded". The code is completely correct; it just has no credits to spend.

## Resolution

root_cause: Three compounding issues prevented on-demand Apify from working for custom place criteria:
  1. **Redundant geocoding query** (profile_adapter.py): profile.address was mapped to listing.street but NOT listing.public_address. geocode_listing built queries like "Brauerstrasse 29, 8004 Zurich, 8004 Zurich, Switzerland" (doubled address) which fail in both Apify geocoder and Nominatim.
  2. **Null-value geocoding pass-through** (apify.py): geocode_listing checked `"lat" in result` (key exists) but not `result.get("lat") is not None` (value non-null). When the geocoder returned {"lat": None, "lon": None}, the function returned it, causing float(None) TypeError in the caller, silently aborting the Apify block.
  3. **Concurrent Apify overload** (scoring.py): top-matches Phase B ran 5 concurrent _score_with_profile calls, each calling Apify geocoding + places search simultaneously. Apify's rate limits/timeouts caused 3 of 5 calls to fail silently. Added Semaphore(2) to limit concurrency.
  Additionally: **No geocoding fallback** -- when a specific street address failed geocoding (Nominatim data gaps), there was no fallback to try "zipcode city" which is more reliable.
fix: |
  1. Set listing.public_address in adapt_profile_to_listing (f6bce37) so geocode_listing uses the clean profile.address directly.
  2. Fixed geocode_listing null-value check: `result.get("lat") is not None` instead of `"lat" in result` (e68f8a3).
  3. Added geocoding fallback: if full address fails, retry with "{zipcode} {city}, Switzerland" (e68f8a3).
  4. Added asyncio.Semaphore(2) in top-matches Phase B to limit concurrent Apify calls (e68f8a3).
  5. Invalidated all top_matches_cache (marked stale) and deleted cached analyses for affected profiles.
verification: End-to-end verified on EC2: all 5 top matches for profile 4fd96c9d now find McDonald's (0.26-2.40 km) and Starbucks (0.17-4.98 km). Previously 4/5 listings showed "not found". Listing 1679697 (Sankt Jakobstrasse, address missing from Nominatim) now geocodes via zipcode fallback.
files_changed: [backend/app/services/profile_adapter.py, backend/app/routers/scoring.py, backend/app/services/apify.py]
