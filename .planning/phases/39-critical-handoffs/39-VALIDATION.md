---
phase: 39
slug: critical-handoffs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react (jsdom) |
| **Config file** | `web/vitest.config.ts` |
| **Quick run command** | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` |
| **Full suite command** | `cd web && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x`
- **After every plan wave:** Run `cd web && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 0 | HND-01, HND-02, HND-03, HND-04 | unit stubs | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | ❌ W0 | ⬜ pending |
| 39-02-01 | 02 | 1 | HND-01 | unit (render + click) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | ❌ W0 | ⬜ pending |
| 39-02-02 | 02 | 1 | HND-02 | unit (render) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | ❌ W0 | ⬜ pending |
| 39-03-01 | 03 | 1 | HND-03 | unit (render) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | ❌ W0 | ⬜ pending |
| 39-03-02 | 03 | 1 | HND-04 | unit (render) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/critical-handoffs.test.tsx` — stubs for HND-01, HND-02, HND-03, HND-04
- [ ] No new framework install needed — vitest + testing-library already configured

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sticky bar always visible without scrolling | HND-01 | CSS position:sticky viewport behavior | 1. Open profile edit page 2. Scroll to bottom 3. Verify sticky bar stays visible |
| Save-then-open-Flatfox flow | HND-01 | Requires real browser tab open | 1. Fill form 2. Click "Save & Open in Flatfox →" 3. Verify save completes then Flatfox opens in new tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
