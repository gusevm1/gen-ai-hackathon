---
phase: 01
slug: foundation-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via WXT `WxtVitest` plugin) |
| **Config file** | `vitest.config.ts` (Wave 0 creation) |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | ONBD-01 | unit | `pnpm vitest run src/__tests__/background.test.ts -t "onInstalled"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | ONBD-02 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "location"` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | ONBD-03 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "listingType"` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 0 | ONBD-04 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "propertyType"` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 0 | ONBD-05 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "price"` | ❌ W0 | ⬜ pending |
| 01-01-06 | 01 | 0 | ONBD-06 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "rooms"` | ❌ W0 | ⬜ pending |
| 01-01-07 | 01 | 0 | ONBD-07 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "livingSpace"` | ❌ W0 | ⬜ pending |
| 01-01-08 | 01 | 0 | ONBD-08 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "yearBuilt"` | ❌ W0 | ⬜ pending |
| 01-01-09 | 01 | 0 | ONBD-09 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "floor"` | ❌ W0 | ⬜ pending |
| 01-01-10 | 01 | 0 | ONBD-10 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "availability"` | ❌ W0 | ⬜ pending |
| 01-01-11 | 01 | 0 | ONBD-11 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "features"` | ❌ W0 | ⬜ pending |
| 01-01-12 | 01 | 0 | ONBD-12 | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "softCriteria"` | ❌ W0 | ⬜ pending |
| 01-01-13 | 01 | 0 | ONBD-13 | unit | `pnpm vitest run src/__tests__/weight-redistribution.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-14 | 01 | 0 | ONBD-14 | unit | `pnpm vitest run src/__tests__/profile-storage.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — WXT Vitest plugin configuration
- [ ] `src/__tests__/background.test.ts` — stubs for ONBD-01 (onInstalled handler)
- [ ] `src/__tests__/profile-schema.test.ts` — Zod schema validation for ONBD-02 through ONBD-12
- [ ] `src/__tests__/weight-redistribution.test.ts` — Proportional redistribution algorithm (ONBD-13)
- [ ] `src/__tests__/profile-storage.test.ts` — WXT storage read/write/persist (ONBD-14)
- [ ] Install test deps: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Onboarding page opens automatically on first install | ONBD-01 | Requires browser runtime and extension lifecycle event | 1. Load unpacked extension 2. Verify onboarding tab opens 3. Close and reopen browser — should NOT reopen |
| Full wizard visual flow and step navigation | ONBD-01 | UI/UX flow requires visual inspection | 1. Walk through all wizard steps 2. Verify step indicators, back/next buttons 3. Verify responsive layout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
