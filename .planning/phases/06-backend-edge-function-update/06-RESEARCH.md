# Phase 6: Backend + Edge Function Update - Research

**Researched:** 2026-03-13
**Domain:** FastAPI backend scoring pipeline, Supabase Edge Functions (Deno), Supabase Python client, profile-aware data access
**Confidence:** HIGH

## Summary

Phase 6 makes the scoring pipeline profile-aware end-to-end. Three components need modification: (1) the Supabase edge function `score-proxy` must resolve the active profile server-side and pass `profile_id` + preferences to the backend, (2) the FastAPI backend must accept profile data from the edge function instead of querying `user_preferences` (which no longer exists), and (3) the analysis save must include `profile_id` and use the new 3-column unique constraint `(user_id, listing_id, profile_id)`.

The scope is narrow -- 3 files need changes (`supabase/functions/score-proxy/index.ts`, `backend/app/services/supabase.py`, `backend/app/routers/scoring.py`), plus test updates. The edge function gains a database query (new capability), the backend's `get_preferences` switches from `user_preferences` to receiving preferences from the edge function, and `save_analysis` adds `profile_id` to the upsert. No new libraries are needed. The existing architecture of edge-function-as-proxy with service-role backend is preserved.

**Primary recommendation:** Have the edge function resolve the active profile (query `profiles WHERE is_default = true` using the user's JWT auth context), then pass both `profile_id` and `preferences` to the backend alongside `user_id` and `listing_id`. The backend becomes a pure scoring engine that trusts the edge function's profile resolution -- it no longer queries Supabase for preferences at all.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| (PROF-05 enabler) | Backend queries `profiles` table, not `user_preferences` | Full coverage: edge function queries `profiles` with RLS via JWT auth context; backend receives preferences from edge function; `SupabaseService.get_preferences()` eliminated or replaced |
| (PROF-05 enabler) | Edge function resolves active profile server-side | Full coverage: edge function creates Supabase client with user's Authorization header, queries `profiles WHERE is_default = true`, extracts `id` and `preferences` JSONB |
| (PROF-05 enabler) | Every analysis row saved with `profile_id` | Full coverage: `save_analysis()` updated to include `profile_id`, upsert uses `on_conflict="user_id,listing_id,profile_id"` for new 3-column unique constraint |
| (PROF-05 enabler) | Different active profiles produce separate analysis records | Enabled by 3-column unique constraint + `profile_id` inclusion in save; verified by upsert conflict resolution on composite key |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supabase-py | 2.28.0 | Backend DB operations (save analysis) | Already installed; used by `SupabaseService` |
| @supabase/supabase-js | 2.x | Edge function Supabase client (query profiles) | Already imported in edge function via `npm:@supabase/supabase-js@2` |
| FastAPI | installed | Backend HTTP framework | Already in use |
| Pydantic | installed | Request/response models | Already in use for `ScoreRequest`, `ScoreResponse` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest + pytest-asyncio | installed | Backend tests | Updating existing test suite for profile-aware flow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge function queries profiles | Backend queries profiles | Edge function already has JWT; querying there enforces RLS and keeps "never trust profile ID from client" principle. Backend would need JWT forwarding for RLS or use service role (bypasses RLS). |
| Pass preferences from edge function to backend | Backend queries profiles itself | Current architecture has edge function as auth layer. Passing preferences removes one backend DB call and keeps backend as pure scoring engine. If backend queried profiles, it would need to use service_role key (bypassing RLS). |
| Upsert with on_conflict | INSERT with conflict handling | Upsert is simpler; existing pattern already uses upsert |

**Installation:**
```bash
# No new packages needed -- all libraries already installed
# Backend: supabase-py 2.28.0, fastapi, pydantic, pytest, pytest-asyncio
# Edge function: npm:@supabase/supabase-js@2 (Deno import)
```

## Architecture Patterns

### Modified Component Architecture
```
Extension                Edge Function                    FastAPI Backend
---------                -------------                    ---------------
                         1. Verify JWT (existing)
POST {listing_id} -----> 2. Query profiles table
                            WHERE is_default=true
                            (NEW - uses user JWT + RLS)
                         3. Extract profile_id +
                            preferences JSONB
                         4. Forward to backend:
                            {listing_id, user_id,    ---->  5. Receive request
                             profile_id, preferences}          (no DB query for prefs)
                                                            6. Fetch listing from Flatfox
                                                            7. Score with Claude
                                                            8. Save analysis with profile_id
                         <---- response <------------------  9. Return ScoreResponse
```

### Key Architectural Change: Edge Function Becomes Profile Resolver

**Before (v1.0):**
- Edge function: auth only, passes `user_id` to backend
- Backend: queries `user_preferences` table, scores, saves to `analyses`

**After (Phase 6):**
- Edge function: auth + active profile resolution, passes `user_id`, `profile_id`, `preferences` to backend
- Backend: receives everything it needs, scores, saves to `analyses` with `profile_id`

**Why this is better:**
1. Edge function already has the user's JWT -- perfect for RLS-enforced profile lookup
2. "Never trust a profile ID from the extension" -- the edge function resolves it server-side
3. Backend becomes stateless regarding user data -- pure scoring engine
4. Eliminates the `get_preferences()` call from backend (one fewer DB roundtrip)

### Pattern 1: Edge Function with RLS-Enforced Database Query

**What:** Create a Supabase client inside the edge function using the user's Authorization header, enabling RLS-enforced queries.
**When to use:** When the edge function needs to read user data while respecting row-level security.
**Source:** [Supabase Edge Functions Auth Docs](https://supabase.com/docs/guides/functions/auth)

```typescript
// Create a client that respects RLS using the user's JWT
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  {
    global: {
      headers: { Authorization: authHeader },
    },
  },
);

// Query profiles -- RLS ensures only this user's profiles are returned
const { data: profile, error: profileError } = await supabaseClient
  .from("profiles")
  .select("id, preferences")
  .eq("is_default", true)
  .single();
```

**Important:** This creates a *second* Supabase client with different purpose. The existing client (used for `auth.getUser()`) uses anon key without auth headers. The new client passes the Authorization header for RLS-enforced queries. Alternatively, a single client can be used for both -- create it with the Authorization header, and use it for both `auth.getUser()` and the profile query.

### Pattern 2: Backend Receives Profile Data from Edge Function

**What:** The backend no longer queries Supabase for preferences. Instead, the edge function passes everything needed.
**When to use:** When upstream auth layer already has the data.

```python
# Updated ScoreRequest -- now includes profile context
class ScoreRequest(BaseModel):
    listing_id: int = Field(description="Flatfox listing primary key")
    user_id: str = Field(description="Supabase user UUID")
    profile_id: str = Field(description="Active profile UUID")
    preferences: dict = Field(description="Profile preferences JSONB")
```

### Pattern 3: Profile-Aware Analysis Save with Composite Upsert

**What:** Save analysis with `profile_id` using the 3-column unique constraint.
**When to use:** Every analysis save.
**Source:** [Supabase Python Upsert Docs](https://supabase.com/docs/reference/python/upsert)

```python
# on_conflict must be comma-separated string, not a list
client.table("analyses").upsert(
    {
        "user_id": user_id,
        "profile_id": profile_id,
        "listing_id": listing_id,
        "score": score_data["overall_score"],
        "breakdown": score_data,
        "summary": "\n".join(score_data.get("summary_bullets", [])),
    },
    on_conflict="user_id,listing_id,profile_id",
).execute()
```

### Anti-Patterns to Avoid

- **Trusting profile_id from the extension request body:** The extension sends `listing_id` only. The edge function resolves the active profile server-side. Never accept a `profile_id` from the client.
- **Backend querying `user_preferences`:** Table no longer exists after Phase 5 migration. All preference access goes through `profiles` table.
- **Using service_role key in the edge function for profile lookup:** Use the user's JWT with anon key and RLS instead. Service role bypasses RLS and is unnecessary here.
- **Passing the entire profile row to the backend:** Only pass `id` and `preferences` -- the backend does not need `name`, `is_default`, timestamps, etc.
- **Creating separate Supabase clients for auth check and profile query:** A single client created with `{ global: { headers: { Authorization: authHeader } } }` can handle both `auth.getUser()` and the profile query.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active profile resolution | Custom SQL query or RPC call | `supabase.from('profiles').select(...).eq('is_default', true).single()` | PostgREST query builder handles RLS automatically |
| Composite key upsert | Manual INSERT/UPDATE with conflict check | `supabase.table('analyses').upsert(..., on_conflict='user_id,listing_id,profile_id')` | PostgREST handles ON CONFLICT correctly |
| JWT verification | Manual JWT parsing/decoding | `supabase.auth.getUser(token)` | Already in use; handles token expiry, revocation |
| Profile ownership check | Application-level user_id matching | RLS policy `(select auth.uid()) = user_id` | Database-enforced, cannot be bypassed |

**Key insight:** The Supabase client's RLS integration means the edge function does not need to manually verify profile ownership -- the RLS policy on `profiles` already ensures users can only see their own profiles. The `.single()` call on `is_default = true` will return exactly the active profile (or error if none exists).

## Common Pitfalls

### Pitfall 1: Edge Function Client Not Getting Auth Context
**What goes wrong:** Querying `profiles` returns empty results or permission errors because the Supabase client was created without the user's Authorization header.
**Why it happens:** The current edge function creates a client with just URL + anon key (no auth headers). This client works for `auth.getUser()` but RLS queries would not have user context.
**How to avoid:** Create the Supabase client with `{ global: { headers: { Authorization: authHeader } } }`. This sets the JWT for all subsequent queries, enabling RLS to identify the user via `auth.uid()`.
**Warning signs:** Profile query returns `null` or `{ error: { code: 'PGRST116' } }` (no rows found) when a profile definitely exists.

### Pitfall 2: User With No Active Profile
**What goes wrong:** `.single()` throws an error if the user has no profiles or no profile with `is_default = true`.
**Why it happens:** New users who haven't created a profile yet, or edge cases where `set_active_profile()` hasn't been called.
**How to avoid:** Return a clear 404-style error from the edge function: `{ error: "No active profile found. Please set up your preferences." }`. The extension should handle this gracefully.
**Warning signs:** 500 errors from the edge function when testing with new users.

### Pitfall 3: Upsert on_conflict Must Be a Comma-Separated String
**What goes wrong:** `supabase-py` upsert fails with error `42P10` ("no unique or exclusion constraint matching the ON CONFLICT specification").
**Why it happens:** Passing `on_conflict` as a list `["user_id", "listing_id", "profile_id"]` instead of a comma-separated string `"user_id,listing_id,profile_id"`. PostgREST expects a comma-separated string.
**How to avoid:** Always use string format: `on_conflict="user_id,listing_id,profile_id"`.
**Warning signs:** Analysis save silently fails or raises exceptions in logs.

### Pitfall 4: Edge Function Returning Full Profile Object to Backend
**What goes wrong:** Unnecessary data transfer and potential data leakage.
**Why it happens:** Querying `select('*')` instead of `select('id, preferences')`.
**How to avoid:** Only select the fields the backend needs: `select('id, preferences')`.
**Warning signs:** Large payloads in edge function logs.

### Pitfall 5: Breaking the Extension API Contract
**What goes wrong:** Extension stops working because the edge function expects different request body.
**Why it happens:** Changing the edge function's expected request body without updating the extension.
**How to avoid:** The extension MUST NOT change in this phase. It still sends `{ listing_id: number }`. The edge function still accepts this same body. The edge function's new behavior (profile resolution) is transparent to the extension.
**Warning signs:** Extension fetch calls returning 400 errors.

### Pitfall 6: Web App Analysis Page Query Breaking
**What goes wrong:** The analysis page at `web/src/app/analysis/[listingId]/page.tsx` queries `analyses` with `.eq('listing_id', listingId)` and `.single()` -- but now there can be multiple analyses per listing (one per profile).
**Why it happens:** The unique constraint changed from `(user_id, listing_id)` to `(user_id, listing_id, profile_id)`, allowing multiple rows per listing.
**How to avoid:** Update the analysis page query to also filter by active profile, or show the most recent analysis. This is a web app concern but Phase 6 should note it as a downstream impact.
**Warning signs:** `.single()` throwing "multiple rows returned" errors on the analysis page.

### Pitfall 7: Backend Tests Mocking the Old Flow
**What goes wrong:** Existing tests still mock `supabase_service.get_preferences()` which the new flow no longer calls.
**Why it happens:** Tests are tightly coupled to the old architecture.
**How to avoid:** Update test fixtures to provide `profile_id` and `preferences` in the request body. Remove or update the `mock_supabase` fixture for `get_preferences`.
**Warning signs:** Tests passing but not reflecting reality -- green tests, broken production.

## Code Examples

Verified patterns from official sources and codebase analysis:

### Updated Edge Function (complete)
```typescript
// Source: Codebase analysis + https://supabase.com/docs/guides/functions/auth
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create client with user's auth context for RLS-enforced queries
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Verify JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData?.user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Resolve active profile server-side (RLS enforced -- user can only see own profiles)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, preferences")
    .eq("is_default", true)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: "No active profile found. Please set up your preferences." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Read request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Forward to backend with profile context
  const backendUrl = Deno.env.get("BACKEND_URL");
  if (!backendUrl) {
    return new Response(
      JSON.stringify({ error: "Backend not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const backendResponse = await fetch(`${backendUrl}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        user_id: authData.user.id,
        profile_id: profile.id,
        preferences: profile.preferences,
      }),
    });

    const responseBody = await backendResponse.text();
    return new Response(responseBody, {
      status: backendResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Backend unreachable" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

### Updated ScoreRequest Model
```python
# Source: Codebase analysis -- backend/app/models/scoring.py
class ScoreRequest(BaseModel):
    """Request body for the scoring endpoint."""
    listing_id: int = Field(description="Flatfox listing primary key")
    user_id: str = Field(description="Supabase user UUID")
    profile_id: str = Field(description="Active profile UUID")
    preferences: dict = Field(description="Profile preferences JSONB")
```

### Updated SupabaseService
```python
# Source: Codebase analysis -- backend/app/services/supabase.py
class SupabaseService:
    # ... (existing __init__ and get_client unchanged)

    # get_preferences() REMOVED -- preferences now come from edge function

    def save_analysis(
        self, user_id: str, profile_id: str, listing_id: str, score_data: dict
    ) -> None:
        """Save or update an analysis result in Supabase.

        Uses upsert with unique(user_id, listing_id, profile_id) constraint.
        """
        client = self.get_client()
        client.table("analyses").upsert(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "listing_id": listing_id,
                "score": score_data["overall_score"],
                "breakdown": score_data,
                "summary": "\n".join(score_data.get("summary_bullets", [])),
            },
            on_conflict="user_id,listing_id,profile_id",
        ).execute()
```

### Updated Scoring Router
```python
# Source: Codebase analysis -- backend/app/routers/scoring.py
@router.post("", response_model=ScoreResponse)
async def score_listing(request: ScoreRequest) -> ScoreResponse:
    # 1. Fetch listing from Flatfox (unchanged)
    listing = await flatfox_client.get_listing(request.listing_id)

    # 2. Parse preferences from request (NEW -- no DB query)
    preferences = UserPreferences.model_validate(request.preferences)

    # 3. Fetch listing images (unchanged)
    image_urls = await flatfox_client.get_listing_image_urls(listing.slug, listing.pk)

    # 4. Score with Claude (unchanged)
    result = await claude_scorer.score_listing(listing, preferences, image_urls=image_urls)

    # 5. Save analysis WITH profile_id (CHANGED)
    await asyncio.to_thread(
        supabase_service.save_analysis,
        request.user_id,
        request.profile_id,  # NEW parameter
        str(request.listing_id),
        result.model_dump(),
    )

    # 6. Return response (unchanged)
    return result
```

## State of the Art

| Old Approach (v1.0) | Current Approach (Phase 6) | When Changed | Impact |
|---------------------|---------------------------------|--------------|--------|
| Edge function passes only `user_id` | Edge function passes `user_id`, `profile_id`, `preferences` | Phase 6 | Edge function becomes profile resolver |
| Backend queries `user_preferences` table | Backend receives preferences from edge function | Phase 6 | Eliminates a DB roundtrip; `user_preferences` table no longer exists |
| `save_analysis` with 2-column upsert `(user_id, listing_id)` | 3-column upsert `(user_id, listing_id, profile_id)` | Phase 6 | Per-profile analysis history |
| ScoreRequest: `{listing_id, user_id}` | ScoreRequest: `{listing_id, user_id, profile_id, preferences}` | Phase 6 | Backend becomes pure scoring engine |

**Deprecated/outdated after this phase:**
- `SupabaseService.get_preferences()` method: removed entirely (preferences come from edge function)
- `user_preferences` table reference in backend: already dropped in Phase 5, backend code catches up
- 2-field ScoreRequest: expanded to include profile context

## Files Requiring Modification

| File | Change | Scope |
|------|--------|-------|
| `supabase/functions/score-proxy/index.ts` | Add profile resolution query, pass profile_id + preferences to backend | Major -- new DB query logic |
| `backend/app/models/scoring.py` | Add `profile_id` and `preferences` to `ScoreRequest` | Minor -- 2 new fields |
| `backend/app/routers/scoring.py` | Use `request.preferences` instead of DB query, pass `profile_id` to save | Medium -- flow change |
| `backend/app/services/supabase.py` | Remove `get_preferences()`, update `save_analysis()` to include `profile_id` | Medium -- method removal + update |
| `backend/tests/test_score_endpoint.py` | Update fixtures and assertions for new request format | Medium -- test rewrite |
| `backend/tests/conftest.py` | No changes needed (sample data still valid) | None |

### Downstream Impact (NOT in Phase 6 scope, but noted)

| File | Impact | When to Fix |
|------|--------|-------------|
| `web/src/app/dashboard/actions.ts` | References `user_preferences` table (dropped) | Phase 7 or 9 (preferences form redesign) |
| `web/src/app/analysis/[listingId]/page.tsx` | `.single()` may fail with multiple profile analyses | Phase 9 (analysis page redesign) |

## Open Questions

1. **Web app `user_preferences` references**
   - What we know: `web/src/app/dashboard/actions.ts` reads/writes `user_preferences` (line 15 and 34). This table was dropped in Phase 5.
   - What's unclear: Whether to fix this in Phase 6 or defer.
   - Recommendation: Defer to Phase 7 (Preferences Schema Unification) or Phase 9 (Web Profile Management). The web app preferences form is being redesigned anyway. Phase 6 scope is backend + edge function only.

2. **Analysis page multi-row handling**
   - What we know: `web/src/app/analysis/[listingId]/page.tsx` queries `.eq('listing_id', listingId).single()`. With per-profile analyses, the same listing_id can have multiple analyses.
   - What's unclear: Whether to show the most recent analysis, the active profile's analysis, or all of them.
   - Recommendation: Defer to Phase 9 (Analysis page redesign, UI-04). For now, the web page may error for users with multiple profiles who scored the same listing -- acceptable given scoring is broken on web anyway until web preferences are updated.

3. **Edge function deployment**
   - What we know: Edge function is deployed via `supabase functions deploy score-proxy`.
   - What's unclear: Whether `--no-verify-jwt` flag is still needed (noted as concern in STATE.md).
   - Recommendation: Keep `--no-verify-jwt` for now (existing known issue). The function handles auth itself via `supabase.auth.getUser()`. Revisiting JWT verification is a separate security concern not in Phase 6 scope.

4. **Pending todo from STATE.md: `set_active_profile()` RPC behavioral test**
   - What we know: STATE.md has a pending todo to verify the RPC works at runtime: "create 2 profiles, call RPC to switch active, confirm partial unique index and atomic UPDATE sequence work correctly."
   - What's unclear: Whether this should be done in Phase 6 or was already validated in Phase 5.
   - Recommendation: Include a manual verification step in Phase 6 planning -- create a test profile, set it as active, and score a listing. This exercises both the RPC and the full pipeline.

## Validation Architecture

> Note: `workflow.nyquist_validation` is not set in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio (auto mode) |
| Config file | `backend/pyproject.toml` |
| Quick run command | `cd backend && python -m pytest tests/test_score_endpoint.py -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -x -q` |

### Phase Requirements --> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-01 | POST /score with profile_id + preferences returns 200 | unit | `cd backend && python -m pytest tests/test_score_endpoint.py::test_score_success -x` | Exists (needs update) |
| SC-02 | ScoreRequest validates profile_id and preferences fields | unit | `cd backend && python -m pytest tests/test_scoring_models.py -x` | Exists (needs update) |
| SC-03 | save_analysis includes profile_id in upsert | unit | `cd backend && python -m pytest tests/test_score_endpoint.py::test_score_saves_analysis -x` | Exists (needs update) |
| SC-04 | Missing profile_id returns validation error | unit | `cd backend && python -m pytest tests/test_score_endpoint.py::test_score_missing_profile -x` | Wave 0 |
| SC-05 | Edge function resolves active profile (manual) | manual | Deploy edge function, call via curl with JWT | Manual |
| SC-06 | Two profiles scoring same listing produce separate records | manual | Score with profile A, switch, score with profile B, verify 2 rows | Manual |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_score_endpoint.py -x -q`
- **Per wave merge:** `cd backend && python -m pytest tests/ -x -q`
- **Phase gate:** Full test suite green + manual edge function verification

### Wave 0 Gaps
- [ ] Update `tests/test_score_endpoint.py` -- update request payloads to include `profile_id` and `preferences`
- [ ] Update `tests/test_score_endpoint.py` -- update `mock_supabase` fixture (remove `get_preferences` mock, update `save_analysis` mock to expect `profile_id`)
- [ ] Add test: missing `profile_id` returns 422 validation error
- [ ] Manual: deploy edge function and verify profile resolution with curl

## Sources

### Primary (HIGH confidence)
- [Supabase Edge Functions Auth Docs](https://supabase.com/docs/guides/functions/auth) -- creating Supabase client with user auth context for RLS-enforced queries
- [Supabase Edge Functions example: select-from-table-with-auth-rls](https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/select-from-table-with-auth-rls/index.ts) -- official example of querying DB from edge function with RLS
- [Supabase Python Upsert Docs](https://supabase.com/docs/reference/python/upsert) -- `on_conflict` parameter format (comma-separated string)
- [Supabase Python Select Docs](https://supabase.com/docs/reference/python/select) -- query builder API
- Codebase analysis -- `supabase/functions/score-proxy/index.ts`, `backend/app/services/supabase.py`, `backend/app/routers/scoring.py`, `backend/app/models/scoring.py` (direct file reading)

### Secondary (MEDIUM confidence)
- [Supabase GitHub Discussion #18503](https://github.com/orgs/supabase/discussions/18503) -- upsert with multiple on_conflict columns format
- [Supabase GitHub Discussion #36532](https://github.com/orgs/supabase/discussions/36532) -- composite key upsert troubleshooting

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation and codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries; modifications to existing code only
- Architecture: HIGH -- pattern follows Supabase official examples for edge function DB queries with RLS
- Pitfalls: HIGH -- identified through direct codebase analysis and known Supabase-py quirks (on_conflict string format)
- Code examples: HIGH -- derived from actual codebase with minimal modifications

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- Supabase client APIs are well-established)
