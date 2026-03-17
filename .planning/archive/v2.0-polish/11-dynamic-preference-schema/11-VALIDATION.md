---
phase: 11
slug: dynamic-preference-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest + pytest-asyncio (asyncio_mode="auto") |
| **Framework (web)** | vitest 3.x + @testing-library/react |
| **Config file (backend)** | `backend/pyproject.toml` |
| **Config file (web)** | `web/vitest.config.ts` |
| **Quick run command (backend)** | `cd backend && python -m pytest tests/test_preferences.py tests/test_prompts.py -x` |
| **Quick run command (web)** | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` |
| **Full suite command (backend)** | `cd backend && python -m pytest tests/ -x` |
| **Full suite command (web)** | `cd web && npx vitest run` |
| **Estimated runtime** | ~15 seconds (backend) + ~10 seconds (web) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_preferences.py tests/test_prompts.py -x` + `cd web && npx vitest run src/__tests__/preferences-schema.test.ts`
- **After every plan wave:** Run full backend + web test suites
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | SCHM-01 | unit | `cd backend && python -m pytest tests/test_preferences.py -x -k "dynamic"` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 0 | SCHM-02 | unit | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 0 | SCHM-03 | unit | `cd backend && python -m pytest tests/test_preferences.py -x -k "dynamic"` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 0 | SCHM-04 | unit | `cd backend && python -m pytest tests/test_prompts.py -x -k "dynamic"` | ❌ W0 | ⬜ pending |
| 11-01-05 | 01 | 0 | SCHM-05 | unit | `cd backend && python -m pytest tests/test_preferences.py -x -k "migrate"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_preferences.py` — new test cases for DynamicField parsing, validation, migration from softCriteria
- [ ] `backend/tests/test_prompts.py` — new test cases for dynamic fields rendered with importance in prompt
- [ ] `web/src/__tests__/preferences-schema.test.ts` — new test cases for dynamicFields schema validation, defaults, round-trip
- [ ] `backend/tests/conftest.py` — add SAMPLE_PREFERENCES_JSON with dynamicFields

*Existing test infrastructure covers all phase requirements — only new test cases needed, no new framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| dynamicFields visible in Supabase profile | SCHM-01 | Requires live DB + UI | 1. Save profile with dynamic fields via web UI 2. Check Supabase table editor for dynamicFields in preferences JSONB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
