---
phase: 41-add-google-maps-street-view-to-property-listings
verified: 2026-04-01T22:30:00Z
status: human_needed
score: 9/9 must-haves verified (automated)
human_verification:
  - test: "Open any analysis page with a valid listing_id that has a listing_profiles row — confirm the 'Property Location' section appears below the 2-column grid"
    expected: "Section fades in on scroll, shows 'Street View' and 'Map' toggle buttons, renders interactive Google Maps Street View panorama facing the property"
    why_human: "Requires a browser with a valid NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set; cannot verify Google Maps JS API rendering programmatically"
  - test: "Click the 'Map' toggle on the analysis page Street View section"
    expected: "Interactive Google Maps map replaces the panorama in the same container; 'Map' button shows filled/primary variant; 'Street View' shows outline variant"
    why_human: "Requires browser interaction with live Maps JS API"
  - test: "Visit an analysis page for a listing without a listing_profiles row (or with null address)"
    expected: "The 'Property Location' section does not appear at all — no error, no placeholder"
    why_human: "Requires real Supabase data; behavior depends on DB contents"
  - test: "Confirm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in Vercel production environment"
    expected: "vercel env ls production shows NEXT_PUBLIC_GOOGLE_MAPS_API_KEY listed"
    why_human: "The 41-02 SUMMARY explicitly notes the interactive vercel env add command was skipped in execution context — this must be confirmed manually or via Vercel dashboard"
  - test: "Load an analysis page for a property in a location without Street View coverage"
    expected: "Section auto-switches to Map view; toggle buttons are hidden (only Map is shown without the toggle control)"
    why_human: "Requires finding a real listing address with no Street View coverage to trigger the StreetViewStatus !== OK path"
---

# Phase 41: Add Google Maps Street View to Property Listings — Verification Report

**Phase Goal:** Add a Google Maps viewer to the property analysis detail page — interactive Street View panorama facing the building by default, with a toggle to Map view and automatic fallback when Street View is unavailable.
**Verified:** 2026-04-01T22:30:00Z
**Status:** human_needed (all automated checks passed; Vercel env var and live rendering require human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `PropertyMapView` component exists at the specified path with all states implemented | VERIFIED | `web/src/components/analysis/PropertyMapView.tsx` — 205 lines, named export, `'use client'`, loading/ready/error states all present |
| 2 | Component shows Street View by default with heading computed toward property | VERIFIED | `computeHeading(panoramaLatLng, propertyLatLng)` at line 103; initial `viewMode` state is `'streetview'` |
| 3 | Toggle switches between Street View and Map in the same container | VERIFIED | Two `Button` components at lines 155–173; second `useEffect` calls `panoramaInstanceRef.current?.setVisible(true/false)` on `viewMode` change |
| 4 | Street View unavailability auto-switches to Map with toggle hidden | VERIFIED | Lines 95–100: `status !== google.maps.StreetViewStatus.OK` → `setStreetViewAvailable(false)`, `setViewMode('map')`; toggle gated on `streetViewAvailable` |
| 5 | Analysis page queries `listing_profiles` and conditionally renders the section | VERIFIED | Lines 79–93 of `page.tsx`: `.from('listing_profiles').select('address, latitude, longitude').eq('listing_id', parseInt(listingId, 10)).maybeSingle()` |
| 6 | Section hidden entirely when `listing_profiles` row absent or address null | VERIFIED | Line 87: `if (listingProfile?.address)` guard; `listingLocation` stays null otherwise; JSX at line 175: `{listingLocation && (...)}` |
| 7 | Section placed full-width below 2-column grid with `mt-8` via FadeIn | VERIFIED | Lines 174–183: `<FadeIn className="mt-8">` wrapping `<PropertyMapView>` inserted after closing `</div>` of grid at line 172 |
| 8 | Geocoder fallback when lat/lng are null | VERIFIED | Lines 54–66: `new google.maps.Geocoder()` with `geocoder.geocode({ address }, ...)` called when `latitude == null || longitude == null` |
| 9 | Env var documented for local development | VERIFIED | `web/.env.local.example` lines 1–5: comment block + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here` |

**Score:** 9/9 truths verified (automated)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/components/analysis/PropertyMapView.tsx` | Client component with all states, toggle, accessibility | VERIFIED | 205 lines; named export; `'use client'`; loading/error/ready states; toggle conditional on `streetViewAvailable` |
| `web/package.json` | `@googlemaps/js-api-loader` in dependencies | VERIFIED | `"@googlemaps/js-api-loader": "^2.0.2"` present; bonus: `"@types/google.maps": "^3.58.1"` also added (commit 60d6d36) |
| `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` | Imports + query + conditional render | VERIFIED | Lines 8–9: imports present; lines 79–93: query present; lines 174–183: render present |
| `web/.env.local.example` | Documents `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | VERIFIED | 5-line file with comment block and placeholder value |
| Vercel production env var `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Set in Vercel for production | HUMAN NEEDED | 41-02 SUMMARY explicitly notes `vercel env add` was skipped — key value not available in execution context |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` (server component) | `listing_profiles` Supabase table | `.from('listing_profiles').select(...)` | WIRED | Line 82–85: query present with correct column selection and `parseInt` cast |
| `page.tsx` | `PropertyMapView` component | Import + conditional JSX render | WIRED | Lines 8, 175–183: imported and rendered inside `{listingLocation && (...)}` |
| `PropertyMapView` | Google Maps JS API | `setOptions` + `importLibrary` | WIRED | Lines 29–46: `setOptions({key: ...})` then `importLibrary('maps'/'streetView'/'geometry')` |
| `PropertyMapView` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var | `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | WIRED (code) / HUMAN NEEDED (value) | Line 30: reference correct; whether key has actual value in Vercel is unverified |
| `PropertyMapView` | `FadeIn` animation wrapper | `<FadeIn className="mt-8">` in `page.tsx` | WIRED | Lines 176–182: `FadeIn` imported and wraps the component |
| `mapContainerRef` div | Google Maps constructors | Always-in-DOM + ref attachment | WIRED | Lines 190–201: div always rendered, `hidden` class only hides visually; Google Maps attaches during `init()` |

---

### Requirements Coverage (D-01 through D-15)

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| D-01 | 41-02 | Street View section placed full-width at bottom after 2-column grid | SATISFIED | `page.tsx` line 174: inserted after `</div>` at line 172 (grid close) |
| D-02 | 41-01 | Use Google Maps JavaScript API (not Static API / iframe) | SATISFIED | `importLibrary('maps'/'streetView'/'geometry')` — full JS API |
| D-03 | 41-01 | Default view is interactive Street View, heading toward property | SATISFIED | `viewMode` default `'streetview'`; `computeHeading` used for panorama POV |
| D-04 | 41-01 | Toggle view is interactive Map with marker | SATISFIED | `google.maps.Map` + `google.maps.Marker` + `InfoWindow` at lines 70–87 |
| D-05 | 41-01 | Toggle is a UI control within the component | SATISFIED | Two `Button` components in section header toggle between modes |
| D-06 | 41-01 | Heading computed via `geometry.spherical.computeHeading(panoramaLatLng, propertyLatLng)` | SATISFIED | Lines 103–106: exact API call present |
| D-07 | 41-01 | Street View unavailable → auto-switch to Map, hide toggle | SATISFIED | Lines 95–100: `setStreetViewAvailable(false)` + `setViewMode('map')`; toggle gated on `streetViewAvailable` |
| D-08 | 41-01 | Both views fully interactive | SATISFIED | Map: `disableDefaultUI: false`; Street View panorama: default interactive controls |
| D-09 | 41-02 | Secondary Supabase query on `listing_profiles` selecting `address, latitude, longitude` | SATISFIED | Lines 81–85 in `page.tsx` |
| D-10 | 41-02 | If `listing_profiles` row not found, hide section entirely | SATISFIED | `listingProfile?.address` guard + `{listingLocation && (...)}` conditional render |
| D-11 | 41-01 | Use lat/lng when provided; fall back to Geocoder if null | SATISFIED | Lines 52–66: `latitude != null && longitude != null` branch + Geocoder fallback |
| D-12 | 41-02 | Env var `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; Vercel + `.env.local` documented | PARTIAL | `.env.local.example` documented; Vercel production var not confirmed (skipped in execution) |
| D-13 | 41-01 | Required libraries: `maps`, `streetView`, `geometry` | SATISFIED | Lines 39–41: `importLibrary` called for all three |
| D-14 | 41-01 | Component path `web/src/components/analysis/PropertyMapView.tsx`; props `address, latitude, longitude` | SATISFIED | File exists at exact path; props interface lines 12–16 matches spec |
| D-15 | 41-01 | Use `@googlemaps/js-api-loader` package | SATISFIED | `^2.0.2` in `package.json`; functional API (`setOptions`/`importLibrary`) used |

**Note on D-12:** Code wiring is complete (`process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` referenced correctly). The Vercel production env var set step was intentionally deferred in the execution context — the key value was unavailable. This is the one item requiring human follow-up.

---

### API Implementation Deviation (Documented, Not a Gap)

The 41-01 PLAN specified `new Loader({...}).load()` but the installed v2.0.2 package deprecated the `.load()` method. The implementation correctly adapted to the v2 functional API: `setOptions()` + `importLibrary()`. This is functionally equivalent and documented in the 41-01 SUMMARY as an auto-fixed bug. No action needed.

---

### Anti-Patterns Found

No anti-patterns detected in modified files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TODO/FIXME/placeholder found | — | — |
| — | — | No empty implementations found | — | — |
| — | — | No stub patterns found | — | — |

---

### Human Verification Required

#### 1. Street View rendering in browser

**Test:** Open any analysis page for a listing that has a `listing_profiles` row with a valid address. Scroll to the bottom of the page.
**Expected:** "Property Location" section fades in on scroll; shows two toggle buttons ("Street View" and "Map"); renders an interactive Google Maps Street View panorama with the camera facing the property building.
**Why human:** Requires browser with a live `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` value; programmatic verification of Maps JS API rendering is not possible.

#### 2. Map toggle interaction

**Test:** Click the "Map" toggle button on the Property Location section.
**Expected:** Interactive Google Maps map replaces the panorama in the same container without page reload; "Map" button shows filled/primary variant; "Street View" button shows outline variant.
**Why human:** Requires live browser interaction with Google Maps JS API.

#### 3. Missing listing_profiles row → section hidden

**Test:** Visit an analysis page for a listing_id that has no row in `listing_profiles`, or where the address column is null.
**Expected:** The "Property Location" section does not appear anywhere on the page. No error message, no empty container, no placeholder.
**Why human:** Requires specific DB state (absent or null-address row); cannot be verified without real Supabase data.

#### 4. Vercel production env var confirmation

**Test:** Run `vercel env ls production | grep NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or check the Vercel dashboard for the project.
**Expected:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` listed as a production environment variable with a real API key value.
**Why human:** The `vercel env add` interactive command was explicitly skipped in the execution context (41-02 SUMMARY). The map will silently fail to load if this is not set — it will show the loading skeleton then error state.

#### 5. Street View unavailability fallback

**Test:** Find a property listing with an address in a location without Google Street View coverage (e.g., remote area). Load its analysis page.
**Expected:** Section shows Map view automatically with no toggle buttons visible.
**Why human:** Requires identifying a real listing address that triggers `StreetViewStatus !== OK`.

---

### Gaps Summary

No code gaps. All 9 observable truths verified programmatically. All 15 decisions (D-01 through D-15) have implementation evidence in the codebase.

The one outstanding item is operational, not a code gap: the Vercel production environment variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` was not set during execution (the plan acknowledged this requires the actual API key value). Without this variable, the map section will render in error state in production. This must be resolved before the feature is live.

---

_Verified: 2026-04-01T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
