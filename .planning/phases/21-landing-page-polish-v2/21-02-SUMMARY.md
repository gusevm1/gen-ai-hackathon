---
phase: 21-landing-page-polish-v2
plan: "02"
subsystem: landing-page
tags: [animation, framer-motion, scroll-driven, ux]
dependency_graph:
  requires: []
  provides: [SectionProblem-useInView-highlight]
  affects: [web/src/components/landing/SectionProblem.tsx]
tech_stack:
  added: []
  patterns: [useInView-driven-animate, per-item-highlight-fade]
key_files:
  created: []
  modified:
    - web/src/components/landing/SectionProblem.tsx
    - web/src/__tests__/section-problem.test.tsx
decisions:
  - "[21-02]: ProblemItem extracted as inner component — useRef + useInView per item, animate (not whileInView) to avoid Framer Motion conflict"
  - "[21-02]: once: false on useInView so highlight re-triggers on scroll back"
  - "[21-02]: Reduced motion uses empty animate object — no opacity/scale/shadow changes"
metrics:
  duration_seconds: 73
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 2
---

# Phase 21 Plan 02: SectionProblem useInView Highlight Summary

Per-item scroll-driven highlight system for SectionProblem using useInView + animate, replacing the slide-in whileInView animation with a dramatic opacity/glow fade pattern.

## What Was Built

Replaced SectionProblem's slide-in animation (whileInView + initial x offset) with a per-item highlight system:

- Extracted `ProblemItem` component above `SectionProblem` in the same file
- Each item gets its own `useRef<HTMLDivElement>` + `useInView(ref, { once: false, amount: 0.5 })`
- `animate` prop driven by `isInView` boolean (NOT `whileInView` — critical: mixing both conflicts in Framer Motion)
- Highlighted: `opacity: 1`, `scale: 1`, teal glow `boxShadow`
- Dimmed: `opacity: 0.25`, `scale: 0.99`, `boxShadow: 'none'`
- All three items become highlighted simultaneously once user scrolls past all of them (`once: false` means each stays at last state)
- Reduced motion: empty `animate` object — no opacity/scale changes

Section header (`motion.div` with `whileInView`) left unchanged.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace slide-in with useInView highlight system | b2eeb03 | SectionProblem.tsx |
| 2 | Update section-problem test to cover useInView highlight structure | 3eb6d8c | section-problem.test.tsx |

## Test Results

- section-problem.test.tsx: 5/5 tests pass
- TypeScript: no errors (`npx tsc --noEmit` clean)
- Pre-existing failures in chat-page, section-hero, section-solution tests are unrelated to this plan

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `/Users/singhs/gen-ai-hackathon/web/src/components/landing/SectionProblem.tsx` — modified, contains `useInView`, `useRef`, `ProblemItem`, animate driven by isInView
- `/Users/singhs/gen-ai-hackathon/web/src/__tests__/section-problem.test.tsx` — modified, 5 tests
- Commit b2eeb03: feat(21-02) — present
- Commit 3eb6d8c: test(21-02) — present
