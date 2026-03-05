---
phase: 01-foundation-first-scraper
plan: 01
subsystem: infra
tags: [typescript, zod, pino, tsx, jest, eslint, swiss-numbers, jsonl]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - TypeScript project scaffolding with ESM, strict mode, and all dependencies
  - PropertyListing Zod schema with type inference for rent and buy listings
  - ScraperAdapter interface for extensible scraper pattern
  - Swiss number parsers (price, rooms, area) with 17 passing tests
  - JSONL streaming file writer with recursive directory creation
  - Fail-fast config loader validating APIFY_TOKEN via Zod
  - Pino structured logger with pino-pretty in dev mode
affects: [01-02, 02-01, 02-02]

# Tech tracking
tech-stack:
  added: [apify-client, zod, pino, pino-pretty, tsx, typescript, eslint, typescript-eslint, jest, ts-jest, "@tsconfig/node22"]
  patterns: [ESM modules, Zod schema validation with type inference, adapter interface pattern, fail-fast config, structured JSON logging]

key-files:
  created:
    - package.json
    - tsconfig.json
    - eslint.config.mjs
    - jest.config.ts
    - .gitignore
    - .env.example
    - src/config.ts
    - src/logger.ts
    - src/schema/listing.ts
    - src/scrapers/types.ts
    - src/parsers/swiss-numbers.ts
    - src/parsers/swiss-numbers.test.ts
    - src/output/jsonl-writer.ts
  modified: []

key-decisions:
  - "Used Zod v4 with z.string().url() and z.string().datetime() -- both work in latest Zod v4.3.6"
  - "Added ts-node dev dependency for Jest TypeScript config parsing"
  - "Used ts-jest ESM preset with moduleNameMapper for .js extension resolution"
  - "PropertyListing currency field defaults to CHF via z.string().default('CHF')"

patterns-established:
  - "Fail-fast config: Zod safeParse on process.env, exit(1) with error details on failure"
  - "Structured logging: Pino with pino-pretty transport in dev, raw JSON in production"
  - "TDD workflow: Write failing tests first, implement to pass, commit separately"
  - "ESM throughout: type module in package.json, .js extensions in imports"
  - "Swiss number parsing: strip formatting, parseFloat, return null on NaN"

requirements-completed: [SETUP-01, SETUP-02, SETUP-03, SCRP-01, SCRP-02, SCRP-04, QUAL-01]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 1 Plan 01: Project Foundation + Core Types + Utilities Summary

**TypeScript project with Zod PropertyListing schema, Swiss number parsers (17 tests), ScraperAdapter interface, fail-fast config, Pino logger, and JSONL writer**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T12:11:26Z
- **Completed:** 2026-03-05T12:15:08Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Greenfield TypeScript project initialized with ESM, strict mode, and full dependency set (apify-client, zod, pino, tsx)
- PropertyListing Zod schema enforces required fields (url, title, listingType, price, rooms, address.city, address.canton) and provides TypeScript type inference
- Swiss number parsers handle CHF formatting, apostrophe thousands separators, dash suffixes, /month suffixes, and null/undefined inputs with 17 passing test cases
- ScraperAdapter interface defines extensible pattern for Homegate (Plan 02) and FlatFox (Phase 2)
- JSONL writer creates nested directories and writes one JSON object per line with proper stream flushing

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize project scaffolding** - `3de2aac` (feat)
2. **Task 2 RED: Failing Swiss number parser tests** - `eeb8979` (test)
3. **Task 2 GREEN: Schema, types, parsers, writer implementation** - `7d51b87` (feat)

_Note: Task 2 was TDD with separate RED and GREEN commits._

## Files Created/Modified
- `package.json` - Project manifest with ESM, all dependencies, npm scripts
- `tsconfig.json` - TypeScript config extending @tsconfig/node22 with strict mode
- `eslint.config.mjs` - ESLint flat config with typescript-eslint recommended + strict
- `jest.config.ts` - Jest config with ts-jest ESM support
- `.gitignore` - Excludes node_modules, dist, data, .env, logs
- `.env.example` - Documents APIFY_TOKEN and LOG_LEVEL
- `src/config.ts` - Fail-fast config loader using Zod env validation
- `src/logger.ts` - Pino logger factory with pino-pretty in dev
- `src/schema/listing.ts` - PropertyListing Zod schema with AddressSchema
- `src/scrapers/types.ts` - ScraperAdapter interface, ScrapeOptions, RawRecord
- `src/parsers/swiss-numbers.ts` - parseSwissPrice, parseSwissRooms, parseSwissArea
- `src/parsers/swiss-numbers.test.ts` - 17 test cases for Swiss number parsing
- `src/output/jsonl-writer.ts` - JSONL streaming writer with recursive mkdir

## Decisions Made
- Used Zod v4 (v4.3.6) -- confirmed z.string().url() and z.string().datetime() work correctly
- Added ts-node as dev dependency because Jest requires it to parse TypeScript config files
- Used ts-jest ESM preset with moduleNameMapper to handle .js extension imports in tests
- PropertyListing currency defaults to 'CHF' via Zod schema default

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed ts-node for Jest config parsing**
- **Found during:** Task 2 (TDD RED phase)
- **Issue:** Jest could not parse jest.config.ts without ts-node installed
- **Fix:** Ran `npm install -D ts-node`
- **Files modified:** package.json, package-lock.json
- **Verification:** Jest successfully runs and parses TypeScript config
- **Committed in:** eeb8979 (part of RED phase commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor dependency addition required for test infrastructure. No scope creep.

## Issues Encountered
None beyond the ts-node deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All foundation contracts are in place for Plan 01-02 (Homegate Scraper + Pipeline Wiring)
- PropertyListing schema ready for validation of scraped records
- ScraperAdapter interface ready for HomegateAdapter implementation
- Swiss number parsers ready for normalize function
- JSONL writer ready for pipeline output
- Config loader and logger ready for manual-run.ts entry point

## Self-Check: PASSED

- All 13 created files: FOUND
- Commit 3de2aac (Task 1): FOUND
- Commit eeb8979 (Task 2 RED): FOUND
- Commit 7d51b87 (Task 2 GREEN): FOUND

---
*Phase: 01-foundation-first-scraper*
*Completed: 2026-03-05*
