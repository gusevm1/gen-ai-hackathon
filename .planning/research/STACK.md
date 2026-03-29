# Technology Stack: Hybrid Scoring Engine (v5.0)

**Project:** HomeMatch
**Researched:** 2026-03-29
**Overall confidence:** HIGH

## Executive Summary

The hybrid scoring engine requires **zero new library additions** to the Python backend. All deterministic formulas (price ratio, distance decay, size range, binary matching) use Python stdlib arithmetic. The existing Pydantic v2.12.5 handles the new response schemas. The existing Anthropic SDK v0.85.0 supports structured outputs on Haiku 4.5 via `messages.parse()`. The frontend needs only TypeScript type changes -- no new packages.

The main work is **schema evolution**, not library addition: a new `ScoreResponse` shape (per-criterion fulfillment list replacing 5-category breakdown), a `criterion_type` field on `DynamicField`, updated `IMPORTANCE_WEIGHT_MAP` values (5/3/2/1 replacing 90/70/50/30), and a `schema_version` field for cache invalidation.

## Recommended Stack Changes

### Summary Table

| Library/Tool | Version | Purpose | Rationale |
|-------------|---------|---------|-----------|
| Python stdlib (`math`, `round`, `max`) | 3.x | Deterministic fulfillment formulas | All formulas are 5-15 lines of basic arithmetic. `max(0, 1 - x/y)` and `round(x, 1)` need no external library. |
| Pydantic v2 (existing) | 2.12.5 | New `ScoreResponse` + `CriterionResult` + `ClaudeSubjectiveResponse` models | Already installed. Supports `float` fields with `ge=0.0, le=1.0`, `Literal` union types, `model_validator` for JSONB migration. |
| Anthropic SDK (existing) | 0.85.0 | `messages.parse()` with new `ClaudeSubjectiveResponse` schema | Already installed. Structured outputs GA on Haiku 4.5. `output_format` parameter still works in `.parse()` helper. |
| TypeScript types (code change) | -- | Update `ScoreResponse` interface in extension + web | No new npm packages. Shape change from `categories[]` + `checklist[]` to `criteria[]`. |

### No New Libraries Needed

| Question | Answer | Rationale |
|----------|--------|-----------|
| Python math/formula libraries? | **No. Use stdlib.** | `price_fulfillment = max(0, 1 - (price - budget_max) / budget_max)` is basic arithmetic. Distance decay `max(0, 1 - dist/radius)` is the same. `math.exp()` available in stdlib if exponential decay is ever preferred. No NumPy/SciPy warranted for 5-10 simple formulas. |
| Schema migration tools for Supabase JSONB? | **No. Use Pydantic model_validator migration pattern (already established).** | `DynamicField` already has a `model_validator(mode="before")` migration path in `preferences.py`. Adding `criterion_type` with a default value means old JSONB rows auto-migrate on read. No Alembic or SQL migration tool needed -- the JSONB column is schemaless by design. |
| Pydantic v2 upgrade? | **No. Already on v2.12.5.** | Current version supports all needed patterns: `Literal` types, `Field(ge=0, le=1)` for fulfillment floats, `model_validator` for migration, `ConfigDict` with `alias_generator`. |
| Anthropic SDK upgrade? | **No.** | SDK v0.85.0 supports `messages.parse()` with `output_format`. Structured outputs are GA on Haiku 4.5. The deprecated `output_format` parameter still works in the `.parse()` helper (SDK translates to `output_config.format` internally). |
| Frontend data fetching libraries? | **No. Update TypeScript types only.** | The Next.js analysis page and extension already fetch `ScoreResponse` as JSON from Supabase. Only the TypeScript interface shape changes. |

---

## Specific Implementation Patterns

### 1. New ScoreResponse Schema (Pydantic v2)

**Confidence: HIGH** (verified against existing codebase + Pydantic v2 docs + Anthropic structured output docs)

The new `ScoreResponse` replaces `categories: list[CategoryScore]` and `checklist: list[ChecklistItem]` with a unified `criteria: list[CriterionResult]`.

```python
class CriterionResult(BaseModel):
    """Result for a single scored criterion."""
    name: str = Field(description="Criterion name matching DynamicField.name or built-in label")
    criterion_type: Literal["price", "distance", "size", "binary_feature", "proximity_quality", "subjective"]
    fulfillment: float = Field(ge=0.0, le=1.0, description="0.0 to 1.0 in 0.1 steps")
    importance: Literal["critical", "high", "medium", "low"]
    reasoning: str = Field(description="One-line explanation with data citation")
    source: Literal["deterministic", "llm"] = Field(description="How fulfillment was computed")

class ScoreResponse(BaseModel):
    """Hybrid scoring response -- deterministic + LLM."""
    overall_score: int = Field(ge=0, le=100)
    match_tier: Literal["excellent", "good", "fair", "poor"]
    summary_bullets: list[str] = Field(min_length=3, max_length=5)
    criteria: list[CriterionResult]
    language: str
    schema_version: int = Field(default=2)
```

**Key design decisions:**

- `fulfillment` as `float` with `ge=0.0, le=1.0`: Pydantic v2 validates this natively. The 0.1-step constraint is enforced via `round(x, 1)` in deterministic formulas and via prompt instruction for Claude. Structured outputs support `float` but not step enumeration in the JSON schema.
- `source` field: Enables frontend to distinguish deterministic vs LLM-evaluated criteria. Useful for transparency ("computed" vs "AI assessed" badges).
- `criterion_type` on the result: Lets the frontend group and display criteria by type without re-classifying.
- `categories` and `checklist` removed: The weighted aggregation formula replaces Claude's `overall_score`. No separate category scores -- every criterion is scored equally via fulfillment x weight.

### 2. Claude-Only Response Schema (Separate from Full ScoreResponse)

**Confidence: HIGH**

Claude no longer returns the full `ScoreResponse`. It returns only subjective evaluations. The scoring pipeline assembles the final response.

```python
class SubjectiveCriterionResult(BaseModel):
    """Claude's evaluation of a single subjective criterion."""
    name: str = Field(description="Criterion name, must match exactly one of the provided criterion names")
    fulfillment: float = Field(ge=0.0, le=1.0, description="How well the listing meets this criterion")
    reasoning: str = Field(description="One-line explanation citing listing data")

class ClaudeSubjectiveResponse(BaseModel):
    """What Claude returns -- only subjective evaluations + summary."""
    criteria: list[SubjectiveCriterionResult]
    summary_bullets: list[str] = Field(min_length=3, max_length=5)
    language: str
```

This is the model passed to `client.messages.parse(output_format=ClaudeSubjectiveResponse)`. It is much smaller than the current `ScoreResponse`, reducing token usage and Claude's cognitive load.

### 3. DynamicField.criterion_type (JSONB Schema Evolution)

**Confidence: HIGH** (verified against existing `model_validator` migration pattern in `preferences.py`)

```python
class CriterionType(str, Enum):
    PRICE = "price"
    DISTANCE = "distance"
    SIZE = "size"
    BINARY_FEATURE = "binary_feature"
    PROXIMITY_QUALITY = "proximity_quality"
    SUBJECTIVE = "subjective"

class DynamicField(BaseModel):
    # ... existing fields (name, value, importance) ...
    criterion_type: CriterionType = CriterionType.SUBJECTIVE  # default = subjective
```

**No SQL migration needed.** Existing JSONB rows without `criterion_type` deserialize with the default `"subjective"` via Pydantic's default mechanism. The existing `model_validator(mode="before")` pattern in `UserPreferences` already handles missing fields.

Classification logic runs at **profile save time** in the web app's preferences API endpoint, NOT at scoring time. The classifier examines the field name/value and assigns the appropriate type. This keeps the scoring hot path simple.

### 4. Weight Map Update

**Confidence: HIGH** (specified in milestone requirements)

```python
# OLD (used as prompt hints for Claude's internal weighting)
IMPORTANCE_WEIGHT_MAP = {
    ImportanceLevel.CRITICAL: 90,
    ImportanceLevel.HIGH: 70,
    ImportanceLevel.MEDIUM: 50,
    ImportanceLevel.LOW: 30,
}

# NEW (used in actual weighted aggregation formula)
IMPORTANCE_WEIGHT_MAP = {
    ImportanceLevel.CRITICAL: 5,
    ImportanceLevel.HIGH: 3,
    ImportanceLevel.MEDIUM: 2,
    ImportanceLevel.LOW: 1,
}
```

Same dict location, different values. The old values were arbitrary numbers passed to Claude. The new values are the actual weights in the aggregation formula: `score = (sum(weight * fulfillment) / sum(weights)) * 100`.

### 5. Score Cache Version Bump

**Confidence: HIGH**

Currently there is NO cache version field. Old cached analyses have the v1 `ScoreResponse` shape (with `categories`, `checklist`, Claude-generated `overall_score`). The new shape is incompatible.

**Approach:** Add `schema_version` to the `breakdown` JSONB when saving:

```python
score_data["schema_version"] = 2  # v5.0 hybrid scoring
```

On cache read in the scoring router, check `schema_version`. If absent or < 2, treat as cache miss (force re-score). This avoids the complexity of migrating old cached analyses, which have low value anyway.

The `save_analysis` method in `supabase.py` also references `score_data["overall_score"]` for the top-level `score` column in the `analyses` table. This still works because `overall_score` remains a field in the new schema (just computed deterministically instead of by Claude).

### 6. Frontend TypeScript Type Changes

**Confidence: HIGH** (verified against `extension/src/types/scoring.ts` and web components)

```typescript
// NEW -- replaces CategoryScore + ChecklistItem
interface CriterionResult {
  name: string;
  criterion_type: 'price' | 'distance' | 'size' | 'binary_feature' | 'proximity_quality' | 'subjective';
  fulfillment: number; // 0.0 - 1.0
  importance: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  source: 'deterministic' | 'llm';
}

interface ScoreResponse {
  overall_score: number;
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[];
  criteria: CriterionResult[];  // replaces categories[] + checklist[]
  language: string;
  schema_version?: number;
}
```

**Affected frontend files (verified by grep):**

| File | Change Needed |
|------|---------------|
| `extension/src/types/scoring.ts` | Replace `CategoryScore`, `ChecklistItem`, `ScoreResponse` interfaces |
| `web/src/components/analysis/CategoryBreakdown.tsx` | Rewrite to render `CriterionResult[]` grouped by type |
| `web/src/components/analysis/ChecklistSection.tsx` | Merge into criterion list display (or remove, since checklist is now part of criteria) |
| `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` | Adapt to new `ScoreResponse.criteria` shape |
| `extension/src/entrypoints/content/components/SummaryPanel.tsx` | Adapt to new shape |
| `extension/src/entrypoints/content/components/ScoreBadge.tsx` | **No change** -- uses `overall_score` and `match_tier` which are unchanged |
| `web/src/app/(dashboard)/analyses/page.tsx` | **No change** -- reads top-level `score` column, not `breakdown` JSONB |

No new npm packages needed. No new data fetching patterns. The same Supabase query returns the `breakdown` JSONB, which now has a different internal shape.

---

## Deterministic Formula Functions (stdlib only)

All formulas are pure Python, no dependencies. Each is a standalone function returning `float` in [0.0, 1.0]:

| Formula | Inputs | Logic | Notes |
|---------|--------|-------|-------|
| `price_fulfillment` | listing price, budget_min, budget_max | Within range = 1.0; over budget = linear decay `max(0, 1 - overshoot/budget_max)` | Uses basic arithmetic only |
| `distance_fulfillment` | listing distance to target, max_radius | `max(0, 1 - dist/radius)` | Linear decay. `math.exp()` available if exponential preferred later. |
| `size_fulfillment` | listing sqm/rooms, user min/max | Within range = 1.0; outside = linear decay based on shortfall | Same pattern as price |
| `binary_feature_fulfillment` | listing attributes, required feature | 1.0 if present, 0.0 if absent | Lookup in `listing.attributes[].name` |
| `proximity_quality_fulfillment` | distance + rating from nearby_places cache | `distance_decay * (1 + rating_bonus)` clamped to [0, 1] | Combines two existing data sources |

Using `round(x, 1)` snaps results to 0.1 steps. Using `max(0.0, ...)` clamps to non-negative. All stdlib.

---

## What NOT to Add

| Library/Tool | Why NOT |
|--------------|---------|
| **NumPy / SciPy** | The formulas are 5 lines of arithmetic each. `max(0, 1 - x/y)` does not need a 30MB dependency. |
| **Alembic / SQL migration tools** | The DB schema (SQL columns) does not change. JSONB content evolves via Pydantic defaults. Alembic for a hackathon project with schemaless JSONB is over-engineering. |
| **Redis / caching layer** | Score caching already works via Supabase `analyses` table with `schema_version` check. Adding Redis adds infrastructure with no benefit at current scale. |
| **Celery / task queues** | Scoring is synchronous request-response. The user clicks FAB and waits. No background processing needed. |
| **Instructor library** | Already using Anthropic's native `messages.parse()` with Pydantic. Instructor adds an abstraction layer over something that works. |
| **JSON Schema migration libraries** | `schema_version` check + re-score is simpler than migrating old JSONB. |
| **Pandas** | No tabular data processing needed. Weighted average is one list comprehension. |
| **jsonschema / fastjsonschema** | Pydantic handles all validation. Adding a separate JSON schema validator is redundant. |
| **New Anthropic SDK version** | v0.85.0 works. The `output_format` -> `output_config.format` migration is handled internally by the SDK's `.parse()` helper. No breaking change until Anthropic removes the convenience parameter. |

---

## Integration Notes

### Anthropic SDK: `output_format` Status

The existing code uses `client.messages.parse(output_format=ScoreResponse)`. Per official Anthropic docs (verified 2026-03-29):

- `output_format` has moved to `output_config.format` at the raw API level
- The SDK's `.parse()` **helper method still accepts `output_format` as a convenience parameter** and translates internally
- The old beta header `structured-outputs-2025-11-13` is no longer needed -- structured outputs are GA
- Haiku 4.5 is confirmed supported for structured outputs

**Action:** Continue using `output_format` in `.parse()`. Optionally migrate to `output_config` syntax, but not required or urgent.

### Structured Output Schema Change = Automatic API Cache Bust

From Anthropic docs: "Changing the `output_config.format` parameter will invalidate any prompt cache for that conversation thread." Since the Pydantic model sent to Claude changes (from `ScoreResponse` to `ClaudeSubjectiveResponse`), Anthropic's server-side prompt cache is automatically invalidated. No manual cache-busting needed on the API side.

### Application-Level Cache Invalidation

The `schema_version` field in the `breakdown` JSONB handles cache invalidation for stored scores in the `analyses` table. The scoring router's cache lookup (lines 43-54 of `backend/app/routers/scoring.py`) should add a version check:

```python
if cached:
    if cached.get("schema_version", 1) >= 2:
        return ScoreResponse.model_validate(cached)
    # else: cache miss, re-score with new pipeline
```

### Scoring Pipeline Architecture Change

The current pipeline is a single Claude call that returns everything. The new pipeline splits into three phases:

1. **Classify** -- separate criteria into deterministic vs subjective (using `criterion_type` from `DynamicField`)
2. **Compute** -- run deterministic formulas for price/distance/size/binary/proximity criteria
3. **Evaluate** -- send only subjective criteria to Claude via `messages.parse(output_format=ClaudeSubjectiveResponse)`
4. **Aggregate** -- combine all `CriterionResult`s, compute weighted `overall_score`, determine `match_tier`

This reduces Claude's workload significantly (fewer criteria to evaluate, no numeric score generation) and makes deterministic criteria instantly reproducible.

### DynamicField Classification Timing

Classification happens at **profile save time**, not scoring time:
1. Web app preferences form submits to API
2. API classifies each `DynamicField.name`/`DynamicField.value` to set `criterion_type`
3. Classification stored in JSONB alongside the field
4. Scoring pipeline reads `criterion_type` and routes accordingly

This means the classifier logic lives in the preferences save endpoint (or a shared utility), not in the scoring service.

### Built-in Criteria (Not from DynamicField)

Some criteria are always present from the structured `UserPreferences` fields (budget, rooms, living_space) rather than from `dynamic_fields`. These are treated as implicit criteria:
- `budget_max` / `budget_min` -> always generates a `price` criterion
- `rooms_min` / `rooms_max` -> always generates a `size` criterion (rooms)
- `living_space_min` / `living_space_max` -> always generates a `size` criterion (sqm)

The `importance` for these comes from `UserPreferences.importance.price`, `.size`, etc. The `dealbreaker` booleans map to `CRITICAL` importance with `fulfillment=0 -> force match_tier="poor"`.

---

## Installation

```bash
# Backend (Python) -- NO NEW PACKAGES
# All formulas use stdlib math/arithmetic
# Pydantic 2.12.5 already installed
# Anthropic SDK 0.85.0 already installed

# Frontend (Next.js) -- NO NEW PACKAGES
# TypeScript type changes only

# Extension (WXT) -- NO NEW PACKAGES
# TypeScript type changes only
```

---

## Sources

- [Anthropic Structured Outputs Docs (GA)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- confirmed Haiku 4.5 support, `output_format` -> `output_config.format` migration path, schema change cache invalidation behavior (HIGH confidence)
- [Pydantic v2 Fields Documentation](https://docs.pydantic.dev/latest/concepts/fields/) -- `ge`/`le` constraints on floats, `Field` descriptor patterns (HIGH confidence)
- [Pydantic v2 Unions Documentation](https://docs.pydantic.dev/latest/concepts/unions/) -- discriminated union patterns with `Literal` (HIGH confidence)
- Existing codebase verified: `backend/app/models/scoring.py` (current ScoreResponse), `backend/app/models/preferences.py` (DynamicField + model_validator pattern), `backend/app/services/claude.py` (messages.parse usage), `backend/app/routers/scoring.py` (cache logic), `backend/app/services/supabase.py` (save_analysis structure) -- all HIGH confidence
- Installed versions verified via `pip show`: Pydantic 2.12.5, Anthropic SDK 0.85.0 (HIGH confidence)
- `backend/requirements.txt`: fastapi, uvicorn, httpx, anthropic, supabase, python-dotenv, pytest, pytest-asyncio (HIGH confidence)

---

*Stack research for: HomeMatch v5.0 -- Hybrid Scoring Engine*
*Researched: 2026-03-29*
