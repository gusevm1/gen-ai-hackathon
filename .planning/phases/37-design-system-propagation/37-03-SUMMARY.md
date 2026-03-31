---
phase: 37-design-system-propagation
plan: 03
subsystem: web/motion
tags: [animation, framer-motion, dashboard, profiles, design-system]
dependency_graph:
  requires: [37-01, 37-02]
  provides: [DS-02-partial]
  affects: [dashboard-home, profiles-list, motion-primitives]
tech_stack:
  added: []
  patterns: [dual-mode-motion-prop, mount-triggered-animation, stagger-grid-animation]
key_files:
  created: []
  modified:
    - web/src/components/motion/FadeIn.tsx
    - web/src/components/motion/StaggerGroup.tsx
    - web/src/components/dashboard/ReturningUserDashboard.tsx
    - web/src/components/profiles/profile-list.tsx
key_decisions:
  - FadeIn animate prop uses undefined check (not boolean) — allows any string target state name, consistent with framer-motion animate API
  - StaggerGroup uses spread conditional pattern to keep non-animate (whileInView) path identical to original — no viewport change
  - Dashboard delays: 0s / 0.1s / 0.2s (per CONTEXT.md 0.05–0.15s step guidance, 3 sections)
  - Profile card key stays on StaggerItem not ProfileCard — StaggerItem is the motion container and needs the key for React reconciliation
requirements: [DS-02]
metrics:
  duration: 3 min
  completed_date: "2026-03-31T20:43:16Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 37 Plan 03: Dual-Mode Motion Primitives + Dashboard/Profile Animations Summary

**One-liner:** FadeIn and StaggerGroup gain optional animate prop for mount-triggered mode; dashboard home and profiles list now animate on mount with staggered delays.

## What Was Built

### Task 1: Add animate prop to FadeIn and StaggerGroup (TDD GREEN)

`FadeIn` gained an `animate?: string` prop. When provided, the component uses `initial="hidden" animate={animate}` (mount-triggered) instead of `whileInView="visible"` with `viewport`. The `useReducedMotion` guard is preserved in both branches. The default (no prop) path is unchanged — `whileInView="visible"` with `viewport={{ once: true, amount: 0.2 }}` — so landing page scroll animations are unaffected.

`StaggerGroup` gained an `animate?: string` prop using a conditional spread pattern. When provided, the component spreads `{ animate }`. Otherwise it spreads `{ whileInView: "visible", viewport: { once: true, amount: 0.15 } }` — identical to the original implementation.

**Tests:** fade-in.test.tsx 3/3 passed (GREEN) — including the animate-prop test from Plan 37-01 scaffold.

### Task 2: Apply on-mount animations to dashboard home and profiles list

`ReturningUserDashboard` now imports `FadeIn` and wraps each of its three sections in `FadeIn animate="visible"` with staggered delays (0s, 0.1s, 0.2s). Each section fades up from hidden on mount.

`profile-list.tsx` card grid replaced the bare `div` with `StaggerGroup animate="visible"` carrying the grid CSS classes, and each `ProfileCard` is wrapped in `StaggerItem`. The empty-state branch, dialogs, and button controls are untouched.

## Verification Results

1. `npm test -- --run src/__tests__/fade-in.test.tsx` — 3/3 passed
2. Full suite — pre-existing failures (8 files, 20 tests) unchanged; no new failures introduced
3. FadeIn source confirms `whileInView="visible"` present in default branch (no regression)
4. ReturningUserDashboard has three `FadeIn animate="visible"` wrappers
5. profile-list.tsx card grid uses `StaggerGroup animate="visible"` with `StaggerItem` children

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `web/src/components/motion/FadeIn.tsx` — modified, animate prop added
- [x] `web/src/components/motion/StaggerGroup.tsx` — modified, animate prop added
- [x] `web/src/components/dashboard/ReturningUserDashboard.tsx` — modified, FadeIn animate wrappers
- [x] `web/src/components/profiles/profile-list.tsx` — modified, StaggerGroup/StaggerItem wrapping grid
- [x] Task 1 commit: 74d8295
- [x] Task 2 commit: 785e14a

## Self-Check: PASSED
