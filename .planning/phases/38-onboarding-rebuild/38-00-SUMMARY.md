---
phase: 38-onboarding-rebuild
plan: "00"
subsystem: onboarding
tags: [tdd, red-tests, wave-0, onboarding, welcome-modal, checklist, settings]
dependency_graph:
  requires: []
  provides:
    - onboarding-welcome-modal.test.tsx (RED tests for ONB-01 through ONB-04)
    - onboarding-checklist.test.tsx (RED tests for ONB-05 and ONB-06)
    - settings-page.test.tsx (RED tests for ONB-07)
  affects:
    - web/src/components/onboarding/OnboardingProvider.tsx (Plan 01 must turn modal tests green)
    - web/src/components/onboarding/OnboardingChecklist.tsx (Plan 02 must turn checklist tests green)
    - web/src/app/(dashboard)/settings/page.tsx (Plan 03 must turn settings tests green)
tech_stack:
  added: []
  patterns:
    - Nyquist compliance: Wave 0 RED test scaffolds before Wave 1 implementation
    - vitest + @testing-library/react with vi.mock for all external dependencies
    - useOnboardingContext mocked at module level to control render conditions
key_files:
  created:
    - web/src/__tests__/onboarding-welcome-modal.test.tsx
    - web/src/__tests__/onboarding-checklist.test.tsx
    - web/src/__tests__/settings-page.test.tsx
  modified: []
decisions:
  - "WelcomeModal tested indirectly via OnboardingProvider with useOnboarding mocked to trigger showWelcome via onboarding_active=true state"
  - "OnboardingChecklist tests mock useOnboardingContext at module level — avoids provider wrapping complexity"
  - "Settings page test mocks useOnboardingContext returning startTour fn — Plan 03 must add the import"
metrics:
  duration_minutes: 6
  completed_date: "2026-04-01"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
requirements:
  - ONB-01
  - ONB-02
  - ONB-03
  - ONB-04
  - ONB-05
  - ONB-06
  - ONB-07
---

# Phase 38 Plan 00: Onboarding Test Scaffolds (Wave 0) Summary

**One-liner:** Three failing TDD test scaffolds asserting Shadcn WelcomeModal copy, section-grouped checklist, and Settings restart-tour button, enforcing ONB-01 through ONB-07 in Red state.

## What Was Built

Three test files establishing automated contracts for the Phase 38 onboarding rebuild:

1. **`onboarding-welcome-modal.test.tsx`** — Tests for ONB-01 through ONB-04. Asserts the rebuilt WelcomeModal renders the new value-prop copy ("HomeMatch scores property listings against your preferences so you instantly know what fits."), the "Let's get started" CTA, "Skip tour" secondary option, and absence of hardcoded hex color inline styles. All 3 copy/style tests fail against the current implementation (old copy + inline styles). The hex-color test passes (DOM renders `rgb()` not `#hex`).

2. **`onboarding-checklist.test.tsx`** — Tests for ONB-05 and ONB-06. Asserts "In the app" and "In the extension" section labels, a success card with "You're all set" text when `onboarding_completed=true`, and a flatfox.ch link in the success card. All 4 assertions fail (current checklist has no section labels and returns null on completion).

3. **`settings-page.test.tsx`** — Test for ONB-07. Asserts an "Onboarding Tour" heading and "Restart tour" button exist in the Settings page, and that clicking the button calls `startTour()`. All 3 assertions fail (Settings page has no onboarding section).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create onboarding-welcome-modal.test.tsx (RED) | 160d104 | web/src/__tests__/onboarding-welcome-modal.test.tsx |
| 2 | Create onboarding-checklist.test.tsx (RED) | d8e2856 | web/src/__tests__/onboarding-checklist.test.tsx |
| 3 | Create settings-page.test.tsx (RED) | b1ae5f7 | web/src/__tests__/settings-page.test.tsx |

## Verification

- All 3 test files run without infrastructure crashes
- New tests: 10 failing (correct RED state), 2 passing (trivially correct assertions)
- Pre-existing test suite: no regressions — same 16 pre-existing failures remain

## Decisions Made

- WelcomeModal is a private component inside OnboardingProvider.tsx; tested by mocking `useOnboarding` to return `onboarding_active: true` which triggers the welcome modal via provider's internal state
- `useOnboardingContext` mocked at module level in checklist/settings tests — cleaner than wrapping with full provider
- Settings test mocks `useOnboardingContext` returning `startTour` even though current production code doesn't import it — Plan 03 must add the import to make tests green

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
