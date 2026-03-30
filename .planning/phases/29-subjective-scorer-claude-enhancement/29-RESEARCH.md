# Phase 29: Subjective Scorer (Claude Enhancement) - Research

**Researched:** 2026-03-30
**Domain:** Anthropic Python SDK (messages.parse), Pydantic structured output, prompt engineering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Module structure:**
- Replace the old system in place — update `claude.py`, `models/scoring.py`, and `prompts/scoring.py` directly
- No new separate module file; this is a replacement of the existing Claude scoring system, not an additive layer
- `ClaudeSubjectiveResponse` and `SubjectiveCriterionResult` models go in `models/scoring.py` alongside the existing `ScoreResponse` (which is kept for v1 legacy cache reads per Phase 30 DB branching)

**Summary bullets call logic:**
- When subjective criteria exist: single `messages.parse()` call returns both `SubjectiveCriterionResult` list AND `summary_bullets` together (one combined call)
- When NO subjective criteria exist: skip the criteria call entirely, then make a separate minimal Claude call that receives **deterministic scores + full listing + full preferences** to generate 3–5 `summary_bullets`
- The minimal bullets-only call uses its own trimmed system prompt (no criteria-evaluation instructions — only bullet generation, language rules)

**Prompt architecture:**
- Replace `prompts/scoring.py` in place — rewrite `build_system_prompt()` with the new subjective-only instructions
- Old 5-category scoring rules, dealbreaker rules, score distribution anchors are removed
- All 4 preserved rules from the existing prompt MUST remain in the new system prompt:
  1. **Sale vs rent price rules** — SALE = total purchase price, RENT = monthly rent, never confuse them
  2. **Language rules** — respond entirely in user's preferred language, ignore listing input language
  3. **Image analysis guidance** — evaluate condition/finish/light from photos when provided
  4. **Proximity data format** — evaluate from verified Nearby Places section only, never guess

**Criterion context to Claude:**
- The subjective scoring call receives: full listing data + all user preferences + list of subjective criteria
- Each criterion presented in structured format: `- {name} ({importance}): {value}` (e.g. `- near a park (HIGH): within 500m`)
- Claude sees the full listing (description, price, rooms, features, photos, proximity) for rich reasoning

### Claude's Discretion
- Exact wording of the new system prompt (within the constraints of the 4 preserved rules above)
- Whether `ClaudeSubjectiveResponse` uses `model_config` with camelCase alias or keeps snake_case (follow established Pydantic pattern from deterministic_scorer.py)
- Fulfillment rounding to 0.1 step: done post-receipt in Python (not instructed to Claude, though the prompt should mention the 0.0–1.0 scale)
- Exact field ordering in `SubjectiveCriterionResult`

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SS-01 | New `ClaudeSubjectiveResponse` Pydantic model returns a list of `SubjectiveCriterionResult` entries, each with `criterion: str`, `fulfillment: float` (0.0–1.0), and `reasoning: str`; fulfillment values rounded to 0.1 step post-receipt | Pydantic model pattern from `FulfillmentResult` in `deterministic_scorer.py` is the template; `messages.parse()` already proven for structured output |
| SS-02 | All `subjective`-type criteria batched into a single `messages.parse()` call; Claude call for criteria skipped entirely if zero subjective criteria | Gating on `CriterionType.SUBJECTIVE` filter over `prefs.dynamic_fields`; empty list short-circuits call |
| SS-03 | Updated scoring system prompt instructs Claude to return `fulfillment ∈ {0.0, 0.1, ..., 1.0}` per criterion with reasoning; Claude must never produce `overall_score` or category-level scores | `build_system_prompt()` in `prompts/scoring.py` rewrite; remove 5-category scoring rules entirely |
| SS-04 | Claude always generates 3–5 natural-language `summary_bullets` in user's preferred language, even when all scored criteria are deterministic; a separate minimal call is made if no subjective criteria triggered a Claude call | Two code paths in `claude.py`: combined call (criteria + bullets) or minimal bullets-only call; both use `messages.parse()` |
</phase_requirements>

---

## Summary

Phase 29 is a focused in-place replacement of the existing Claude scoring system. The current `ClaudeScorer.score_listing()` makes a single call that produces a full 5-category score — this is replaced with a smarter two-path system: when subjective criteria exist, one `messages.parse()` call returns per-criterion fulfillment values plus summary bullets; when no subjective criteria exist, no criteria call is made and a minimal bullets-only call produces the summary.

All changes are confined to three files: `services/claude.py`, `models/scoring.py`, and `prompts/scoring.py`. The `FulfillmentResult` model from `deterministic_scorer.py` is reused as the Phase 31 aggregator interface. The `ScoreResponse` model is kept in `models/scoring.py` for v1 legacy cache reads.

The key complexity is the dual code path in `ClaudeScorer.score_listing()` — the function must filter `prefs.dynamic_fields` by `criterion_type == CriterionType.SUBJECTIVE`, decide which path to take, and always return a consistent shape. The existing `messages.parse()` + Pydantic pattern is already proven by Phase 27 (classifier) and the current scorer, so no new SDK capabilities are needed.

**Primary recommendation:** Treat this as a prompt + model surgery, not a structural refactor. The infrastructure (client, content blocks, nearby_places injection) is unchanged; only the output model and system prompt change.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `anthropic` (AsyncAnthropic) | Already installed (claude-haiku-4-5-20251001 in use) | `messages.parse()` for structured output | Proven in Phase 27 classifier and current scorer |
| `pydantic` (BaseModel, ConfigDict, Field) | Already installed | Structured output model for Claude response | Project-wide standard; `FulfillmentResult` is the template |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pydantic.alias_generators.to_camel` | Same as project | camelCase alias generation | Follow `FulfillmentResult` / `DynamicField` pattern for API-crossing models |
| `CriterionType` from `app.models.preferences` | Phase 27 | Filter subjective fields | Import in `claude.py` to gate Claude call |
| `FulfillmentResult` from `app.services.deterministic_scorer` | Phase 28 | Return type for Phase 31 aggregator | `score_listing()` converts `SubjectiveCriterionResult` → `FulfillmentResult` |

**No new packages required.** All dependencies are already installed.

---

## Architecture Patterns

### Files Modified (in-place replacement)

```
backend/app/
├── models/scoring.py          # Add ClaudeSubjectiveResponse + SubjectiveCriterionResult; keep ScoreResponse
├── prompts/scoring.py         # Rewrite build_system_prompt(); add build_bullets_system_prompt()
│                              # build_user_prompt() and build_image_content_blocks() unchanged
└── services/claude.py         # Replace score_listing() with two-path logic
```

### Pattern 1: New Pydantic Output Models

`SubjectiveCriterionResult` and `ClaudeSubjectiveResponse` follow the exact same pattern as `FulfillmentResult` in `deterministic_scorer.py`:

```python
# Source: /backend/app/services/deterministic_scorer.py (FulfillmentResult template)
class SubjectiveCriterionResult(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    criterion: str
    fulfillment: float = Field(ge=0.0, le=1.0)
    reasoning: str

class ClaudeSubjectiveResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    criteria: list[SubjectiveCriterionResult]
    summary_bullets: list[str] = Field(min_length=3, max_length=5)
```

Note: `fulfillment` is `float` (not `Optional[float]`) in `SubjectiveCriterionResult` — Claude always provides a value for criteria it evaluates. None-as-skip applies at the `FulfillmentResult` layer, not here.

### Pattern 2: Two-Path Score Logic in claude.py

```python
# Source: /backend/app/services/claude.py (structural pattern to extend)
async def score_listing(
    self,
    listing: FlatfoxListing,
    preferences: UserPreferences,
    image_urls: list[str] | None = None,
    nearby_places: dict[str, list[dict]] | None = None,
) -> tuple[list[FulfillmentResult], list[str]]:
    """Returns (subjective_results, summary_bullets)."""
    client = self.get_client()

    subjective_fields = [
        f for f in preferences.dynamic_fields
        if f.criterion_type == CriterionType.SUBJECTIVE
    ]

    content: list[dict] = []
    content.extend(build_image_content_blocks(image_urls or []))
    content.append({
        "type": "text",
        "text": build_user_prompt(listing, preferences, nearby_places=nearby_places)
    })

    if subjective_fields:
        # PATH A: combined criteria + bullets call
        # Append subjective criteria list to content
        ...
        response = await client.messages.parse(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=build_system_prompt(preferences.language),
            messages=[{"role": "user", "content": content}],
            output_format=ClaudeSubjectiveResponse,
        )
        parsed = response.parsed_output
        results = [_to_fulfillment_result(r, ...) for r in parsed.criteria]
        return results, parsed.summary_bullets
    else:
        # PATH B: minimal bullets-only call
        ...
        response = await client.messages.parse(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            system=build_bullets_system_prompt(preferences.language),
            messages=[{"role": "user", "content": bullets_content}],
            output_format=BulletsOnlyResponse,
        )
        return [], response.parsed_output.summary_bullets
```

### Pattern 3: Existing Proven messages.parse() Usage

```python
# Source: /backend/app/services/classifier.py (Phase 27 reference pattern)
result = await client.messages.parse(
    model=CLASSIFIER_MODEL,
    max_tokens=1024,
    messages=[{"role": "user", "content": build_classifier_prompt(fields)}],
    response_format=ClassificationResponse,  # Note: classifier uses response_format, scorer uses output_format
)
# Access via: result.parsed.classifications  (classifier)
# Access via: result.parsed_output           (scorer — check which attr the SDK returns)
```

**Critical:** The existing `claude.py` uses `output_format=ScoreResponse` and accesses `response.parsed_output`. The classifier uses `response_format=ClassificationResponse` and accesses `result.parsed`. This inconsistency is already present in the codebase — follow whichever pattern the existing `score_listing()` uses (`output_format` + `parsed_output`) since that is the proven scorer path.

### Pattern 4: FulfillmentResult Conversion

Subjective results must be converted to `FulfillmentResult` for Phase 31 compatibility:

```python
# Source: /backend/app/services/deterministic_scorer.py (FulfillmentResult definition)
def _to_fulfillment_result(
    r: SubjectiveCriterionResult,
    field: DynamicField,
) -> FulfillmentResult:
    fulfillment_rounded = round(round(r.fulfillment * 10) / 10, 1)
    return FulfillmentResult(
        criterion_name=r.criterion,
        fulfillment=fulfillment_rounded,
        importance=field.importance,
        reasoning=r.reasoning,
    )
```

### Pattern 5: Subjective Criteria Presentation Format

Each subjective criterion presented to Claude in the user prompt section:
```
## Subjective Criteria to Evaluate

- quiet neighborhood (HIGH): no main road
- bright and modern (MEDIUM): large windows preferred
- near a park (CRITICAL): within 500m walking
```

Format: `- {field.name} ({field.importance.value.upper()}): {field.value or "not specified"}`

### Anti-Patterns to Avoid

- **Using `response_format` instead of `output_format`:** The working scorer uses `output_format`; switching could break parsing.
- **Returning `overall_score` from the new prompt:** The new system prompt must explicitly state Claude should never produce an overall score.
- **Using `fulfillment=None` in `SubjectiveCriterionResult`:** Claude always returns a float for criteria it evaluates. None-as-skip only applies in `FulfillmentResult` for aggregation.
- **Importing `FulfillmentResult` from the wrong module:** It lives in `deterministic_scorer.py`, not `models/scoring.py`.
- **Changing `build_user_prompt()` signature:** The nearby_places injection and image blocks are reused unchanged; only the closing instruction line changes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured Claude output | Custom JSON parsing / regex extraction | `messages.parse(output_format=PydanticModel)` | Already proven; handles validation, retry, errors |
| Fulfillment rounding | Claude-side instruction to round | Python: `round(round(r.fulfillment * 10) / 10, 1)` | Simpler, deterministic, no prompt brittleness |
| Criterion filtering | Manual type-checking | `[f for f in prefs.dynamic_fields if f.criterion_type == CriterionType.SUBJECTIVE]` | CriterionType enum from Phase 27 is the canonical source |
| camelCase serialization | Manual field aliasing | `ConfigDict(alias_generator=to_camel, populate_by_name=True)` | Project standard from DynamicField and FulfillmentResult |

**Key insight:** The `messages.parse()` + Pydantic pattern already handles all the hard parts — retry on validation failure, schema injection into the prompt, structured extraction. The only work is defining the right Pydantic models and writing the right prompts.

---

## Common Pitfalls

### Pitfall 1: Score Return Type Change Breaks Router

**What goes wrong:** `routers/scoring.py` currently expects `score_listing()` to return `ScoreResponse`. Changing the return type without updating the router causes a type error or runtime failure.

**Why it happens:** The router calls `claude_scorer.score_listing(...)` and assigns the result directly to `result`, then calls `result.model_dump()` and saves to Supabase. The `ScoreResponse` shape is hardcoded in that flow.

**How to avoid:** The CONTEXT.md notes this is Phase 29's boundary — no scoring pipeline integration yet. The router is updated to handle the new return shape (tuple of results + bullets, or just the new model) as part of this phase. Alternatively, `score_listing()` can temporarily return a partial object. **Clarify the exact return contract during planning** — the method signature must be decided so the router can be updated consistently.

**Warning signs:** `AttributeError` on `result.overall_score` or `result.categories` in the router.

### Pitfall 2: matched_output vs parsed_output SDK Attribute

**What goes wrong:** The existing scorer accesses `response.parsed_output`; the classifier accesses `result.parsed`. Using the wrong attribute name raises `AttributeError`.

**Why it happens:** The Anthropic Python SDK has evolved; `messages.parse()` response attribute name may differ by SDK version or call style.

**How to avoid:** Confirm by reading the working `score_listing()` code (uses `response.parsed_output`) and replicate exactly. Do not use `result.parsed` for the scorer path.

### Pitfall 3: Empty Subjective Fields List Passed to Claude

**What goes wrong:** `score_listing()` is called with a profile that has no `dynamic_fields` at all (legacy profile), and the code accidentally calls the criteria path with an empty list, causing Claude to return an empty `criteria` list but still burning a full-cost API call.

**Why it happens:** The gate condition checks `len(subjective_fields) > 0` but `dynamic_fields` itself might be populated with non-subjective types only.

**How to avoid:** Filter on `criterion_type == CriterionType.SUBJECTIVE` specifically, not on `len(dynamic_fields) > 0`. Handle the case where `criterion_type` is `None` (legacy fields without classification) — the CONTEXT.md is silent on this; **decide in planning** whether unclassified fields default to subjective or are skipped.

**Warning signs:** Empty `criteria` list returned from combined call, wasting tokens.

### Pitfall 4: Preserved Prompt Rules Silently Dropped

**What goes wrong:** During the rewrite of `build_system_prompt()`, one or more of the 4 required preserved rules is accidentally omitted or truncated.

**Why it happens:** The old prompt is 104 lines; the 4 rules are scattered throughout (language rules at top, price rules in middle, image analysis in IMAGE ANALYSIS block, proximity rules at bottom).

**How to avoid:** Extract each of the 4 rules as named constants or clearly labeled sections before rewriting. Write a test that checks the system prompt string contains key sentinel phrases (e.g., "SALE = total purchase price", "RENT = monthly rent", "Nearby Places Data (Verified)", "preferred language").

**Warning signs:** Claude confusing sale vs rent prices in scoring, responses in wrong language, proximity criteria ignored.

### Pitfall 5: BulletsOnlyResponse Model Too Permissive

**What goes wrong:** The minimal bullets-only call returns fewer than 3 bullets or more than 5, violating SS-04.

**Why it happens:** Without `min_length=3, max_length=5` constraints on the Pydantic field, Claude may return fewer bullets.

**How to avoid:** Define `BulletsOnlyResponse` (or embed in `ClaudeSubjectiveResponse`) with `Field(min_length=3, max_length=5)` — same as existing `ScoreResponse.summary_bullets`.

---

## Code Examples

### Verified Pattern: messages.parse() with output_format (active scorer)

```python
# Source: /backend/app/services/claude.py (current production code)
response = await client.messages.parse(
    model=CLAUDE_MODEL,
    max_tokens=4096,
    system=build_system_prompt(preferences.language),
    messages=[{"role": "user", "content": content}],
    output_format=ScoreResponse,
)
return response.parsed_output
```

### Verified Pattern: FulfillmentResult model construction

```python
# Source: /backend/app/services/deterministic_scorer.py
class FulfillmentResult(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    criterion_name: str
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    importance: ImportanceLevel
    reasoning: Optional[str] = None  # None for deterministic; Claude fills for subjective
```

### Verified Pattern: DynamicField criterion_type filtering

```python
# Source: /backend/app/models/preferences.py (CriterionType enum)
class CriterionType(str, Enum):
    SUBJECTIVE = "subjective"
    # ... others

# Usage pattern:
subjective_fields = [
    f for f in preferences.dynamic_fields
    if f.criterion_type == CriterionType.SUBJECTIVE
]
```

### Verified Pattern: Nearby places injection (unchanged)

```python
# Source: /backend/app/prompts/scoring.py (build_user_prompt, lines 366-399)
# The nearby_places injection block at the bottom of build_user_prompt() is
# reused verbatim — no changes needed. The closing instruction line is the
# only part that changes (remove "Score each of the 5 categories..." instruction).
```

### Verified Pattern: Image content blocks (unchanged)

```python
# Source: /backend/app/prompts/scoring.py (build_image_content_blocks)
def build_image_content_blocks(image_urls: list[str]) -> list[dict]:
    return [
        {"type": "image", "source": {"type": "url", "url": url}}
        for url in image_urls
    ]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude scores 5 categories (0-100 each) | Claude scores individual subjective criteria (0.0-1.0 fulfillment) | Phase 29 | Granular, verifiable scores vs opaque aggregates |
| Single Claude call for everything | Deterministic formulas + optional Claude for subjective only | Phase 29 | Cheaper, faster, more consistent |
| `overall_score` computed by Claude | `overall_score` computed in Python (Phase 31) | Phase 29/31 | Transparent, formula-based aggregation |
| `checklist` field with met/partial/not-met | `SubjectiveCriterionResult` with `fulfillment` float | Phase 29 | Continuous scale, richer for weighted aggregation |
| Category importance in prompt (CRITICAL/HIGH/MEDIUM/LOW labels) | Criterion importance in structured format per field | Phase 29 | Per-criterion weighting instead of per-category |

**Deprecated/outdated:**
- `CategoryScore` model: removed from active use (kept only in `ScoreResponse` for v1 legacy reads)
- `ChecklistItem` model: removed from active use (same)
- DEALBREAKER RULES in system prompt: removed (dealbreakers handled by Phase 31 aggregator)
- SCORE DISTRIBUTION section in system prompt: removed (no overall score from Claude)
- IMPORTANCE LEVELS section referencing `critical=90, high=70` weights: removed

---

## Open Questions

1. **Return type of `score_listing()` in Phase 29**
   - What we know: Router currently expects `ScoreResponse`; Phase 29 changes the return type
   - What's unclear: Does Phase 29 update `routers/scoring.py` to use the new return, or does `score_listing()` return a temporary compatibility object? The CONTEXT.md says "No scoring pipeline integration in this phase (that is Phase 31)"
   - Recommendation: Plan should include updating `routers/scoring.py` to call the new method and handle the new return — even if Phase 31 replaces this again, the endpoint must not be broken after Phase 29

2. **Handling DynamicField with criterion_type=None**
   - What we know: `DynamicField.criterion_type` is `Optional[CriterionType]`, defaulting to `None` for backward compat (Phase 27 decision)
   - What's unclear: Should `None` criterion_type fields be treated as subjective (defaulting per Phase 27 design) or skipped?
   - Recommendation: Treat `None` as subjective (consistent with Phase 27 classifier defaulting to SUBJECTIVE for ambiguous criteria)

3. **BulletsOnlyResponse model location**
   - What we know: The minimal bullets-only call needs a Pydantic output model
   - What's unclear: Should this be a standalone model in `models/scoring.py` or a private inner class?
   - Recommendation: Add `BulletsOnlyResponse` to `models/scoring.py` alongside the other models for consistency

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest with asyncio_mode="auto" (pyproject.toml) |
| Config file | `/backend/pyproject.toml` |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/test_claude_subjective_scorer.py -x -q` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/ -x -q -m "not integration"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SS-01 | `ClaudeSubjectiveResponse` and `SubjectiveCriterionResult` models validate correctly; fulfillment rounded to 0.1 | unit | `pytest tests/test_claude_subjective_scorer.py::TestModels -x -q` | ❌ Wave 0 |
| SS-01 | `SubjectiveCriterionResult` rejects fulfillment > 1.0 or < 0.0 | unit | `pytest tests/test_claude_subjective_scorer.py::TestModels::test_fulfillment_bounds -x -q` | ❌ Wave 0 |
| SS-02 | `score_listing()` skips criteria call when zero subjective fields | unit | `pytest tests/test_claude_subjective_scorer.py::TestScoreListing::test_no_subjective_criteria_skips_criteria_call -x -q` | ❌ Wave 0 |
| SS-02 | `score_listing()` makes single combined call when subjective fields exist | unit | `pytest tests/test_claude_subjective_scorer.py::TestScoreListing::test_subjective_criteria_single_call -x -q` | ❌ Wave 0 |
| SS-03 | New system prompt never contains "overall_score" or "category" scoring instructions | unit | `pytest tests/test_claude_subjective_scorer.py::TestPrompts::test_system_prompt_no_overall_score -x -q` | ❌ Wave 0 |
| SS-03 | New system prompt contains all 4 preserved rules (sale/rent, language, image, proximity) | unit | `pytest tests/test_claude_subjective_scorer.py::TestPrompts::test_system_prompt_preserved_rules -x -q` | ❌ Wave 0 |
| SS-04 | Bullets-only call made when no subjective criteria exist | unit | `pytest tests/test_claude_subjective_scorer.py::TestScoreListing::test_bullets_only_call_when_no_subjective -x -q` | ❌ Wave 0 |
| SS-04 | `summary_bullets` length 3-5 enforced by model validation | unit | `pytest tests/test_claude_subjective_scorer.py::TestModels::test_summary_bullets_length -x -q` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/test_claude_subjective_scorer.py -x -q`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/ -x -q -m "not integration"`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/test_claude_subjective_scorer.py` — covers SS-01 through SS-04 (all new; existing `test_scoring.py` tests the old ScoreResponse shape and should remain passing)

*(Existing test infrastructure: conftest.py, test fixtures, pytest asyncio — all in place. Only the new test file is missing.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `/backend/app/services/claude.py` — current `messages.parse()` call pattern, `output_format`, `parsed_output` attribute
- Direct code read: `/backend/app/services/deterministic_scorer.py` — `FulfillmentResult` model pattern, ConfigDict, alias_generator
- Direct code read: `/backend/app/services/classifier.py` — Phase 27 `messages.parse()` reference pattern
- Direct code read: `/backend/app/models/preferences.py` — `CriterionType`, `DynamicField`, `ImportanceLevel` definitions
- Direct code read: `/backend/app/prompts/scoring.py` — full current prompt logic; all 4 preserved rules identified by line
- Direct code read: `/backend/app/routers/scoring.py` — current `score_listing()` call site and `ScoreResponse` usage
- Direct code read: `/backend/app/models/scoring.py` — `ScoreResponse`, `CategoryScore`, `ChecklistItem` definitions

### Secondary (MEDIUM confidence)
- Direct code read: `/backend/tests/` directory survey — pytest infrastructure confirmed, `asyncio_mode="auto"`, existing `test_scoring.py` mock pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all dependencies confirmed present
- Architecture: HIGH — all call sites and interfaces confirmed by direct code read
- Pitfalls: HIGH — identified by reading actual call sites in `routers/scoring.py` and existing tests
- Prompt preservation: HIGH — all 4 required rules located by line in `prompts/scoring.py`

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable SDK — no fast-moving dependencies)
