---
phase: 5
slug: db-schema-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PostgreSQL migration validation (SQL-based, no test framework) |
| **Config file** | None — pure SQL migration, validated by `supabase db push` success |
| **Quick run command** | `supabase db push --dry-run` (if supported) or manual SQL review |
| **Full suite command** | `supabase db push` + manual verification via Supabase Studio |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Review SQL syntax; `supabase db push` to remote
- **After every plan wave:** N/A — single migration file
- **Before `/gsd:verify-work`:** Migration applied successfully, manual verification of constraints via Supabase Studio SQL editor
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PROF-07 | smoke | `supabase db push` succeeds without errors | N/A — migration file is the test | pending |
| 05-01-02 | 01 | 1 | PROF-07 | manual | Insert two `is_default = true` rows for same user — expect unique violation | Manual SQL | pending |
| 05-01-03 | 01 | 1 | PROF-07 | manual | Call `set_active_profile()` RPC, verify old profile deactivated and new one activated | Manual SQL | pending |
| 05-01-04 | 01 | 1 | PROF-07 | smoke | `supabase db push` succeeds + verify constraint in Studio | N/A — migration file is the test | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `supabase/migrations/002_profiles_schema.sql` — the migration file itself (the entire deliverable)
- [ ] Verify Supabase CLI is linked to remote project: `supabase link`
- [ ] Verify moddatetime extension is available: `create extension if not exists moddatetime schema extensions;`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Partial unique index enforces one default per user | PROF-07 | Requires inserting test rows via SQL editor | Insert two `is_default = true` rows for same `user_id` — expect unique violation error |
| `set_active_profile()` atomically switches default | PROF-07 | Requires calling RPC and verifying state changes | Call RPC with valid profile_id, verify old profile has `is_default = false`, new has `is_default = true` |
| Analyses unique constraint `(user_id, listing_id, profile_id)` | PROF-07 | Requires inserting test rows via SQL editor | Insert duplicate `(user_id, listing_id, profile_id)` — expect violation; different `profile_id` — expect success |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
