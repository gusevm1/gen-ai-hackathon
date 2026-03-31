---
status: resolved
trigger: "Extension onboarding steps 5-8 not appearing on Flatfox"
created: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:01:00Z
---

## Current Focus

hypothesis: The OnboardingOverlay renders inside the Shadow DOM root (homematch-fab), but fixed/absolute positions inside a Shadow DOM root are clipped to the shadow host's stacking context. The SVG overlay and tooltip are rendered inside the shadow root's container div, so they may not cover the full viewport as expected. Additionally the overlay uses `position: fixed` but the shadow host might not establish its own stacking context correctly.

SECOND (stronger) hypothesis: The overlay is rendered inside the Shadow DOM which is an `overlay` type shadow root. The `position: fixed` elements inside a shadow root DO work relative to the viewport — BUT the `App` React component renders BOTH the Fab AND the OnboardingOverlay inside the same shadow root container. The OnboardingOverlay renders at zIndex 99999, which should work. The real issue may be that `getOnboardingState()` is called once on mount and reads state via `browser.runtime.sendMessage({ action: 'getOnboardingState' })` — the extension background queries Supabase with `is_default: true`. If the background script returns null (not logged in yet, or timing issue), the onboarding state is null and overlay never renders.

test: Read all evidence carefully to determine whether the issue is:
  (a) Race condition: Supabase write happens, but extension reads BEFORE it propagates
  (b) Auth: user not logged in in extension so getOnboardingState returns null
  (c) Shadow DOM rendering issue: overlay not visible due to stacking context
  (d) The `onBeforeOpen` callback fires but `open()` is called inside a try/catch that swallows errors, so if updateOnboardingState fails, the tab opens anyway without step=5 written

expecting: Code review reveals the failure point
next_action: Analyze code paths for each hypothesis — DONE, see evidence

## Symptoms

expected: When user clicks "Open in Flatfox" from the profile form at step 4, Supabase is updated to step=5, a new Flatfox tab opens, and the extension content script shows the onboarding overlay (step 5 tip)
actual: The tab opens on Flatfox but no onboarding overlay appears
errors: None reported
reproduction: Go through onboarding to step 4, click "Open in Flatfox"
started: After Phase 34-02 implementation

## Eliminated

- hypothesis: OnboardingOverlay component is missing
  evidence: File exists at extension/src/entrypoints/content/components/OnboardingOverlay.tsx, it's imported and used in App.tsx
  timestamp: 2026-03-30T00:00:00Z

- hypothesis: EXTENSION_STEPS array missing step 5-8 configs
  evidence: All four steps (5,6,7,8) are defined in App.tsx EXTENSION_STEPS array
  timestamp: 2026-03-30T00:00:00Z

- hypothesis: step number mismatch (web writes 5, extension checks different value)
  evidence: Web writes step=5 via updateOnboardingState(5, true, ...) in preferences-form.tsx:157. Extension checks state.onboarding_step >= 5 && <= 8 in App.tsx:162-165. These match.
  timestamp: 2026-03-30T00:00:00Z

- hypothesis: onBeforeOpen callback not passed
  evidence: preferences-form.tsx:152-160 passes onBeforeOpen when onboardingActive && step === 4. The callback awaits updateOnboardingState before window.open in open-in-flatfox-button.tsx:31-33.
  timestamp: 2026-03-30T00:00:00Z

## Evidence

- timestamp: 2026-03-30T00:00:00Z
  checked: App.tsx mount effect for onboarding (lines 158-169)
  found: getOnboardingState() is called ONCE on mount with no polling. Returns null if user not logged in (background returns { onboarding: null } when no user). If null, overlay never renders.
  implication: If user opens Flatfox without being logged into the extension, overlay will not show. This is a valid scenario during onboarding (step 5 instructs them to log in).

- timestamp: 2026-03-30T00:00:00Z
  checked: background.ts getOnboardingState handler (lines 71-80)
  found: Queries `profiles` table with `eq('is_default', true)`. Returns null if user not authenticated.
  implication: For step 5 ("Click the HomeMatch icon in your toolbar") — the user MAY not be logged in yet. The extension reads null, overlay never shows. THIS IS THE PRIMARY BUG for step 5.

- timestamp: 2026-03-30T00:00:00Z
  checked: open-in-flatfox-button.tsx error handling (lines 33-38)
  found: If onBeforeOpen throws, it falls into the catch block and opens the Flatfox tab WITHOUT the step=5 Supabase write. However the web app's updateOnboardingState uses supabase.rpc directly (not through extension background), so it should succeed regardless of extension auth state.
  implication: If the RPC call fails for network/auth reasons, step stays at 4 and extension reads step=4 which is < 5, so overlay still won't show.

- timestamp: 2026-03-30T00:00:00Z
  checked: OnboardingOverlay.tsx rendering context
  found: The component renders inside the homematch-fab Shadow DOM overlay (position:'overlay'). It uses position:fixed with zIndex:99999 inside that shadow root. The shadow root IS an 'overlay' type which means it overlays the page. Fixed positioning inside shadow roots IS scoped to the viewport in modern Chrome.
  implication: Shadow DOM rendering should work correctly for fixed-position overlays.

- timestamp: 2026-03-30T00:00:00Z
  checked: Race condition possibility
  found: onBeforeOpen awaits updateOnboardingState (Supabase write) before window.open(). So by the time the new tab opens, the write should be committed. However there's no artificial delay — the tab opens immediately after the await resolves. Supabase write is async/network; the new tab loads the content script which ALSO makes a network call. In practice, the 100-200ms network RTT for the Supabase write should complete before the new tab's content script runs.
  implication: Race condition is unlikely to be the primary cause, but could be secondary.

- timestamp: 2026-03-30T00:00:00Z
  checked: Step 5 use case: user NOT logged into extension
  found: This is the PRIMARY use case for step 5 — the user hasn't logged into the extension yet. The overlay SHOULD show even if the user is not logged into the extension, because the state is stored in Supabase (accessible via the web app's auth), not in extension storage. But the extension reads state via background.ts which requires the user to be logged into the extension. If not logged in, background returns null, overlay never shows.
  implication: ROOT CAUSE FOUND: The extension reads onboarding state via getOnboardingState() which goes through the background script, requiring extension auth. For step 5, the user is by definition NOT logged into the extension yet. So the overlay for step 5 (and possibly step 6) never renders because the auth check fails.

## Resolution

root_cause: The extension content script reads onboarding state via `browser.runtime.sendMessage({ action: 'getOnboardingState' })`, which queries Supabase from the background script. The background script gate-checks `auth.getUser()` — if no user is logged in, it returns `{ onboarding: null }`. This means step 5 ("Click the toolbar icon to open the extension") will NEVER show: the very purpose of step 5 is to guide the user to log in, so they cannot be logged in yet. The overlay for step 6 has the same problem.

fix: The extension needs a fallback mechanism to read onboarding state WITHOUT requiring the user to be logged in. Options:
  1. Pass the onboarding step as a URL parameter in the Flatfox URL (e.g. ?homematch_step=5) so the content script can read it without any auth
  2. Store the onboarding step in chrome.storage.local (set by the web app via a cross-origin message or the extension's background script receiving a special message) before opening the tab
  3. Use a URL fragment/query parameter approach — simplest and most reliable

The cleanest fix: When writing step=5 to Supabase (in onBeforeOpen), also encode the onboarding step in the Flatfox URL as a query parameter. The content script reads this parameter on load and uses it as the initial step if getOnboardingState() returns null.

verification: Extension build succeeded (wxt build, no errors). Web TypeScript pre-existing test errors only — no errors in modified files. Committed and pushed as 3d2ade0.
files_changed:
  - extension/src/entrypoints/content/App.tsx
  - web/src/components/preferences/preferences-form.tsx
  - web/src/components/profiles/open-in-flatfox-button.tsx
