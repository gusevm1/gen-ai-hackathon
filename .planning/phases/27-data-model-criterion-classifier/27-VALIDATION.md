---
phase: 27
slug: data-model-criterion-classifier
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend) + vitest (frontend) |
| **Config file** | `backend/pytest.ini` / `web/vitest.config.ts` |
| **Quick run command** | `cd backend && python -m pytest tests/test_classifier.py tests/test_preferences.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest -x -q && cd ../web && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_classifier.py tests/test_preferences.py -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest -x -q && cd ../web && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 0 | DM-01 | unit | `cd backend && python -m pytest tests/test_classifier.py -x -q` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 0 | DM-03 | unit | `cd backend && python -m pytest tests/test_preferences.py -x -q` | ✅ | ⬜ pending |
| 27-02-01 | 02 | 1 | DM-01 | unit | `cd backend && python -m pytest tests/test_classifier.py -x -q` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 1 | DM-03 | unit | `cd backend && python -m pytest tests/test_preferences.py::TestImportanceWeightMap -x -q` | ✅ | ⬜ pending |
| 27-03-01 | 03 | 2 | DM-02 | integration | `cd backend && python -m pytest tests/test_preferences.py -x -q` | ✅ | ⬜ pending |
| 27-03-02 | 03 | 2 | DM-02 | manual | See manual section | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_classifier.py` — stubs for DM-01 (CriterionClassifier unit tests)
- [ ] Verify `backend/tests/test_preferences.py::TestImportanceWeightMap` exists and will be updated for DM-03

*Existing infrastructure covers most phase requirements — only classifier test file is new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile save triggers LLM classification in production | DM-02 | Requires EC2 live call + Supabase JSONB inspection | 1. Save a profile via frontend, 2. Query Supabase `dynamic_fields` to confirm `criterionType` values are set |
| Vercel `EC2_API_URL` env var set for server action | DM-02 | Vercel dashboard config | Check Vercel project settings → Environment Variables |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
