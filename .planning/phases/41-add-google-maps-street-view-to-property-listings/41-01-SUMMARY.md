---
phase: 41
plan: 01
subsystem: web
tags: [google-maps, street-view, component, analysis-page]
dependency_graph:
  requires: []
  provides: [PropertyMapView component]
  affects: [web/src/components/analysis/]
tech_stack:
  added: ["@googlemaps/js-api-loader@^2.0.2"]
  patterns: [google-maps-js-api, street-view-panorama, map-toggle]
key_files:
  created:
    - web/src/components/analysis/PropertyMapView.tsx
  modified:
    - web/package.json
decisions:
  - Used importLibrary() functional API (v2) instead of deprecated Loader class .load() — v2 package no longer exposes .load() method
  - Added cleanup cancelled flag in useEffect to prevent state updates on unmounted component
  - setOptions/importLibrary called in same effect as initialization — no separate script-loading phase needed
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_changed: 2
  completed_date: "2026-04-01"
---

# Phase 41 Plan 01: PropertyMapView Component Summary

Interactive Google Maps Street View component installed and implemented for the property analysis page — uses `@googlemaps/js-api-loader` v2 functional API with panorama heading computed toward property coordinates, Map fallback when Street View is unavailable.

## What Was Built

### Task 1: Install `@googlemaps/js-api-loader`
Added `@googlemaps/js-api-loader@^2.0.2` to `web/package.json` dependencies. The package provides a Promise-based wrapper for Google Maps JS API script loading with TypeScript types included — no separate `@types/*` package needed.

**Commit:** `4b8c40f`

### Task 2: Create `PropertyMapView` Client Component
Created `web/src/components/analysis/PropertyMapView.tsx` as a `'use client'` named export component with:

- **Props:** `address: string`, `latitude: number | null`, `longitude: number | null`
- **Loading state:** `<Skeleton className="h-96 w-full rounded-lg" />` — no spinner, no text
- **Error state:** muted `h-96` container with `text-sm text-muted-foreground` "Unable to load map"
- **Map container:** always in DOM (hidden via `cn()` + `hidden` class until ready) so Google Maps constructor can attach to the ref during init
- **Street View:** heading computed via `google.maps.geometry.spherical.computeHeading(panoramaLatLng, propertyLatLng)`; panorama visible toggled via second `useEffect` watching `[viewMode, loadState]`
- **Geocoder fallback:** when `latitude`/`longitude` are null, geocodes the `address` string
- **Toggle:** two `Button` components (`MapPin`/`Map` icons from lucide-react, `size="sm"`, `aria-pressed` set correctly); hidden when Street View unavailable
- **Accessibility:** `section aria-labelledby`, `h2` with matching `id`, `aria-label` on map div, `sr-only` span with address inside map div

**Commit:** `6cdd116`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated to @googlemaps/js-api-loader v2 functional API**
- **Found during:** Task 2 TypeScript build check
- **Issue:** Plan specified `new Loader({...}).load()` but installed package v2.0.2 deprecated the `Loader` class — it has no `.load()` method (TypeScript error: `Property 'load' does not exist on type 'Loader'`)
- **Fix:** Replaced `new Loader()` + `.load()` with `setOptions()` + `importLibrary()` functional API exported from v2 package. Behavior is identical: API key configured once, libraries loaded in parallel via `Promise.all([importLibrary('maps'), importLibrary('streetView'), importLibrary('geometry')])`
- **Files modified:** `web/src/components/analysis/PropertyMapView.tsx`
- **Commit:** `6cdd116`

## Verification Results

All 16 plan checklist items passed:
- `@googlemaps/js-api-loader` in package.json dependencies
- Named export `export function PropertyMapView`
- `'use client'` as first line
- Props interface `{ address: string; latitude: number | null; longitude: number | null }`
- Loading skeleton `h-96 w-full rounded-lg` no text
- Error state `h-96` muted container "Unable to load map" in `text-sm text-muted-foreground`
- `aria-label="Property location map"` on map div + `sr-only` span with address
- `aria-labelledby="property-location-heading"` on section + matching `id` on h2
- `aria-pressed` boolean on both toggle buttons
- Toggle conditionally rendered `loadState === 'ready' && streetViewAvailable`
- `setStreetViewAvailable(false)` + `setViewMode('map')` when StreetViewStatus !== OK
- `computeHeading` from `google.maps.geometry.spherical`
- Geocoder fallback when lat/lng null
- `cn()` imported from `@/lib/utils`
- TypeScript build passes (no errors in PropertyMapView.tsx)

## Self-Check: PASSED

Files created:
- web/src/components/analysis/PropertyMapView.tsx — FOUND
- web/package.json modified — FOUND

Commits:
- 4b8c40f (chore: install package) — FOUND
- 6cdd116 (feat: component) — FOUND
