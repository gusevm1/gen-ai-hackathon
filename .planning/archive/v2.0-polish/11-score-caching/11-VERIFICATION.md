---
phase: 11-score-caching
verified: 2026-03-17T00:00:00Z
status: human_needed
score: 10/10 code must-haves verified
human_verification:
  - test: "Confirm stale column migration applied to production Supabase"
    expected: "SELECT column_name FROM information_schema.columns WHERE table_name='analyses' AND column_name='stale' returns one row; idx_analyses_cache_lookup index exists"
    why_human: "Supabase CLI not authenticated in local env — cannot query production DB. Summary documents this was deferred to user."
  - test: "Confirm edge function score-proxy is deployed with cache logic"
    expected: "npx supabase functions list shows score-proxy deployed after commit 96027b1; X-HomeMatch-Cache header present in responses"
    why_human: "Supabase CLI not authenticated locally — cannot verify deployed version matches local code."
  - test: "Score a listing twice and confirm second request is instant (cache hit)"
    expected: "Second score returns in <100ms with X-HomeMatch-Cache: hit header; no Claude API call made"
    why_human: "Real-time network behavior cannot be verified programmatically."
  - test: "Save preferences in web app and score the same listing in the extension"
    expected: "Listing re-scores from backend (cache bypassed); badge briefly shows greyed-out with warning icon before fresh score arrives"
    why_human: "Cross-service stale invalidation flow requires live browser + web app interaction."
  - test: "Long-press FAB for 2 seconds and confirm force re-score triggers"
    expected: "Circular progress ring animates around FAB; at 2s the ring disappears and scoring starts for all visible listings; regular tap still works normally"
    why_human: "Pointer event timing and visual animation require human observation in browser."
---

# Phase 11: Score Caching Verification Report

**Phase Goal:** Users get instant cached scores for previously-scored listings, reducing wait time and Claude API costs
**Verified:** 2026-03-17
**Status:** human_needed — all code verified, two infrastructure deployments and three UX flows require human confirmation
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | analyses table has a stale boolean column defaulting to false | VERIFIED | `supabase/migrations/003_add_stale_column.sql` L4: `alter table analyses add column stale boolean not null default false` |
| 2 | Backend upsert explicitly sets stale=false when saving a new score | VERIFIED | `backend/app/services/supabase.py` L59: `"stale": False` inside upsert dict |
| 3 | Edge function returns cached result when non-stale analysis exists | VERIFIED | `supabase/functions/score-proxy/index.ts` L103-111: `if (cached && !cached.stale)` returns `cached.breakdown` with `X-HomeMatch-Cache: hit` header |
| 4 | Edge function calls backend when no analysis exists or analysis is stale | VERIFIED | L94-115: cache check block only returns early on hit; falls through to backend proxy otherwise |
| 5 | Edge function passes force_rescore flag to bypass cache | VERIFIED | L91: `const forceRescore = body.force_rescore === true`; cache check skipped when true |
| 6 | Edge function signals preference-staleness via X-HomeMatch-Pref-Stale header | VERIFIED | L114: `prefStale = cached?.stale === true`; L145: `missHeaders["X-HomeMatch-Pref-Stale"] = "true"` conditionally added |
| 7 | Saving preferences marks all analyses for that profile as stale | VERIFIED | `web/src/app/(dashboard)/profiles/actions.ts` L177-181: `.update({ stale: true }).eq('profile_id', profileId)` after successful pref update |
| 8 | Long-pressing FAB for 2 seconds triggers force re-score | VERIFIED | `Fab.tsx` L29: `LONG_PRESS_DURATION = 2000`; L43-50: auto-fires `onLongPress()` at completion; `App.tsx` L283-285: `handleForceRescore` calls `handleScore(true)` |
| 9 | Circular progress ring animates around FAB during long-press | VERIFIED | `Fab.tsx` L132-148: SVG circle with `strokeDashoffset` driven by `longPressProgress` state |
| 10 | Stale scores have distinct visual states per reason | VERIFIED | `ScoreBadge.tsx`: `opacity-50 grayscale border-gray-300` for pref-stale; `ring-2 ring-amber-400/70` for profile-switch. `SummaryPanel.tsx`: distinct banners for each reason |

**Score:** 10/10 truths verified in code

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/003_add_stale_column.sql` | stale column on analyses table | VERIFIED | ALTER TABLE + CREATE INDEX; 9 lines, substantive |
| `backend/app/services/supabase.py` | Updated upsert with stale=false | VERIFIED | `"stale": False` at L59 in 7-key upsert dict |
| `supabase/functions/score-proxy/index.ts` | Cache check before backend proxy | VERIFIED | 157 lines; full cache-aside logic with hit/miss/pref-stale headers |
| `web/src/app/(dashboard)/profiles/actions.ts` | Stale-marking on preference save | VERIFIED | `.update({ stale: true })` at L177-181 inside `saveProfilePreferences` |
| `extension/src/lib/api.ts` | ScoreResult interface, force_rescore param, prefStale signal | VERIFIED | `ScoreResult` interface at L14-17; `forceRescore` param at L31; `prefStale` from header at L50 |
| `extension/src/entrypoints/content/components/Fab.tsx` | Long-press detection + circular progress ring | VERIFIED | `onLongPress` prop; pointer events; SVG ring; 160 lines |
| `extension/src/entrypoints/content/App.tsx` | handleScore forceRescore, prefStale detection, staleReasonRef | VERIFIED | `forceRescore: boolean = false` at L195; `staleReasonRef` at L40; `if (prefStale)` at L247; `onLongPress={handleForceRescore}` at L290 |
| `extension/src/entrypoints/content/components/ScoreBadge.tsx` | Preference-stale visual state | VERIFIED | `staleReason` prop; `isPrefStale` and `isProfileStale` branching; distinct CSS classes |
| `extension/src/entrypoints/content/components/SummaryPanel.tsx` | Preference-stale warning banner | VERIFIED | "Preferences changed" banner at L30-33; "Scores may be outdated" at L35-38 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/app/services/supabase.py` | analyses table | upsert sets stale=false | WIRED | `"stale": False` present in upsert dict at L59 |
| `supabase/functions/score-proxy/index.ts` | analyses table | SELECT for cache check | WIRED | `.from("analyses").select("score, breakdown, summary, stale")...maybeSingle()` at L95-101 |
| `supabase/functions/score-proxy/index.ts` | `extension/src/lib/api.ts` | X-HomeMatch-Pref-Stale response header | WIRED | Edge sets header at L145; extension reads `res.headers.get('X-HomeMatch-Pref-Stale')` at L50 of api.ts |
| `web/src/app/(dashboard)/profiles/actions.ts` | analyses table | UPDATE stale=true on preference save | WIRED | `.update({ stale: true }).eq('profile_id', profileId)` at L178-180 |
| `extension/src/lib/api.ts` | `supabase/functions/score-proxy/index.ts` | POST body with force_rescore | WIRED | `JSON.stringify({ listing_id: listingId, force_rescore: forceRescore })` at L40 |
| `Fab.tsx` | `App.tsx` | onLongPress callback triggers handleScore(true) | WIRED | `onLongPress={handleForceRescore}` at App.tsx L290; Fab fires `onLongPress()` at L49 |
| `App.tsx` | `extension/src/lib/api.ts` | scoreListings with forceRescore=true | WIRED | `scoreListings(pks, jwt, callback, forceRescore)` at L245+263 |
| `extension/src/lib/api.ts` | `App.tsx` | onResult callback delivers prefStale boolean | WIRED | `onResult?.(id, data, prefStale)` at api.ts L77; consumed at App.tsx L245-252 |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CACHE-01 | 11-01, 11-02 | System returns cached score when listing_id + profile_id exists (skips Claude) | SATISFIED | Edge function cache-aside at score-proxy L94-115; stale column ensures only non-stale rows are returned as hits |
| CACHE-02 | 11-01, 11-02 | Cache invalidated when user saves updated preferences (existing analyses marked stale) | SATISFIED | `saveProfilePreferences` marks all profile analyses stale at actions.ts L177-181; stale column foundation at migration L4 |
| CACHE-03 | 11-03 | User can force re-score from extension FAB (manual override ignoring cache) | SATISFIED | 2-second long-press in Fab.tsx triggers `handleForceRescore` -> `handleScore(true)` -> `scoreListings(..., true)` -> edge function `forceRescore` bypasses cache check |

No orphaned requirements for Phase 11. REQUIREMENTS.md traceability table maps CACHE-01/02/03 exclusively to Phase 11, all accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `App.tsx` | 236 | Comment using word "placeholder" in a comment about grey badge state | Info | No impact — describes intentional loading state visual, not a code stub |

No blocking anti-patterns found. No TODO/FIXME/empty implementations.

### Human Verification Required

#### 1. Production DB Migration

**Test:** Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'analyses' AND column_name = 'stale';` in the Supabase SQL Editor for project `mlhtozdtiorkemamzjjc`.
**Expected:** One row returned confirming the `stale` column exists; also verify `idx_analyses_cache_lookup` index appears in index listing.
**Why human:** Supabase CLI is not authenticated in the local environment. Both 11-01 and 11-02 summaries document this as explicit "user setup required" — the migration file is committed but production application was deferred.

#### 2. Edge Function Deployment

**Test:** After `supabase login`, run `npx supabase functions deploy score-proxy --no-verify-jwt` from the repo root, then verify via `npx supabase functions list --project-ref mlhtozdtiorkemamzjjc`.
**Expected:** score-proxy function appears in list with a recent updated_at timestamp matching or after commit `96027b1`.
**Why human:** Supabase CLI requires auth token not present in local env. The cache logic code is committed and correct; deployment is the only remaining step.

#### 3. Cache Hit Verification

**Test:** On Flatfox, click FAB to score a listing (takes a few seconds — Claude call). Navigate away and return to the same listing page. Click FAB again.
**Expected:** The second scoring completes instantly (<100ms feel). In browser DevTools Network tab, the score-proxy request should return with `X-HomeMatch-Cache: hit` response header.
**Why human:** Real-time network round-trip behavior cannot be verified programmatically from source code alone. Depends on both the migration AND edge function deployment being in place.

#### 4. Preference Stale Invalidation Flow

**Test:** Score a listing in the extension. Open the HomeMatch web app, navigate to the active profile, change any preference value, save. Return to Flatfox, click the FAB.
**Expected:** The previously-cached listing re-scores from backend (stale flag was set on save). The badge briefly shows greyed-out with a warning icon (preference-stale state) until the fresh score returns and clears the stale state.
**Why human:** Requires coordinated interaction across web app and Chrome extension; cross-service stale signal flows cannot be simulated without a live environment.

#### 5. Long-Press FAB Interaction

**Test:** On a Flatfox listing page with previously scored listings, hover over the FAB to see the "Long press 2–3 s to hard rescore" tooltip. Then hold the FAB button for 2 full seconds.
**Expected:** Circular black progress ring animates around the FAB during the hold. At 2 seconds the ring disappears and all visible listings begin re-scoring. A regular single tap should still trigger normal (cached) scoring for unscored listings.
**Why human:** Pointer event timing, visual animation, and user interaction UX require human observation in a real browser context.

### Infrastructure Status

Two deployment steps are pending and required before the caching system functions in production:

1. **DB migration** (`003_add_stale_column.sql`) — must be applied via Supabase SQL Editor or `npx supabase db push --linked` after authenticating. Without this, the `stale` column does not exist and the edge function cache query will fail.

2. **Edge function** (`score-proxy`) — must be redeployed to include the cache-aside logic committed in `96027b1`. Without this, requests bypass the cache check entirely.

The SQL to apply manually if needed:
```sql
alter table analyses add column stale boolean not null default false;

create index idx_analyses_cache_lookup
  on analyses (user_id, listing_id, profile_id)
  where (stale = false);
```

And the deploy command (after `supabase login`):
```bash
npx supabase functions deploy score-proxy --no-verify-jwt
```

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
