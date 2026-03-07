# Phase 1: Foundation & Onboarding - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

WXT Chrome extension scaffold (Manifest V3) with a full-page onboarding wizard that captures user property preferences and persists them in chrome.storage.local. Users install the extension, complete the wizard, and have a validated profile ready for scoring in later phases. Content script, background worker, popup, and onboarding page entrypoints must all be scaffolded.

</domain>

<decisions>
## Implementation Decisions

### Wizard flow & steps
- 3-step wizard: (1) Standard filters, (2) Soft criteria, (3) Weight allocation
- **Step 1 — Standard filters**: Mirrors Homegate's own filter panel (location+radius, buy/rent, category, price range, rooms, living space, year built, type, floor, availability, features/furnishings). All fields optional — these are the "default" filters Homegate already supports
- **Step 2 — Soft criteria**: Hybrid approach — category prompts (e.g., "Surroundings", "Building quality", "Lifestyle") with curated suggestions per category, PLUS an LLM-assisted chat where users describe criteria in their own words and Claude helps refine them into specific evaluable criteria (e.g., "lake view", "spacious garden", "near public transport")
- **Step 3 — Weight allocation**: Sliders for all discussed categories that always sum to 100%. When one slider moves up, others proportionally adjust down. Categories are dynamic — derived from what the user actually configured in Steps 1 and 2 (no phantom categories for things they didn't set)
- Linear navigation with back/next buttons (no step jumping)
- Per-step auto-save — if user closes mid-wizard, they resume where they left off

### Visual style & feel
- React + shadcn/ui + Tailwind CSS
- Warm & friendly visual tone — soft colors, rounded elements, approachable feel (think Airbnb/Zillow warmth)
- Homegate-inspired accent color (#E4006E pink/magenta) — feels native to the platform
- Light + dark mode with a manual toggle
- Full-page layout for onboarding (not popup — too cramped for this complexity)

### Weight configuration UX
- Slider-based weight allocation per category
- All sliders must always sum to exactly 100%
- Proportional redistribution when any slider is moved (budget allocation pattern)
- Categories are dynamically generated from the user's actual profile — only categories the user filled in/discussed get weight sliders
- Appears as its own Step 3 after soft criteria are captured

### Profile schema & storage
- chrome.storage.local for persistence (survives browser restarts)
- Zod validation on both save and load (Zod already in project dependencies)
- Schema version field from day 1 (`schemaVersion: 1`) for future migration support
- Per-step auto-save during wizard (partial profile saved after each step)
- Profile editing: popup has "Edit preferences" link that reopens the full-page wizard in edit mode (reuses onboarding UI)

### Claude's Discretion
- Exact LLM prompt design for the soft criteria chat assistant
- Suggested category prompts and their curated suggestion lists
- Proportional redistribution algorithm for weight sliders
- Loading states and transitions between wizard steps
- Dark mode color palette specifics (as long as warm & friendly tone is maintained)
- Popup dashboard layout and content (profile summary, on/off toggle, edit link)

</decisions>

<specifics>
## Specific Ideas

- Step 1 should mirror Homegate's filter panel layout as shown in their UI (Location+radius, Search in, Category, Price from/to, Rooms from/to, Living space from/to, Year built from/to, Type, Floor, Availability, Features and furnishings checkboxes)
- The LLM-assisted chat in Step 2 is the core value differentiator — it helps users articulate criteria that Homegate can't filter for but a human reviewing the listing could evaluate (e.g., "lake view (actually verifiable)", "spacious well-kept garden")
- Weight sliders should feel like allocating a budget — intuitive "this matters more to me" interaction
- Inspiration: JobRight.ai's match percentage approach applied to real estate

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schema/listing.ts`: PropertyListingSchema (Zod) — field names and types can inform the preference profile schema (rooms, livingSpace, floor, yearBuilt, features, propertyType, etc.)
- Zod already a project dependency — no new dependency needed for profile validation

### Established Patterns
- TypeScript + Zod validation pattern established in the codebase
- ESM modules (`"type": "module"` in package.json)
- Jest for testing

### Integration Points
- This is a greenfield Chrome extension build — no existing extension code to integrate with
- The existing `src/` scraper code is from the pre-pivot era and won't be reused in Phase 1
- Profile schema created here will be consumed by Phase 2 (data extraction) and Phase 3 (LLM scoring) — it's the foundation for the entire scoring pipeline

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-onboarding*
*Context gathered: 2026-03-07*
