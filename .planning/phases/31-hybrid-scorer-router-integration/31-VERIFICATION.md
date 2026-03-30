---
phase: 31-hybrid-scorer-router-integration
verified: 2026-03-30T17:35:00Z
status: passed
score: 17/17 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Score a real listing end-to-end via the extension"
    expected: "Badge appears with a numeric score, match_tier badge color, and per-criterion breakdown visible in popup"
    why_human: "Requires live Supabase + EC2 backend + Chrome extension; cannot verify network round-trip programmatically"
  - test: "Trigger the 'unavailable' path by scoring a listing with no ListingProfile in DB"
    expected: "Extension shows a graceful 'not available yet' message instead of an error or empty badge"
    why_human: "Requires a production listing ID that has no pre-computed profile; depends on real DB state"
---

# Phase 31: Hybrid Scorer Router Integration Verification Report

**Phase Goal:** The scoring router orchestrates the full pipeline: looks up pre-computed ListingProfile data, adapts it for the deterministic scorer, routes subjective criteria to OpenRouter, aggregates fulfillment into a weighted score, and returns a v2 response -- with graceful degradation when no enrichment data exists.
**Verified:** 2026-03-30T17:35:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CriterionResult model exists with criterion_name, fulfillment, importance, weight, reasoning fields | VERIFIED | `scoring.py` lines 41-55; Python import + instantiation confirmed |
| 2 | ScoreResponse v2 includes schema_version=2, criteria_results list, enrichment_status field, and preserves overall_score/match_tier/summary_bullets names | VERIFIED | `scoring.py` lines 58-88; runtime check confirmed all 6 fields present |
| 3 | profile_adapter converts ListingProfile to FlatfoxListing with correct type coercions (attributes list[str]->list[FlatfoxAttribute], rooms float->str) | VERIFIED | `profile_adapter.py` lines 39-77; assert checks for pk, number_of_rooms='3.5', attributes[0].name passed |
| 4 | profile_adapter converts ListingProfile amenities to proximity_data dict format | VERIFIED | `profile_adapter.py` lines 80-113; distance_km and is_fallback=False confirmed |
| 5 | Weighted aggregation computes (sum weight*fulfillment)/(sum weights)*100 using IMPORTANCE_WEIGHT_MAP | VERIFIED | `hybrid_scorer.py` lines 46-56; score=80 for HIGH=1.0 + MEDIUM=0.5 confirmed |
| 6 | None fulfillment values are excluded from both numerator and denominator | VERIFIED | `hybrid_scorer.py` line 35; score unchanged when None criterion added |
| 7 | CRITICAL importance with fulfillment=0 forces match_tier=poor and caps score at 39 | VERIFIED | `hybrid_scorer.py` lines 41-61; score=17 (capped), tier='poor' confirmed |
| 8 | Scoring router looks up ListingProfile from Supabase and adapts it to FlatfoxListing for deterministic scoring | VERIFIED | `scoring.py` lines 127, 192-193; get_listing_profile + adapt_profile_to_listing both imported and called |
| 9 | Deterministic scorer runs on all non-subjective criteria using adapted listing + proximity data | VERIFIED | `scoring.py` lines 199-234; synthesize_builtin_results + 5-way criterion_type routing present |
| 10 | Subjective scorer runs on subjective criteria via OpenRouter, returning FulfillmentResults + summary_bullets | VERIFIED | `scoring.py` lines 237-238; claude_scorer.score_listing called with listing + proximity_data |
| 11 | When ALLOW_CLAUDE_FALLBACK=false and no ListingProfile exists, endpoint returns enrichment_status=unavailable without calling any LLM | VERIFIED | `scoring.py` lines 152-173; returns immediately with enrichment_status='unavailable', no save, no LLM call |
| 12 | OpenRouter model constant updated to google/gemini-2.5-flash-lite | VERIFIED | `openrouter.py` line 30; runtime assertion passed |
| 13 | Saved analysis includes schema_version=2 and fulfillment_data in the record | VERIFIED | `scoring.py` lines 447-450; score_data["fulfillment_data"] populated from criteria_results before save |
| 14 | Backend get_analysis rejects cached entries with schema_version < 2 or missing schema_version | VERIFIED | `supabase.py` line 62; `breakdown.get("schema_version", 0) >= 2` check confirmed |
| 15 | Edge function score-proxy rejects cached entries with schema_version < 2 or missing schema_version | VERIFIED | `index.ts` lines 104-115; `cached.breakdown?.schema_version ?? 0 >= 2` check confirmed |
| 16 | Valid v2 cached entries (schema_version >= 2) are still returned normally | VERIFIED | `index.ts` lines 106-114; if-branch returns 200 with cache hit header |
| 17 | Edge function is deployed to Supabase | VERIFIED | `npx supabase functions list` shows score-proxy ACTIVE version 6, updated 2026-03-30 15:21 |

**Score:** 17/17 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/models/scoring.py` | CriterionResult + ScoreResponse v2 with schema_version, criteria_results, enrichment_status | VERIFIED | All 5 CriterionResult fields present; ScoreResponse has 3 v2 additions + preserved field names |
| `backend/app/services/profile_adapter.py` | adapt_profile_to_listing + adapt_profile_amenities with type coercions | VERIFIED | 114 lines; both exports present; list[str]->list[FlatfoxAttribute] + float->str coercions implemented |
| `backend/app/services/hybrid_scorer.py` | compute_weighted_score + to_criterion_result with HA-01/HA-02/HA-03 | VERIFIED | 92 lines; both exports present; all 3 HA requirements runtime-verified |
| `backend/app/routers/scoring.py` | Full hybrid pipeline orchestration with ALLOW_CLAUDE_FALLBACK gating | VERIFIED | 467 lines; _score_with_profile, _fallback_claude_pipeline, _resolve_distance_km, _save_analysis_fire_and_forget all present |
| `backend/app/services/openrouter.py` | OPENROUTER_MODEL = "google/gemini-2.5-flash-lite" | VERIFIED | Line 30 confirmed |
| `backend/app/services/supabase.py` | get_analysis with schema_version >= 2 check | VERIFIED | Line 62; breakdown.get("schema_version", 0) >= 2 |
| `supabase/functions/score-proxy/index.ts` | Cache check with schema_version >= 2 filter | VERIFIED | Lines 104-115; nullish coalescing ?? 0 fallback present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `profile_adapter.py` | `listing_profile.py` | imports ListingProfile, AmenityCategory | WIRED | Line 21: `from app.models.listing_profile import AmenityCategory, ListingProfile` |
| `hybrid_scorer.py` | `preferences.py` | imports IMPORTANCE_WEIGHT_MAP, ImportanceLevel | WIRED | Line 14: `from app.models.preferences import IMPORTANCE_WEIGHT_MAP, ImportanceLevel` |
| `scoring.py` (router) | `profile_adapter.py` | imports adapt_profile_to_listing, adapt_profile_amenities | WIRED | Line 42; both functions called in _score_with_profile |
| `scoring.py` (router) | `hybrid_scorer.py` | imports compute_weighted_score, to_criterion_result | WIRED | Line 40; both functions called in _score_with_profile |
| `scoring.py` (router) | `listing_profile_db.py` | imports get_listing_profile | WIRED | Line 41; called via asyncio.to_thread on line 127 |
| `scoring.py` (router) | `deterministic_scorer.py` | imports score functions + synthesize_builtin_results | WIRED | Lines 31-39; all 5 scoring functions + synthesize_builtin_results imported and called |
| `supabase.py` | analyses table breakdown JSONB | checks breakdown.schema_version >= 2 | WIRED | Line 62: breakdown.get("schema_version", 0) >= 2 |
| `index.ts` | analyses table breakdown JSONB | checks cached.breakdown?.schema_version >= 2 | WIRED | Lines 105-106: schemaVersion = cached.breakdown?.schema_version ?? 0; if (schemaVersion >= 2) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HA-01 | 31-01 | Weighted average score = (sum weight*fulfillment / sum weights) * 100 | SATISFIED | hybrid_scorer.py lines 46-56; runtime test: score=80 for HIGH=1.0 + MEDIUM=0.5 |
| HA-02 | 31-01 | None fulfillment excluded from numerator and denominator | SATISFIED | hybrid_scorer.py line 35; runtime test: score unchanged when None criterion added |
| HA-03 | 31-01 | CRITICAL criterion with fulfillment=0 forces poor tier, caps at 39 | SATISFIED | hybrid_scorer.py lines 41-61; runtime test: score=17 (cap confirmed), tier='poor' |
| HA-04 | 31-01 | ScoreResponse v2: overall_score/match_tier/summary_bullets names preserved; criteria_results + schema_version added | SATISFIED | scoring.py lines 68-88; all preserved names + v2 additions confirmed |
| INT-03 | 31-01, 31-02 | Router performs ListingProfile lookup; adapter converts to FlatfoxListing for deterministic scorer | SATISFIED | scoring.py line 127 (get_listing_profile) + lines 192-193 (adapt calls); profile_adapter.py verified |
| INT-04 | 31-02 | ALLOW_CLAUDE_FALLBACK=false + no ListingProfile -> enrichment_status="unavailable" without LLM call | SATISFIED | scoring.py lines 152-173; direct return without LLM call, no save |
| INT-05 | 31-02 | OPENROUTER_MODEL updated from gemini-2.0-flash-001 to gemini-2.5-flash-lite | SATISFIED | openrouter.py line 30; runtime assertion confirmed |
| DB-02 | 31-03 | Cache read checks schema_version; entries with schema_version < 2 trigger re-score | SATISFIED | supabase.py line 62 (backend) + index.ts lines 104-115 (edge function); both layers confirmed |

No orphaned requirements -- all 8 IDs from REQUIREMENTS.md for Phase 31 are accounted for across the three plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/services/profile_adapter.py` | 97 | `return {}` | Info | Legitimate early-return guard: "Return empty dict if profile.amenities is empty" -- correct behavior |
| `app/services/openrouter.py` | 254 | `return []` | Info | Legitimate early-return guard: "if not gaps: return []" -- correct behavior |

No blockers. Both flagged patterns are valid guard clauses, not stub implementations.

---

### Human Verification Required

#### 1. End-to-end scoring via extension (happy path)

**Test:** Install extension, score a Zürich listing that has a pre-computed ListingProfile in the DB (any of the ~164 profiles)
**Expected:** Badge shows numeric score + tier color; popup shows per-criterion breakdown (criteria_results) and enrichment_status="available"
**Why human:** Requires live Chrome extension + Supabase auth + EC2 backend; network round-trip cannot be verified programmatically

#### 2. Graceful degradation (unavailable path)

**Test:** Score a listing that has no ListingProfile (outside Zürich coverage area) with ALLOW_CLAUDE_FALLBACK=false on EC2
**Expected:** Extension displays a readable "not yet available" message; no error thrown; no LLM cost incurred
**Why human:** Requires a production listing ID not in the listing_profiles table; depends on live DB state

---

### Gaps Summary

No gaps. All 17 must-haves verified across Plans 01, 02, and 03. The phase goal is achieved:

- The scoring router (`scoring.py`) orchestrates the full pipeline: cache check -> ListingProfile lookup -> adapt (via `profile_adapter.py`) -> deterministic scoring (5 criterion types) + subjective scoring (OpenRouter) -> weighted aggregation (via `hybrid_scorer.py`) -> ScoreResponse v2 with schema_version=2 and enrichment_status="available"
- CRITICAL override (HA-03) and None exclusion (HA-02) are implemented and runtime-verified
- Graceful degradation returns enrichment_status="unavailable" immediately when no profile exists and ALLOW_CLAUDE_FALLBACK=false
- Both cache layers (backend Python + Supabase edge function) reject stale v1 entries (schema_version < 2) as required by DB-02
- Edge function is deployed and active (version 6, updated 2026-03-30)
- All 8 requirement IDs (HA-01 through HA-04, INT-03 through INT-05, DB-02) are satisfied

---

_Verified: 2026-03-30T17:35:00Z_
_Verifier: Claude (gsd-verifier)_
