# Phase 41: Add Google Maps Street View to Property Listings - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a Google Maps viewer to the property analysis detail page (`/analysis/[listingId]`). The viewer defaults to an interactive Street View panorama facing the building, with a toggle to an interactive Map view. If Street View coverage is unavailable, fall back automatically to the Map view. This is purely a frontend + Supabase read addition — no backend changes required.

</domain>

<decisions>
## Implementation Decisions

### Placement
- **D-01:** The Street View / Map section is placed **full-width at the bottom** of the analysis page, after all score content (score header, bullet summary, breakdown, checklist).

### API Implementation
- **D-02:** Use the **Google Maps JavaScript API** — not the Static API or Embed iframe. Renders both `StreetViewPanorama` and `Map` via JS API in the same component with a smooth toggle.
- **D-03:** Default view is **interactive Street View** — the panorama loads with the camera heading computed toward the property coordinates (heading from panorama's found position to the lat/lng of the listing). User can walk around and look around freely.
- **D-04:** Toggle view is an **interactive Map** (`google.maps.Map`) with a marker on the property coordinates. User can zoom and pan.
- **D-05:** The toggle is a UI control (button/tab) within the viewer component switching between Street View and Map mode.
- **D-06:** Camera heading toward building: use `google.maps.geometry.spherical.computeHeading(panoramaLatLng, propertyLatLng)` to auto-orient the panorama.

### Fallback
- **D-07:** If Street View coverage is unavailable for the address (detected via `StreetViewStatus` callback), **automatically show the Map view** — no Street View toggle needed in that case. Map is always available.
- **D-08:** Both views are fully interactive: Street View = walk/look around; Map = zoom/pan/marker.

### Address / Coordinates Data Source
- **D-09:** The analysis page server component performs a **secondary Supabase query**: `listing_profiles` table, filtered by `listing_id`, selecting `address`, `latitude`, `longitude`.
- **D-10:** If `listing_profiles` row not found (listing not yet profiled), hide the Street View section entirely — no error shown to user.
- **D-11:** Use `latitude`/`longitude` from `listing_profiles` when available for accurate panorama positioning. Fall back to geocoding the `address` string via the Maps JS API `Geocoder` if coordinates are null.

### API Key
- **D-12:** Store as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable in Vercel + `.env.local`. Standard for Maps JS API (must be loaded in browser). Restrict the key in Google Cloud Console to the Vercel domain to prevent abuse.
- **D-13:** Required Maps JS API libraries: `maps`, `streetView`, `geometry` (for heading computation).

### Component Architecture
- **D-14:** New client component: `web/src/components/analysis/PropertyMapView.tsx`. Accepts `address: string`, `latitude: number | null`, `longitude: number | null` props.
- **D-15:** Use `@googlemaps/js-api-loader` npm package (or dynamic script loading) to load the Maps JS API in the client component.

### Claude's Discretion
- Exact height/aspect ratio of the map container (suggested: `h-80` or `h-96` for good balance)
- Styling of the toggle button (should follow existing design system — shadcn Button variants)
- Loading state while Maps JS API initializes (skeleton or spinner)
- Error boundary if Maps JS API fails to load

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Analysis Page
- `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` — Server component structure, Supabase query patterns, layout grid

### Existing Analysis Components
- `web/src/components/analysis/ScoreHeader.tsx` — Design patterns for analysis section components
- `web/src/components/analysis/ChecklistSection.tsx` — Example right-column component

### Database Schema
- `supabase/migrations/005_listing_profiles.sql` — `listing_profiles` table schema (address, latitude, longitude columns)

### Design System
- `.planning/codebase/CONVENTIONS.md` — Component conventions, Tailwind v4 patterns
- `.planning/codebase/STACK.md` — Web app stack (Next.js 16, React 19, Tailwind v4, shadcn/ui)

### Infrastructure
- `CLAUDE.md` — Vercel deploy process, env var management

No external ADRs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/components/ui/` — shadcn/ui Button, Card, Badge components for toggle and container styling
- FadeIn / StaggerGroup motion primitives (Framer Motion) — can wrap the Street View section for consistent entrance animation
- Existing server component pattern in `page.tsx` for additional Supabase queries

### Established Patterns
- Server components do multiple sequential Supabase queries (see profile name fetch in analysis page)
- Client components use `'use client'` directive and receive data via props from server component
- Design tokens: `bg-primary`, `text-muted-foreground`, `border-primary` for consistent styling

### Integration Points
- `analysis/[listingId]/page.tsx` — add `listing_profiles` query, pass `address`/`lat`/`lng` to new `PropertyMapView` client component
- `web/package.json` — add `@googlemaps/js-api-loader` dependency
- Vercel env vars — add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

</code_context>

<specifics>
## Specific Ideas

- Camera facing: use `google.maps.geometry.spherical.computeHeading()` to orient panorama toward the building
- Toggle control: a tab-like button group ("Street View" | "Map") within the section header
- Street View unavailable: silently switch to Map mode, hide toggle button (only Map available)
- Section heading: "Property Location" or "Street View" — simple label above the map container

</specifics>

<deferred>
## Deferred Ideas

- Satellite view as a third toggle option (out of scope for this phase)
- Directions integration (out of scope)
- Distance-to-amenities map overlay (separate phase concept)

None of the todos matched this phase scope.

</deferred>

---

*Phase: 41-add-google-maps-street-view-to-property-listings*
*Context gathered: 2026-04-01*
