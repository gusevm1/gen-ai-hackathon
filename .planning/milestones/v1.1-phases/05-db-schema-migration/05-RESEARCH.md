# Phase 5: DB Schema Migration - Research

**Researched:** 2026-03-13
**Domain:** PostgreSQL schema design, Supabase migrations, RLS policies, PL/pgSQL RPC functions
**Confidence:** HIGH

## Summary

Phase 5 is a clean-slate database schema migration. The existing `user_preferences` and `analyses` tables are dropped (only 2 test users -- no real data) and replaced with a `profiles` table (multi-profile per user, JSONB preferences, active-profile tracking) and a recreated `analyses` table with `profile_id` foreign key. An atomic `set_active_profile()` PL/pgSQL function handles profile switching in a single transaction.

The migration is straightforward PostgreSQL DDL with well-understood patterns: partial unique indexes for "at most one active per user," SECURITY DEFINER RPC for atomic deactivation/activation, and standard Supabase RLS policies. All of this goes into a single migration file (`002_profiles_schema.sql`) deployed via `supabase db push`.

**Primary recommendation:** Use a single SQL migration file with DROP/CREATE/RLS/RPC sections, leveraging PostgreSQL 17's native partial unique index and PL/pgSQL function capabilities. No external libraries or tools needed beyond the Supabase CLI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Clean slate: drop both `user_preferences` and `analyses` tables entirely
- Only 2 test users exist -- no real data to preserve, no backfill needed
- No compatibility shims or views -- accept brief scoring downtime until Phase 6 deploys
- Fresh `profiles` and `analyses` tables created from scratch
- Single migration file: `supabase/migrations/002_profiles_schema.sql`
- Follows existing pattern (001_initial_schema.sql already in repo)
- Drops old tables, creates `profiles` table, recreates `analyses` with `profile_id` FK, adds RLS policies, creates `set_active_profile()` RPC -- all in one file
- Applied via `supabase db push` (Supabase CLI)
- No seed data -- tables start empty

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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROF-07 | DB schema supports multiple profiles per user with atomic active-profile switching via Postgres RPC | Full research coverage: profiles table design, partial unique index for single-active enforcement, `set_active_profile()` PL/pgSQL function with SECURITY DEFINER, analyses FK, RLS policies. All patterns verified against PostgreSQL 17 docs and Supabase official documentation. |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PostgreSQL | 17.6 | Database engine (Supabase-hosted) | Already running; confirmed via `supabase/.temp/postgres-version` |
| Supabase CLI | latest | Migration deployment via `supabase db push` | Established pattern from Phase 1 (001_initial_schema.sql) |
| PL/pgSQL | built-in | Procedural language for RPC function | Native PostgreSQL; no extensions needed for function logic |
| moddatetime | extension | Auto-update `updated_at` on row changes | Supabase built-in extension; standard pattern for timestamp management |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `supabase db push` | Deploy migration to remote project | After writing and reviewing the SQL file |
| `supabase link` | Connect CLI to remote project | Before first push (likely already linked from Phase 1) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Partial unique index | Application-level check | Index is database-enforced, race-condition-proof; app-level can have concurrent violations |
| SECURITY DEFINER RPC | Service-role key in backend | RPC is callable from JS client directly; keeps profile switching on frontend without backend roundtrip |
| moddatetime extension | Custom trigger function | moddatetime is purpose-built, less code, well-tested |
| Single migration file | Multiple files | Context decided single file; simpler for clean-slate migration |

**Installation:**
```bash
# No new packages needed -- this is pure SQL/DDL work
# Supabase CLI should already be installed and linked from Phase 1
supabase link  # if not already linked
supabase db push  # deploy migration
```

## Architecture Patterns

### Migration File Structure
```
supabase/migrations/
  001_initial_schema.sql    # Existing (Phase 1)
  002_profiles_schema.sql   # NEW (Phase 5) -- single file, all changes
```

### Recommended Table Schema

#### `profiles` table
```sql
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Meine Suche',
  preferences jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

**Design decisions (Claude's discretion):**

1. **Column `name`**: `text not null` with a CHECK constraint for max length. Recommendation: `check (char_length(name) between 1 and 100)` -- 100 chars is generous for profile names, prevents empty strings.

2. **Column `is_default`**: Named `is_default` (matching the roadmap/success criteria language), not `is_active`. This boolean marks the single active profile per user.

3. **Default profile name**: `'Meine Suche'` (Swiss German market, per CONTEXT.md specific idea from user). This is the DEFAULT value -- users can rename later.

4. **Metadata fields (description, color)**: Recommend deferring to Phase 9. Adding columns later is trivial (ALTER TABLE ADD COLUMN). Keeping Phase 5 minimal reduces scope and the columns would be unused until the profile management UI exists.

5. **Max profiles per user**: Recommend enforcing via a CHECK-like trigger, capped at 10. This prevents abuse while being generous for the B2B pilot (property managers with multiple client searches). Enforced in the `set_active_profile()` RPC or a separate `create_profile()` helper. A simple approach: validate count in application code (Phase 9) rather than a database trigger -- simpler, and the count limit is a soft business rule not a data integrity constraint.

6. **ON DELETE CASCADE from auth.users**: When a Supabase user is deleted, all their profiles are automatically removed. Matches the existing pattern in 001_initial_schema.sql.

#### `analyses` table (recreated)
```sql
create table analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  listing_id text not null,
  score numeric not null,
  breakdown jsonb not null default '{}',
  summary text,
  created_at timestamptz default now() not null,
  unique(user_id, listing_id, profile_id)
);
```

**Key change**: `profile_id` FK added, unique constraint expanded from `(user_id, listing_id)` to `(user_id, listing_id, profile_id)`. ON DELETE CASCADE on `profile_id` means deleting a profile also deletes its analyses -- correct behavior for Phase 9 profile deletion.

### Pattern 1: Partial Unique Index (One Active Profile Per User)

**What:** A partial unique index ensures at most one row with `is_default = true` per user.
**When to use:** Whenever you need "at most one X per Y" with a boolean flag.
**Source:** [PostgreSQL 17 Partial Indexes docs](https://www.postgresql.org/docs/17/indexes-partial.html)

```sql
-- Enforces: at most one profile with is_default = true per user_id
create unique index idx_profiles_one_default_per_user
  on profiles (user_id)
  where (is_default = true);
```

This is the canonical PostgreSQL pattern. Multiple profiles can have `is_default = false`, but only one per user can have `is_default = true`. Any attempt to set a second profile as default (without unsetting the first) will raise a unique violation error -- which is exactly what makes the `set_active_profile()` RPC necessary.

### Pattern 2: Atomic Profile Switching RPC

**What:** A PL/pgSQL function that deactivates the current default and activates the new one in a single transaction.
**When to use:** Called from the JS client via `supabase.rpc('set_active_profile', { ... })`.
**Source:** [Supabase Database Functions docs](https://supabase.com/docs/guides/database/functions)

```sql
create or replace function set_active_profile(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- Look up the profile and verify ownership
  select user_id into v_user_id
    from public.profiles
    where id = target_profile_id;

  if v_user_id is null then
    raise exception 'Profile not found';
  end if;

  -- Verify the caller owns this profile
  if v_user_id != auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Deactivate current default (if any)
  update public.profiles
    set is_default = false, updated_at = now()
    where user_id = v_user_id
      and is_default = true;

  -- Activate the target profile
  update public.profiles
    set is_default = true, updated_at = now()
    where id = target_profile_id;
end;
$$;
```

**Why SECURITY DEFINER:** The function needs to update `is_default` on rows the user owns. With SECURITY INVOKER (default), RLS UPDATE policies would apply -- which is fine for the user's own rows. However, SECURITY DEFINER is safer here because:
1. The function performs its own ownership validation (`auth.uid()` check)
2. It prevents partial-state issues if RLS policies ever change
3. It guarantees atomicity without RLS interference
4. The `set search_path = ''` prevents search_path injection attacks

**Transaction behavior:** PostgREST (which Supabase uses) wraps every RPC call in a transaction. The PL/pgSQL function body is also atomic. If either UPDATE fails, both are rolled back.

### Pattern 3: RLS Policies for User-Owned Data

**What:** Row-level security policies restricting each user to their own profiles and analyses.
**Source:** [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

```sql
-- Profiles: users can view, insert, update, delete their own
alter table profiles enable row level security;

create policy "Users can view own profiles"
  on profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own profiles"
  on profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own profiles"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own profiles"
  on profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

**Improvement over Phase 1:** Add `to authenticated` role target (best practice from Supabase docs) and wrap `auth.uid()` in a subselect `(select auth.uid())` for better query planner performance. Also add DELETE policy (needed for Phase 9 profile deletion). The existing 001_initial_schema.sql omitted the role and subselect -- not a problem, but the new migration should follow current best practices.

### Pattern 4: Auto-Update Timestamps

**What:** Use the `moddatetime` extension to automatically update `updated_at` on row changes.
**Source:** [Supabase auto-update timestamps](https://supabase-sql.vercel.app/automatically-update-timestamp)

```sql
-- Enable the moddatetime extension (if not already enabled)
create extension if not exists moddatetime schema extensions;

-- Auto-update updated_at on profiles changes
create trigger handle_profiles_updated_at
  before update on profiles
  for each row
  execute procedure moddatetime(updated_at);
```

Note: The `set_active_profile()` RPC manually sets `updated_at = now()` for clarity, but the trigger would catch it too. Having both is harmless -- the trigger fires after the function sets the value, overwriting it with `now()` which is the same value within the transaction.

### Anti-Patterns to Avoid

- **Application-level active profile enforcement:** Never rely on application code to ensure only one default profile. Use the partial unique index -- it is race-condition-proof.
- **Separate "active profile" column on users table:** Adds a join and cross-table consistency problem. The `is_default` boolean on profiles is simpler and self-contained.
- **Using `is_active` instead of `is_default`:** The roadmap, success criteria, and Phase 6 all reference `is_default`. Keep naming consistent across the project.
- **Skipping SECURITY DEFINER on the RPC:** Without it, the two-UPDATE pattern could partially succeed if RLS policies are misconfigured, leaving the user with zero or two default profiles.
- **Creating the function in a public API-exposed schema without DEFINER protections:** Always set `search_path = ''` and use fully qualified table names (`public.profiles`) in SECURITY DEFINER functions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auto-update timestamps | Custom trigger function | `moddatetime` extension | Built-in, well-tested, single line |
| One-active-per-user constraint | Application-level checks | Partial unique index | Database-enforced, race-condition-proof |
| Atomic multi-row update | Two separate API calls | PL/pgSQL function (RPC) | Single transaction, automatic rollback on failure |
| UUID generation | Application-side UUID | `gen_random_uuid()` | Native PostgreSQL, no round-trip |

**Key insight:** This phase is pure PostgreSQL DDL and PL/pgSQL. Every requirement is solved by built-in PostgreSQL features or Supabase-bundled extensions. No external libraries, no application code, no custom tooling.

## Common Pitfalls

### Pitfall 1: Forgetting to Drop Old RLS Policies
**What goes wrong:** `DROP TABLE` automatically drops RLS policies and indexes, so this is NOT actually a pitfall for clean-slate drops. However, if using `ALTER TABLE` instead, old policies would remain.
**Why it happens:** Confusion about whether DROP TABLE cascades to policies.
**How to avoid:** Since the context locks clean-slate drops, this is a non-issue. `DROP TABLE IF EXISTS` handles everything.
**Warning signs:** None -- just be aware that `DROP TABLE` is all-or-nothing.

### Pitfall 2: Partial Unique Index Not Covering NULL
**What goes wrong:** If `is_default` is nullable, rows with `is_default = NULL` bypass the partial index entirely.
**Why it happens:** PostgreSQL treats NULL as neither true nor false.
**How to avoid:** Define `is_default boolean not null default false`. The `not null` constraint ensures every row has an explicit true/false value, so the partial index `WHERE (is_default = true)` correctly governs all "active" rows.
**Warning signs:** Profiles appearing with NULL is_default -- would mean constraint is silently bypassed.

### Pitfall 3: RPC Function Not Validating Ownership
**What goes wrong:** If `set_active_profile()` doesn't verify `auth.uid() = user_id`, a malicious user could activate another user's profile.
**Why it happens:** SECURITY DEFINER bypasses RLS, so ownership checks must be explicit in the function body.
**How to avoid:** Always check `auth.uid()` against the profile's `user_id` before performing updates.
**Warning signs:** Any SECURITY DEFINER function without explicit authorization checks.

### Pitfall 4: Foreign Key Direction on analyses.profile_id
**What goes wrong:** If `ON DELETE` behavior is wrong, deleting a profile either orphans analyses (SET NULL) or blocks deletion (RESTRICT).
**Why it happens:** Default FK behavior is NO ACTION (similar to RESTRICT).
**How to avoid:** Use `ON DELETE CASCADE` -- when a profile is deleted, its analyses should be deleted too. This matches the user-level cascade pattern already in place.
**Warning signs:** Phase 9 profile deletion failing with FK constraint errors.

### Pitfall 5: Migration File Naming
**What goes wrong:** Supabase CLI expects migrations in timestamp-prefixed format (e.g., `20260313000000_profiles_schema.sql`), but the project uses sequential numbering (`001_`, `002_`).
**Why it happens:** The project established its own naming convention in Phase 1.
**How to avoid:** Follow the existing convention: `002_profiles_schema.sql`. The Supabase CLI applies migrations in alphabetical order, so sequential numbering works fine. The `supabase db push` command will detect and apply new migration files.
**Warning signs:** Migration not being picked up by `supabase db push` -- would indicate a naming or tracking issue.

### Pitfall 6: Scoring Downtime Between Phase 5 and Phase 6
**What goes wrong:** After Phase 5 drops `user_preferences` and `analyses`, the backend's `SupabaseService.get_preferences()` will fail (table doesn't exist), and the edge function/extension scoring will be broken.
**Why it happens:** Expected -- the CONTEXT explicitly accepts "brief scoring downtime until Phase 6 deploys."
**How to avoid:** This is a known accepted trade-off, not a bug. Phase 6 updates the backend to query `profiles` instead of `user_preferences`.
**Warning signs:** If Phase 6 is delayed significantly, scoring remains broken.

## Code Examples

### Complete Migration File Structure

```sql
-- 002_profiles_schema.sql
-- Phase 5: DB Schema Migration - Multi-profile support
-- Drops legacy tables (clean slate), creates profiles + analyses with profile FK

-- ============================================================
-- 1. Drop legacy tables (clean slate -- only test data exists)
-- ============================================================
drop table if exists analyses;
drop table if exists user_preferences;

-- ============================================================
-- 2. Enable extensions
-- ============================================================
create extension if not exists moddatetime schema extensions;

-- ============================================================
-- 3. Create profiles table
-- ============================================================
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Meine Suche'
    check (char_length(name) between 1 and 100),
  preferences jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enforce at most one default profile per user
create unique index idx_profiles_one_default_per_user
  on profiles (user_id)
  where (is_default = true);

-- Performance index for user lookups
create index idx_profiles_user_id on profiles (user_id);

-- Auto-update updated_at
create trigger handle_profiles_updated_at
  before update on profiles
  for each row
  execute procedure moddatetime(updated_at);

-- ============================================================
-- 4. Create analyses table (with profile_id FK)
-- ============================================================
create table analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  listing_id text not null,
  score numeric not null,
  breakdown jsonb not null default '{}',
  summary text,
  created_at timestamptz default now() not null,
  unique(user_id, listing_id, profile_id)
);

-- Performance index for profile lookups
create index idx_analyses_profile_id on analyses (profile_id);

-- ============================================================
-- 5. RLS policies -- profiles
-- ============================================================
alter table profiles enable row level security;

create policy "Users can view own profiles"
  on profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own profiles"
  on profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own profiles"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own profiles"
  on profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- 6. RLS policies -- analyses
-- ============================================================
alter table analyses enable row level security;

create policy "Users can view own analyses"
  on analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own analyses"
  on analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own analyses"
  on analyses for update
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- 7. RPC: Atomic profile switching
-- ============================================================
create or replace function set_active_profile(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- Look up the profile and verify it exists
  select user_id into v_user_id
    from public.profiles
    where id = target_profile_id;

  if v_user_id is null then
    raise exception 'Profile not found';
  end if;

  -- Verify the caller owns this profile
  if v_user_id != auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Deactivate all defaults for this user
  update public.profiles
    set is_default = false
    where user_id = v_user_id
      and is_default = true;

  -- Activate the target profile
  update public.profiles
    set is_default = true
    where id = target_profile_id;
end;
$$;
```

### Calling the RPC from JavaScript (Phase 6+ reference)
```typescript
// Source: https://supabase.com/docs/reference/javascript/rpc
const { error } = await supabase.rpc('set_active_profile', {
  target_profile_id: 'some-uuid-here'
});
if (error) console.error('Profile switch failed:', error.message);
```

### Calling the RPC from Python (Phase 6+ reference)
```python
# Source: https://supabase.com/docs/reference/python/rpc
response = supabase_client.rpc(
    'set_active_profile',
    {'target_profile_id': 'some-uuid-here'}
).execute()
```

### Querying the Active Profile (Phase 6+ reference)
```typescript
// Get the active profile for the logged-in user
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('is_default', true)
  .single();
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v1.1 Phase 5) | When Changed | Impact |
|---------------------|---------------------------------|--------------|--------|
| `user_preferences` table (one row per user) | `profiles` table (many rows per user) | Phase 5 | Enables multi-profile search |
| `analyses` unique on `(user_id, listing_id)` | Unique on `(user_id, listing_id, profile_id)` | Phase 5 | Per-profile analysis history |
| No profile concept | `is_default` boolean + partial unique index | Phase 5 | Database-enforced single active profile |
| No RPC functions | `set_active_profile()` PL/pgSQL | Phase 5 | Atomic profile switching |

**Deprecated/outdated after this phase:**
- `user_preferences` table: dropped entirely (replaced by `profiles.preferences` JSONB column)
- `analyses` with `(user_id, listing_id)` constraint: replaced with 3-column constraint

## Open Questions

1. **Max profiles per user limit**
   - What we know: B2B pilot with property managers suggests multiple profiles per user is core functionality. No hard limit specified in requirements.
   - What's unclear: Whether to enforce a limit at DB level (trigger) or app level (Phase 9 UI).
   - Recommendation: Defer to Phase 9 application code. A DB trigger adds complexity for a soft business rule. If needed later, adding a trigger is non-destructive.

2. **moddatetime extension availability on remote Supabase**
   - What we know: moddatetime is listed as a built-in Supabase extension. Works in local dev.
   - What's unclear: Whether it needs to be explicitly enabled on the hosted project first.
   - Recommendation: Include `create extension if not exists moddatetime schema extensions;` in the migration. The `if not exists` clause makes it idempotent.

3. **Analyses DELETE policy**
   - What we know: Phase 1's analyses table had no DELETE policy. The backend uses service role (bypasses RLS).
   - What's unclear: Whether Phase 9 profile deletion (which cascades to analyses) needs an explicit DELETE RLS policy on analyses.
   - Recommendation: CASCADE deletes bypass RLS (they happen at the FK constraint level, not through the API). No DELETE policy on analyses is needed for Phase 5. Can be added in Phase 9 if direct client-side deletion is required.

## Validation Architecture

> Note: `workflow.nyquist_validation` is not set in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | PostgreSQL migration validation (SQL-based, no test framework) |
| Config file | None -- pure SQL migration, validated by `supabase db push` success |
| Quick run command | `supabase db push --dry-run` (if supported) or manual SQL review |
| Full suite command | `supabase db push` + manual verification via Supabase Studio |

### Phase Requirements --> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-07a | Profiles table created with correct schema | smoke | `supabase db push` succeeds without errors | N/A -- migration file is the test |
| PROF-07b | Partial unique index enforces one default per user | manual | Insert two `is_default = true` rows for same user -- expect unique violation | Manual SQL |
| PROF-07c | `set_active_profile()` atomically switches default | manual | Call RPC, verify old profile deactivated and new one activated | Manual SQL |
| PROF-07d | Analyses table has `profile_id` FK with correct unique constraint | smoke | `supabase db push` succeeds + verify constraint in Studio | N/A -- migration file is the test |

### Sampling Rate
- **Per task commit:** Review SQL syntax; `supabase db push` to remote
- **Per wave merge:** N/A -- single migration file
- **Phase gate:** Migration applied successfully, manual verification of constraints via Supabase Studio SQL editor

### Wave 0 Gaps
- [ ] `supabase/migrations/002_profiles_schema.sql` -- the migration file itself (the entire deliverable)
- [ ] Verify Supabase CLI is linked to remote project: `supabase link`
- [ ] Verify moddatetime extension is available: `create extension if not exists moddatetime schema extensions;`

## Sources

### Primary (HIGH confidence)
- [PostgreSQL 17 Partial Indexes documentation](https://www.postgresql.org/docs/17/indexes-partial.html) -- partial unique index syntax and boolean column pattern
- [PostgreSQL 17 Unique Indexes documentation](https://www.postgresql.org/docs/17/indexes-unique.html) -- unique index enforcement behavior
- [PostgreSQL 17 CREATE INDEX documentation](https://www.postgresql.org/docs/current/sql-createindex.html) -- CREATE UNIQUE INDEX WHERE syntax
- [Supabase Database Functions docs](https://supabase.com/docs/guides/database/functions) -- PL/pgSQL function creation, SECURITY DEFINER vs INVOKER, search_path
- [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- auth.uid() usage, policy types, performance best practices
- [Supabase Database Migrations docs](https://supabase.com/docs/guides/deployment/database-migrations) -- supabase db push workflow
- [Supabase JavaScript RPC reference](https://supabase.com/docs/reference/javascript/rpc) -- client-side function calling
- [Supabase Python RPC reference](https://supabase.com/docs/reference/python/rpc) -- Python client RPC calling
- [Supabase Cascade Deletes docs](https://supabase.com/docs/guides/database/postgres/cascade-deletes) -- ON DELETE CASCADE behavior

### Secondary (MEDIUM confidence)
- [Supabase moddatetime pattern](https://supabase-sql.vercel.app/automatically-update-timestamp) -- auto-update timestamps via extension
- [Supabase RPC transactions discussion](https://dev.to/voboda/gotcha-supabase-postgrest-rpc-with-transactions-45a7) -- PostgREST transaction wrapping behavior
- [Supabase atomicity with RPC](https://openillumi.com/en/en-supabase-transaction-rpc-atomicity/) -- PL/pgSQL automatic rollback on error

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- PostgreSQL 17 confirmed, Supabase CLI established, all patterns from official docs
- Architecture: HIGH -- Partial unique index, PL/pgSQL RPC, and RLS are well-documented PostgreSQL features used exactly as intended
- Pitfalls: HIGH -- All pitfalls are well-known PostgreSQL patterns with documented solutions

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- PostgreSQL DDL patterns rarely change)
