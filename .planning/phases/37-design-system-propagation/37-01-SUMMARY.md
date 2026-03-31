---
phase: 37-design-system-propagation
plan: "01"
subsystem: testing
tags: [tdd, design-system, tier-colors, fade-in, test-scaffold]
dependency_graph:
  requires: []
  provides: [tier-colors-test-scaffold, fade-in-animate-test-scaffold]
  affects: [37-02, 37-03]
tech_stack:
  added: []
  patterns: [TDD RED state, vitest, @testing-library/react]
key_files:
  created:
    - web/src/__tests__/tier-colors.test.tsx
  modified:
    - web/src/__tests__/fade-in.test.tsx
decisions:
  - Used `as any` cast in fade-in test to bypass TypeScript compile error for unknown animate prop — avoids modifying FadeIn interface before Plan 02
  - tier-colors tests assert NEW palette (teal/green/red) not current values (emerald/blue/gray) — deliberate RED state per Wave 0 Nyquist compliance
metrics:
  duration: "11 min"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 37 Plan 01: TDD Test Scaffold Summary

Vitest test scaffolding for design-system palette enforcement and FadeIn animate-prop readiness, both in deliberate RED/green state for Wave 0 Nyquist compliance.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create tier-colors.test.tsx with failing assertions | 413f56e | web/src/__tests__/tier-colors.test.tsx |
| 2 | Extend fade-in.test.tsx with animate-prop test case | 1cf10a2 | web/src/__tests__/fade-in.test.tsx |

## What Was Built

**tier-colors.test.tsx** — 5 test cases against `getTierColor()` asserting the NEW design-system palette:
- excellent: bg-teal-500 / ring-teal-500/40 (currently emerald — FAILS)
- good: bg-green-500 / ring-green-500/40 (currently blue — FAILS)
- fair: bg-amber-500 / ring-amber-500/40 (unchanged — PASSES)
- poor: bg-red-500 / ring-red-500/40 (currently gray — FAILS)
- unknown: falls back to poor (red-500) values — FAILS

4/5 tests are RED. Plan 02 must make them GREEN by updating ScoreHeader palette.

**fade-in.test.tsx** — Added `renders children in animate (mount) mode` test using `animate="visible"` prop. Passes with `as any` cast. Plan 02 will add the `animate` prop to FadeIn's TypeScript interface, at which point the cast can be removed.

## Deviations from Plan

**1. [Rule 2 - Missing] Used `as any` cast for animate prop in fade-in test**
- **Found during:** Task 2
- **Issue:** FadeIn's TypeScript interface has no `animate` prop; test would fail to compile without workaround
- **Fix:** Cast `animate={"visible" as any}` with ESLint suppress comment — test runs and passes; cast removed by Plan 02 when prop is properly typed
- **Files modified:** web/src/__tests__/fade-in.test.tsx

## Pre-existing Test Failures (Out of Scope)

The following test files had pre-existing failures unrelated to this plan's changes:
- download-page.test.tsx
- chat-page.test.tsx
- landing-page.test.tsx
- navbar.test.tsx
- section-cta.test.tsx
- section-solution.test.tsx
- top-navbar.test.tsx

These are logged for awareness but not fixed (per scope boundary rules).

## Self-Check: PASSED
