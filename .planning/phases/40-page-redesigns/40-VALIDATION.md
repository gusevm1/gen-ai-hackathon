---
phase: 40
slug: page-redesigns
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / jest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 0 | PG-01 | unit | `npm test -- --run profile-card` | ❌ W0 | ⬜ pending |
| 40-01-02 | 01 | 1 | PG-01 | unit | `npm test -- --run profile-card` | ❌ W0 | ⬜ pending |
| 40-01-03 | 01 | 1 | PG-02 | unit | `npm test -- --run profile-card` | ❌ W0 | ⬜ pending |
| 40-02-01 | 02 | 0 | PG-03 | unit | `npm test -- --run analyses-grid` | ❌ W0 | ⬜ pending |
| 40-02-02 | 02 | 1 | PG-03 | unit | `npm test -- --run analyses-grid` | ❌ W0 | ⬜ pending |
| 40-02-03 | 02 | 1 | PG-04 | unit | `npm test -- --run analyses-grid` | ❌ W0 | ⬜ pending |
| 40-03-01 | 03 | 1 | PG-05 | unit | `npm test -- --run chat-page` | ✅ | ⬜ pending |
| 40-03-02 | 03 | 1 | PG-06 | unit | `npm test -- --run chat-page` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/profile-card.test.tsx` — stubs for PG-01, PG-02
- [ ] `__tests__/analyses-grid.test.tsx` — stubs for PG-03, PG-04

*chat-page.test.tsx already exists and can be extended.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat → summary card transition animation | PG-06 | Visual animation cannot be asserted in jsdom | Trigger analysis, observe transition is smooth (not jarring) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
