---
status: resolved
trigger: "The entire onboarding/tutorial system is broken — existing users are incorrectly triggered into onboarding, the tour flow has wrong steps/content, the checklist widget shows wrong data and disappears, and the flow doesn't complete properly (steps 4+ never fire, no extension guidance)."
created: 2026-03-30T00:00:00Z
updated: 2026-03-30T01:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: 7 confirmed issues — step counter "1 of 1", profile save→flatfox flow, missing permanent Flatfox button in form, unwanted Flatfox button on dashboard, URL not language-aware, extension step labels wrong
test: Code read confirms all 7 issues, applying targeted fixes
expecting: Each file patched correctly
next_action: Apply fixes to all 7 files

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: |
  - Existing users (who have profiles and analyses) should NOT be auto-triggered into onboarding
  - When a user manually triggers "Take a quick tour", the tour should show 8 steps in sequence
  - Step 1: Welcome/intro, Step 2: Extension install, Step 3: Create profile, Steps 4+: guidance flow
  - Checklist widget shows 8 steps, persists, tracks progress
  - "Previous" on step 1 should be hidden/disabled
  - Clicking "Done" on any step advances to next (not stops)

actual: |
  - Existing user lands on dashboard → immediately taken to extension install page (Step 2, skipping Step 1)
  - "Previous" button on install page exists but appears clickable (wrong)
  - Clicking "Done" on install page: tour stops completely
  - Checklist widget shows "Step 1 of 8" but content shows 3 listings (wrong content)
  - Checklist widget disappears after clicking manual profile creation
  - Steps 4-7 (extension side) never fire
  - No continuation after profile creation

errors: No explicit errors reported, but tour stops after "Done" click

reproduction: |
  1. Login as existing user with profiles
  2. Navigate to dashboard → auto-triggers onboarding at Step 2 (wrong)
  3. Alternatively: click "Take a quick tour" in profile dropdown
  4. Observe: skips Step 1, wrong checklist content, tour stops on Done, no steps 4+

started: Just implemented in Phase 34 (34-01 and 34-02), never worked correctly

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-30T00:05:00Z
  checked: OnboardingProvider.tsx — auto-start trigger condition (line 184)
  found: |
    Condition: `!state.onboarding_active && !state.onboarding_completed && state.onboarding_step === 1`
    DEFAULT_ONBOARDING = { step: 1, active: false, completed: false }.
    Existing users who have never touched onboarding have NULL in their profile preferences, so
    getOnboardingState() returns DEFAULT_ONBOARDING. This makes every existing user look like a
    brand-new user and triggers auto-start on every page load.
    FIX NEEDED: getOnboardingState must distinguish "no record in DB" (new user) from DEFAULT_ONBOARDING.
  implication: Auto-trigger fires for ALL existing users on every dashboard visit.

- timestamp: 2026-03-30T00:05:01Z
  checked: OnboardingProvider.tsx — step numbering mapping (lines 42-129)
  found: |
    The driver.js tour steps are:
      pathname='/download' && step===1 → "Install the HomeMatch Extension"
      pathname='/dashboard' && step===2 → "Create Your First Profile"
      pathname='/dashboard' && step===3 → "Head to Flatfox"
    BUT the intended spec has:
      Step 1: Welcome/intro
      Step 2: Extension install
      Step 3: On home page - Create first profile
      Step 4+: Guide after profile creation
    So the implementation has skipped "Step 1: Welcome/intro" entirely. The download/install step
    is coded as onboarding_step===1, which goes straight to the extension page with no intro.
    This is why the user sees Step 2 (from the spec) but the code thinks it's Step 1.
    The "Previous" button showing on what should be Step 2: driver.js shows a Previous button
    because allowClose=true but more importantly driver.js shows Previous on all steps except
    explicitly disabled. With only 1 step defined in the array, driver.js still shows Previous
    on step index 0 unless disabled.
  implication: No welcome/intro step exists; driver.js shows Previous button on first step.

- timestamp: 2026-03-30T00:05:02Z
  checked: OnboardingProvider.tsx — onDestroyStarted handler (lines 49-53, 76-80, 102-106)
  found: |
    Every driver.js instance uses `onDestroyStarted: () => { skip(); driverInstance.destroy(); }`
    The driver.js docs show that onDestroyStarted fires when the user closes the tour OR when
    "Done" is clicked on the last step of the driver instance. Since each page only defines ONE
    step, clicking "Done" (which is the Next/Done button on the last step) fires onDestroyStarted
    which calls skip() — which sets onboarding_active=false without advancing the step.
    This is why clicking "Done" on the install page stops the tour: it calls skip() instead of advance().
    The fix: use onCloseClick to call skip(), and use onNextClick to call advance() + navigate.
  implication: Clicking "Done" on any step calls skip() and stops the tour instead of advancing.

- timestamp: 2026-03-30T00:05:03Z
  checked: OnboardingChecklist.tsx — items array (lines 18-31)
  found: |
    The checklist shows 3 items: Install, Create Profile, Analyze.
    The UI correctly says "Step X of 8" but the actual list has only 3 items.
    The spec requires 8 steps in the checklist. The items array was written as a simplified 3-item
    summary instead of 8 distinct checklist steps.
  implication: Checklist content mismatch — shows 3 items but labels it "of 8".

- timestamp: 2026-03-30T00:05:04Z
  checked: OnboardingChecklist.tsx — visibility condition (line 14)
  found: |
    `if (!isActive || !state) return null;`
    When user clicks manual profile creation, the dialog opens (setCreateOpen(true) in dashboard).
    The dialog uses CreateProfileDialog which calls handleCreate → createProfile → router.push('/profiles/'+id).
    After profile creation, the user navigates to /profiles/[id] — but that page is still within
    the (dashboard) layout which includes OnboardingChecklist. The issue is the checklist
    disappearing: when the user is at step 2 (create profile) and creates a profile, advance() is
    NOT called automatically. Nothing calls advance() after profile creation. The checklist stays
    visible only if isActive is true — but since Done/Next calls skip() (see Bug 3), by this point
    onboarding_active is false and the checklist hides. Also: the ProfileCreationChooser click
    does NOT call advance().
  implication: No hook after profile creation to advance step; tour has already been killed by skip().

- timestamp: 2026-03-30T00:05:05Z
  checked: TakeATourButton.tsx — dropdown variant (lines 17-24)
  found: |
    The dropdown variant renders a <span> — but does NOT attach an onClick handler.
    The nav-user.tsx calls <DropdownMenuItem onClick={startTour}> which correctly wraps it.
    So the dropdown variant itself is fine (the parent handles the click).
    However the inline variant (Button onClick={startTour}) is correct.
    But startTour() only updates state and calls updateOnboardingState — it does NOT trigger navigation.
    After startTour(), the OnboardingProvider effect (line 192-198) should fire because
    state.onboarding_active becomes true, then calls launchTourForCurrentPage().
    BUT: launchTourForCurrentPage() for step=1 only runs on pathname==='/download'. If user is
    on /dashboard, launchTourForCurrentPage() is a no-op for step=1 (no matching condition).
    The navigation to /download only happens in the auto-start useEffect (line 188).
    Manual startTour() doesn't navigate to /download.
  implication: Manually triggering "Take a quick tour" from dashboard doesn't navigate anywhere for step 1.

- timestamp: 2026-03-30T00:05:06Z
  checked: onboarding-state.ts — getOnboardingState for new vs existing users
  found: |
    `return data?.preferences?.onboarding ?? DEFAULT_ONBOARDING;`
    When preferences.onboarding is NULL (never set), returns DEFAULT_ONBOARDING.
    When the auto-trigger fires, it checks for step===1 && !active && !completed — which matches
    both "brand new user" AND "existing user who has never touched onboarding".
    To fix the auto-trigger false positive: the DB needs a way to signal "user explicitly has no
    onboarding record yet" vs "user saw onboarding but it was reset". Best fix: add a flag or
    use a separate check. Simplest fix: only auto-trigger if the user has NO profiles at all (a
    truly new user). But the layout already fetches profiles — this data isn't in the onboarding
    provider. Alternative: store a sentinel in DB to indicate "onboarding_seen". Actually the
    simplest fix: don't auto-trigger at all — only start on manual "Take a quick tour" click.
    Remove the auto-start useEffect block (lines 183-191).
  implication: Auto-trigger cannot reliably distinguish new from existing users without additional DB state.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  7 confirmed issues in the onboarding system:

  1. STEP COUNTER "1 of 1": Each driver.js instance had only 1 step in its steps array.
     driver.js correctly reported "1 of 1" because it only knows about its own steps array.
     FIX: Set showProgress:false and added progressText:'Step X of 9' to each popover so the
     correct global step position is always shown.

  2. PROFILE → SAVE PREFERENCES → OPEN FLATFOX SEQUENCE BROKEN: After handleCreate advanced
     the onboarding from step 3→4, the user landed on /profiles/[id] but there was no driver.js
     tour for step 4 on that page — the step 4 tour was only on /dashboard. Nothing guided the
     user to save preferences or open Flatfox.
     FIX: Added step 4 driver.js instance for pathname.startsWith('/profiles/'), showing a 2-step
     tour: first highlights #save-preferences-btn ("Save Your Preferences"), then #open-flatfox-profile-btn
     ("Head to Flatfox"). The second step writes step=5 to Supabase before opening Flatfox.

  3. MISSING PERMANENT "OPEN IN FLATFOX" BUTTON IN PROFILE FORM: The preferences form had no
     permanent Flatfox button next to Save.
     FIX: Added OpenInFlatfoxButton next to the Save button in preferences-form.tsx, with id
     "open-flatfox-profile-btn" (tour target), using live form.watch() values, language-aware.
     Also added id="save-preferences-btn" to the Save button for tour targeting.

  4. UNWANTED "OPEN IN FLATFOX" BUTTON ON DASHBOARD: dashboard/page.tsx showed an Open Flatfox
     button when isActive && step >= 4. This was the old step 4 CTA, now moved to the profile form.
     FIX: Removed the conditional Open Flatfox block from dashboard/page.tsx entirely.

  5. FLATFOX URL NOT LANGUAGE-AWARE: buildFlatfoxUrl() always generated flatfox.ch/en/search/.
     FIX: Added language parameter to buildFlatfoxUrl() and buildFlatfoxUrlWithGeocode(). Maps
     'de'→'de', 'en'→'en', 'fr'→'fr', 'it'→'it'. All callers updated to pass language.

  6 & 7. EXTENSION ONBOARDING STEPS WRONG LABELS AND WRONG STEP ASSIGNMENTS:
     - Step 5 was labeled "Log In" but should be "Open the HomeMatch Extension" (toolbar icon tip)
     - Step 6 was "Analyze Listings" (FAB target) but should be "Log In to HomeMatch"
     - Step 7 was "Your Results" (badge target) but should be "Analyze Listings" (FAB target)
     - Step 8 was "View Full Analysis" (no target) — kept, but badge targeting moved from step 7 to step 8
     - Auto-advance was on step 6→7 but now should be step 7→8 (after scoring)
     - handleStep4Next (login verify) was called on step 5's next but now correctly on step 6
     FIX: Rewrote EXTENSION_STEPS array with correct titles/instructions/targets.
          Changed auth verify handler from step 5 to step 6.
          Changed auto-advance from step 6→7 to step 7→8.
          Changed badge target from step7 to step8 variable.

fix: |
  - web/src/components/onboarding/OnboardingProvider.tsx: showProgress:false + progressText on each
    step; step 4 tour moved from /dashboard to /profiles/* with 2-step driver (save+flatfox);
    language-aware Flatfox URL via buildFlatfoxUrl(language); added useLanguage + buildFlatfoxUrl imports.
  - web/src/app/(dashboard)/dashboard/page.tsx: removed isActive&&step>=4 Open Flatfox CTA block;
    removed ExternalLink, Button imports.
  - web/src/components/preferences/preferences-form.tsx: added OpenInFlatfoxButton import; added
    permanent Open Flatfox button with id="open-flatfox-profile-btn" next to save; save button gets
    id="save-preferences-btn".
  - web/src/components/profiles/open-in-flatfox-button.tsx: added id and language props; card variant
    now uses rose-600 background (pink/red); buildFlatfoxUrl/buildFlatfoxUrlWithGeocode calls pass language.
  - web/src/lib/flatfox-url.ts: added language param to buildFlatfoxUrl() and buildFlatfoxUrlWithGeocode();
    added FLATFOX_LOCALE map; URL now uses /${locale}/search/ instead of /en/search/.
  - web/src/components/profiles/profile-card.tsx: passes language to OpenInFlatfoxButton.
  - web/src/app/(dashboard)/profiles/[profileId]/page.tsx: passes lang to OpenInFlatfoxButton.
  - extension/src/entrypoints/content/App.tsx: rewrote EXTENSION_STEPS (5=open extension, 6=login,
    7=analyze FAB, 8=view analysis); renamed handleStep4Next→handleLoginVerify; changed onNext from
    step 5 to step 6 for auth verify; scoring auto-advance from step 6→7 to step 7→8; badge target
    from step7 to step8.

verification: TypeScript check on all modified files — 0 new errors.
files_changed:
  - web/src/components/onboarding/OnboardingProvider.tsx
  - web/src/app/(dashboard)/dashboard/page.tsx
  - web/src/components/preferences/preferences-form.tsx
  - web/src/components/profiles/open-in-flatfox-button.tsx
  - web/src/lib/flatfox-url.ts
  - web/src/components/profiles/profile-card.tsx
  - web/src/app/(dashboard)/profiles/[profileId]/page.tsx
  - extension/src/entrypoints/content/App.tsx
