---
phase: 29
slug: subjective-scorer-claude-enhancement
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-30
---

# Phase 29 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | backend/pytest.ini or backend/pyproject.toml |
| **Quick run command** | `cd backend && python -m pytest tests/test_subjective_models.py tests/test_subjective_scorer.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -x -q` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_subjective_models.py tests/test_subjective_scorer.py -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | SS-01 | unit | `cd backend && python -m pytest tests/test_subjective_models.py::TestSubjectiveModels -x -q` | No (W0) | pending |
| 29-01-02 | 01 | 1 | SS-03 | unit | `cd backend && python -m pytest tests/test_subjective_models.py::TestPrompts -x -q` | No (W0) | pending |
| 29-02-01 | 02 | 2 | SS-02 | unit | `cd backend && python -m pytest tests/test_subjective_scorer.py::TestScoreListing -x -q` | No (W0) | pending |
| 29-02-02 | 02 | 2 | SS-04 | unit | `cd backend && python -m pytest tests/test_subjective_scorer.py -x -q -m "not integration"` | No (W0) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_subjective_models.py` -- model validation + prompt tests (created by Plan 01 Tasks 1 and 2)
- [ ] `backend/tests/test_subjective_scorer.py` -- two-path scoring logic tests with mocked OpenRouter calls (created by Plan 02 Task 1)

*Existing pytest infrastructure covers the framework; only the new test files need to be created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OpenRouter returns summary_bullets in user's preferred language | SS-04 | Requires live OpenRouter API call and language verification | Call /score endpoint with a listing and profile with `preferred_language: "es"`, verify bullets are in Spanish |
| Prompt preserved rules produce correct output for edge cases | SS-03 | Rent vs sale price confusion requires real LLM reasoning | Send a listing with monthly rent price and SALE type -- verify model uses correct interpretation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
