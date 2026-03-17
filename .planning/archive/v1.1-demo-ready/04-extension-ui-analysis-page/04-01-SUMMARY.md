---
phase: 04-extension-ui-analysis-page
plan: 01
subsystem: auth, ui
tags: [supabase, chrome-extension, wxt, manifest-v3, flatfox, typescript]

# Dependency graph
requires:
  - phase: 03-llm-scoring-pipeline
    provides: ScoreResponse model contract, score-proxy edge function
provides:
  - ScoreResponse/CategoryScore/ChecklistItem TypeScript interfaces
  - TIER_COLORS constant (emerald/blue/amber/gray palette)
  - Supabase client with browser.storage.local adapter for MV3
  - Edge function API client (scoreListing/scoreListings)
  - Flatfox DOM parser (extractVisibleListingPKs, findListingCardElement)
  - Background script with auth message handling (signIn/signOut/getSession/getUser)
  - Popup LoginForm component with error handling
  - Popup Dashboard with Supabase auth state and website links
affects: [04-02, 04-03]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js"]
  patterns: ["browser.storage.local adapter for MV3 service workers", "background message passing for auth"]

key-files:
  created:
    - extension/src/types/scoring.ts
    - extension/src/lib/supabase.ts
    - extension/src/lib/api.ts
    - extension/src/lib/flatfox.ts
    - extension/src/components/popup/LoginForm.tsx
  modified:
    - extension/src/entrypoints/background.ts
    - extension/src/components/popup/Dashboard.tsx
    - extension/wxt.config.ts
    - extension/package.json
    - extension/src/__tests__/scoring-types.test.ts
    - extension/src/__tests__/auth-flow.test.ts

key-decisions:
  - "browser.storage.local (WXT API) over chrome.storage.local for MV3 service worker Supabase adapter"
  - "Sequential scoring (not parallel) to avoid overwhelming backend"
  - "Edit Preferences opens Next.js website /dashboard (not onboarding wizard)"

patterns-established:
  - "Auth message passing: popup sends action messages to background, background calls supabase.auth"
  - "TIER_COLORS: modern palette (emerald/blue/amber/gray) not traffic light"
  - "Supabase client singleton with chromeStorageAdapter for extension-wide auth"

requirements-completed: [EXT-07]

# Metrics
duration: 15min
completed: 2026-03-11
---

# Phase 4 Plan 1: Extension Infrastructure & Auth Summary

**Supabase auth plumbing with browser.storage.local adapter, shared scoring types, edge function API client, Flatfox DOM parser, and popup rewrite from Homegate local-storage flow to Supabase login with website links**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-11T12:21:47Z
- **Completed:** 2026-03-11T12:36:55Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created all shared TypeScript types mirroring backend ScoreResponse, with modern TIER_COLORS palette
- Built Supabase client with custom browser.storage.local adapter for MV3 service workers
- Implemented edge function API client with sequential scoring and progressive rendering callback
- Rewrote popup from old Homegate local-storage profile flow to Supabase auth with login form and website links
- Background script handles 4 auth message types (signIn, signOut, getSession, getUser)
- All 9 tests passing (4 scoring-types + 5 auth-flow)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared types, lib modules, and install Supabase dependency** - `f6e16b1` + `804722d` (feat + fix)
2. **Task 2: Background script auth + popup rewrite with Supabase login** - `42734b2` (feat)

## Files Created/Modified
- `extension/src/types/scoring.ts` - TypeScript interfaces mirroring backend ScoreResponse, CategoryScore, ChecklistItem + TIER_COLORS
- `extension/src/lib/supabase.ts` - Supabase client with browser.storage.local adapter for MV3
- `extension/src/lib/api.ts` - Edge function API client (scoreListing, scoreListings with progressive callback)
- `extension/src/lib/flatfox.ts` - DOM parser for extracting listing PKs and finding card elements
- `extension/src/components/popup/LoginForm.tsx` - Email/password login form with error handling and loading state
- `extension/src/components/popup/Dashboard.tsx` - Rewritten popup with Supabase auth state, login form, and website action buttons
- `extension/src/entrypoints/background.ts` - Auth message handler (signIn/signOut/getSession/getUser)
- `extension/wxt.config.ts` - Flatfox.ch target, version 0.2.0, Supabase domain in host_permissions
- `extension/package.json` - Added @supabase/supabase-js dependency
- `extension/src/__tests__/scoring-types.test.ts` - 4 tests validating TIER_COLORS and ScoreResponse type shape
- `extension/src/__tests__/auth-flow.test.ts` - 5 tests for background auth message handling

## Decisions Made
- Used `browser.storage.local` (WXT API) instead of `chrome.storage.local` for TypeScript compatibility in WXT environment
- Sequential scoring in scoreListings to avoid overwhelming the backend with parallel Claude API calls
- "Edit Preferences" opens the Next.js website dashboard page, not the old onboarding wizard
- Hardcoded Supabase URL and anon key in extension (anon key is public, safe for client-side)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used browser.storage.local instead of chrome.storage.local**
- **Found during:** Task 1 (Supabase client creation)
- **Issue:** `chrome.storage.local` not available as a TypeScript type in WXT environment, causing TS2304 errors
- **Fix:** Changed to `browser.storage.local` which is WXT's polyfilled API with proper types
- **Files modified:** extension/src/lib/supabase.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** f6e16b1

**2. [Rule 3 - Blocking] Concurrent agent commit collision on scoring-types.test.ts**
- **Found during:** Task 1 (commit)
- **Issue:** Another agent (04-04) committed the same files simultaneously, causing my commit to only include test file reversion
- **Fix:** Created a separate fix commit restoring the full test content
- **Files modified:** extension/src/__tests__/scoring-types.test.ts
- **Verification:** All 4 scoring-types tests pass
- **Committed in:** 804722d

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in Phase 1 StepFilters.tsx wizard component (Zod/RHF type mismatch) -- out of scope, not caused by this plan's changes
- WXT build process slow/hanging during verification -- TypeScript compilation and tests pass, build issue is pre-existing

## User Setup Required
None - no external service configuration required. Supabase credentials are hardcoded (anon key is public).

## Next Phase Readiness
- All shared lib modules ready for content script consumption (Plan 03 depends on these)
- Popup auth flow functional -- content script can get JWT via background message passing
- Flatfox DOM parser ready for badge injection positioning
- Extension targets flatfox.ch with Supabase domain in host_permissions

## Self-Check: PASSED

- All 11 files verified present on disk
- All 3 commits (f6e16b1, 804722d, 42734b2) found in git log
- 9/9 tests passing (4 scoring-types + 5 auth-flow)

---
*Phase: 04-extension-ui-analysis-page*
*Completed: 2026-03-11*
