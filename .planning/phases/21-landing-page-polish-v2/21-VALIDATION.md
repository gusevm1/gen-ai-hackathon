---
phase: 21
slug: landing-page-polish-v2
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v4.0.18 |
| **Config file** | `web/vitest.config.ts` |
| **Quick run command** | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |
| **Full suite command** | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **After every plan wave:** Run `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-W0 | 01 | 0 | LP-03 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-hero.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 21-01-01 | 01 | 1 | LP-03 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-hero.test.tsx src/__tests__/section-problem.test.tsx src/__tests__/section-cta.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | LP-06 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/landing-translations.test.ts src/__tests__/section-solution.test.tsx --reporter=verbose` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 1 | LP-04 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-problem.test.tsx --reporter=verbose` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 1 | LP-04 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-problem.test.tsx --reporter=verbose` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 2 | LP-03 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-solution.test.tsx --reporter=verbose` | ✅ | ⬜ pending |
| 21-03-02 | 03 | 2 | LP-06 | unit | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/section-cta.test.tsx src/__tests__/section-solution.test.tsx --reporter=verbose` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/__tests__/section-hero.test.tsx` — assertions for 7 chips rendering, TIER_COLORS distribution (3 excellent / 2 good / 1 fair / 1 poor), white/95 card style, 40x40 score circle

*Existing test files present for all other tasks: `section-problem.test.tsx`, `section-solution.test.tsx`, `section-cta.test.tsx`, `landing-translations.test.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero chips float animation at xl breakpoint | LP-03 | CSS animations and `xl:flex` responsive breakpoint not fully testable in jsdom | Visit `/` on a ≥1280px viewport; confirm 7 chips float at left/right edges |
| Problem section scroll highlight (opacity / glow) | LP-04 | `useInView` hook requires real scroll events not available in jsdom | Scroll slowly through the problem section; each item should illuminate as it enters view |
| Gradient divider visibility between Solution and CTA | LP-06 | Visual CSS gradient not verifiable in unit tests | Inspect the section boundary in browser devtools; teal gradient visible at ~50% opacity midpoint |
| CTA radial glow and once:false re-trigger | LP-06 | Radial-gradient overlay and viewport re-trigger require visual inspection | Scroll down to CTA, scroll back up past it, scroll down again — animation should re-fire |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
