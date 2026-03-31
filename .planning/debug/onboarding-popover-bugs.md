---
status: awaiting_human_verify
trigger: "Fix 3 critical blocking bugs in the HomeMatch onboarding driver.js popovers"
created: 2026-03-30T00:00:00Z
updated: 2026-03-30T03:30:00Z
---

## Current Focus

hypothesis: Step 4 on-load driver.js popover gets auto-destroyed when user clicks a form field; driverRef.current holds the dead instance; advanceToOpenFlatfox() calls moveNext() on it, throws, catch calls launchTourForCurrentPage() synchronously which fires drive(1) immediately but never shows the Open Flatfox popover reliably
test: Replace on-load step-4 driver with inline banner; expose showOpenFlatfoxStep() that creates a fresh driver instance; call it from preferences-form.tsx after successful save
expecting: Banner stays visible while user fills form; after save, driver.js highlights #open-flatfox-profile-btn reliably
next_action: Human verification — confirm Save Preferences triggers Open Flatfox popover in app

## Symptoms

expected: Popovers behave correctly — tour non-blocking, click-outside works, modals accessible, no white square
actual: (1) Auto-trigger fires for existing users, (2) click-outside creates infinite toggle loop, (3) white square artifact on screen, (4) overlay blocks modals and inputs, (5) Start Tour button unclickable under overlay, (6) Save Preferences button does NOT trigger Open Flatfox step — the driver popover on the Open Flatfox button never appears after saving
errors: Visual/UX bugs — no JS errors
reproduction: Launch onboarding tour — all issues visible on steps 1-4
started: After initial driver.js integration + subsequent hack layering

## Eliminated

- hypothesis: Issue 1 is a CSS problem
  evidence: Root cause is allowClose:false which disables the onOverlayClick handler entirely — not a styling issue
  timestamp: 2026-03-30T00:01:00Z

- hypothesis: MutationObserver approach can fix modal blocking
  evidence: Causes unpredictable z-index state; setting overlayOpacity:0 is the correct fix — no overlay = no blocking = no z-index fights
  timestamp: 2026-03-30T02:00:00Z

- hypothesis: overlayClickBehavior toggle approach can fix click-outside
  evidence: Creates infinite toggle loop between "popover visible" and "Resume Tutorial button" states; overlayOpacity:0 eliminates the need entirely
  timestamp: 2026-03-30T02:00:00Z

- hypothesis: driverRef.current.moveNext() reliably advances to the Open Flatfox sub-step after save
  evidence: driverRef.current holds a destroyed driver instance (no onDestroyStarted callback clears it for step 4); moveNext() throws; catch calls launchTourForCurrentPage() synchronously; drive(1) fires before driverRef.current is set to the new instance — Open Flatfox popover never shows
  timestamp: 2026-03-30T03:00:00Z

## Evidence

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx
  found: allowClose:false is set globally on all driver instances — this disables overlay click handling
  implication: Original Issue 1 root cause

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx patchCloseButton function
  found: Replaces driver X button text/style inline — but driver puts .driver-close-btn at absolute top-right outside padding box
  implication: Original Issue 3 root cause — button overflows popover container

- timestamp: 2026-03-30T00:00:00Z
  checked: create-profile-dialog.tsx + profile-list.tsx
  found: Dialog is a Radix/shadcn Dialog rendered into a portal — driver.js overlay sits at z-index 100000+ above the dialog
  implication: Original Issue 2 root cause — overlay blocks dialogs

- timestamp: 2026-03-30T02:00:00Z
  checked: Current OnboardingProvider.tsx with all "fixes" applied
  found: overlayClickBehavior toggles popover opacity creating infinite toggle loop; MutationObserver z-index manipulation races with driver.js internal state; patchCloseButton DOM manipulation conflicts with driver re-renders; white square from driver.js highlighting null/body element on step 1
  implication: All current hacks compound each other; correct fix is overlayOpacity:0 which eliminates all overlay-related issues in one change

- timestamp: 2026-03-30T02:00:00Z
  checked: getOnboardingState in onboarding-state.ts
  found: Queries profiles table for preferences.onboarding — if user has onboarding_active:true stored from prior partial tour, auto-trigger fires
  implication: Auto-trigger for existing users is caused by stale onboarding_active:true in DB; fix is to check hasProfiles before auto-starting

- timestamp: 2026-03-30T03:00:00Z
  checked: OnboardingProvider.tsx step 4 driver block + advanceToOpenFlatfox + preferences-form.tsx handleSubmit
  found: (1) Step 4 driver has NO onDestroyStarted callback — driverRef.current stays set to destroyed instance when user clicks a form field. (2) advanceToOpenFlatfox() calls moveNext() on dead instance, throws, catch calls launchTourForCurrentPage() synchronously. (3) launchTourForCurrentPage creates new driver, sets driverRef.current = inst, then calls inst.drive(1) — but this is from inside the synchronous catch, and the driver never fires reliably.
  implication: The entire 2-step driver approach for step 4 is fragile. Fix: remove on-load driver for step 4, show inline banner instead, expose showOpenFlatfoxStep() that creates a standalone single-step driver after save.

## Resolution

root_cause: |
  Step 4 on-load driver.js popover for "Save Preferences" gets auto-destroyed when user clicks any form field.
  driverRef.current holds the stale destroyed instance (no onDestroyStarted to clear it).
  After save, advanceToOpenFlatfox() calls moveNext() on the dead driver → throws → catch calls
  launchTourForCurrentPage() synchronously → creates new driver and immediately calls drive(1) —
  the "Open in Flatfox" popover is fired on a freshly created instance from within the catch block
  and never reliably appears.

fix: |
  1. In OnboardingProvider: remove the on-load driver.js step for "Save Preferences" (step 4 first sub-step)
  2. In OnboardingProvider: add inline banner rendered via React when onboarding_active && step === 4 on a /profiles/ page
  3. In OnboardingProvider: add showOpenFlatfoxStep() — creates a fresh standalone driver pointing at #open-flatfox-profile-btn
  4. Expose showOpenFlatfoxStep via context (replacing advanceToOpenFlatfox)
  5. In preferences-form.tsx: after successful save, if onboarding step 4, call showOpenFlatfoxStep()
  6. Remove the 3-second setTimeout delay hack and step4SavedRef

verification: awaiting human confirmation — commit 12be701 deployed to Vercel
files_changed:
  - web/src/components/onboarding/OnboardingProvider.tsx
  - web/src/components/preferences/preferences-form.tsx
