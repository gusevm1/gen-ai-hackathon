---
phase: 20
slug: landing-page-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `web/vitest.config.ts` |
| **Quick run command** | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run 2>&1 | tail -20` |
| **Full suite command** | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npm test -- --run 2>&1 | tail -20`
- **After every plan wave:** Run `cd web && npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | LP-03 | unit | `npm test -- --run landing-translations` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 2 | LP-01 | structural | `ls web/src/components/landing/` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 2 | LP-01, DS-02 | unit+tsc | `npx tsc --noEmit 2>&1 \| grep -c error` | ✅ | ⬜ pending |
| 20-03-01 | 03 | 3 | LP-01, LP-05 | unit+tsc | `npx tsc --noEmit 2>&1 \| grep -c error` | ✅ | ⬜ pending |
| 20-03-02 | 03 | 3 | LP-01, LP-05, LP-06 | unit | `npm test -- --run landing-page` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/lib/translations.ts` — add all new `landing_hero_*`, `landing_globe_*`, `landing_howit_*`, `landing_features_*`, `landing_cta_*` keys (EN+DE); remove old chapter keys
- [ ] `web/src/__tests__/landing-translations.test.ts` — currently failing due to missing keys; Plan 01 Task 1 fixes this first

---

## Phase Requirements Coverage

| Req ID | Behavior | Test Type | Status |
|--------|----------|-----------|--------|
| LP-01 | Landing page renders without auth | unit | ⬜ pending |
| LP-03 | Problem/Solution sections with EN/DE copy | unit | ⬜ pending |
| LP-05 | Primary CTA button present and links to /auth | unit | ⬜ pending |
| LP-06 | Sign In link in navbar | unit | ⬜ pending |
| DS-02 | Dark hero background applied | smoke/visual | manual |
| LP-08 | No layout shift from animations | manual | manual |
