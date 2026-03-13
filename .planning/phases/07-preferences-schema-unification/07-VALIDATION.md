---
phase: 7
slug: preferences-schema-unification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend) + vitest 4.0.18 (web) |
| **Config file** | `backend/pyproject.toml` + `web/vitest.config.mts` |
| **Quick run command** | `cd backend && python3 -m pytest tests/ -x -q && cd ../web && npx vitest run` |
| **Full suite command** | `cd backend && python3 -m pytest tests/ -x -q && cd ../web && npx vitest run` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python3 -m pytest tests/ -x -q && cd ../web && npx vitest run`
- **After every plan wave:** Run full suite (same — both are fast)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | PREF-13 | unit | `cd backend && python3 -m pytest tests/test_preferences.py -x` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 0 | PREF-13 | unit | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` | ✅ (update) | ⬜ pending |
| 07-01-03 | 01 | 1 | PREF-13 | unit | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` | ✅ (update) | ⬜ pending |
| 07-01-04 | 01 | 1 | PREF-13 | unit | `cd backend && python3 -m pytest tests/test_preferences.py -x` | ❌ W0 | ⬜ pending |
| 07-01-05 | 01 | 1 | PREF-13 | unit | `cd backend && python3 -m pytest tests/test_preferences.py -x` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | PREF-14 | unit | `cd backend && python3 -m pytest tests/test_prompts.py -x` | ✅ (update) | ⬜ pending |
| 07-02-02 | 02 | 1 | PREF-14 | unit | `cd backend && python3 -m pytest tests/test_prompts.py -x` | ✅ (update) | ⬜ pending |
| 07-02-03 | 02 | 1 | PREF-14 | unit | `cd backend && python3 -m pytest tests/test_prompts.py -x` | ✅ (update) | ⬜ pending |
| 07-02-04 | 02 | 1 | PREF-14 | integration | `cd backend && python3 -m pytest tests/test_score_endpoint.py -x` | ✅ (update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_preferences.py` — NEW file: Pydantic model parsing tests (new format, old format, selectedFeatures migration)
- [ ] `backend/tests/conftest.py` — Update `SAMPLE_PREFERENCES_JSON` to new format + add `LEGACY_PREFERENCES_JSON` fixture
- [ ] `web/src/__tests__/preferences-schema.test.ts` — Update tests for new fields (dealbreakers, importance, floorPreference)
- [ ] `backend/tests/test_prompts.py` — Update test fixtures and assertions for new prompt format

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scoring a listing with dealbreaker violation produces "poor" tier | PREF-14 | Requires live Claude API call | Score a listing with budget exceeding max when budgetDealbreaker=true; verify match_tier="poor" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
