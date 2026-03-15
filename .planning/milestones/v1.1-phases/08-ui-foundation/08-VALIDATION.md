---
phase: 8
slug: ui-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 + jsdom |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd web && pnpm vitest run` |
| **Full suite command** | `cd web && pnpm vitest run && pnpm build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && pnpm vitest run`
- **After every plan wave:** Run `cd web && pnpm vitest run && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | UI-01 | unit | `cd web && pnpm vitest run src/__tests__/sidebar.test.tsx -x` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 0 | UI-02 | unit | `cd web && pnpm vitest run src/__tests__/navbar.test.tsx -x` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 0 | UI-03 | unit | `cd web && pnpm vitest run src/__tests__/theme-toggle.test.tsx -x` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 0 | UI-05 | smoke | `cd web && pnpm vitest run src/__tests__/twenty-first-component.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/sidebar.test.tsx` — stubs for UI-01 (sidebar nav items, collapse behavior)
- [ ] `web/src/__tests__/navbar.test.tsx` — stubs for UI-02 (user identity, profile switcher placeholder)
- [ ] `web/src/__tests__/theme-toggle.test.tsx` — stubs for UI-03 (theme switching logic)
- [ ] `web/src/__tests__/twenty-first-component.test.tsx` — stubs for UI-05 (21st.dev component smoke test)

*No additional framework install needed (vitest + jsdom already configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar collapses to icon mode on desktop | UI-01 | Visual layout verification | Click collapse trigger, verify icons visible, labels hidden |
| Mobile sidebar opens as sheet overlay | UI-01 | Requires mobile viewport | Resize to <768px, tap hamburger, verify sheet opens |
| Dark mode has no FOUC on first load | UI-03 | Timing-dependent visual test | Clear localStorage, set OS to dark, hard refresh, verify no flash |
| 21st.dev component visual quality | UI-05 | Subjective visual assessment | Inspect component in both light/dark themes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
