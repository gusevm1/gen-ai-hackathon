---
phase: 30
slug: database-infrastructure-prep
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Supabase CLI + SSH verification (infrastructure phase — no unit tests) |
| **Config file** | none — uses existing Supabase CLI and SSH access |
| **Quick run command** | `npx supabase inspect db index-stats --linked` |
| **Full suite command** | SSH health check + migration verification queries |
| **Estimated runtime** | ~10 seconds per verification |

---

## Sampling Rate

- **After every task commit:** Verify migration applied via SQL query
- **After every plan wave:** Full infrastructure verification
- **Before `/gsd:verify-work`:** All migrations verified, env vars confirmed, backend healthy
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | DB-01, DB-03 | migration | `npx supabase db push --linked` | ✅ | ⬜ pending |
| 30-01-02 | 01 | 1 | INT-01 | infra | SSH env var check | ✅ | ⬜ pending |
| 30-01-03 | 01 | 1 | INT-02 | infra | SSH health check + curl | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — Supabase CLI linked, SSH access confirmed, migration files exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OPENROUTER_API_KEY is valid | INT-01 | Secret value — cannot test without live API call | Set key, restart backend, check /health |
| Existing analyses still readable | DB-01 | Requires checking production data | Query `SELECT count(*) FROM analyses WHERE breakdown->>'schema_version' IS NULL` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
