# Phase 5: DB Schema Migration - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a `profiles` table that supports multiple named profiles per user, recreate `analyses` table with `profile_id` foreign key and updated unique constraint, and implement atomic profile switching via Postgres RPC. Clean-slate migration — drop legacy tables (only test data exists). This is schema-only work — no backend/frontend code changes (those are Phase 6+).

</domain>

<decisions>
## Implementation Decisions

### Old table handling
- Clean slate: drop both `user_preferences` and `analyses` tables entirely
- Only 2 test users exist — no real data to preserve, no backfill needed
- No compatibility shims or views — accept brief scoring downtime until Phase 6 deploys
- Fresh `profiles` and `analyses` tables created from scratch

### Migration execution
- Single migration file: `supabase/migrations/002_profiles_schema.sql`
- Follows existing pattern (001_initial_schema.sql already in repo)
- Drops old tables, creates `profiles` table, recreates `analyses` with `profile_id` FK, adds RLS policies, creates `set_active_profile()` RPC — all in one file
- Applied via `supabase db push` (Supabase CLI)
- No seed data — tables start empty

### Claude's Discretion
- Profile table column types and constraints (id, user_id, name, preferences JSONB, is_default boolean, created_at, updated_at, plus any metadata columns)
- Whether to add optional metadata fields (description, color) now or defer to Phase 9
- Default profile naming scheme for new profiles
- Character limit on profile names
- Max profiles per user limit (if any, enforced via constraint or RPC)
- Partial unique index implementation for `is_default` (one active profile per user)
- `set_active_profile()` RPC implementation details (transaction, validation)
- RLS policy design for the new `profiles` table
- `analyses` unique constraint: `(user_id, listing_id, profile_id)` for per-profile analysis history

</decisions>

<specifics>
## Specific Ideas

- B2B pilot context (Bellevia Immobilien): property managers will manage multiple client searches — schema should support this cleanly
- "Meine Suche" was suggested as a good default profile name (Swiss German market)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/001_initial_schema.sql`: Current schema pattern — new migration follows same conventions (IF NOT EXISTS, RLS policies, uuid primary keys)
- `backend/app/services/supabase.py`: `SupabaseService` reads `user_preferences` and writes `analyses` — Phase 6 updates these to use `profiles` table
- `backend/app/models/preferences.py`: `UserPreferences` Pydantic model — preferences JSONB structure stays the same inside profiles

### Established Patterns
- Supabase CLI migrations in `supabase/migrations/` directory
- RLS policies per table (select/insert/update for own user data via `auth.uid() = user_id`)
- Service role key bypasses RLS in backend (`SUPABASE_SERVICE_ROLE_KEY`)
- UUID primary keys via `gen_random_uuid()`
- JSONB for flexible preference storage (no schema migrations when preference fields change)

### Integration Points
- `user_preferences` table: read by `SupabaseService.get_preferences()` (backend) and `web/src/app/dashboard/actions.ts` (frontend) — both break after drop, fixed in Phase 6
- `analyses` table: unique constraint changes from `(user_id, listing_id)` to `(user_id, listing_id, profile_id)`
- Edge function `score-proxy`: currently passes `user_id` only — Phase 6 adds active profile resolution
- Supabase project: `mlhtozdtiorkemamzjjc` — migration applied via `supabase db push`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-db-schema-migration*
*Context gathered: 2026-03-13*
