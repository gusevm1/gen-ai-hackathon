---
phase: 14
slug: chat-ui-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd web && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd web && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd web && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 0 | NAV-01, NAV-02 | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 0 | CHAT-01–09 | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 0 | CHAT-09 | unit | `cd web && npx vitest run src/__tests__/ai-avatar.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | NAV-01, NAV-02 | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | CHAT-01–05 | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx -t "idle\|naming\|Start Creating" --reporter=verbose` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | CHAT-06, CHAT-07, CHAT-09 | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx src/__tests__/ai-avatar.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 14-02-03 | 02 | 2 | CHAT-08 | manual | N/A — verify no Supabase imports in ai-search components | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/top-navbar.test.tsx` — stubs for NAV-01, NAV-02 (AI-Powered Search item, nav order)
- [ ] `web/src/__tests__/chat-page.test.tsx` — stubs for CHAT-01 through CHAT-07 (layout states, profile name prompt, message thread)
- [ ] `web/src/__tests__/ai-avatar.test.tsx` — stubs for CHAT-09 (circular avatar renders house icon with bg-primary)

*Existing infrastructure covers test runner — Vitest + testing-library already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Conversation is ephemeral (no DB calls) | CHAT-08 | No Supabase calls to mock in a purely in-memory component | Verify no `supabase` or `createClient` imports in `web/src/app/(dashboard)/ai-search/` files |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
