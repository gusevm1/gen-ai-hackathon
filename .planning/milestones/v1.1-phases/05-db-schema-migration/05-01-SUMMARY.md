---
phase: 05-db-schema-migration
plan: 01
subsystem: database
tags: [postgres, supabase, rls, rpc, migration, profiles, jsonb]

# Dependency graph
requires:
  - phase: 04-extension-ui
    provides: v1.0 complete (clean slate for schema migration)
provides:
  - profiles table with JSONB preferences and partial unique index for one-active-per-user
  - analyses table with profile_id FK and expanded unique constraint (user_id, listing_id, profile_id)
  - set_active_profile() RPC for atomic active-profile switching
  - RLS policies on both tables restricting access to own rows
affects: [06-backend-edge-function, 08-ui-foundation, 09-web-profile-management, 10-extension-profile-switcher]

# Tech tracking
tech-stack:
  added: [moddatetime extension]
  patterns: [SECURITY DEFINER with empty search_path, subselect auth.uid() for RLS performance, partial unique index for business constraint]

key-files:
  created:
    - supabase/migrations/002_profiles_schema.sql
  modified: []

key-decisions:
  - "Schema-qualify moddatetime as extensions.moddatetime() for remote Supabase compatibility"
  - "Clean-slate migration: drop legacy tables before creating new ones (only test data existed)"
  - "Partial unique index enforces one-active-profile-per-user at DB level instead of application logic"

patterns-established:
  - "RLS subselect pattern: (SELECT auth.uid()) = user_id for query planner performance"
  - "SECURITY DEFINER + SET search_path = '' for RPC functions with fully qualified table references"
  - "TO authenticated role target on all RLS policies"

requirements-completed: [PROF-07]

# Metrics
duration: ~25min
completed: 2026-03-13
---

# Phase 5 Plan 01: Profiles Schema Migration Summary

**Multi-profile Postgres schema with profiles table, JSONB preferences, partial unique index, set_active_profile() RPC, and profile-aware analyses FK -- deployed to remote Supabase**

## Performance

- **Duration:** ~25 min (across checkpoint pause)
- **Started:** 2026-03-13
- **Completed:** 2026-03-13
- **Tasks:** 2 (1 auto + 1 checkpoint-verify)
- **Files modified:** 1

## Accomplishments
- Created 144-line migration file with all 7 sections (drop, extensions, profiles, analyses, profiles RLS, analyses RLS, RPC)
- Profiles table supports multiple profiles per user with JSONB preferences and partial unique index enforcing one active per user
- set_active_profile() RPC atomically switches active profile with ownership validation via auth.uid()
- Analyses table has profile_id FK with expanded 3-column unique constraint enabling per-profile analysis history
- 7 RLS policies (4 profiles + 3 analyses) restrict access to authenticated users' own rows
- Legacy user_preferences and analyses tables dropped cleanly
- Migration deployed and verified on remote Supabase project

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the profiles schema migration file** - `7f4b647` (feat)
2. **Task 1 fix: Schema-qualify moddatetime for remote Supabase** - `8af5bd1` (fix)
3. **Task 2: Deploy migration and verify remote schema** - user-verified checkpoint (no code commit)

## Files Created/Modified
- `supabase/migrations/002_profiles_schema.sql` - Complete multi-profile schema migration (144 lines): drops legacy tables, creates profiles + analyses tables, RLS policies, indexes, moddatetime trigger, set_active_profile() RPC

## Decisions Made
- **Schema-qualify moddatetime:** Used `extensions.moddatetime()` instead of bare `moddatetime()` because remote Supabase requires schema-qualified extension function references (local Supabase CLI was more permissive)
- **Clean-slate migration:** Dropped legacy tables before creating new ones since only test data existed -- simplest path to correct schema
- **Partial unique index:** Enforces at most one `is_default = true` per user at the database level, preventing application-level race conditions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Schema-qualify moddatetime for remote Supabase**
- **Found during:** Task 2 (deployment to remote Supabase)
- **Issue:** `supabase db push` failed because remote Supabase could not resolve bare `moddatetime` function -- requires schema-qualified `extensions.moddatetime()`
- **Fix:** Changed `EXECUTE PROCEDURE moddatetime(updated_at)` to `EXECUTE PROCEDURE extensions.moddatetime(updated_at)` in the trigger definition
- **Files modified:** `supabase/migrations/002_profiles_schema.sql`
- **Verification:** `supabase db push` succeeded after fix; all 5 verification queries confirmed correct in Supabase Studio
- **Committed in:** `8af5bd1`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for remote deployment compatibility. No scope creep.

## Issues Encountered
None beyond the moddatetime schema qualification (documented as deviation above).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database schema fully supports multi-profile features for all downstream phases (6-10)
- Phase 6 can begin: backend + edge function need to query profiles table and resolve active profile
- Phase 8 can reference profiles table for navbar profile display
- All RLS policies in place -- no additional security setup needed

## Self-Check: PASSED

- FOUND: supabase/migrations/002_profiles_schema.sql
- FOUND: commit 7f4b647 (Task 1)
- FOUND: commit 8af5bd1 (Task 1 fix)
- FOUND: 05-01-SUMMARY.md

---
*Phase: 05-db-schema-migration*
*Completed: 2026-03-13*
