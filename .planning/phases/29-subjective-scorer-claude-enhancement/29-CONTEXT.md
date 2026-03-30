# Phase 29: Subjective Scorer (Claude Enhancement) - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing full 5-category Claude scoring call with a focused subjective-only call that returns per-criterion fulfillment values (0.0–1.0) and reasoning for each subjective criterion. Always produce 3–5 summary_bullets regardless of whether subjective criteria exist. Preserve all existing prompt logic that works correctly today. No scoring pipeline integration in this phase (that is Phase 31).

</domain>

<decisions>
## Implementation Decisions

### Module structure
- Replace the old system in place — update `claude.py`, `models/scoring.py`, and `prompts/scoring.py` directly
- No new separate module file; this is a replacement of the existing Claude scoring system, not an additive layer
- `ClaudeSubjectiveResponse` and `SubjectiveCriterionResult` models go in `models/scoring.py` alongside the existing `ScoreResponse` (which is kept for v1 legacy cache reads per Phase 30 DB branching)

### Summary bullets call logic
- When subjective criteria exist: single `messages.parse()` call returns both `SubjectiveCriterionResult` list AND `summary_bullets` together (one combined call)
- When NO subjective criteria exist: skip the criteria call entirely, then make a separate minimal Claude call that receives **deterministic scores + full listing + full preferences** to generate 3–5 `summary_bullets`
- The minimal bullets-only call uses its own trimmed system prompt (no criteria-evaluation instructions — only bullet generation, language rules)

### Prompt architecture
- Replace `prompts/scoring.py` in place — rewrite `build_system_prompt()` with the new subjective-only instructions
- Old 5-category scoring rules, dealbreaker rules, score distribution anchors are removed
- All 4 preserved rules from the existing prompt MUST remain in the new system prompt:
  1. **Sale vs rent price rules** — SALE = total purchase price, RENT = monthly rent, never confuse them
  2. **Language rules** — respond entirely in user's preferred language, ignore listing input language
  3. **Image analysis guidance** — evaluate condition/finish/light from photos when provided
  4. **Proximity data format** — evaluate from verified Nearby Places section only, never guess

### Criterion context to Claude
- The subjective scoring call receives: full listing data + all user preferences + list of subjective criteria
- Each criterion presented in structured format: `- {name} ({importance}): {value}` (e.g. `- near a park (HIGH): within 500m`)
- Claude sees the full listing (description, price, rooms, features, photos, proximity) for rich reasoning

### Claude's Discretion
- Exact wording of the new system prompt (within the constraints of the 4 preserved rules above)
- Whether `ClaudeSubjectiveResponse` uses `model_config` with camelCase alias or keeps snake_case (follow established Pydantic pattern from deterministic_scorer.py)
- Fulfillment rounding to 0.1 step: done post-receipt in Python (not instructed to Claude, though the prompt should mention the 0.0–1.0 scale)
- Exact field ordering in `SubjectiveCriterionResult`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claude.py` → `ClaudeScorer`: existing `score_listing()` method and `messages.parse()` pattern — replace the output model and system prompt, keep the structural pattern
- `models/scoring.py` → `ScoreResponse`: keep this for legacy v1 cache reads; add `ClaudeSubjectiveResponse` + `SubjectiveCriterionResult` here
- `prompts/scoring.py` → `build_system_prompt()` + `build_user_prompt()`: rewrite in place; the proximity section builder (`nearby_places` injection) and `build_image_content_blocks()` in `claude.py` are reusable as-is
- `deterministic_scorer.py` → `FulfillmentResult`: subjective results must be returned as `FulfillmentResult` instances so Phase 31 aggregator handles them uniformly

### Established Patterns
- `messages.parse()` with `output_format=PydanticModel` — already proven for structured output (Phase 27 classifier, current scorer)
- `ConfigDict(alias_generator=to_camel, populate_by_name=True)` on models that cross the API boundary — follow same for new models
- None-as-skip sentinel: missing/unclear subjective criteria return `fulfillment=None`, not 0.0

### Integration Points
- Phase 31 (Hybrid Aggregator) will import `FulfillmentResult` from `deterministic_scorer.py` for all results — the subjective scorer must return `list[FulfillmentResult]` (converting from `SubjectiveCriterionResult`)
- `claude.py` → `claude_scorer` singleton used by `routers/scoring.py` — the public interface must remain compatible
- The existing `build_user_prompt()` call signature should remain stable; nearby_places injection pattern stays

</code_context>

<specifics>
## Specific Ideas

- `SubjectiveCriterionResult` has: `criterion: str`, `fulfillment: float` (0.0–1.0), `reasoning: str` — fulfillment rounded to 0.1 step after receipt
- `ClaudeSubjectiveResponse` has: `criteria: list[SubjectiveCriterionResult]`, `summary_bullets: list[str]` (3–5 items, in user's preferred language)
- The new system prompt must never instruct Claude to produce an `overall_score` or category-level scores — fulfillment per criterion only
- Minimal bullets-only call: receives deterministic FulfillmentResult list + full listing + preferences; system prompt is stripped to just language rules + bullet generation instructions

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-subjective-scorer-claude-enhancement*
*Context gathered: 2026-03-30*
