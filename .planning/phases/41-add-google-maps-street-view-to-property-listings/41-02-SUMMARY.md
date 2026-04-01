---
phase: 41
plan: "02"
subsystem: web/analysis
tags: [google-maps, street-view, analysis-page, server-component]
dependency_graph:
  requires: [41-01]
  provides: [property-map-section-in-analysis-page, env-var-documentation]
  affects: [web/src/app/(dashboard)/analysis/[listingId]/page.tsx]
tech_stack:
  added: ["@googlemaps/js-api-loader@2.0.2 (worktree prerequisite)"]
  patterns: [server-component-secondary-query, conditional-client-component-render, whileInView-fadein]
key_files:
  created:
    - web/src/components/analysis/PropertyMapView.tsx
    - web/.env.local.example
  modified:
    - web/src/app/(dashboard)/analysis/[listingId]/page.tsx
decisions:
  - "Used .maybeSingle() (not .single()) for listing_profiles query to avoid throw on missing row (D-10)"
  - "parseInt(listingId, 10) used to cast string URL param to integer for listing_profiles.listing_id column"
  - "FadeIn without animate prop uses whileInView mode automatically — no extra prop needed"
  - ".env.local.example committed with git add -f to bypass web/.gitignore .env* pattern (example files are documentation, not secrets)"
  - "Pre-existing test TypeScript errors (test files, not production code) confirmed out of scope — same failures existed before this plan"
metrics:
  duration_seconds: 158
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 3
---

# Phase 41 Plan 02: Analysis Page Integration + Env Var Summary

**One-liner:** Wired `listing_profiles` Supabase query into analysis page server component with conditional `PropertyMapView` render inside `FadeIn` whileInView animation, plus `.env.local.example` docs for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| Prereq | Install @googlemaps/js-api-loader + add PropertyMapView component | fcfc477 | web/package.json, web/src/components/analysis/PropertyMapView.tsx |
| 1 | Add listing_profiles query and render PropertyMapView in analysis page | e02f40b | web/src/app/(dashboard)/analysis/[listingId]/page.tsx |
| 2 | Document NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.example | b0cc1fc | web/.env.local.example |

## What Was Built

### Analysis Page Integration (Task 1)

Modified `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` (server component) with three changes:

1. **Imports**: Added `PropertyMapView` from `@/components/analysis/PropertyMapView` and `FadeIn` from `@/components/motion/FadeIn`

2. **Secondary query**: After the `profileName` fetch block, fetches `listing_profiles` table using `.maybeSingle()` selecting `address, latitude, longitude`, filtered by `.eq('listing_id', parseInt(listingId, 10))`. Sets `listingLocation` to null if row is absent or address is null — implements D-10 (no error surfaced when row missing).

3. **Conditional JSX**: After the 2-column grid `</div>`, renders `PropertyMapView` wrapped in `<FadeIn className="mt-8">` only when `listingLocation` is non-null. Passes `address`, `latitude`, `longitude` props directly.

### Env Var Documentation (Task 2)

Created `web/.env.local.example` with commented entry for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` including setup instructions (Google Cloud Console, Maps JavaScript API, HTTP referrer restriction for local dev). Force-committed past web's `.env*` gitignore pattern since example files are documentation.

The interactive `vercel env add` command was intentionally skipped per execution context — the API key value is not available in this session.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @googlemaps/js-api-loader package + PropertyMapView component**
- **Found during:** Pre-execution check (worktree setup)
- **Issue:** Plan 41-01 was executed in a different worktree (agent-a24d6095). This worktree (agent-a318f68a) did not have the `@googlemaps/js-api-loader` package or the `PropertyMapView.tsx` component which 41-02 depends on.
- **Fix:** Installed `@googlemaps/js-api-loader@2.0.2` via npm and created `PropertyMapView.tsx` with identical content to the other worktree's commit.
- **Files modified:** `web/package.json`, `web/src/components/analysis/PropertyMapView.tsx`
- **Commit:** fcfc477

**2. [Rule 3 - Blocking] .env.local.example blocked by web/.gitignore .env* pattern**
- **Found during:** Task 2 commit
- **Issue:** The `web/.gitignore` contains `.env*` which matches `.env.local.example`. Git rejected staging the file.
- **Fix:** Used `git add -f` to force-add the file. Example files are intentionally committed documentation, not secrets.
- **Files modified:** web/.env.local.example
- **Commit:** b0cc1fc

**3. [Out of scope] Pre-existing TypeScript test errors**
- Multiple test files (`__tests__/*.test.tsx`) have pre-existing TypeScript errors (missing `screen` export, implicit `any` types, missing type fields). These match the pattern documented in STATE.md (38-01 decision: "23 failures existed before this plan"). These were NOT touched and NOT fixed — logged for awareness only.

## Verification Results

- [x] `page.tsx` imports `PropertyMapView` from `@/components/analysis/PropertyMapView`
- [x] `page.tsx` imports `FadeIn` from `@/components/motion/FadeIn`
- [x] `listing_profiles` query uses `.maybeSingle()` and selects `address, latitude, longitude`
- [x] Query uses `.eq('listing_id', parseInt(listingId, 10))` for integer cast
- [x] `listingLocation` is null when `listingProfile?.address` is falsy
- [x] `<PropertyMapView>` only rendered inside `{listingLocation && (...)}`
- [x] `<FadeIn className="mt-8">` wraps `<PropertyMapView>`
- [x] `<PropertyMapView>` receives `address`, `latitude`, `longitude` from `listingLocation`
- [x] PropertyMapView section appears after 2-column grid, before container's closing `</div>`
- [x] TypeScript check: no errors in changed production files (pre-existing test errors are out of scope)
- [x] `web/.env.local.example` contains `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` entry with comment
- [x] No existing query, component, or JSX structure above insertion point was modified

## Self-Check: PASSED

Files exist:
- web/src/components/analysis/PropertyMapView.tsx: FOUND
- web/src/app/(dashboard)/analysis/[listingId]/page.tsx: FOUND (modified)
- web/.env.local.example: FOUND

Commits exist:
- fcfc477: FOUND
- e02f40b: FOUND
- b0cc1fc: FOUND
