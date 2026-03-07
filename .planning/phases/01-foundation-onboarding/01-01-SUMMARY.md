---
phase: 01-foundation-onboarding
plan: 01
subsystem: ui, extension
tags: [wxt, react, tailwindcss, shadcn-ui, zod, chrome-extension, mv3, vitest]

# Dependency graph
requires: []
provides:
  - WXT Chrome extension scaffold with 4 entrypoints (background, content, popup, onboarding)
  - Zod v4 PreferenceProfileSchema with all ONBD-02 through ONBD-12 fields
  - WXT typed storage layer (profileStorage, wizardStateStorage) with versioning
  - Proportional weight redistribution algorithm
  - 16 shadcn/ui components configured with Homegate accent color
  - Vitest test infrastructure with WXT fakeBrowser integration
affects: [02-wizard-ui, 03-scoring, 04-content-script]

# Tech tracking
tech-stack:
  added: [wxt@0.20.18, react@19.2.4, tailwindcss@3.4.19, zod@4.3.6, shadcn-ui, react-hook-form@7.71.2, vitest@4.0.18, happy-dom@20.8.3]
  patterns: [WXT file-based entrypoints, WXT storage.defineItem with versioning, shadcn/ui cn() utility, dark mode class toggle]

key-files:
  created:
    - extension/wxt.config.ts
    - extension/tailwind.config.js
    - extension/vitest.config.ts
    - extension/src/schema/profile.ts
    - extension/src/schema/weights.ts
    - extension/src/storage/profile-storage.ts
    - extension/src/utils/weight-redistribution.ts
    - extension/src/lib/theme.ts
    - extension/src/lib/utils.ts
    - extension/src/entrypoints/background.ts
    - extension/src/entrypoints/content.ts
    - extension/src/entrypoints/popup/App.tsx
    - extension/src/entrypoints/onboarding/App.tsx
    - extension/src/__tests__/profile-schema.test.ts
    - extension/src/__tests__/weight-redistribution.test.ts
    - extension/src/__tests__/profile-storage.test.ts
    - extension/src/__tests__/background.test.ts
  modified: []

key-decisions:
  - "Used wxt/utils/storage import path instead of wxt/storage (WXT 0.20 export map change)"
  - "Replaced jsdom with happy-dom due to ESM compatibility issues with jsdom 28"
  - "Exported handleInstalled function from background.ts for direct unit testing with vi.spyOn"
  - "Used React 19.2 (WXT template default) instead of downgrading to React 18"

patterns-established:
  - "Pattern: WXT entrypoints under src/entrypoints/ with srcDir: 'src' config"
  - "Pattern: Storage imports from 'wxt/utils/storage' for non-entrypoint files"
  - "Pattern: fakeBrowser.reset() + vi.restoreAllMocks() in test beforeEach"
  - "Pattern: Homegate accent color #E4006E as CSS custom property --primary"

requirements-completed: [ONBD-01, ONBD-14]

# Metrics
duration: 9min
completed: 2026-03-07
---

# Phase 01 Plan 01: Foundation & Extension Scaffold Summary

**WXT Chrome extension with React 19, Tailwind CSS v3, 16 shadcn/ui components, Zod v4 profile schema, WXT typed storage, weight redistribution algorithm, and 43 passing tests**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-07T14:45:37Z
- **Completed:** 2026-03-07T14:54:52Z
- **Tasks:** 2
- **Files modified:** 46

## Accomplishments
- WXT extension builds to valid MV3 Chrome extension with background, content, popup, and onboarding entrypoints
- Zod v4 PreferenceProfileSchema validates all 14 preference fields with schemaVersion: 1
- Proportional weight redistribution algorithm handles all edge cases (zeros, rounding, 2-5+ categories)
- Background service worker opens onboarding page on first install only (unit tested)
- WXT typed storage with version 1 for profile and wizard state persistence
- Full test suite with 43 tests covering schema validation, weight algorithm, storage, and background handler

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize WXT project with React, Tailwind, shadcn/ui, and all entrypoints** - `0130a4f` (feat)
2. **Task 2 RED: Add failing tests for schema, weights, storage, background** - `b38f6c4` (test)
3. **Task 2 GREEN: Implement profile schema, storage, weight algorithm** - `03feabf` (feat)

## Files Created/Modified
- `extension/wxt.config.ts` - WXT config with srcDir, React module, manifest (name, permissions, host_permissions)
- `extension/tailwind.config.js` - Tailwind v3 with Homegate accent, dark mode, shadcn CSS variables
- `extension/vitest.config.ts` - Vitest with WxtVitest plugin, happy-dom environment
- `extension/components.json` - shadcn/ui CLI configuration
- `extension/src/schema/profile.ts` - PreferenceProfileSchema (Zod v4) with all ONBD fields
- `extension/src/schema/weights.ts` - WeightsSchema and validateWeightsSum helper
- `extension/src/storage/profile-storage.ts` - WXT typed storage for profile and wizard state
- `extension/src/utils/weight-redistribution.ts` - Proportional redistribution algorithm
- `extension/src/lib/theme.ts` - Dark/light mode toggle with WXT storage persistence
- `extension/src/lib/utils.ts` - shadcn cn() utility
- `extension/src/entrypoints/background.ts` - Service worker with onInstalled handler
- `extension/src/entrypoints/content.ts` - Content script placeholder for homegate.ch
- `extension/src/entrypoints/popup/` - Popup dashboard (placeholder)
- `extension/src/entrypoints/onboarding/` - Onboarding page (placeholder)
- `extension/src/components/ui/` - 16 shadcn/ui components
- `extension/src/__tests__/` - 4 test files with 43 tests total

## Decisions Made
- Used `wxt/utils/storage` import path: WXT 0.20 changed its export map, so `wxt/storage` is not valid -- must use `wxt/utils/storage` for non-entrypoint files (entrypoints get `storage` auto-imported)
- Replaced jsdom with happy-dom: jsdom 28 has ESM compatibility issues with `@exodus/bytes` that prevent test execution
- Exported handleInstalled from background.ts: WXT's `defineBackground` wrapping makes direct import testing difficult; exporting the handler function allows clean unit testing with vi.spyOn on fakeBrowser.tabs.create
- Kept React 19.2 (WXT template default): No downgrade needed since shadcn/ui components work fine with React 19

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed wxt/storage import path**
- **Found during:** Task 1 (build verification)
- **Issue:** RESEARCH.md referenced `import { storage } from 'wxt/storage'` but WXT 0.20 exports storage at `wxt/utils/storage`
- **Fix:** Changed import to `from 'wxt/utils/storage'` in theme.ts and profile-storage.ts
- **Files modified:** `extension/src/lib/theme.ts`, `extension/src/storage/profile-storage.ts`
- **Verification:** Build succeeds, all imports resolve
- **Committed in:** 0130a4f (Task 1 commit)

**2. [Rule 3 - Blocking] Replaced jsdom with happy-dom**
- **Found during:** Task 2 (RED phase test execution)
- **Issue:** jsdom 28 throws `ERR_REQUIRE_ESM` for `@exodus/bytes` dependency, preventing all tests from running
- **Fix:** Replaced jsdom with happy-dom, updated vitest.config.ts environment
- **Files modified:** `extension/package.json`, `extension/vitest.config.ts`
- **Verification:** All 43 tests execute and pass
- **Committed in:** b38f6c4 (Task 2 RED commit)

**3. [Rule 3 - Blocking] Exported handleInstalled for testability**
- **Found during:** Task 2 (background test implementation)
- **Issue:** fakeBrowser.tabs.create is not a spy by default; importing the background module with defineBackground wrapping doesn't support direct spy assertions
- **Fix:** Exported `handleInstalled` function from background.ts, test calls it directly with vi.spyOn on fakeBrowser methods
- **Files modified:** `extension/src/entrypoints/background.ts`, `extension/src/__tests__/background.test.ts`
- **Verification:** All 3 background tests pass correctly
- **Committed in:** 03feabf (Task 2 GREEN commit)

---

**Total deviations:** 3 auto-fixed (3 blocking issues)
**Impact on plan:** All auto-fixes were necessary for the build and test infrastructure to function. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Extension scaffold complete, ready for wizard UI implementation (Plan 02)
- Profile schema and storage layer ready for wizard form integration
- Weight redistribution algorithm ready for Step 3 sliders
- shadcn/ui components available for wizard UI
- Background service worker correctly opens onboarding page

## Self-Check: PASSED

All 23 key files verified present. All 3 commits verified in git log.

---
*Phase: 01-foundation-onboarding*
*Completed: 2026-03-07*
