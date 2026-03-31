# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## onboarding-system-broken — Onboarding tour step counter wrong, profile flow broken, extension guidance missing
- **Date:** 2026-03-30
- **Error patterns:** onboarding, step counter, 1 of 1, driver.js, flatfox button, extension steps, profile flow
- **Root cause:** (1) driver.js showProgress with single-step instances always shows "1 of 1" — need progressText instead. (2) Step 4 tour targeted /dashboard but user lands on /profiles/[id] after profile creation. (3) No permanent Open Flatfox button in preferences form. (4) Dashboard had an unwanted onboarding-only Open Flatfox CTA. (5) buildFlatfoxUrl() hardcoded /en/search/ instead of locale-based path. (6/7) Extension EXTENSION_STEPS had wrong titles and step assignments for steps 5-8.
- **Fix:** showProgress:false + progressText:'Step X of 9' on each driver popover; step 4 tour moved to /profiles/* with 2-step sequence (save + open flatfox); added OpenInFlatfoxButton to preferences-form.tsx footer; removed dashboard Open Flatfox CTA; added language param to buildFlatfoxUrl; rewrote EXTENSION_STEPS with correct step titles and reassigned auth-verify to step 6, auto-advance to step 7→8.
- **Files changed:** web/src/components/onboarding/OnboardingProvider.tsx, web/src/app/(dashboard)/dashboard/page.tsx, web/src/components/preferences/preferences-form.tsx, web/src/components/profiles/open-in-flatfox-button.tsx, web/src/lib/flatfox-url.ts, web/src/components/profiles/profile-card.tsx, web/src/app/(dashboard)/profiles/[profileId]/page.tsx, extension/src/entrypoints/content/App.tsx
---

## background-image-not-displaying — Background image missing from web app despite file existing locally
- **Date:** 2026-03-29
- **Error patterns:** background image, not displaying, webp, missing, public, zurich
- **Root cause:** web/public/zurich_bg_grossmuenster.webp was added to the local filesystem but never committed to git. Vercel deploys from git so the file is absent in production.
- **Fix:** Committed web/public/zurich_bg_grossmuenster.webp to git and pushed to main, triggering a Vercel redeploy.
- **Files changed:** web/public/zurich_bg_grossmuenster.webp
---

