# Phase 3: LLM Scoring Pipeline - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend can score a Flatfox listing against a user's weighted preferences via Claude, returning a structured score with category breakdown and reasoning. Includes the Supabase edge function proxy and storing results in Supabase. Does NOT include extension UI, badge rendering, or the website full analysis page (those are Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Score structure — Hybrid model
- 5 weight categories for standard filters: location, price, size, features, condition
- Each category gets a 0-100 score assigned directly by Claude with full LLM judgment (no strict rubric)
- Soft criteria (free-text) and selected features (balcony, parking, etc.) are evaluated as a separate checklist with per-item weights
- Overall 0-100 score: Claude's discretion on how to combine category scores and checklist scores

### Score badge display
- Color-coded number only (no text label like "Good Match")
- Color palette should be visually attractive and intuitive — NOT basic green/yellow/red traffic light
- Phase 4 implements the badge UI, but the scoring response should include a match tier/band so the extension knows which color to apply

### Summary bullets (3-5 for extension overlay)
- Pros/cons list format with reasons
- Highlight where the user would be **compromising** if they chose this property
- Include both specific numbers AND high-level labels (e.g., "CHF 2,100/mo vs your CHF 2,500 max — within budget")
- Bullets should be concise enough for an extension overlay panel

### Full analysis page (returned in scoring response, rendered by Phase 4)
- Both combined: pros/cons summary at the top + category-by-category breakdown below
- Each category section: score, reasoning bullets with listing data citations
- Category breakdown matches the 5 weight categories + checklist results

### Analysis language
- Analysis returned in the **user's preferred language** (not the listing's language)
- This overrides the original EVAL-05 requirement — user sets their preferred language in preferences
- Requires a language preference field in user preferences (may need a small Phase 2 addition or handled in Phase 3 planning)

### Claude's Discretion
- Missing data behavior: how to handle listings that lack info for a category (infer from context vs neutral score vs exclude)
- Soft criteria evaluation approach: how to assess free-text criteria ("near Bahnhof") against listing data
- Feature evaluation: binary check vs quality assessment — Claude can decide based on available listing detail
- Overall score formula: how to blend category scores and checklist scores into the 0-100 overall
- Prompt engineering: structure, chain-of-thought, JSON output format

</decisions>

<specifics>
## Specific Ideas

- Compromises should be front-and-center — the user wants to immediately see what they'd be giving up
- Color-coded badges should feel modern and attractive, not like a traffic light
- Numbers matter: include specific data points (CHF amounts, m², room counts) alongside qualitative labels

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FlatfoxListing` model (backend/app/models/listing.py): Full parsed listing with all fields — direct input to Claude prompt
- `UserPreferences` model (backend/app/models/preferences.py): Mirrors frontend Zod schema — includes weights, soft criteria, selected features
- `FlatfoxClient` singleton (backend/app/services/flatfox.py): Async httpx client, already fetches listings by pk
- `listings` router (backend/app/routers/listings.py): Pattern for new scoring router

### Established Patterns
- Pydantic models for request/response validation
- Singleton service pattern with lazy initialization (FlatfoxClient)
- FastAPI router pattern with prefix and tags
- Lifespan management for async clients

### Integration Points
- New `/score` endpoint on the FastAPI backend (parallel to existing `/listings` router)
- Supabase edge function must proxy POST /score with auth validation (new edge function or extend existing)
- Results stored in Supabase `analyses` table (schema created in Phase 1: user_id, listing_id, score, breakdown, created_at)
- Anthropic SDK needs to be added to requirements.txt (not currently present)
- No Supabase client in backend yet — needed to read preferences and write analysis results

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-llm-scoring-pipeline*
*Context gathered: 2026-03-10*
