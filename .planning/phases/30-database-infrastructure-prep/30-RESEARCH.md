# Phase 30: Database & Infrastructure Prep - Research

**Researched:** 2026-03-30
**Domain:** Supabase PostgreSQL migrations, EC2 environment configuration, additive schema evolution
**Confidence:** HIGH

## Summary

Phase 30 is a pure infrastructure/deployment phase with zero application code changes. It prepares the production environment for Phase 31 (Hybrid Scorer) by applying four database changes and configuring three environment variables on EC2.

The four database operations are: (1) apply migration 005 to create the `listing_profiles` table with indexes, (2) apply migration 006 to add the `research_json` JSONB column to that table, (3) create a new migration 007 to add `fulfillment_data` JSONB column to the `analyses` table, and (4) within that same migration, document that `schema_version` lives inside the existing `breakdown` JSONB column (no DDL needed -- it is a JSON field written by application code). The three EC2 env vars are `OPENROUTER_API_KEY`, `ALLOW_CLAUDE_FALLBACK=false`, and `SUBJECTIVE_MODEL=google/gemini-2.5-flash-lite`.

All migrations are additive (CREATE TABLE, ALTER TABLE ADD COLUMN). No existing data is modified. No application code changes are needed. The Supabase project is linked (`mlhtozdtiorkemamzjjc`), and the project uses raw SQL migration files applied via the Supabase dashboard SQL editor or `npx supabase db push`. EC2 access is via SSH with the project key.

**Primary recommendation:** Apply migrations via Supabase dashboard SQL editor (copy-paste each file), verify with `\d` queries, then SSH to EC2 to append env vars to `backend/.env`. Verify each step before proceeding.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INT-01 | Supabase migrations 005 (listing_profiles table) and 006 (research_json column) applied to production before hybrid scorer ships | Migration files already exist at `supabase/migrations/005_listing_profiles.sql` and `006_add_research_json.sql`. Both are additive, safe to apply. |
| INT-02 | `OPENROUTER_API_KEY`, `ALLOW_CLAUDE_FALLBACK=false`, and `SUBJECTIVE_MODEL` env vars set on EC2 | Backend code already reads these via `os.environ.get()` in `claude.py` (lines 39, 122) and `openrouter.py` (line 152). Default values handle missing vars gracefully. |
| DB-01 | `schema_version` field added to the `breakdown` JSONB column in the `analyses` table | No DDL migration needed -- `schema_version` is a key inside the existing `breakdown` JSONB blob. Application code in Phase 31 writes `schema_version: 2` into the JSON. Existing rows without this key read as `None`/missing, which Phase 31 cache logic treats as v1. |
| DB-03 | `fulfillment_data` JSONB column added to `analyses` table | New migration 007 adds `ALTER TABLE analyses ADD COLUMN IF NOT EXISTS fulfillment_data jsonb`. Existing rows get NULL. Phase 31 writes structured fulfillment data here. |
</phase_requirements>

## Standard Stack

### Core

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Supabase PostgreSQL | 15.x | Production database | Already running, project linked |
| Supabase CLI | latest via npx | Migration management | `npx supabase` used throughout project |
| SSH | OpenSSH | EC2 access | Standard deployment method per CLAUDE.md |

### Supporting

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| psql/SQL Editor | Supabase dashboard | Run migration SQL directly | For applying migrations when `db push` has issues |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase dashboard SQL editor | `npx supabase db push --linked` | CLI push applies all unapplied migrations at once; dashboard gives per-migration control and immediate verification |
| Appending to .env file | Using systemd env or AWS SSM | .env file is the established pattern (see CLAUDE.md deploy instructions); systemd/SSM adds complexity |

## Architecture Patterns

### Migration File Convention

The project uses numbered SQL files in `supabase/migrations/`:
```
supabase/migrations/
  001_initial_schema.sql          # analyses + user_preferences
  002_profiles_schema.sql         # profiles + analyses rebuild with profile_id FK
  003_add_stale_column.sql        # ALTER TABLE analyses ADD stale
  004_add_nearby_places_cache.sql # CREATE TABLE nearby_places_cache
  005_listing_profiles.sql        # CREATE TABLE listing_profiles (NEW)
  006_add_research_json.sql       # ALTER TABLE listing_profiles ADD research_json (NEW)
  007_fulfillment_data.sql        # ALTER TABLE analyses ADD fulfillment_data (TO CREATE)
```

### Pattern: Additive-Only Schema Changes

All Phase 30 migrations follow the additive pattern:
- `CREATE TABLE IF NOT EXISTS` -- safe to re-run
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` -- safe to re-run
- No `DROP`, `ALTER TYPE`, or `DELETE` statements
- No data migration of existing rows
- Existing rows with NULL in new columns continue to read correctly

### Pattern: JSONB Schema Version (DB-01)

The `schema_version` field lives INSIDE the `breakdown` JSONB column, not as a separate SQL column. This is the existing pattern: the `breakdown` column stores the full `ScoreResponse` as JSON. Phase 31 will write `{"schema_version": 2, ...}` into this blob. Existing v1 entries lack this key, which is equivalent to `schema_version: 1`.

```python
# Phase 31 cache read pattern (for reference -- not implemented in Phase 30)
cached = supabase_service.get_analysis(user_id, profile_id, listing_id)
if cached and cached.get("schema_version", 1) >= 2:
    return ScoreResponse.model_validate(cached)
# else: cache miss, re-score
```

No DDL migration is needed for DB-01. The `breakdown` column is already `jsonb not null default '{}'`.

### Pattern: Separate Structured Column (DB-03)

The `fulfillment_data` JSONB column is a NEW top-level column on the `analyses` table, separate from `breakdown`. This follows the same pattern as migration 003 (adding `stale` column). The purpose is to store structured per-criterion fulfillment data in a queryable format, separate from the opaque `breakdown` blob.

```sql
-- 007_fulfillment_data.sql
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS fulfillment_data jsonb;
```

No default value is needed (NULL is correct for existing rows). No index is needed initially (no queries filter on fulfillment_data).

### EC2 Environment Variable Pattern

The backend reads env vars from `~/gen-ai-hackathon/backend/.env` which is sourced by the Python process. The established pattern from CLAUDE.md:

```bash
ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 \
  "echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/gen-ai-hackathon/backend/.env"
```

Three vars to add:
1. `OPENROUTER_API_KEY` -- the OpenRouter API key (obtain from user)
2. `ALLOW_CLAUDE_FALLBACK=false` -- disable expensive Claude fallback
3. `SUBJECTIVE_MODEL=google/gemini-2.5-flash-lite` -- the OpenRouter model for subjective scoring

### Anti-Patterns to Avoid

- **Running migrations out of order:** 006 depends on 005 (adds column to `listing_profiles` table). Always apply in numerical order.
- **Using `db push` without verifying:** The Supabase CLI push applies ALL unapplied migrations. If earlier migrations were applied manually via SQL editor, the CLI may fail or re-apply them. Check the `_supabase_migrations` tracking table first.
- **Setting ALLOW_CLAUDE_FALLBACK=true:** Default must be `false` to prevent accidental Claude API costs ($0.06/request). Only set to `true` when deliberately enabling the fallback path.
- **Forgetting to restart uvicorn after .env change:** Python reads env vars at process start. Appending to .env without restarting the backend has no effect.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration tracking | Custom migration runner | Supabase built-in migration tracking | Already tracks applied migrations in `_supabase_migrations` table |
| Schema_version column migration | DDL ALTER for schema_version | JSONB key inside existing `breakdown` column | The column already exists as JSONB; adding a key is a write-time concern, not a DDL concern |
| Env var management | AWS SSM / secrets manager | `.env` file on EC2 | Established project pattern, 3 vars only, not worth the complexity |

## Common Pitfalls

### Pitfall 1: Migration 005 Already Partially Applied
**What goes wrong:** If someone ran the `listing_profiles` CREATE TABLE statement manually (e.g., during the batch enrichment process), running migration 005 again may fail or create duplicate indexes.
**Why it happens:** The HANDOFF.md notes that 27 listings from zipcode 8051 are "already saved to Supabase." This implies the table may already exist in production.
**How to avoid:** Check if `listing_profiles` table exists before applying: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listing_profiles');`. If it exists, skip 005 or verify its schema matches the migration file. The `IF NOT EXISTS` clauses in the migration should handle this, but verify index and trigger creation too.
**Warning signs:** `relation "listing_profiles" already exists` errors.

### Pitfall 2: Supabase Migration Tracking Mismatch
**What goes wrong:** If migrations 005/006 are applied via the SQL editor (not via `npx supabase db push`), the Supabase CLI migration tracker does not know about them. Future `db push` commands may try to re-apply them.
**Why it happens:** The CLI tracks migrations in `supabase_migrations.schema_migrations`. Manual SQL execution bypasses this tracking.
**How to avoid:** Either apply ALL migrations via `npx supabase db push --linked` (which auto-tracks), OR if using the SQL editor, manually insert tracking records:
```sql
INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('005_listing_profiles');
INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('006_add_research_json');
INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('007_fulfillment_data');
```
**Warning signs:** `npx supabase db push` tries to re-run old migrations.

### Pitfall 3: EC2 .env File Not Sourced by Uvicorn
**What goes wrong:** Appending env vars to `.env` but the running uvicorn process does not pick them up because Python reads env vars at import time.
**Why it happens:** The backend is started with `nohup python -m uvicorn ...` which reads the environment at launch time. Adding to `.env` after launch has no effect unless the file is explicitly loaded (e.g., via `python-dotenv`).
**How to avoid:** Always restart uvicorn after modifying `.env`:
```bash
ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 \
  "pkill -f uvicorn; cd gen-ai-hackathon/backend && nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &"
```
**Warning signs:** Backend logs show `OPENROUTER_API_KEY is not set in environment` after supposedly adding it.

### Pitfall 4: OPENROUTER_API_KEY Needs to be Obtained from User
**What goes wrong:** The research/plan assumes the API key is available, but it is a secret that must be provided by the user.
**Why it happens:** API keys cannot be stored in code or planning documents.
**How to avoid:** Explicitly flag this as a user action item. The planner should include a task that blocks on user input for the API key value.
**Warning signs:** Empty or placeholder API key in .env.

### Pitfall 5: fulfillment_data Column on RLS-Enabled Table
**What goes wrong:** The `analyses` table has RLS policies (see migration 002). Adding a column does not break RLS, but if the column is referenced in future policy updates or the edge function selects it, the RLS policies must allow it.
**Why it happens:** RLS policies on `analyses` use `auth.uid() = user_id` for row-level access. Column additions are transparent to existing policies. The edge function selects `score, breakdown, summary, stale` (line 97 of `score-proxy/index.ts`).
**How to avoid:** The new `fulfillment_data` column is additive. No RLS policy changes needed. The edge function does NOT need to select this column initially. Phase 31 will update the edge function if needed.
**Warning signs:** None expected -- this is a non-issue if understood correctly.

## Code Examples

### Migration 005: listing_profiles (Already Exists)

```sql
-- Source: supabase/migrations/005_listing_profiles.sql
-- 106 lines, creates listing_profiles table with:
-- - 30+ columns for objective, AI-analyzed, and proximity data
-- - Unique constraint on listing_id
-- - Indexes: listing_id, (latitude, longitude), (offer_type, canton)
-- - Auto-update trigger for updated_at
-- - No RLS (system-wide, backend uses service_role key)
```

### Migration 006: research_json (Already Exists)

```sql
-- Source: supabase/migrations/006_add_research_json.sql
ALTER TABLE listing_profiles
  ADD COLUMN IF NOT EXISTS research_json jsonb;
```

### Migration 007: fulfillment_data (TO CREATE)

```sql
-- 007_fulfillment_data.sql
-- Phase 30: Add fulfillment_data column to analyses table for v2 scoring data.
-- Stores per-criterion fulfillment results as structured JSONB.
-- Existing rows get NULL (no backfill needed).

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS fulfillment_data jsonb;

COMMENT ON COLUMN analyses.fulfillment_data IS
  'Structured per-criterion fulfillment data from v2 hybrid scoring pipeline';
```

### EC2 Environment Variable Setup

```bash
# SSH to EC2 and append env vars to backend .env
ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 "cat >> ~/gen-ai-hackathon/backend/.env << 'EOF'
OPENROUTER_API_KEY=<user-provides-key>
ALLOW_CLAUDE_FALLBACK=false
SUBJECTIVE_MODEL=google/gemini-2.5-flash-lite
EOF"
```

### Verification Queries

```sql
-- Verify listing_profiles table exists with expected columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_profiles'
ORDER BY ordinal_position;

-- Verify research_json column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'listing_profiles' AND column_name = 'research_json';

-- Verify fulfillment_data column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'analyses' AND column_name = 'fulfillment_data';

-- Verify indexes on listing_profiles
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'listing_profiles';

-- Verify existing data not corrupted (should return existing row count)
SELECT count(*) FROM analyses;
SELECT count(*) FROM listing_profiles;

-- Verify existing analyses still readable (breakdown JSONB intact)
SELECT id, breakdown->>'overall_score' as score FROM analyses LIMIT 3;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All scoring via Claude per-request | Hybrid: deterministic + subjective | v5.0 (current) | Requires ListingProfile table + env vars |
| ScoreResponse v1 (categories) | ScoreResponse v2 (criteria_results, schema_version) | v5.0 Phase 31 | Requires fulfillment_data column + schema_version in breakdown JSONB |
| No OpenRouter integration | OpenRouter for subjective scoring | v5.0 Phase 29 | Requires OPENROUTER_API_KEY env var |

**Key context:** Migrations 005 and 006 support the ListingProfile data layer that already has 27 enriched listings (zipcode 8051). Migration 007 and the schema_version JSONB key support the v2 scoring response that Phase 31 will produce.

## Open Questions

1. **Does the listing_profiles table already exist in production?**
   - What we know: HANDOFF.md says 27 listings were "already saved to Supabase" from the batch enrichment process. This implies the table was created manually.
   - What's unclear: Whether it was created with the exact schema from migration 005 or a variant.
   - Recommendation: Query production DB to check. If it exists, verify schema matches. If not, apply migration 005.

2. **What is the OPENROUTER_API_KEY value?**
   - What we know: The key format is `sk-or-...` per OpenRouter convention.
   - What's unclear: The actual key value. This is a user secret.
   - Recommendation: The planner must include a task that asks the user for this value. Cannot be automated.

3. **Should the backend be restarted after env var changes?**
   - What we know: YES. Python reads `.env` at process start. The deploy command in CLAUDE.md includes `pkill -f uvicorn` + restart.
   - What's unclear: Whether `python-dotenv` auto-loads .env at import time (it does in many FastAPI setups).
   - Recommendation: Always restart after .env changes. The standard deploy command handles this.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (backend) |
| Config file | `backend/pytest.ini` or inline config |
| Quick run command | `cd backend && python -m pytest tests/ -x --timeout=10` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | Migrations 005/006 applied to production | manual-only | N/A -- verify via SQL query on production DB | N/A |
| INT-02 | Env vars set on EC2 | manual-only | N/A -- verify via SSH grep of .env file | N/A |
| DB-01 | schema_version in breakdown JSONB | manual-only | N/A -- no DDL; verified by Phase 31 code writing the key | N/A |
| DB-03 | fulfillment_data column exists on analyses | manual-only | N/A -- verify via SQL query on production DB | N/A |

**Justification for manual-only:** Phase 30 is entirely infrastructure deployment (apply SQL migrations to production DB, configure env vars on EC2). These are operational tasks verified by querying the production environment, not by running unit tests. There are no application code changes to test.

### Sampling Rate
- **Per task:** Verify via SQL query after each migration
- **Phase gate:** All four verification queries must pass before Phase 31 begins

### Wave 0 Gaps
None -- Phase 30 has no application code changes requiring test infrastructure.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/005_listing_profiles.sql` -- full migration SQL reviewed
- `supabase/migrations/006_add_research_json.sql` -- full migration SQL reviewed
- `supabase/migrations/001_initial_schema.sql` -- analyses table original schema
- `supabase/migrations/002_profiles_schema.sql` -- analyses table with profile_id FK
- `supabase/migrations/003_add_stale_column.sql` -- ALTER TABLE ADD COLUMN pattern
- `supabase/functions/score-proxy/index.ts` -- edge function cache read (`select("score, breakdown, summary, stale")`)
- `backend/app/services/supabase.py` -- `save_analysis()` and `get_analysis()` patterns
- `backend/app/services/claude.py` -- env var reads (OPENROUTER_API_KEY, SUBJECTIVE_MODEL)
- `backend/app/services/openrouter.py` -- env var reads (OPENROUTER_API_KEY)
- `.planning/REQUIREMENTS.md` -- INT-01, INT-02, DB-01, DB-03 requirements
- `.planning/ROADMAP.md` -- Phase 30 success criteria
- `.planning/HANDOFF.md` -- migration status ("Not applied"), existing enriched data context
- `CLAUDE.md` -- SSH deploy commands, Supabase project ref

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` -- feature landscape analysis confirming migration ordering
- `.planning/research/PITFALLS.md` -- pitfall analysis for input model mismatch (Phase 31 concern, not Phase 30)
- `.planning/research/STACK.md` -- env var patterns, model constant update

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools (Supabase CLI, SSH, SQL) are already in use
- Architecture: HIGH -- migration patterns follow exact conventions from migrations 001-004
- Pitfalls: HIGH -- identified from direct codebase analysis and HANDOFF.md status notes

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable infrastructure, no version-sensitive components)
