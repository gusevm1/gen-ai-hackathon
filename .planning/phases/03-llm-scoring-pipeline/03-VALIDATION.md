---
phase: 3
slug: llm-scoring-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (already configured) |
| **Config file** | `backend/tests/conftest.py` (exists, has fixtures and markers) |
| **Quick run command** | `cd backend && python -m pytest tests/ -x -m "not integration"` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -m "not integration"`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | EVAL-02, EVAL-03 | unit | `cd backend && python -m pytest tests/test_scoring_models.py -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | EVAL-01, EVAL-04 | unit | `cd backend && python -m pytest tests/test_scoring.py -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | EVAL-05 | unit | `cd backend && python -m pytest tests/test_prompts.py -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | AUTH-03 | manual | Manual: call edge function with valid/invalid JWT | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_scoring_models.py` — stubs for EVAL-02, EVAL-03 (Pydantic model validation)
- [ ] `backend/tests/test_scoring.py` — stubs for EVAL-01, EVAL-04 (mock Claude for scoring endpoint)
- [ ] `backend/tests/test_prompts.py` — stubs for EVAL-05 (prompt template language selection)
- [ ] Mock fixtures for Claude responses in `backend/tests/conftest.py`
- [ ] Sample preferences fixture (with camelCase keys as stored in Supabase)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge function proxies POST /score with auth validation | AUTH-03 | Requires running Supabase edge function with real JWT | 1. Start edge function locally 2. Call with valid JWT 3. Verify forwarded to backend 4. Call with invalid JWT 5. Verify 401 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
