---
phase: 29
slug: subjective-scorer-claude-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | backend/pytest.ini or backend/pyproject.toml |
| **Quick run command** | `cd backend && python -m pytest tests/test_scoring.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -x -q` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_scoring.py -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | SS-01 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_subjective_models -x -q` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | SS-01 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_criterion_result_structure -x -q` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | SS-02 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_build_system_prompt_subjective -x -q` | ❌ W0 | ⬜ pending |
| 29-02-02 | 02 | 1 | SS-02 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_preserved_prompt_rules -x -q` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 2 | SS-03 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_score_listing_no_subjective -x -q` | ❌ W0 | ⬜ pending |
| 29-03-02 | 03 | 2 | SS-03 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_score_listing_with_subjective -x -q` | ❌ W0 | ⬜ pending |
| 29-04-01 | 03 | 2 | SS-04 | unit | `cd backend && python -m pytest tests/test_scoring.py::test_bullets_only_call -x -q` | ❌ W0 | ⬜ pending |
| 29-05-01 | 04 | 3 | SS-01,SS-02,SS-03,SS-04 | integration | `cd backend && python -m pytest tests/test_scoring_integration.py -x -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_scoring.py` — unit test stubs for SS-01 through SS-04
- [ ] `backend/tests/test_scoring_integration.py` — integration test stubs for full scoring path
- [ ] `backend/tests/conftest.py` — shared fixtures (mock listing, mock profile with/without subjective criteria)

*Existing pytest infrastructure covers the framework; only test files need to be created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude returns summary_bullets in user's preferred language | SS-04 | Requires live Claude API call and language verification | Call /score endpoint with a listing and profile with `preferred_language: "es"`, verify bullets are in Spanish |
| Prompt preserved rules produce correct output for edge cases | SS-02 | Rent vs sale price confusion requires real Claude reasoning | Send a listing with monthly rent price and SALE type — verify Claude uses correct interpretation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
