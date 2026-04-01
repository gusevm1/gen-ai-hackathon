# Phase 41: Add Google Maps Street View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 41-add-google-maps-street-view-to-property-listings
**Areas discussed:** Placement, Street View API method, Address data source, Fallback behavior, API key storage

---

## Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width below score header | Between score header and 2-column grid | |
| Full-width at the bottom | After all score content | ✓ |
| Right column above checklist | In sticky right column | |

---

## Street View API Method

| Option | Description | Selected |
|--------|-------------|----------|
| Google Maps JS API | Interactive panorama + map toggle, heading computation | ✓ |
| Static API (proxied image) | Server-proxied image, no interactivity | |
| Maps Embed iframe | Simple iframe, no heading control | |

**Toggle view:** Google Maps JS API Map view (vs iframe) — ✓

**User specifics added:** Camera should face the building (heading computed toward property coords). Interactive Street View is default; user can toggle to interactive Map. Both views are fully interactive.

---

## Address Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| Query listing_profiles by listing_id | Secondary Supabase query in server component | ✓ |
| Add address to analyses breakdown | Store in ScoreResponse JSONB | |

---

## Fallback When Street View Unavailable

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to static map view | Show Map with marker | ✓ |
| Hide section entirely | No map shown | |
| Show placeholder message | Text + external link | |

**User clarification:** Both views interactive — Street View = walk/look around, Map = zoom/pan. If Street View unavailable, show Map only (hide toggle).

---

## API Key Storage

| Option | Description | Selected |
|--------|-------------|----------|
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY env var | Client-side, restrict by domain | ✓ |
| Server-side proxy route | Key stays server-side | |
