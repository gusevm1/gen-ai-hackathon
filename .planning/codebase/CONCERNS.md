---
focus: concerns
generated: 2026-03-27
---

# Codebase Concerns

## Security

### Hardcoded Credentials
- `extension/src/lib/api.ts` has `SUPABASE_ANON_KEY` hardcoded as a string literal in source. The anon key is public by design (Supabase), but this still ends up in the built extension bundle and version history. Should be injected via WXT env vars.
- The edge function relies on `SUPABASE_ANON_KEY` auto-set by Supabase — acceptable pattern there.

### CORS Wide Open on Backend
- `backend/app/main.py` sets `allow_origins=["*"]` — backend accepts requests from any origin. Since the backend sits behind the edge function (which enforces auth), this is partially mitigated, but the backend is still directly accessible from the internet with no authentication of its own.

### No Backend Auth
- The EC2 backend (`POST /score`, `POST /chat`, etc.) has no authentication. It trusts `user_id`, `profile_id`, and `preferences` values passed in the request body from the edge function. A direct caller could submit arbitrary user_id/profile_id values.
- The EC2 host is publicly accessible on port 8000.

### EC2 SSH Key in CLAUDE.md
- `CLAUDE.md` documents the SSH command including the key path — this is a runbook for CI/CD use, but the key itself must not be committed.

## Technical Debt

### Legacy Migration 001
- `supabase/migrations/001_initial_schema.sql` creates `user_preferences` and a `analyses` table that are immediately dropped by `002_profiles_schema.sql`. Migration 001 is dead code in production but still runs on fresh installs.

### Onboarding Entry Point May Be Stale
- The extension previously had an `onboarding/` entrypoint (referenced in older planning docs). The onboarding flow has moved to the web app, but any lingering references in the extension could cause confusion.

### Wizard/Profile Schema Split
- The original extension had a full wizard-based onboarding flow (`StepFilters`, `StepSoftCriteria`, `StepWeights`, `useWizardState`). These appear to have been replaced by the web app chat flow, but remnants may exist in the extension codebase.

### Supabase Sync is Fire-and-Forget
- Backend scoring saves analysis results with `asyncio.to_thread(...)` wrapped in a try/except that only logs on failure. If Supabase write fails, the user still gets a score but it won't be cached — no retry mechanism.

## Performance

### Scoring Latency
- Each scoring request: Flatfox API fetch + page scrape + optional Apify/Places call + Claude inference. No timeout enforced on the Claude call. Slow listings could block the batch.
- Batch concurrency default is 10, which may overwhelm Claude rate limits on large Flatfox result pages.

### Image Scoring
- All listing images are fetched and sent to Claude as content blocks. No image count cap — a listing with many images could significantly increase token usage and cost.

### Apify Cold Starts
- Apify actor calls (Places search) can have cold start latency of several seconds, adding to total scoring time.

## Missing Features / Incomplete

### Multi-language Support
- Backend `build_system_prompt()` accepts a `language` param, but the extent of language support is unclear from tests. Web app has a `translations.ts` file but coverage is unknown.

### Error Boundaries
- The extension content script and web app appear to have minimal error boundary coverage. An uncaught React error could blank out the entire scoring overlay or dashboard.

### Profile Staleness Propagation
- When a profile is updated, existing analyses need to be marked stale. The mechanism for setting `stale=true` on analyses is not visible in the code reviewed — this may be a missing trigger or done client-side.

### No Automated Deployment Pipeline
- Deployment is documented as manual SSH commands in `CLAUDE.md`. No CI/CD (GitHub Actions) for backend deployment or extension builds. Vercel handles web app deploys automatically.

## Backend / Performance

### No Rate Limiting
- No rate limiting on any endpoint (`/score`, `/chat`, `/geocode`). A single user or bad actor could exhaust Claude API quotas or EC2 resources.

### No Claude Concurrency Limit
- `scoreListings()` in the extension fires up to 10 parallel requests to the edge function, each of which calls Claude. No server-side semaphore on the backend to cap concurrent Claude calls.

### Blocking Supabase Client in Async Backend
- `supabase_service` uses the sync `supabase-py` client wrapped in `asyncio.to_thread()`. This works but ties up a thread pool worker per DB call. A native async client would be cleaner.

### No EC2 Process Manager
- Backend runs via `nohup uvicorn ... &` (per CLAUDE.md). No systemd, supervisor, or Docker — the process won't auto-restart on crash or EC2 reboot.

### No Health Monitoring
- No alerting or uptime monitoring on EC2. The `/health` endpoint exists but nothing watches it automatically.

## Supabase Schema

### Missing DELETE Policy on Analyses
- `analyses` table RLS has SELECT, INSERT, UPDATE policies but no DELETE policy. Users cannot delete their own cached analyses.

### No Stale Flag Trigger
- When `profiles.preferences` is updated, existing `analyses` rows for that profile should be marked `stale=true`. No DB trigger or function enforces this — it must be done by application code and could be missed.

### No `updated_at` on Analyses
- The `analyses` table has `created_at` but no `updated_at` column, making it impossible to tell when a cached score was last refreshed.

## Browser Extension Specific

### MV3 Service Worker Lifetime
- The background service worker can be killed by the browser at any time. Any in-progress state stored only in the service worker's memory would be lost.

### Content Script Injection Scope
- The content script is injected on `*.flatfox.ch/*`. If Flatfox changes their DOM structure (listing card selectors, listing ID attributes), the parser will silently fail with no visible error.

### Extension Zip in Web Public
- `web/public/homematch-extension.zip` is committed to the repo. Large binary files in git can bloat the repository over time.
