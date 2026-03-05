# Phase 1: Foundation + First Scraper - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a local pipeline that scrapes Homegate listings via Apify, validates each record against a Zod schema, and writes normalized JSONL output to a timestamped directory on disk. A developer runs a single command (`npx tsx src/manual-run.ts homegate`) to execute the full pipeline. This phase covers project setup, schema definition, Swiss number parsing, Homegate integration, and structured logging. Scheduling, second scrapers, and deployment are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Listing schema design
- Schema covers both rent AND buy listings — `listingType` field discriminates between them
- Required fields: URL, title, listingType, price, rooms, address (city + canton) — listings missing any required field are rejected
- Address stored in dual format: raw address string preserved as-is PLUS structured fields (street, zip, city, canton) parsed where available
- Every record includes `source` (e.g., "homegate") and `scrapedAt` (ISO timestamp) for traceability

### Scrape scope & filtering
- Geographic scope: all of Switzerland — full nationwide scrape, no regional filtering
- Property types: residential only (apartments and houses) — no commercial, parking, or storage
- No price or size filters — capture everything, filtering happens downstream during analysis
- No artificial listing cap — scrape all available Homegate listings (memory-safe via JSONL streaming to disk)

### Data granularity per listing
- Comprehensive capture: store everything Homegate provides (sqm, floor, year built, description, amenities, etc.)
- Description text: stored as-is, full length, no truncation — valuable for future NLP analysis
- Images: store URLs only, never download actual image files (png/pdf/jpg)
- Agent/agency info: capture agency name and contact info when available
- Normalized output only — no raw Apify response preserved alongside clean records

### Run behavior & developer UX
- Default log level: info — progress milestones (starting, records fetched, validation summary, output path, done)
- Validation rejections: warning per rejection during run, then aggregate summary at end (e.g., "1,234 valid / 12 rejected (missing price: 8, missing rooms: 4)")
- Apify failure handling: fail fast, no partial output — exit with error, clean state for retry
- `--dry-run` flag supported: fetches small sample (~10 listings), validates and logs, does not write to disk — saves Apify credits during development

### Claude's Discretion
- Exact Apify actor selection and input configuration for Homegate
- Swiss number parser implementation approach
- Pino logger configuration details
- TypeScript project structure (folder layout, tsconfig settings)
- Exit codes and error message formatting
- Exact JSONL streaming implementation

</decisions>

<specifics>
## Specific Ideas

- Scrape the entire Homegate for Switzerland — "as long as it won't blow up the memory on the EC2 box we're fine"
- Investment analysis is the downstream use case — comprehensive data capture now enables richer analysis later
- Image URLs matter, actual image files do not — storage and licensing concerns

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Greenfield project — no existing code to reuse

### Established Patterns
- No established patterns yet — this phase sets the conventions for the entire project

### Integration Points
- This phase creates the foundation: schema, adapter interface, and data format that Phase 2 (FlatFox) and Phase 3 (EC2 deployment) build upon
- Scraper adapter interface (SCRP-02) must be designed for extensibility — FlatFox in Phase 2 uses direct REST API, not Apify

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-first-scraper*
*Context gathered: 2026-03-05*
