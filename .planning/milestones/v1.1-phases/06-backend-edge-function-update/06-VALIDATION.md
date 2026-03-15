---
phase: 6
slug: backend-edge-function-update
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-asyncio (auto mode) |
| **Config file** | `backend/pyproject.toml` |
| **Quick run command** | `cd backend && python -m pytest tests/test_score_endpoint.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -x -q` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_score_endpoint.py -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SC-01 | unit | `cd backend && python -m pytest tests/test_score_endpoint.py::test_score_success -x` | ✅ (needs update) | ⬜ pending |
| 06-01-02 | 01 | 1 | SC-02 | unit | `cd backend && python -m pytest tests/test_scoring_models.py -x` | ✅ (needs update) | ⬜ pending |
| 06-01-03 | 01 | 1 | SC-03 | unit | `cd backend && python -m pytest tests/test_score_endpoint.py::test_score_saves_analysis -x` | ✅ (needs update) | ⬜ pending |
| 06-01-04 | 01 | 1 | SC-04 | unit | `cd backend && python -m pytest tests/test_score_endpoint.py::test_score_missing_profile -x` | ❌ W0 | ⬜ pending |
| 06-01-05 | 01 | 1 | SC-05 | manual | Deploy edge function, call via curl with JWT | N/A | ⬜ pending |
| 06-01-06 | 01 | 1 | SC-06 | manual | Score with profile A, switch, score with profile B, verify 2 rows | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `tests/test_score_endpoint.py` — update request payloads to include `profile_id` and `preferences`
- [ ] Update `tests/test_score_endpoint.py` — update `mock_supabase` fixture (remove `get_preferences` mock, update `save_analysis` mock to expect `profile_id`)
- [ ] Add test: missing `profile_id` returns 422 validation error
- [ ] Manual: deploy edge function and verify profile resolution with curl

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge function resolves active profile via RLS query | SC-05 | Requires deployed Supabase edge function + live DB | Deploy edge function, call via curl with valid JWT, verify response includes profile-attributed scoring |
| Two profiles scoring same listing produce separate records | SC-06 | Requires full pipeline integration with live services | Score listing with profile A, switch active profile to B via RPC, re-score same listing, verify 2 distinct analysis rows in DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
