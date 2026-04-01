---
status: partial
phase: 41-add-google-maps-street-view-to-property-listings
source: [41-VERIFICATION.md]
started: 2026-04-01T00:00:00Z
updated: 2026-04-01T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Set Vercel env var and verify map renders in production
expected: Navigate to an analysis page for a listing with lat/lng in listing_profiles — Street View loads by default, toggle switches to Map view
result: [pending]

### 2. Test Street View unavailable fallback
expected: For a listing in a location without Street View coverage, map view renders automatically with toggle hidden
result: [pending]

### 3. Test missing listing_profiles row
expected: For a listing with no listing_profiles row, the Property Location section is not shown at all
result: [pending]

### 4. Test geocoder fallback
expected: For a listing with address but null lat/lng, the map still loads using the geocoded coordinates
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
