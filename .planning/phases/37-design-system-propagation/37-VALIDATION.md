---
phase: 37
slug: design-system-propagation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Testing Library (React) |
| **Config file** | `web/vitest.config.mts` |
| **Quick run command** | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |
| **Full suite command** | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **After every plan wave:** Run `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-W0-01 | Wave0 | 0 | DS-03 | unit | `cd web && npm test -- --run src/__tests__/tier-colors.test.tsx` | ❌ W0 | ⬜ pending |
| 37-W0-02 | Wave0 | 0 | DS-02 | unit | `cd web && npm test -- --run src/__tests__/fade-in.test.tsx` | ✅ extend | ⬜ pending |
| 37-01-01 | 01 | 1 | DS-01 | grep/smoke | `grep -r "rose-" web/src --include="*.tsx" --include="*.ts" \| grep -v "node_modules" \| wc -l` → 0 | Manual verify | ⬜ pending |
| 37-02-01 | 02 | 1 | DS-03 | unit | `cd web && npm test -- --run src/__tests__/tier-colors.test.tsx` | ❌ W0 | ⬜ pending |
| 37-03-01 | 03 | 1 | DS-02 | unit | `cd web && npm test -- --run src/__tests__/fade-in.test.tsx` | ✅ extend | ⬜ pending |
| 37-04-01 | 04 | 2 | DS-04 | unit | `cd web && npm test -- --run` | Manual verify | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/tier-colors.test.tsx` — unit tests for `getTierColor()` returning teal/green/amber/red classes (DS-03)
- [ ] Extend `web/src/__tests__/fade-in.test.tsx` — add test case for `animate` prop mode (DS-02)

*Existing Vitest infrastructure covers all run harness needs — only new test files required for new behaviors.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No `rose-` class in compiled web source | DS-01 | Grep-based check, not a unit test | Run `grep -r "rose-" web/src --include="*.tsx" --include="*.ts" \| grep -v node_modules` — should return 0 matches |
| Card hover lift effect visible | DS-04 | CSS class presence can be tested; visual rendering requires browser | Check rendered HTML for `hover:shadow-lg hover:-translate-y-1` or equivalent classes |
| Dashboard animations play on mount | DS-02 | Visual behavior requires browser | Load dashboard pages and verify FadeIn animations trigger on mount (not scroll) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
