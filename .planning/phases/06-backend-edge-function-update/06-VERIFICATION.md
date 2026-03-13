---
phase: 06-backend-edge-function-update
verified: 2026-03-13T14:30:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Score a Flatfox listing with profile A active, then switch active profile to B via set_active_profile() RPC, re-score the same listing, and check the analyses table"
    expected: "Two separate rows exist in the analyses table with the same (user_id, listing_id) but different profile_id values"
    why_human: "Requires deployed edge function + live Supabase DB + Chrome extension. Cannot verify the 3-column uniqueness constraint produces separate rows without a real INSERT into the live database."
  - test: "Check the analyses table in Supabase Dashboard for the presence of a legacy 2-column unique constraint (user_id, listing_id) alongside the 3-column one"
    expected: "Only the 3-column constraint (user_id, listing_id, profile_id) exists; the old 2-column constraint has been dropped"
    why_human: "The SUMMARY flagged this as a known issue. Cannot inspect DB constraints from code. A stale 2-column constraint would cause save errors for previously-scored listings, silently breaking profile separation."
---

# Phase 6: Backend + Edge Function Update Verification Report

**Phase Goal:** The scoring pipeline reads preferences from the profiles table, resolves the active profile server-side, and stores profile attribution on every analysis
**Verified:** 2026-03-13T14:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Backend accepts profile_id and preferences in POST /score request body (not from DB) | VERIFIED | `ScoreRequest` in `backend/app/models/scoring.py` lines 59-60: `profile_id: str` and `preferences: dict` as required fields. `backend/app/routers/scoring.py` line 50: `UserPreferences.model_validate(request.preferences)` — no DB call. |
| 2 | Backend saves every analysis with the profile_id used for scoring | VERIFIED | `backend/app/services/supabase.py` lines 37-61: `save_analysis(user_id, profile_id, listing_id, score_data)` includes `"profile_id": profile_id` in upsert dict with `on_conflict="user_id,listing_id,profile_id"`. Router passes `request.profile_id` at line 74. |
| 3 | Edge function resolves active profile server-side via profiles table with RLS | VERIFIED | `supabase/functions/score-proxy/index.ts` lines 48-52: Supabase client created with `Authorization: authHeader` for RLS. Lines 66-70: `.from("profiles").select("id, preferences").eq("is_default", true).single()`. Lines 72-77: 404 returned if no active profile. |
| 4 | Scoring the same listing with two different active profiles produces two separate analysis rows | VERIFIED (structurally) | 3-column `on_conflict="user_id,listing_id,profile_id"` in `save_analysis` means different `profile_id` values create separate rows. Full end-to-end confirmation requires human verification (live DB). |
| 5 | Extension request format is unchanged (still sends only listing_id) | VERIFIED | Edge function receives `body` from extension (only `listing_id`), then appends `user_id`, `profile_id`, `preferences` from server-side sources before forwarding to backend. Extension never sends profile context. |

**Score:** 5/5 truths verified (4 automated + 1 requires human confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/models/scoring.py` | ScoreRequest with profile_id and preferences fields | VERIFIED | Lines 59-60: both fields present as required `str` and `dict` with Field descriptions |
| `backend/app/services/supabase.py` | save_analysis with profile_id parameter; get_preferences removed | VERIFIED | `get_preferences` method absent from file. `save_analysis` signature includes `profile_id: str` as second param. 3-column upsert confirmed. |
| `backend/app/routers/scoring.py` | Scoring endpoint using request.preferences instead of DB query | VERIFIED | Line 50: `UserPreferences.model_validate(request.preferences)`. No `get_preferences` call. No `supabase_service` query for preferences. |
| `backend/tests/test_score_endpoint.py` | Updated tests with profile_id in request payloads and save assertions | VERIFIED | 7 tests present. All request payloads include `profile_id` and `preferences`. `test_score_missing_profile` and `test_score_missing_preferences` exist (422). `test_score_preferences_not_found` removed. `mock_supabase` fixture has no `get_preferences`. |
| `supabase/functions/score-proxy/index.ts` | Active profile resolution via profiles table query with RLS | VERIFIED | Full RLS-enforced query present. `is_default = true`. `.single()`. 404 on missing profile. Forwards `profile_id` and `preferences` to backend. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/functions/score-proxy/index.ts` | `backend/app/routers/scoring.py` | HTTP POST with `{listing_id, user_id, profile_id, preferences}` | WIRED | Lines 100-108 of index.ts: `JSON.stringify({...body, user_id: authData.user.id, profile_id: profile.id, preferences: profile.preferences})` sent to `${backendUrl}/score` |
| `backend/app/routers/scoring.py` | `backend/app/services/supabase.py` | `save_analysis` call with profile_id argument | WIRED | Lines 71-77 of scoring.py: `asyncio.to_thread(supabase_service.save_analysis, request.user_id, request.profile_id, str(request.listing_id), result.model_dump())` |
| `backend/app/routers/scoring.py` | `backend/app/models/scoring.py` | ScoreRequest with profile_id and preferences fields | WIRED | `ScoreRequest` imported at line 21; `request.profile_id` used at line 74, `request.preferences` used at line 50 |
| `supabase/functions/score-proxy/index.ts` | profiles table (Supabase) | RLS-enforced query with user JWT | WIRED | Lines 48-70: client created with user Authorization header; `.from("profiles").select("id, preferences").eq("is_default", true).single()` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| (PROF-05 enabler) | 06-01-PLAN.md | Infrastructure phase enabling PROF-05 end-to-end | SATISFIED | Scoring pipeline now reads from `profiles` table via edge function, resolves profile server-side, saves profile attribution. PROF-05 itself (user sets active profile from UI) is mapped to Phase 9. |

**Notes on requirement traceability:**
- PLAN frontmatter declares `requirements: []` (empty array). This is intentional — the plan documents note Phase 6 is an infrastructure enabler, not a standalone requirement.
- REQUIREMENTS.md Traceability table does not map any requirement ID to Phase 6. PROF-05 is mapped to Phase 9 (Web Profile Management). This is consistent.
- No orphaned requirements found — no REQUIREMENTS.md entries point to Phase 6.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/app/models/preferences.py` | 43 | Stale docstring: "Stored as JSONB in Supabase user_preferences table" | Info | Misleading comment only; `user_preferences` table was dropped in Phase 5. No functional impact. |

No functional stubs, empty implementations, placeholder returns, or TODO/FIXME patterns found in modified files.

### Human Verification Required

#### 1. Two-Profile Separate Analysis Rows

**Test:** With two profiles in the database, set profile A as active via `SELECT set_active_profile('profile-a-id')` in Supabase SQL Editor. Score a Flatfox listing from the extension. Then switch: `SELECT set_active_profile('profile-b-id')`. Re-score the same listing.

**Expected:** The `analyses` table contains two rows with identical `(user_id, listing_id)` but different `profile_id` values — one for profile A, one for profile B.

**Why human:** Requires a deployed edge function (version 5 per SUMMARY), live Supabase database, and Chrome extension on a Flatfox listing. The structural enablement (3-column `on_conflict`) is verified, but actual separate row creation requires a real DB transaction with two different profile IDs.

#### 2. Stale 2-Column Unique Constraint on Analyses Table

**Test:** In Supabase Dashboard, open the Table Editor or SQL Editor and run:
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'analyses';
```

**Expected:** Only the 3-column partial/unique index `(user_id, listing_id, profile_id)` exists. No legacy 2-column `(user_id, listing_id)` constraint remains.

**Why human:** The SUMMARY explicitly flags: "The analyses table may have a legacy 2-column unique constraint (user_id, listing_id) alongside the new 3-column one. This caused a save error for a previously-scored listing." A stale 2-column constraint would cause upsert conflicts and silently break profile-separated scoring for listings scored prior to Phase 5. Must be verified and dropped from the DB if present.

### Gaps Summary

No automated gaps found. All five observable truths are verified at the code level. The phase goal — pipeline reads preferences from profiles table (via edge function), resolves active profile server-side, stores profile attribution on every analysis — is fully implemented.

Two items require human confirmation before the phase can be considered completely closed:

1. The 3-column unique constraint actually produces separate rows in a live two-profile scenario (structural evidence is complete; live behavior needs confirmation).
2. A potentially stale 2-column `(user_id, listing_id)` unique constraint on the analyses table — flagged by the phase executor in the SUMMARY — must be inspected and removed if present. If this constraint exists, scoring a listing with a second profile will hit a constraint conflict and fail silently (the router catches all `save_analysis` exceptions).

The stale constraint issue is the higher-priority human check: it could silently break the primary goal of the phase (separate analysis rows per profile) in production without any visible error to the user.

---

_Verified: 2026-03-13T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
