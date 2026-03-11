---
phase: 04-extension-ui-analysis-page
plan: 00
subsystem: testing
tags: [vitest, test-stubs, tdd, jsdom, wxt]

# Dependency graph
requires:
  - phase: 03-llm-scoring-pipeline
    provides: ScoreResponse contract types for test validation
provides:
  - 5 extension test stub files (content-matches, flatfox-parser, scoring-types, auth-flow, loading-state)
  - web vitest config with jsdom environment and React plugin
  - 2 web test stub files (analysis-page, category-breakdown)
  - 30 total it.todo() markers ready for implementation plans to fill
affects: [04-01-PLAN, 04-02-PLAN, 04-03-PLAN]

# Tech tracking
tech-stack:
  added: [jsdom@25 (web devDep)]
  patterns: [it.todo() stubs for TDD red-phase scaffolding, .mts config for ESM in CJS projects]

key-files:
  created:
    - extension/src/__tests__/content-matches.test.ts
    - extension/src/__tests__/flatfox-parser.test.ts
    - extension/src/__tests__/scoring-types.test.ts
    - extension/src/__tests__/auth-flow.test.ts
    - extension/src/__tests__/loading-state.test.ts
    - web/vitest.config.mts
    - web/src/__tests__/analysis-page.test.ts
    - web/src/__tests__/category-breakdown.test.ts
  modified:
    - web/package.json
    - web/pnpm-lock.yaml

key-decisions:
  - "Used .mts extension for web vitest config (not .ts) to enable ESM imports in CJS-default Next.js project"
  - "jsdom@25 for web tests (jsdom 28 has ESM incompatibilities; happy-dom excluded per plan constraint)"

patterns-established:
  - "it.todo() pattern: implementation plans fill stubs with real assertions as they build production code"
  - "web vitest config: jsdom environment + @vitejs/plugin-react + @ path alias matching Next.js tsconfig"

requirements-completed: [EXT-01, EXT-03, EXT-04, EXT-07, EXT-08, WEB-01, WEB-02]

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 04 Plan 00: Wave 0 Test Scaffolding Summary

**30 vitest test stubs across extension (20) and web (10) with jsdom config, ready for TDD green-phase in plans 01-03**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T12:21:27Z
- **Completed:** 2026-03-11T12:27:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- 5 extension test stub files covering EXT-01, EXT-03, EXT-04, EXT-07, EXT-08 with 20 it.todo() markers
- Web vitest configuration with jsdom environment, React plugin, and path aliases
- 2 web test stub files covering WEB-01, WEB-02 with 10 it.todo() markers
- Backward compatibility verified: existing tests (background, profile-storage, weight-redistribution, preferences-schema) unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Extension test stubs (5 files)** - `003016f` (test)
2. **Task 2: Web vitest config and test stubs (3 files)** - `d5e0365` (test)

## Files Created/Modified
- `extension/src/__tests__/content-matches.test.ts` - 3 it.todo() stubs for content script URL matching (EXT-01)
- `extension/src/__tests__/flatfox-parser.test.ts` - 6 it.todo() stubs for PK extraction from DOM (EXT-03)
- `extension/src/__tests__/scoring-types.test.ts` - 3 it.todo() stubs for ScoreResponse type validation (EXT-04)
- `extension/src/__tests__/auth-flow.test.ts` - 5 it.todo() stubs for Supabase auth message flow (EXT-07)
- `extension/src/__tests__/loading-state.test.ts` - 3 it.todo() stubs for loading state rendering (EXT-08)
- `web/vitest.config.mts` - Vitest config with jsdom, React plugin, globals, and @ alias
- `web/src/__tests__/analysis-page.test.ts` - 4 it.todo() stubs for analysis page rendering (WEB-01)
- `web/src/__tests__/category-breakdown.test.ts` - 6 it.todo() stubs for category breakdown component (WEB-02)
- `web/package.json` - Added jsdom@25 devDependency
- `web/pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Used `.mts` extension for web vitest config instead of `.ts` -- the web project lacks `"type": "module"` in package.json, so `.ts` files are treated as CJS and fail with `ERR_REQUIRE_ESM` when importing vitest/config. The `.mts` extension forces ESM mode.
- Installed jsdom@25 instead of jsdom@28 -- jsdom 28 has ESM compatibility issues (`@exodus/bytes` require() errors). jsdom 25 works cleanly.
- Plan specified `web/vitest.config.ts` but delivered `web/vitest.config.mts` due to ESM requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed vitest config extension from .ts to .mts**
- **Found during:** Task 2 (Web vitest config)
- **Issue:** `vitest/config` import fails with `ERR_REQUIRE_ESM` in CJS-default Next.js project
- **Fix:** Used `.mts` extension to force ESM mode for the config file
- **Files modified:** web/vitest.config.mts (created as .mts instead of .ts)
- **Verification:** `npx vitest run src/__tests__/` completes successfully
- **Committed in:** d5e0365

**2. [Rule 3 - Blocking] Downgraded jsdom from 28 to 25**
- **Found during:** Task 2 (Web vitest config)
- **Issue:** jsdom 28.1.0 has ESM incompatibility with `@exodus/bytes` / `html-encoding-sniffer` packages
- **Fix:** Installed jsdom@25.0.1 which uses stable CJS-compatible dependencies
- **Files modified:** web/package.json, web/pnpm-lock.yaml
- **Verification:** `npx vitest run src/__tests__/` completes with jsdom environment
- **Committed in:** d5e0365

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to make vitest run in the web project. Config file path changed from `.ts` to `.mts`. No scope creep.

## Issues Encountered
- Pre-existing test failure in `extension/src/__tests__/profile-schema.test.ts` (features test) -- not caused by this plan, not fixed (out of scope)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 30 test stubs ready for implementation plans (01, 02, 03) to fill with real assertions
- Extension test infrastructure unchanged (existing vitest.config.ts + WxtVitest plugin)
- Web test infrastructure ready (new vitest.config.mts with jsdom + React)
- Pre-existing profile-schema test failure should be investigated in a future plan

## Self-Check: PASSED

- All 8 created files verified on disk
- Both task commits (003016f, d5e0365) verified in git log

---
*Phase: 04-extension-ui-analysis-page*
*Completed: 2026-03-11*
