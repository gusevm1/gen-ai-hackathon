# Research Summary: HomeMatch v5.0 Hybrid Scoring Engine

**Domain:** Hybrid deterministic + AI property scoring pipeline
**Researched:** 2026-03-29
**Overall confidence:** HIGH

## Executive Summary

HomeMatch v5.0 replaces the current all-Claude scoring system with a hybrid architecture where numeric scores are computed deterministically in Python and Claude handles only subjective evaluation. The current system sends every criterion to Claude in a single `messages.parse()` call that returns category scores (0-100), an overall score, and a checklist. The new system classifies each user criterion by type (price, size, distance, binary_feature, proximity_quality, subjective), computes fulfillment (0.0-1.0) deterministically for all non-subjective criteria, and calls Claude only for genuinely subjective ones (e.g., "quiet neighborhood", "good natural light", "modern kitchen").

The most important architectural insight from the codebase analysis is that Flatfox attribute names are English slugs ("balconygarden", "petsallowed", "lift"), NOT German strings. The frontend `FEATURE_SUGGESTIONS` already stores these exact slugs. This eliminates the need for a complex normalization layer -- binary feature matching is a simple set membership check with a small alias map for German free-text inputs.

The migration strategy is additive: new columns added to the analyses table, schema_version field in the response JSONB, frontend branches on version for backward-compatible rendering. No data migration needed. The existing proximity.py module already contains the keyword-matching and distance-computation patterns that the new deterministic scorer will reuse.

The build order is driven by a clear dependency chain: data models and classifier first (everything depends on criterion_type), deterministic scorer second (pure functions, fully testable), subjective scorer third (Claude prompt refactor), hybrid orchestrator fourth (wires everything together), database migration fifth, frontend consumers last.

## Key Findings

**Stack:** No new Python packages needed. The existing `anthropic` SDK, Pydantic, and Python stdlib (`math`, `re`) provide everything. Frontend needs only a new React component for fulfillment display.

**Architecture:** Single Claude call for all subjective criteria (not per-criterion). Criterion type classified at profile save time via backend regex/keyword matching. Built-in preferences (budget, rooms, living_space) synthesized as virtual fulfillment results without migrating them into dynamic_fields.

**Critical pitfall:** The `Importance` model (per-category: location/price/size/features/condition) is being replaced by per-criterion importance on `DynamicField`, but built-in fields (budget, rooms, living_space) still need importance mapping. The hybrid scorer must synthesize importance from dealbreaker flags and the old per-category importance during the transition period.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Data Model + Classifier** - Foundation phase
   - Addresses: CriterionType enum, DynamicField.criterion_type, classify_dynamic_fields(), updated IMPORTANCE_WEIGHT_MAP
   - Avoids: Downstream phases depending on untyped criteria

2. **Deterministic Scorer** - Core computation engine
   - Addresses: Price/size/distance/binary/proximity fulfillment formulas, FulfillmentResult model, FEATURE_ALIAS_MAP
   - Avoids: Coupling deterministic logic to Claude calls

3. **Subjective Scorer (Claude refactor)** - AI-only path
   - Addresses: SubjectiveEvaluation model, new prompts for fulfillment-only output, score_subjective() method
   - Avoids: Breaking existing scoring during transition (old method kept temporarily)

4. **Hybrid Scorer + Router Integration** - Orchestration
   - Addresses: Weighted aggregation, CRITICAL override, missing data handling, ScoreResponse v2, router wiring
   - Avoids: Partial integration (deterministic + subjective must both be ready)

5. **Database Migration + Cache Versioning** - Storage layer
   - Addresses: schema_version column, fulfillment_data column, backward-compatible cache reads
   - Avoids: Breaking existing cached analyses

6. **Frontend Consumers** - Display layer
   - Addresses: FulfillmentBreakdown component, schema_version branching, extension type updates
   - Avoids: Building UI before response shape is finalized

**Phase ordering rationale:**
- Phase 1 before all others: criterion_type is the foundation for routing criteria to the right scorer
- Phase 2 before Phase 4: deterministic scorer must exist before the hybrid orchestrator can call it
- Phase 3 before Phase 4: subjective scorer must exist before the hybrid orchestrator can call it
- Phase 5 can run in parallel with Phase 4 (SQL migration is independent, but testing needs Phase 4 output)
- Phase 6 is strictly last: it consumes the final v2 response shape

**Research flags for phases:**
- Phase 1: Standard patterns (regex classification) -- no deeper research needed
- Phase 2: Standard patterns (pure math functions) -- no deeper research needed
- Phase 3: Likely needs prompt engineering iteration -- the fulfillment (0.0-1.0) output format is new for the Claude prompt and may need tuning
- Phase 4: Standard orchestration -- no deeper research needed
- Phase 6: May need UX research for the fulfillment visualization design

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new packages. All computation uses existing Python stdlib + Pydantic. |
| Features | HIGH | v5.0 scope explicitly defined in PROJECT.md. All criteria types identified from codebase. |
| Architecture | HIGH | All design decisions grounded in direct codebase reading. Flatfox slug format confirmed from test fixtures and live constants. |
| Pitfalls | HIGH | Key risks identified: built-in field importance mapping, backward compatibility of cached analyses, criterion_type classification accuracy. |

## Gaps to Address

- **Prompt engineering for subjective fulfillment:** Claude currently returns integer scores (0-100). The new prompt asks for float fulfillment (0.0-1.0). This is a format change that needs testing to ensure Claude produces well-calibrated values. May need example-based calibration in the prompt.
- **Condition/image-based scoring path:** Currently Claude evaluates property condition from images as a category. In v5.0, this becomes a subjective criterion. If no user has a condition-related dynamic_field, image analysis may be skipped entirely. Decide whether to always include a synthetic "Property Condition" subjective criterion when images are available.
- **Feature alias map completeness:** The FEATURE_ALIAS_MAP for German synonyms needs empirical population. Start with the 12 features in FEATURE_SUGGESTIONS, add German translations, then expand based on actual user input patterns from Supabase profiles data.

## Sources

- Direct codebase analysis of all files listed in ARCHITECTURE.md sources section
- PROJECT.md v5.0 milestone definition and target features
