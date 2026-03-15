---
phase: 05-db-schema-migration
verified: 2026-03-13T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
human_verification:
  - test: "Confirm supabase db push succeeded against remote Supabase project (ref: mlhtozdtiorkemamzjjc)"
    expected: "Migration applies without errors; profiles and analyses tables exist; user_preferences table is absent; partial unique index idx_profiles_one_default_per_user exists; set_active_profile function exists in public schema"
    why_human: "Remote Supabase deployment cannot be verified programmatically — SUMMARY documents it was confirmed in Supabase Studio but the verifier cannot re-query the remote DB"
  - test: "Call set_active_profile() twice for the same user (once to set profile A active, once to set profile B active) and verify only one profile has is_default = true"
    expected: "After each call exactly one row per user has is_default = true; the old default is cleared; the new target is activated"
    why_human: "Atomicity under concurrent calls and the PL/pgSQL transaction boundary require live DB execution to verify behaviorally"
---

# Phase 5: DB Schema Migration Verification Report

**Phase Goal:** Create the multi-profile database schema migration — profiles table with JSONB preferences and atomic active-profile switching, analyses table with profile_id FK, RLS policies, and set_active_profile() RPC function.
**Verified:** 2026-03-13
**Status:** human_needed (all automated checks PASSED; 2 items need human confirmation of remote deployment)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | profiles table exists with columns id, user_id, name, preferences (JSONB), is_default, created_at, updated_at | VERIFIED | Lines 19-28: all 7 columns present with correct types and constraints |
| 2 | At most one profile per user can have is_default = true, enforced by a partial unique index | VERIFIED | Lines 31-33: `CREATE UNIQUE INDEX idx_profiles_one_default_per_user ON profiles (user_id) WHERE (is_default = true)` |
| 3 | Calling set_active_profile(target_profile_id) atomically deactivates the old default and activates the new one | VERIFIED | Lines 134-142: two UPDATE statements — `SET is_default = false WHERE is_default = true` then `SET is_default = true WHERE id = target_profile_id`; ownership validated via auth.uid() |
| 4 | analyses table exists with a profile_id FK and unique constraint on (user_id, listing_id, profile_id) | VERIFIED | Lines 47-57: profile_id FK `REFERENCES profiles(id) ON DELETE CASCADE NOT NULL`, `UNIQUE(user_id, listing_id, profile_id)` |
| 5 | RLS policies restrict both tables to user's own rows via auth.uid() | VERIFIED | Lines 65-105: RLS enabled on both tables; 4 policies on profiles (SELECT/INSERT/UPDATE/DELETE), 3 on analyses (SELECT/INSERT/UPDATE); all use `(SELECT auth.uid()) = user_id` with `TO authenticated` |
| 6 | Legacy user_preferences and analyses tables are dropped | VERIFIED | Lines 8-9: `DROP TABLE IF EXISTS analyses` and `DROP TABLE IF EXISTS user_preferences` |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/002_profiles_schema.sql` | Complete schema migration: drop legacy tables, create profiles + analyses, RLS, RPC | VERIFIED | 144 lines (exceeds min_lines: 80); contains all 7 sections; contains `set_active_profile` |

**Artifact Level 1 (Exists):** File present at correct path.
**Artifact Level 2 (Substantive):** 144 lines, contains 7 distinct DDL sections, 7 RLS policies, RPC function with full implementation.
**Artifact Level 3 (Wired):** This is a pure SQL migration file — "wiring" is the SQL itself. All internal references are correct: analyses.profile_id references profiles.id; RPC function references public.profiles with fully qualified names required by `SET search_path = ''`.

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `analyses.profile_id` | `profiles.id` | foreign key with ON DELETE CASCADE | VERIFIED | Line 50: `profile_id uuid references profiles(id) on delete cascade not null` |
| `set_active_profile()` | `profiles.is_default` | PL/pgSQL UPDATE statements | VERIFIED | Lines 134-142: `SET is_default = false` (deactivate) then `SET is_default = true` (activate) |
| `idx_profiles_one_default_per_user` | `profiles (user_id) WHERE is_default = true` | partial unique index | VERIFIED | Lines 31-33: multi-line form; index name, column, and WHERE clause all correct — single-line pattern did not match due to line breaks but the constraint is unambiguous |

**Note on key link 3 pattern:** The PLAN specified a single-line regex `create unique index.*where.*is_default.*true`. The actual SQL spans three lines. The index unambiguously exists and enforces the correct constraint — this is a pattern limitation, not a gap.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PROF-07 | 05-01-PLAN.md | DB schema supports multiple profiles per user with atomic active-profile switching via Postgres RPC | SATISFIED | profiles table with partial unique index; set_active_profile() RPC; analyses table with profile_id FK; all in 002_profiles_schema.sql |

**Orphaned requirements:** None. No additional PROF-07-assigned requirements in REQUIREMENTS.md beyond what 05-01-PLAN.md claimed.

**REQUIREMENTS.md cross-reference:** PROF-07 is marked `[x]` (complete) and mapped to Phase 5. All other requirements listed in REQUIREMENTS.md (PROF-01 through PROF-06, PREF-11 through PREF-15, UI-01 through UI-05, EXT-09 through EXT-13) belong to phases 7-10 — none are orphaned against Phase 5.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO, FIXME, placeholder comments, empty implementations, or stub patterns found in the migration file.

---

### Human Verification Required

#### 1. Remote Supabase Deployment Confirmation

**Test:** Check Supabase Studio for project ref `mlhtozdtiorkemamzjjc` — run the 5 verification queries from Task 2 in the PLAN:
```sql
-- 1. Verify profiles table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' ORDER BY ordinal_position;

-- 2. Verify analyses table has profile_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'analyses' ORDER BY ordinal_position;

-- 3. Verify partial unique index
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles';

-- 4. Verify RPC function exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'set_active_profile';

-- 5. Verify old tables are gone
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('user_preferences', 'profiles', 'analyses');
```

**Expected:** profiles and analyses present; user_preferences absent; idx_profiles_one_default_per_user index listed; set_active_profile function present.

**Why human:** The SUMMARY reports `supabase db push` succeeded and all 5 queries were confirmed in Supabase Studio. However, the verifier cannot programmatically query the remote Supabase instance to re-confirm current state.

#### 2. Atomic Profile Switching Behavioral Test

**Test:** In Supabase Studio, insert two profiles for a test user with `is_default = false`. Call `SELECT set_active_profile('<profile_a_id>')`. Verify profile A has `is_default = true` and B has `is_default = false`. Then call `SELECT set_active_profile('<profile_b_id>')`. Verify B now has `is_default = true` and A has `is_default = false`.

**Expected:** At no point do two profiles share `is_default = true`. The partial unique index would reject such a state. Each call cleanly transfers the active status.

**Why human:** PL/pgSQL transaction semantics and the enforcement of the partial unique index during the two-UPDATE sequence require a live execution to confirm behavioral correctness. Static analysis of the SQL confirms the correct UPDATE order (deactivate-then-activate) but cannot simulate the DB engine's constraint evaluation.

---

### Summary

The migration file `supabase/migrations/002_profiles_schema.sql` is complete, substantive (144 lines), and correctly internally wired. All 6 observable truths are satisfied by the SQL content:

- profiles table has all 7 required columns with correct types and constraints
- Partial unique index `idx_profiles_one_default_per_user` enforces one-active-per-user at the DB level
- `set_active_profile()` RPC correctly deactivates then activates, validates ownership, uses SECURITY DEFINER + empty search_path
- analyses table has the profile_id FK with ON DELETE CASCADE and the 3-column unique constraint
- 7 RLS policies (4 profiles + 3 analyses) use the performant subselect auth.uid() pattern with TO authenticated
- Both legacy tables (user_preferences, analyses) are dropped at the top of the migration

PROF-07 is fully satisfied by the artifact. The only unverifiable items are remote deployment (requires Supabase Studio access) and behavioral atomicity testing (requires live DB execution). The SUMMARY reports both were confirmed during execution.

Commits 7f4b647 and 8af5bd1 both exist in the git log and correspond to the migration file creation and the moddatetime schema qualification fix.

---

_Verified: 2026-03-13_
_Verifier: Claude (gsd-verifier)_
