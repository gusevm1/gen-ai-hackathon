---
status: fixing
trigger: "Fix 9 confirmed UX issues in the HomeMatch onboarding system"
created: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Focus

hypothesis: All 9 issues confirmed via code reading — applying fixes now
test: Applying all fixes in sequence
expecting: All issues resolved
next_action: Apply all 9 fixes to 4 files

## Symptoms

expected: Smooth onboarding with correct text, non-blocking popovers, proper transitions
actual: Multiple UX issues across install step text, popover behavior, step transitions, and extension steps
errors: None (UX issues, not crashes)
reproduction: Follow onboarding from step 1
started: Always

## Evidence

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx step 2
  found: Description says "Download and install" which is misleading — user must do many more steps
  implication: Issue 1 confirmed

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx all steps
  found: allowClose: true on all steps, no "Exit Tutorial" label, no hint text about clicking outside
  implication: Issues 2, 9 confirmed

- timestamp: 2026-03-30T00:00:00Z
  checked: download/page.tsx steps array
  found: Only 4 installation steps — missing pin-to-toolbar step
  implication: Issue 3 confirmed

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx step 3
  found: side: 'top' — popover appears above/over the selection cards
  implication: Issue 4 confirmed

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx step 4 (save preferences)
  found: Popover fires immediately on entering /profiles/ page at step 4, no delay
  implication: Issue 5 confirmed

- timestamp: 2026-03-30T00:00:00Z
  checked: preferences-form.tsx handleSubmit
  found: onSave() called, no onboarding advance triggered after success
  implication: Issue 6 confirmed — need to inject advance() call after successful save

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx step 4 second sub-step (Open in Flatfox)
  found: showButtons: ['next', 'close'] — "next" button opens Flatfox URL; should only be "Exit Tutorial"
  implication: Issue 7 confirmed

- timestamp: 2026-03-30T00:00:00Z
  checked: extension/src/entrypoints/content/App.tsx onboarding load
  found: Reads state once on mount, checks step >= 5 && <= 8. Steps 5-7 are defined in EXTENSION_STEPS. Logic appears correct structurally.
  implication: Issue 8 — need to verify step 4→5 transition writes step=5 to Supabase BEFORE flatfox opens

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingProvider.tsx step 4 onNextClick for "Open in Flatfox"
  found: updateOnboardingState(5, true, ...) then destroy() then window.open() — this is correct.
  implication: Issue 8 is actually about step 4 sub-step 1 (save prefs) not advancing to sub-step 2 (open flatfox) automatically

## Eliminated

- hypothesis: Extension step reading is broken
  evidence: The getOnboardingState() call and step range check (5-8) look correct; the real issue is step 4 not advancing properly
  timestamp: 2026-03-30T00:00:00Z

## Resolution

root_cause: Multiple independent UX issues across OnboardingProvider.tsx, download/page.tsx, and preferences-form.tsx
fix: Applying 9 targeted fixes
verification: pending
files_changed: [
  "web/src/components/onboarding/OnboardingProvider.tsx",
  "web/src/app/(dashboard)/download/page.tsx",
  "web/src/components/preferences/preferences-form.tsx",
  "web/src/lib/translations.ts"
]
