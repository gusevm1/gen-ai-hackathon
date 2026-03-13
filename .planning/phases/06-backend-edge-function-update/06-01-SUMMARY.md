---
phase: 06-backend-edge-function-update
plan: 01
status: complete
started: 2026-03-13T13:00:00.000Z
completed: 2026-03-13T14:00:00.000Z
tasks_completed: 3
tasks_total: 3
---

# Plan 06-01 Summary

## What Was Built

Made the scoring pipeline profile-aware end-to-end: the edge function resolves the active profile server-side, the backend receives profile context in the request body instead of querying for it, and every analysis is saved with profile attribution.

## Key Changes

### Backend (Python/FastAPI)
- **ScoreRequest model** (`backend/app/models/scoring.py`): Added `profile_id` (str) and `preferences` (dict) as required fields
- **SupabaseService** (`backend/app/services/supabase.py`): Removed `get_preferences()` method entirely; updated `save_analysis()` to accept `profile_id` parameter with 3-column `on_conflict="user_id,listing_id,profile_id"` upsert
- **Scoring router** (`backend/app/routers/scoring.py`): Removed DB preferences lookup; validates `request.preferences` via Pydantic; passes `request.profile_id` to `save_analysis`
- **Tests** (`backend/tests/test_score_endpoint.py`): All 7 endpoint tests updated with `profile_id` and `preferences` in payloads; added `test_score_missing_profile` and `test_score_missing_preferences` (422 validation); removed obsolete `test_score_preferences_not_found`

### Edge Function (TypeScript/Deno)
- **score-proxy** (`supabase/functions/score-proxy/index.ts`): Creates Supabase client with user's Authorization header for RLS; queries `profiles` table for active profile (`is_default = true`, `.single()`); returns 404 if no active profile; forwards `profile_id` + `preferences` to backend alongside `user_id` and `listing_id`

### Web Dashboard Fix (bonus)
- **actions.ts** (`web/src/app/dashboard/actions.ts`): Fixed pre-existing bug where save/load preferences still referenced dropped `user_preferences` table; now reads/writes to `profiles` table

## Commits

| Commit | Description |
|--------|-------------|
| `f7a5dfa` | test(06-01): add failing tests for profile-aware scoring pipeline (RED) |
| `37ba591` | feat(06-01): update backend to accept profile context and save with profile_id (GREEN) |
| `352914d` | feat(06-01): update edge function to resolve active profile and forward context |
| `b0a7fbc` | fix(web): update dashboard to use profiles table instead of dropped user_preferences |

## Key Files

### Created
- (none)

### Modified
- `backend/app/models/scoring.py` — ScoreRequest with profile_id and preferences fields
- `backend/app/services/supabase.py` — save_analysis with profile_id; get_preferences removed
- `backend/app/routers/scoring.py` — Uses request.preferences instead of DB query
- `backend/tests/test_score_endpoint.py` — Updated tests with profile_id in payloads
- `backend/tests/test_scoring.py` — Updated mock for save_analysis 4-arg signature
- `supabase/functions/score-proxy/index.ts` — Active profile resolution via RLS query
- `web/src/app/dashboard/actions.ts` — Fixed to use profiles table

## Verification

- All 57 backend tests pass (7 endpoint + 50 others)
- Edge function deployed (version 5, active)
- End-to-end scoring verified: user saved preferences via web dashboard → extension FAB scored a listing → score badge (28) appeared → full analysis page rendered with category breakdown
- Backend deployed on EC2 with updated code

## Deviations

- **Dashboard fix**: Discovered and fixed pre-existing bug where web dashboard still referenced dropped `user_preferences` table — not in original plan but required for end-to-end testing
- **Backend restart**: Required manual EC2 restart after git pull to pick up new backend code

## Issues

- **Stale unique constraint**: The analyses table may have a legacy 2-column unique constraint (`user_id, listing_id`) alongside the new 3-column one (`user_id, listing_id, profile_id`). This caused a save error for a previously-scored listing. Should be verified and cleaned up.

## Self-Check: PASSED
