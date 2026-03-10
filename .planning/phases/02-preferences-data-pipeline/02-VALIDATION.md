---
phase: 2
slug: preferences-data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), pytest (backend) |
| **Config file** | `web/vitest.config.ts` (Wave 0 creates), `backend/pytest.ini` (Wave 0 creates) |
| **Quick run command** | `cd web && npx vitest run --reporter=verbose` / `cd backend && python -m pytest -x -q` |
| **Full suite command** | `cd web && npx vitest run && cd ../backend && python -m pytest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command for the relevant subsystem
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PREF-01..09 | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PREF-10 | integration | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | DATA-01 | unit | `cd backend && python -m pytest -x -q` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | DATA-02 | unit | `cd backend && python -m pytest -x -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/vitest.config.ts` — vitest config for Next.js web app
- [ ] `backend/tests/conftest.py` — pytest fixtures for FastAPI
- [ ] `backend/tests/test_flatfox.py` — stubs for DATA-01, DATA-02
- [ ] `web/src/__tests__/preferences.test.tsx` — stubs for PREF-01..10

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Preferences load on refresh | PREF-10 | Requires Supabase auth session | Log in, save prefs, refresh page, verify data persists |
| Flatfox API returns real data | DATA-01 | External API dependency | Run test endpoint with real listing pk |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
