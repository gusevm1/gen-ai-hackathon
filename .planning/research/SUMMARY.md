# Research Summary: ListingProfile + OpenRouter Integration into v5.0

**Domain:** Integration of pre-computed enrichment pipeline into hybrid scoring architecture
**Researched:** 2026-03-30
**Overall confidence:** HIGH

## Executive Summary

The integration of the ListingProfile enrichment pipeline and OpenRouter gap-fill into the existing v5.0 hybrid scoring architecture is straightforward but requires careful attention to three key decisions: (1) how pre-computed ListingProfile data feeds into the Phase 28 deterministic scorer without modifying its proven interface, (2) updating the deprecated OpenRouter model before deployment, and (3) gating the expensive Claude fallback via environment variable.

Two parallel code paths have converged. The committed v5.0 code (Phases 27-28) provides criterion classification and deterministic scoring against `FlatfoxListing` (live Flatfox API data). The untracked enrichment code provides `ListingProfile` (pre-computed property data with haversine-accurate amenity distances, AI-analyzed condition scores, and market context). These are complementary: FlatfoxListing provides authoritative live data (price, rooms, sqm, attributes), while ListingProfile provides enrichment data (amenity distances, condition, neighborhood) that cannot be obtained at score time without expensive research.

The recommended integration pattern is an **adapter function** that converts `ListingProfile` fields to `FlatfoxListing`-compatible format, allowing all 41 deterministic scorer tests to remain green. For distance and proximity criteria, the adapter extracts pre-computed amenity data from the profile and passes it as the `actual_km` and `proximity_data` arguments the scorer already expects. When no ListingProfile exists, the system degrades gracefully to live Apify proximity data or skips criteria with missing data.

The most urgent finding is that **Gemini 2.0 Flash (`google/gemini-2.0-flash-001`) is deprecated and will shut down June 1, 2026**. The model constant in `openrouter.py` must be updated to `google/gemini-2.5-flash-lite` (same pricing: $0.10/M input, $0.40/M output) before any deployment.

## Key Findings

**Stack:** Zero new Python packages. One model constant update (Gemini 2.0 Flash to 2.5 Flash Lite -- same price, not deprecated). Two new env vars (`OPENROUTER_API_KEY`, `ALLOW_CLAUDE_FALLBACK`). `httpx` already installed.

**Architecture:** Adapter pattern bridges ListingProfile to FlatfoxListing. Phase 28 scorer (439 lines, 41 tests) stays untouched. Scoring router becomes a multi-path orchestrator: cache -> deterministic -> subjective (Claude) -> gap-fill (OpenRouter) -> aggregation. ListingProfile is optional -- system degrades gracefully without it.

**Critical pitfall:** Gemini 2.0 Flash deprecation (June 1, 2026) -- must update model constant before deployment. Second pitfall: the gap detector (`gap_detector.py`) outputs `ChecklistItem` objects while the deterministic scorer outputs `FulfillmentResult` objects -- these are different models from different eras of the codebase. Phase 31 must bridge them or choose one format.

**Design tension resolved:** The subjective scorer (Phase 29, Claude) and the gap-fill (OpenRouter) handle different concerns and can coexist. Subjective scorer evaluates criteria typed `criterion_type == "subjective"`. Gap-fill fills data holes where the deterministic scorer should have answered but ListingProfile data was missing. However, the v5.0 approach of skipping missing data in aggregation (HA-02) is simpler and more predictable than gap-filling. Recommend keeping OpenRouter gap-fill as optional diagnostic, not in critical scoring path.

## Implications for Roadmap

Based on research, the existing phase structure (29-32) is correct with these adjustments:

1. **Phase 29: Subjective Scorer (Claude Refactor)** - Unchanged scope
   - Addresses: SS-01 through SS-04
   - Independent of ListingProfile integration (uses same FlatfoxListing + nearby_places inputs)
   - Can optionally include ListingProfile enrichment context (condition scores, neighborhood data) in the Claude prompt for richer subjective evaluation
   - Summary bullets generation needed even when all criteria are deterministic (separate minimal Claude call)

2. **Phase 30: Database Schema Prep + Migration Deploy** - Expanded to include migration 005/006
   - Addresses: DB-01, DB-03, plus migrations 005 (listing_profiles table) and 006 (research_json)
   - Apply all four migrations before any scoring code ships
   - Set `OPENROUTER_API_KEY` and `ALLOW_CLAUDE_FALLBACK` on EC2
   - This is the infrastructure prep phase

3. **Phase 31: Hybrid Scorer & Router Integration** - Expanded significantly
   - Addresses: HA-01 through HA-04, DB-02, plus:
   - Create `profile_adapter.py` (~40 lines: ListingProfile to FlatfoxListing conversion + proximity data extraction)
   - Wire ListingProfile lookup into scoring router
   - Update OpenRouter model constant to `google/gemini-2.5-flash-lite`
   - Optionally wire gap detection + OpenRouter fill for data gaps
   - Implement weighted aggregation formula
   - CRITICAL override logic (f=0 forces poor tier, cap at 39)
   - ScoreResponse v2 schema
   - `ALLOW_CLAUDE_FALLBACK` gating in router
   - Add `openrouter_service.close()` to lifespan

4. **Phase 32: Frontend Consumers** - Unchanged scope
   - Addresses: FE-01 through FE-04
   - FulfillmentBreakdown component, checklist threshold update
   - schema_version branching for backward compat
   - Extension TypeScript types (additive only)

**Phase ordering rationale:**
- Phase 29 can run in parallel with Phase 30 (no dependency between subjective scorer and DB migrations)
- Phase 31 depends on both 29 and 30 (needs subjective scorer + DB ready)
- Phase 32 depends on 31 (needs v2 response shape to render)

**Research flags for phases:**
- Phase 29: Needs careful prompt engineering -- preserving existing prompt logic (sale/rent distinction, language rules, image analysis, proximity data section) while restricting Claude to subjective-only evaluation. May need iteration.
- Phase 31: Most complex phase. Consider splitting into 31a (router + adapter + deterministic orchestration) and 31b (aggregation + ScoreResponse v2 + cache gating) if scope is too large.
- Phase 30: Standard deployment work, no research needed.
- Phase 32: Standard frontend work, no research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack additions | HIGH | All dependencies verified against `requirements.txt`. Model deprecation confirmed on OpenRouter. No new packages. |
| Adapter pattern | HIGH | Both models' fields read line-by-line. Impedance mismatch is clear and the adapter is ~40 lines. |
| OpenRouter integration | HIGH | Existing 372-line implementation is well-structured. Only model constant change needed. |
| Supabase JSONB | HIGH | Migration files read. Patterns match existing codebase conventions. |
| Gap-fill vs subjective scorer coexistence | MEDIUM | Design is logical but untested. The two systems handle different concerns but have overlapping output formats. |
| Gemini 2.5 Flash Lite structured output | MEDIUM | OpenRouter docs confirm Gemini support generically. Existing fallback JSON parsing handles any issues. |

## Gaps to Address

- Gemini 2.5 Flash Lite structured output support -- test empirically during Phase 31 implementation
- Gap detector output format (`ChecklistItem`) vs scorer output format (`FulfillmentResult`) -- Phase 31 must decide whether to bridge, convert, or deprecate the gap detector
- Summary bullets generation when all criteria are deterministic -- Phase 29 needs the "no subjective criteria" code path (separate minimal Claude call)
- Pre-enriched listing coverage -- only 27 listings in zipcode 8051. Phase 31 must handle the "no ListingProfile" case gracefully
- Amenity category mapping -- `_infer_amenity_category()` function needs empirical testing against real user DynamicField names

## Sources

- Direct codebase analysis of all referenced files (HIGH confidence)
- [OpenRouter Gemini 2.0 Flash page](https://openrouter.ai/google/gemini-2.0-flash-001) -- deprecation confirmed (HIGH)
- [OpenRouter Gemini 2.5 Flash Lite page](https://openrouter.ai/google/gemini-2.5-flash-lite) -- pricing and availability confirmed (HIGH)
- [OpenRouter Structured Outputs docs](https://openrouter.ai/docs/guides/features/structured-outputs) -- JSON mode support (MEDIUM)
- [Supabase JSONB docs](https://supabase.com/docs/guides/database/json) -- index and query patterns (HIGH)
- [FastAPI Settings docs](https://fastapi.tiangolo.com/advanced/settings/) -- env var patterns (HIGH)
- HANDOFF.md side-by-side comparison of v5.0 and v6.0 approaches
- Phase 28 verification report (10/10 truths verified)
- ROADMAP.md phase dependencies and success criteria
- REQUIREMENTS.md (24 requirements: DM/DS/SS/HA/DB/FE)

---

*Research Summary for: HomeMatch v5.0 -- Integration of ListingProfile Enrichment + OpenRouter Gap-Fill*
*Researched: 2026-03-30*
