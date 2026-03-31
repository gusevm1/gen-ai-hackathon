---
status: awaiting_human_verify
trigger: "Extension content script running on Flatfox, URL has ?homematch_onboarding=5, but NO onboarding tip is visible"
created: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:01:00Z
---

## Current Focus

hypothesis: OnboardingOverlay renders inside a Shadow DOM root (the homematch-fab shadow root), so its fixed-position elements with zIndex 99999 are scoped to the shadow root's stacking context — invisible relative to the actual page viewport.
test: Read index.tsx to confirm App is mounted inside a shadow root, read OnboardingOverlay to confirm it does NOT use createPortal to escape to document.body.
expecting: Root cause confirmed — overlay is trapped inside shadow DOM stacking context.
next_action: Refactor OnboardingOverlay to render via createPortal(…, document.body) so it escapes the shadow DOM.

## Symptoms

expected: Onboarding tip/overlay for step 5 appears visibly on the Flatfox search page when URL has ?homematch_onboarding=5
actual: No overlay visible anywhere on the page despite content script being connected
errors: None reported
reproduction: Navigate to flatfox.ch/en/search/?homematch_onboarding=5
started: After commit 3d2ade0 added URL param fallback

## Eliminated

- hypothesis: URL param fallback code is missing or broken
  evidence: Code in App.tsx lines 175-187 correctly reads URLSearchParams, parses integer, checks 5-6 range, and calls setOnboardingState. The fallback is correct.
  timestamp: 2026-03-30T00:01:00Z

- hypothesis: State is never set — onboardingState stays null
  evidence: The fallback setOnboardingState call sets { onboarding_step: 5, onboarding_active: true, onboarding_completed: false }. activeStepConfig lookup finds EXTENSION_STEPS[0] (step 5). Condition on line 474 `activeStepConfig && onboardingState` would be true. State IS being set.
  timestamp: 2026-03-30T00:01:00Z

- hypothesis: OnboardingOverlay component has a conditional that prevents render
  evidence: OnboardingOverlay only returns null if rect is null (line 108). getExtensionIconFallbackRect() always returns a valid DOMRect (lines 45-49). So rect will always be set for step 5. Component DOES render.
  timestamp: 2026-03-30T00:01:00Z

## Evidence

- timestamp: 2026-03-30T00:01:00Z
  checked: extension/src/entrypoints/content/index.tsx
  found: App is mounted with createShadowRootUi into a shadow root named 'homematch-fab', position 'overlay'. The React root containing App (and therefore OnboardingOverlay) lives INSIDE the shadow DOM.
  implication: All position:fixed elements rendered by App are positioned relative to the shadow root's containing block / stacking context, not the real viewport. They are invisible outside the shadow host.

- timestamp: 2026-03-30T00:01:00Z
  checked: extension/src/entrypoints/content/components/OnboardingOverlay.tsx
  found: The overlay div uses position:fixed and zIndex:99999, but does NOT use createPortal. It renders as a direct child of the React tree, which is inside the shadow DOM container.
  implication: In a shadow DOM overlay context, position:fixed is clipped/scoped to the shadow root. The overlay never appears on the real page layer.

- timestamp: 2026-03-30T00:01:00Z
  checked: OnboardingTooltip.tsx
  found: Tooltip also uses position:fixed with zIndex:100001 — same shadow DOM scoping problem.
  implication: Both the dark backdrop SVG and the tooltip card are invisible outside the shadow host element.

## Resolution

root_cause: OnboardingOverlay (and its child OnboardingTooltip) render inside the homematch-fab Shadow DOM root via a normal React tree. Shadow DOM creates an isolated stacking context — position:fixed and z-index values are scoped within it, not relative to the real page viewport. The overlay elements are present in the DOM but invisible because they are trapped inside the shadow root's rendering layer.
fix: Wrapped OnboardingOverlay render in createPortal(…, document.body) in App.tsx. Bumped all overlay z-index values to 2147483647 (max) in OnboardingOverlay.tsx and OnboardingTooltip.tsx. Build passes. Committed as 377d4ee.
verification: []
files_changed: [extension/src/entrypoints/content/App.tsx, extension/src/entrypoints/content/components/OnboardingOverlay.tsx, extension/src/entrypoints/content/components/OnboardingTooltip.tsx]
