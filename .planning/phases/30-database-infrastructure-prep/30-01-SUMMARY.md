---
phase: 30-database-infrastructure-prep
plan: 01
subsystem: database, infra
tags: [supabase, postgres, migrations, ec2, env-vars, openrouter]

# Dependency graph
requires:
  - phase: 29-subjective-scorer-openrouter
    provides: "OpenRouter client and scoring logic that needs OPENROUTER_API_KEY"
provides:
  - "listing_profiles table with 53 columns verified in production Supabase"
  - "research_json column on listing_profiles for raw research data"
  - "fulfillment_data JSONB column on analyses table for v2 scoring"
  - "EC2 .env with OPENROUTER_API_KEY, ALLOW_CLAUDE_FALLBACK=false, SUBJECTIVE_MODEL"
  - "Migration tracking records for 005, 006, 007 in schema_migrations"
affects: [31-hybrid-scorer-router-integration, 32-cache-invalidation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent ALTER TABLE with IF NOT EXISTS for safe re-application"
    - "Migration tracking via supabase_migrations.schema_migrations ON CONFLICT DO NOTHING"

key-files:
  created:
    - supabase/migrations/007_fulfillment_data.sql
  modified:
    - supabase/migrations/005_listing_profiles.sql (committed to repo, already applied to prod)
    - supabase/migrations/006_add_research_json.sql (committed to repo, already applied to prod)

key-decisions:
  - "Skipped checkpoint:human-action for OPENROUTER_API_KEY -- key already existed on EC2 from batch enrichment"
  - "Committed migrations 005 and 006 alongside 007 since they were untracked in git"
  - "DB-01 (schema_version) confirmed as JSONB key in breakdown column -- no DDL needed"

patterns-established:
  - "Remote SQL execution via npx supabase db query --linked for production schema changes"
  - "Migration tracking registration for manually-applied migrations"

requirements-completed: [INT-01, INT-02, DB-01, DB-03]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 30 Plan 01: Database Infrastructure Prep Summary

**Production Supabase migrations (005-007) applied with fulfillment_data column on analyses, EC2 env vars configured for OpenRouter hybrid scoring**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T14:20:43Z
- **Completed:** 2026-03-30T14:26:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Applied migration 007 adding fulfillment_data JSONB column to analyses table
- Verified migrations 005 (listing_profiles) and 006 (research_json) already applied to production
- Registered all three migrations in schema_migrations tracking table
- Configured EC2 .env with ALLOW_CLAUDE_FALLBACK=false and SUBJECTIVE_MODEL=google/gemini-2.5-flash-lite
- Restarted backend -- health check passes, no env var warnings in logs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 007 and apply all migrations to production** - `265e849` (chore)
2. **Task 2: Provide OPENROUTER_API_KEY** - Skipped (key already on EC2)
3. **Task 3: Set EC2 env vars and restart backend** - No file changes (remote SSH operations only)

## Files Created/Modified
- `supabase/migrations/007_fulfillment_data.sql` - Adds fulfillment_data JSONB column to analyses table for v2 scoring data
- `supabase/migrations/005_listing_profiles.sql` - Committed to repo (was untracked; already applied to production)
- `supabase/migrations/006_add_research_json.sql` - Committed to repo (was untracked; already applied to production)

## Decisions Made
- **Skipped human-action checkpoint:** OPENROUTER_API_KEY already existed on EC2 from batch enrichment operations. Only added ALLOW_CLAUDE_FALLBACK and SUBJECTIVE_MODEL.
- **Committed all three migration files:** 005 and 006 were untracked in git despite being applied to production. Committed alongside 007 for completeness.
- **DB-01 confirmed as application-level concern:** schema_version is a JSONB key inside existing breakdown column, not a separate SQL column. Phase 31 handles this at write time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Skipped checkpoint:human-action for OPENROUTER_API_KEY**
- **Found during:** Task 2 (Provide OPENROUTER_API_KEY)
- **Issue:** Plan required user to provide OPENROUTER_API_KEY, but key was already set on EC2 from batch enrichment
- **Fix:** Verified key exists (`grep -c` returned 1), skipped checkpoint, proceeded directly to Task 3
- **Files modified:** None
- **Verification:** `grep OPENROUTER_API_KEY ~/gen-ai-hackathon/backend/.env` shows exactly 1 entry starting with `sk-or-v1-`
- **Committed in:** N/A (no file changes)

---

**Total deviations:** 1 auto-fixed (1 blocking -- checkpoint skip)
**Impact on plan:** Eliminated unnecessary user interaction. No scope creep. All requirements met.

## Issues Encountered
- SSH exit code 255 when pkill terminates the uvicorn process that SSH is connected through. Resolved by splitting kill and start into separate SSH sessions.
- Backend log showed "address already in use" error from a second start attempt, but the first process was already running and healthy.

## Production Verification Results
- `listing_profiles` table: 53 columns, 164 rows, all indexes active
- `research_json` column: present on listing_profiles
- `fulfillment_data` column: present on analyses
- Existing analyses: 127 rows intact, breakdown JSONB readable (scores: 18, 28, 18)
- EC2 .env: OPENROUTER_API_KEY (1), ALLOW_CLAUDE_FALLBACK=false (1), SUBJECTIVE_MODEL=google/gemini-2.5-flash-lite (1)
- Backend health: `{"status":"healthy","service":"homematch-api"}`

## User Setup Required
None - OPENROUTER_API_KEY was already configured on EC2.

## Next Phase Readiness
- All database schema changes deployed and verified
- EC2 environment fully configured for hybrid scoring
- Phase 31 (Hybrid Scorer & Router Integration) can proceed without infrastructure blockers

## Self-Check: PASSED

- FOUND: supabase/migrations/007_fulfillment_data.sql
- FOUND: .planning/phases/30-database-infrastructure-prep/30-01-SUMMARY.md
- FOUND: commit 265e849

---
*Phase: 30-database-infrastructure-prep*
*Completed: 2026-03-30*
