---
phase: "19"
plan: "01"
subsystem: "web/landing"
tags: [landing-page, marketing, motion, translations, auth-refactor]
dependency_graph:
  requires: [18-01]
  provides: [landing-page, auth-route]
  affects: [web/src/app/page.tsx, web/src/app/auth/page.tsx, web/src/lib/translations.ts]
tech_stack:
  added: []
  patterns: [server-component-auth-gate, sequential-animation-timeline, scroll-triggered-sections]
key_files:
  created:
    - web/src/app/auth/page.tsx
    - web/src/components/landing/LandingPageContent.tsx
    - web/src/components/landing/LandingNavbar.tsx
    - web/src/components/landing/HeroSection.tsx
    - web/src/components/landing/HeroDemo.tsx
    - web/src/components/landing/ProblemSection.tsx
    - web/src/components/landing/HowItWorksSection.tsx
    - web/src/components/landing/FeaturesSection.tsx
    - web/src/components/landing/CtaSection.tsx
    - web/src/components/landing/LandingFooter.tsx
    - web/src/__tests__/landing-translations.test.ts
    - web/src/__tests__/landing-page.test.tsx
    - web/src/__tests__/auth-page.test.tsx
  modified:
    - web/src/app/page.tsx
    - web/src/lib/translations.ts
decisions:
  - "Auth form moved to /auth; / is now a Server Component that redirects logged-in users to /dashboard"
  - "translations const exported so test files can import it directly for coverage checks"
  - "IntersectionObserver mock added in landing-page test (same pattern as existing fade-in.test.tsx)"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-27"
  tasks_completed: 15
  files_created: 13
  files_modified: 2
---

# Phase 19 Plan 01: Landing Page Summary

**One-liner:** Apple-inspired marketing landing page with sequential HeroDemo animation, scroll-triggered FadeIn/StaggerGroup sections, 30 EN/DE translation keys, and auth form relocated to /auth.

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Create web/src/app/auth/page.tsx (copy of old page.tsx) | 9ffb3d7 |
| 2 | Update translations.ts — add 30 landing_* keys (EN/DE) + export const | 9ffb3d7 |
| 3 | Replace page.tsx with Server Component landing shell | 9ffb3d7 |
| 4 | Create LandingPageContent.tsx | 9ffb3d7 |
| 5 | Create LandingNavbar.tsx | 9ffb3d7 |
| 6 | Create HeroSection.tsx | 9ffb3d7 |
| 7 | Create HeroDemo.tsx | 9ffb3d7 |
| 8 | Create ProblemSection.tsx | 9ffb3d7 |
| 9 | Create HowItWorksSection.tsx | 9ffb3d7 |
| 10 | Create FeaturesSection.tsx | 9ffb3d7 |
| 11 | Create CtaSection.tsx | 9ffb3d7 |
| 12 | Create LandingFooter.tsx | 9ffb3d7 |
| 13 | Write 3 test files | 9ffb3d7 |
| 14 | Run tests + fix failures | 9ffb3d7 |
| 15 | Commit | 9ffb3d7 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added IntersectionObserver mock in landing-page.test.tsx**
- **Found during:** Task 14
- **Issue:** `useInView` from motion/react requires IntersectionObserver, which JSDOM does not implement. Tests failed with `ReferenceError: IntersectionObserver is not defined`.
- **Fix:** Added `beforeAll` block mocking `global.IntersectionObserver` — same pattern used in the existing `fade-in.test.tsx`.
- **Files modified:** web/src/__tests__/landing-page.test.tsx
- **Commit:** 9ffb3d7

## Test Results

- 156 passed, 6 failed (6 pre-existing chat-page failures, unchanged)
- All new landing page tests pass: landing-translations (62 tests), landing-page (3 tests), auth-page (1 test)

## Self-Check: PASSED

All 15 created/modified files confirmed present. Commit 9ffb3d7 confirmed in git log.
