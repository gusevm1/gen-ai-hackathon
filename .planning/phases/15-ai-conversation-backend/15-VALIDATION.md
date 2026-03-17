---
phase: 15
slug: ai-conversation-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio |
| **Config file** | `backend/pyproject.toml` |
| **Quick run command** | `cd backend && python -m pytest tests/test_chat_endpoint.py tests/test_conversation.py -x` |
| **Full suite command** | `cd backend && python -m pytest tests/ -x` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_chat_endpoint.py tests/test_conversation.py -x`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -x`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | AI-01, AI-02, AI-05 | unit | `cd backend && python -m pytest tests/test_chat_endpoint.py tests/test_conversation.py -x` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | AI-01 | unit | `cd backend && python -m pytest tests/test_chat_endpoint.py -x` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | AI-02, AI-05 | unit | `cd backend && python -m pytest tests/test_conversation.py -x` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | AI-01 | unit | `cd backend && python -m pytest tests/test_chat_endpoint.py tests/test_conversation.py -x` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | AI-03, AI-04 | manual | Manual: send partial description, verify Claude asks follow-up; use "must have" language, verify critical importance | N/A | ⬜ pending |
| 15-03-02 | 03 | 2 | AI-01–AI-05 | unit | `cd backend && python -m pytest tests/ -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_chat_endpoint.py` — stubs for AI-01 (POST /chat returns ChatResponse shape, 422 on bad input)
- [ ] `backend/tests/test_conversation.py` — stubs for AI-02, AI-05 (sentinel parsing, preference extraction, schema mapping, ready signal)
- [ ] `backend/tests/conftest.py` — fixtures: sample chat messages, sample Claude response with `<preferences_ready>` tag

*pytest + pytest-asyncio already installed (existing test suite in backend/tests/).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude asks follow-up questions when info missing | AI-03 | Requires live Claude API call; mocked tests can't verify prompt quality | Send "I want an apartment" only (no location/budget), verify response contains a clarifying question |
| Claude infers importance levels from language cues | AI-04 | Requires live Claude API call; prompt engineering quality not unit-testable | Send "I absolutely must have a balcony", verify extracted `features` contains "balcony" with critical/high importance level |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
