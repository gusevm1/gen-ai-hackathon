---
phase: 38
slug: onboarding-rebuild
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library (jsdom) |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/` |
| **Full suite command** | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/`
- **After every plan wave:** Run `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-W0-01 | W0 | 0 | ONB-01,02,03,04 | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 38-W0-02 | W0 | 0 | ONB-05,06 | unit | `npx vitest run src/__tests__/onboarding-checklist.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 38-W0-03 | W0 | 0 | ONB-07 | unit | `npx vitest run src/__tests__/settings-page.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 38-01-01 | 01 | 1 | ONB-01 | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ W0 | ⬜ pending |
| 38-01-02 | 01 | 1 | ONB-02 | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ W0 | ⬜ pending |
| 38-01-03 | 01 | 1 | ONB-03 | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ W0 | ⬜ pending |
| 38-01-04 | 01 | 1 | ONB-04 | unit | `npx vitest run src/__tests__/onboarding-welcome-modal.test.tsx` | ❌ W0 | ⬜ pending |
| 38-02-01 | 02 | 1 | ONB-05 | unit | `npx vitest run src/__tests__/onboarding-checklist.test.tsx` | ❌ W0 | ⬜ pending |
| 38-02-02 | 02 | 1 | ONB-06 | unit | `npx vitest run src/__tests__/onboarding-checklist.test.tsx` | ❌ W0 | ⬜ pending |
| 38-03-01 | 03 | 2 | ONB-07 | unit | `npx vitest run src/__tests__/settings-page.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/onboarding-welcome-modal.test.tsx` — stubs for ONB-01, ONB-02, ONB-03, ONB-04
- [ ] `web/src/__tests__/onboarding-checklist.test.tsx` — stubs for ONB-05, ONB-06
- [ ] `web/src/__tests__/settings-page.test.tsx` — stub for ONB-07

*Existing Vitest + RTL infrastructure is sufficient — no framework install needed. Tests follow the pattern in `theme-toggle.test.tsx` and `navbar.test.tsx`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WelcomeModal dark-mode visual correctness | ONB-02 | CSS var rendering requires browser | Toggle dark mode in app, open WelcomeModal, verify no color artifacts |
| Success card dismissal persistence across reload | ONB-06 | localStorage requires real browser env | Complete all steps, dismiss success card, reload — card should stay dismissed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
