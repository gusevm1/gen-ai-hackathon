---
phase: 34-onboarding-tutorial-system
plan: "02"
subsystem: extension
tags: [onboarding, extension, overlay, content-script, shadow-dom]
dependency_graph:
  requires: ["34-01"]
  provides: ["extension-onboarding-steps-4-7", "spotlight-overlay", "onboarding-state-sync"]
  affects: ["extension/content-script", "extension/background"]
tech_stack:
  added: []
  patterns: ["SVG-mask spotlight overlay", "Shadow DOM fixed positioning", "background message passthrough"]
key_files:
  created:
    - extension/src/lib/onboarding.ts
    - extension/src/entrypoints/content/components/OnboardingOverlay.tsx
    - extension/src/entrypoints/content/components/OnboardingTooltip.tsx
  modified:
    - extension/src/entrypoints/background.ts
    - extension/src/entrypoints/content/App.tsx
    - extension/src/entrypoints/content/style.css
decisions:
  - "SVG mask cutout approach chosen for spotlight — avoids driver.js Shadow DOM conflicts"
  - "OnboardingOverlay renders inside existing FAB shadow root (fixed positioning is viewport-relative, not shadow-host-relative)"
  - "Step 5 auto-advance implemented in handleScore setOnboardingState callback to avoid stale closure issues"
  - "Step 4 login verification uses existing getSession message rather than a new endpoint"
  - "Supabase writes are fire-and-forget (no await blocking UI transitions)"
  - "Silent error handling in onboarding.ts helpers — null treated as no onboarding by content script"
metrics:
  duration: "~8min"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 6
---

# Phase 34 Plan 02: Extension Onboarding Overlay (Steps 4-7) Summary

**One-liner:** SVG-mask spotlight overlay in extension content script guides users through login, analyze, understand results, and web app redirect — coordinated via background script Supabase state sync.

## What Was Built

Extension-side onboarding system that activates when a user lands on Flatfox during an active onboarding session (steps 4-7). Reads state on page load via background script, shows step-appropriate spotlights, and writes state transitions back to Supabase.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Background message handlers + onboarding state helpers | 2526b62 | background.ts, lib/onboarding.ts |
| 2 | Spotlight overlay, tooltips, App.tsx integration | e580dc0 | OnboardingOverlay.tsx, OnboardingTooltip.tsx, App.tsx, style.css |

## Component Details

### `extension/src/lib/onboarding.ts`
Two async helpers for content scripts:
- `getOnboardingState()` — sends `getOnboardingState` to background, returns typed `OnboardingState | null`
- `updateOnboardingState(step, active, completed)` — sends `updateOnboardingState` to background; silently fails

### `extension/src/entrypoints/background.ts` (new cases)
- `getOnboardingState`: checks user auth, queries `profiles.preferences` for default profile, returns onboarding JSONB slice
- `updateOnboardingState`: calls `update_onboarding_state` Supabase RPC deployed in Plan 01

### `OnboardingOverlay.tsx`
Full-viewport fixed overlay with SVG mask cutout. Targets elements by CSS selector or shadow host tag name. Adds resize/scroll listeners (debounced) to reposition. Uses `getExtensionIconFallbackRect()` for step 4 (no DOM target). Cutout has `pointerEvents: none` so the user can interact with the highlighted element.

### `OnboardingTooltip.tsx`
Positioned tooltip with inline styles. Automatically flips above/below based on viewport space. Arrow caret always points at target. Shows "Step X of 7" progress, Skip button, and configurable Next/Got it/Done button. Displays optional `statusMessage` in red for validation errors.

### `App.tsx` onboarding integration
- `useEffect` on mount loads onboarding state; only activates if step ∈ [4,7] and `onboarding_active`
- `advanceOnboarding` increments step, writes to Supabase; step 7 → 8 opens web app and hides overlay
- `skipOnboarding` sets `active=false`, hides overlay immediately
- `handleStep4Next` verifies `getSession` before advancing (shows inline error if unauthenticated)
- `handleScore` auto-advances step 5 → 6 via `setOnboardingState` callback when scoring produces results

## Step Behavior Summary

| Step | Trigger | Target | Advance |
|------|---------|--------|---------|
| 4 | Page load with step=4 | Extension icon area (fallback rect) | "I'm logged in" — verifies auth |
| 5 | Step=5 active | FAB shadow host (`homematch-fab`) | Auto: scoring completes with results |
| 6 | After step 5 auto-advance | First badge shadow host | "Got it" button |
| 7 | After step 6 | No specific target | "Done" → sets step=8, opens homematch.ch/analyses |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Implementation Notes

**Re: index.tsx changes not needed** — plan section 2d noted that no changes to index.tsx were required if overlay renders inside App.tsx's shadow root. This was confirmed: `position: fixed` in a shadow DOM element is relative to the viewport, so the overlay covers the full screen correctly from within the FAB shadow root.

**Re: step 5 nextLabel: null** — the plan specifies `nextLabel: null` for step 5 (auto-advance). The `OnboardingOverlay` renders the Next button with `nextLabel ?? 'Next'` fallback, so the button is still visible as a fallback in case auto-advance doesn't trigger (e.g., scoring fails). This is a safe deviation.

## Self-Check

Files created:
- [x] `extension/src/lib/onboarding.ts` — FOUND
- [x] `extension/src/entrypoints/content/components/OnboardingOverlay.tsx` — FOUND
- [x] `extension/src/entrypoints/content/components/OnboardingTooltip.tsx` — FOUND

Commits:
- [x] 2526b62 — Task 1 (background handlers + onboarding.ts)
- [x] e580dc0 — Task 2 (overlay components + App.tsx)

Build: `npm run build` — PASSED (4.4s, no errors)

## Self-Check: PASSED
