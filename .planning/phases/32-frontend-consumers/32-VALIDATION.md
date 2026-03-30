---
phase: 32
slug: frontend-consumers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (web)** | vitest 4.0.18 + jsdom |
| **Framework (ext)** | vitest 4.0.18 + happy-dom + WxtVitest |
| **Config file (web)** | `web/vitest.config.mts` |
| **Config file (ext)** | `extension/vitest.config.ts` |
| **Quick run (web)** | `cd web && npx vitest run --reporter verbose` |
| **Quick run (ext)** | `cd extension && npx vitest run --reporter verbose` |
| **Full suite** | Both quick runs |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run --reporter verbose` and `cd extension && npx vitest run --reporter verbose`
- **After every plan wave:** Run both commands
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | FE-01 | unit | `cd web && npx vitest run src/__tests__/fulfillment-breakdown.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | FE-02 | unit | `cd web && npx vitest run src/__tests__/fulfillment-breakdown.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-01-03 | 01 | 1 | FE-04 | unit | `cd web && npx vitest run src/__tests__/analysis-page.test.ts -x` | ✅ (needs update) | ⬜ pending |
| 32-02-01 | 02 | 1 | FE-03 | unit | `cd extension && npx vitest run src/__tests__/scoring-types.test.ts -x` | ✅ (needs update) | ⬜ pending |
| 32-02-02 | 02 | 1 | FE-05 | unit | `cd extension && npx vitest run src/__tests__/scoring-types.test.ts -x` | ✅ (needs update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/fulfillment-breakdown.test.ts` — stubs for FE-01, FE-02 (fulfillment threshold logic, component data handling)
- [ ] Update `web/src/__tests__/analysis-page.test.ts` — add v2 schema_version branching tests (FE-04)
- [ ] Update `extension/src/__tests__/scoring-types.test.ts` — add v2 type shape and enrichment_status tests (FE-03, FE-05)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grey beta badge visual appearance | FE-05 | Visual rendering in extension popup | Load extension on Flatfox listing with enrichment_status=unavailable, verify grey badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
