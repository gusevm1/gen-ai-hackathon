# Architecture: Hybrid Deterministic + AI Scoring Engine

**Project:** HomeMatch v5.0
**Researched:** 2026-03-29
**Confidence:** HIGH (all recommendations derived from reading the live codebase)

---

## Design Decisions (Answers to Posed Questions)

### 1. Claude: One call for all subjective criteria, not per-criterion

**Decision:** Single Claude call batching all subjective criteria together.

**Rationale:**
- Current `ClaudeScorer.score_listing()` already makes exactly one `messages.parse()` call. The new architecture should preserve this pattern.
- Per-criterion calls would mean N API round-trips (latency: N x 1-3s) vs one call (1-3s total). For a user with 5 subjective criteria, that is 5-15s vs 1-3s.
- Claude already receives the full listing context (description, images, nearby places). Sending it N times wastes tokens and money.
- Atomicity concern is a non-issue: if any single subjective criterion fails to parse, the whole `messages.parse()` call fails and we retry once. There is no partial-success scenario to handle.

**Implementation:** New Pydantic model `SubjectiveEvaluation` with a `criteria: list[SubjectiveCriterionResult]` field. Claude returns fulfillment (0.0-1.0) + reasoning for each subjective criterion in one structured response. The prompt lists only subjective criteria (deterministic ones are omitted).

### 2. Criterion type classification: At profile save time, backend-side

**Decision:** Backend classifies `criterion_type` when the profile is saved (POST/PUT to profiles endpoint).

**Rationale:**
- Frontend should not own classification logic because it would drift from the backend's scoring pipeline expectations. The backend is the authority on what "distance" vs "proximity_quality" means.
- A separate `/classify` endpoint adds a network round-trip on every profile save for no benefit. Classification is cheap (regex + keyword matching on field name/value) and should run inline.
- The existing `extract_proximity_requirements()` in `proximity.py` already does keyword matching to identify proximity fields. This same pattern extends to classifying price ("CHF", "budget", "Miete"), size ("sqm", "m2", "Zimmer"), and distance fields.
- `criterion_type` is stored on `DynamicField` in the JSONB, so it travels with the profile everywhere (no extra DB query at score time).

**Implementation:** Add `criterion_type: Optional[CriterionType]` to `DynamicField`. Add a `classify_dynamic_fields()` function called in the profile save endpoint (or as a Pydantic model_validator). Unclassified fields default to `subjective`.

### 3. Analyses table migration: Add columns, do not replace

**Decision:** Add `schema_version` (int, default 2) and `fulfillment_data` (JSONB) columns. Keep existing `breakdown` column intact.

**Rationale:**
- Existing cached analyses (v1 schema) should not crash the frontend. A version column lets both backend and frontend branch on schema version.
- The `breakdown` column is used by `save_analysis()` as the full score blob, and `get_analysis()` returns `breakdown` directly. The new `fulfillment_data` stores per-criterion fulfillment details separately from the summary response.
- Replacing `breakdown` would require a data migration of all existing rows, which is unnecessary for a hackathon project with test data.
- Old v1 analyses: `schema_version = 1` (or NULL). Frontend renders them with the old CategoryBreakdown component.
- New v2 analyses: `schema_version = 2`. Frontend renders with new FulfillmentBreakdown component.

**Migration SQL:**
```sql
ALTER TABLE analyses ADD COLUMN schema_version int DEFAULT 1;
ALTER TABLE analyses ADD COLUMN fulfillment_data jsonb;
```

### 4. ScoreResponse versioning: Envelope pattern with schema_version field

**Decision:** Add `schema_version: int` to the `breakdown` JSONB blob. Frontend checks version before rendering.

**Rationale:**
- The frontend already reads `breakdown` as a loosely typed cast (`as { overall_score?: number, ... }`). Adding `schema_version` to this blob is non-breaking.
- The extension's `ScoreResponse` TypeScript interface needs a `schema_version` field added, but all existing fields become optional with fallback defaults (already the case in the analysis page: `breakdown.overall_score ?? analysis.score ?? 0`).
- Backend `ScoreResponse` Pydantic model gets `schema_version: int = 2` with a default, so new responses always carry the version.
- Old cached analyses without `schema_version` are treated as version 1 by convention (undefined = 1).

**Frontend branching:**
```typescript
if (!breakdown.schema_version || breakdown.schema_version === 1) {
  // Render legacy CategoryBreakdown + ChecklistSection
} else {
  // Render new FulfillmentBreakdown
}
```

### 5. Binary features normalization: Direct slug matching, no German translation needed

**Decision:** Direct string matching between `UserPreferences.features[]` and `FlatfoxListing.attributes[].name`. No normalization layer needed for the common case.

**Critical finding:** The Flatfox API returns attribute names as **English-ish slugs** (e.g., `"balconygarden"`, `"petsallowed"`, `"parkingspace"`, `"lift"`, `"dishwasher"`), NOT German strings. The frontend `FEATURE_SUGGESTIONS` in `web/src/lib/constants/features.ts` already uses these exact slugs as values. So user preferences already store the same slug format as the API returns.

**Implementation:**
- Deterministic matching: `feature_slug in {attr.name for attr in listing.attributes}` -- a simple set membership check.
- For features NOT in `FEATURE_SUGGESTIONS` (user-typed free text like "Waschmaschine"), add a small alias map: `{"waschmaschine": "washingmachine", "aufzug": "lift", "balkon": "balconygarden", ...}`. This covers the 10-15 most common German synonyms.
- Claude fallback for fuzzy matching is NOT needed for binary features because the slug set is small and closed. Save Claude for subjective criteria only.

---

## Component Map

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `CriterionType` enum | `backend/app/models/preferences.py` | `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective` |
| `classify_dynamic_fields()` | `backend/app/services/classifier.py` | Regex-based criterion type assignment |
| `DeterministicScorer` | `backend/app/services/deterministic.py` | Computes fulfillment for typed criteria (price, size, distance, binary, proximity_quality) |
| `SubjectiveCriterionResult` | `backend/app/models/scoring.py` | Pydantic model for Claude's per-criterion subjective output |
| `SubjectiveEvaluation` | `backend/app/models/scoring.py` | Pydantic model wrapping list of SubjectiveCriterionResult (Claude output_format) |
| `HybridScorer` | `backend/app/services/hybrid.py` | Orchestrates deterministic + subjective scoring, computes weighted overall_score |
| `FulfillmentResult` | `backend/app/models/scoring.py` | Per-criterion fulfillment (0.0-1.0) + reasoning + source (deterministic/ai) |
| `FEATURE_ALIAS_MAP` | `backend/app/services/deterministic.py` | German-to-slug mapping for binary features |
| `FulfillmentBreakdown` | `web/src/components/analysis/FulfillmentBreakdown.tsx` | v2 analysis page component showing per-criterion fulfillment bars |

### Modified Components

| Component | File | Change |
|-----------|------|--------|
| `DynamicField` | `backend/app/models/preferences.py` | Add `criterion_type: Optional[CriterionType]` field |
| `ScoreResponse` | `backend/app/models/scoring.py` | Replace `categories` with `fulfillments: list[FulfillmentResult]`, add `schema_version`, keep `summary_bullets`/`match_tier`/`checklist` |
| `score_listing()` router | `backend/app/routers/scoring.py` | Replace `claude_scorer.score_listing()` call with `hybrid_scorer.score()` |
| `ClaudeScorer` | `backend/app/services/claude.py` | Add `score_subjective()` method returning `SubjectiveEvaluation`; keep old `score_listing()` temporarily |
| `build_system_prompt()` | `backend/app/prompts/scoring.py` | Remove category scoring instructions, add subjective-only fulfillment instructions |
| `build_user_prompt()` | `backend/app/prompts/scoring.py` | Only include subjective criteria (not deterministic ones) |
| `save_analysis()` | `backend/app/services/supabase.py` | Store `schema_version` and `fulfillment_data` alongside `breakdown` |
| `get_analysis()` | `backend/app/services/supabase.py` | Return `schema_version` so caller can branch |
| `IMPORTANCE_WEIGHT_MAP` | `backend/app/models/preferences.py` | Update to new weights: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 |
| `ScoreResponse` (TS) | `extension/src/types/scoring.ts` | Add `schema_version`, `fulfillments` field, make `categories` optional |
| Analysis page | `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` | Branch on schema_version for v1 vs v2 rendering |
| `CategoryBreakdown` | `web/src/components/analysis/CategoryBreakdown.tsx` | Keep for v1 backward compat |
| `ChecklistSection` | `web/src/components/analysis/ChecklistSection.tsx` | Adapt to show per-criterion fulfillment bars instead of boolean met/not-met |
| Profile save endpoint | Edge function or backend endpoint | Call `classify_dynamic_fields()` before persisting |

### Removed Components

| Component | Reason |
|-----------|--------|
| `CategoryScore` model | Replaced by per-criterion `FulfillmentResult` -- no more 5-category breakdown |
| `Importance` model | Category-level importance replaced by per-criterion importance on `DynamicField` (deprecate, not delete in v5.0) |
| `_format_importance_section()` | No longer needed -- importance is per-criterion, not per-category |

---

## Data Flow (New Architecture)

```
                          Profile Save Flow
                          ================

User edits preferences
        |
        v
Frontend sends profile JSON (with dynamic_fields)
        |
        v
Backend profile endpoint (or edge function)
        |
        v
classify_dynamic_fields(dynamic_fields) -----> Adds criterion_type to each DynamicField
        |
        v
Save to Supabase profiles.preferences JSONB (now includes criterion_type per field)


                          Scoring Flow
                          ============

POST /score (listing_id, user_id, profile_id, preferences)
        |
        v
  [Cache check] -----> Hit? Check schema_version.
        |                    v1 cached? Return as-is (frontend handles legacy rendering)
        |                    v2 cached? Return as-is
        |
        v (miss)
  Fetch listing from Flatfox API
        |
        v
  Geocode if needed (existing)
        |
        v
  Fetch proximity data (existing, for proximity_quality criteria)
        |
        v
  Fetch listing images (existing)
        |
        v
  Parse preferences -> UserPreferences (with criterion_type on each DynamicField)
        |
        +--------> DeterministicScorer.score(listing, preferences, nearby_data)
        |               |
        |               +---> Built-in fields:
        |               |       price criteria:     fulfillment from budget_min/max vs listing price
        |               |       size criteria:       fulfillment from rooms_min/max, living_space_min/max
        |               |       floor_preference:    fulfillment from listing.floor
        |               |
        |               +---> Typed dynamic_fields:
        |               |       distance criteria:   distance_decay(haversine(listing, target), threshold)
        |               |       binary_feature:      slug in listing.attributes
        |               |       proximity_quality:   distance_decay * rating_bonus(nearby_data)
        |               |       price (dynamic):     budget formula
        |               |       size (dynamic):      range formula
        |               |
        |               v
        |           list[FulfillmentResult] (source="deterministic")
        |
        +--------> ClaudeScorer.score_subjective(listing, subjective_criteria, images, nearby_data)
        |               |
        |               v (single messages.parse() call)
        |           SubjectiveEvaluation
        |               |
        |               v
        |           list[FulfillmentResult] (source="ai")
        |
        v
  HybridScorer.aggregate(deterministic_results + subjective_results)
        |
        +---> Weighted average: sum(f_i * w_i) / sum(w_i)  (scale 0-100)
        |         where w_i = {CRITICAL:5, HIGH:3, MEDIUM:2, LOW:1}
        |
        +---> CRITICAL override: if any CRITICAL criterion has f=0.0 -> match_tier = "poor"
        |
        +---> Missing data: skip criterion (omit from both numerator and denominator)
        |
        +---> match_tier from computed score: >=80 excellent, >=60 good, >=40 fair, <40 poor
        |
        v
  Build ScoreResponse v2 (schema_version=2, fulfillments, summary_bullets, match_tier)
        |
        v
  Save to Supabase analyses table
        |   - breakdown: full ScoreResponse dict (as before)
        |   - schema_version: 2
        |   - fulfillment_data: per-criterion details
        |   - score: overall_score int (for sorting/filtering)
        |
        v
  Return ScoreResponse
```

---

## Deterministic Fulfillment Formulas

### Price Fulfillment
```python
def price_fulfillment(listing_price: int | None, budget_min: int | None, budget_max: int | None) -> float | None:
    if listing_price is None:
        return None  # skip -- missing data
    if budget_max and listing_price > budget_max:
        overshoot = (listing_price - budget_max) / budget_max
        return max(0.0, 1.0 - overshoot * 2)  # linear decay, 0 at 50% over
    if budget_min and listing_price < budget_min:
        return 0.8  # under budget is still good, slight penalty for suspicion
    return 1.0  # within range
```

### Size / Rooms Fulfillment
```python
def range_fulfillment(actual: float | None, pref_min: float | None, pref_max: float | None) -> float | None:
    if actual is None:
        return None  # skip
    if pref_min and actual < pref_min:
        shortfall = (pref_min - actual) / pref_min
        return max(0.0, 1.0 - shortfall * 2)
    if pref_max and actual > pref_max:
        return 0.9  # over max is usually fine for size
    return 1.0
```

### Distance Fulfillment
```python
def distance_fulfillment(distance_km: float, threshold_km: float) -> float:
    if distance_km <= threshold_km:
        return 1.0
    overshoot = (distance_km - threshold_km) / threshold_km
    return max(0.0, 1.0 - overshoot)  # linear decay to 0 at 2x threshold
```

### Binary Feature Fulfillment
```python
def binary_feature_fulfillment(feature_slug: str, listing_attributes: set[str]) -> float:
    normalized = FEATURE_ALIAS_MAP.get(feature_slug.lower(), feature_slug.lower())
    return 1.0 if normalized in listing_attributes else 0.0
```

### Proximity Quality Fulfillment
```python
def proximity_quality_fulfillment(nearby_places: list[dict], threshold_km: float) -> float:
    if not nearby_places:
        return 0.0
    nearest = min(nearby_places, key=lambda p: p.get("distance_km", float("inf")))
    dist = nearest.get("distance_km")
    if dist is None:
        return 0.5  # found but distance unknown
    dist_score = distance_fulfillment(dist, threshold_km)
    rating = nearest.get("rating")
    rating_bonus = (rating / 5.0) * 0.2 if rating else 0.0  # up to +0.2 for 5-star
    return min(1.0, dist_score + rating_bonus)
```

---

## Key Schema Changes

### CriterionType Enum (new)
```python
class CriterionType(str, Enum):
    DISTANCE = "distance"
    PRICE = "price"
    SIZE = "size"
    BINARY_FEATURE = "binary_feature"
    PROXIMITY_QUALITY = "proximity_quality"
    SUBJECTIVE = "subjective"
```

### DynamicField (updated)
```python
class DynamicField(BaseModel):
    name: str
    value: str = ""
    importance: ImportanceLevel = ImportanceLevel.MEDIUM
    criterion_type: Optional[CriterionType] = None  # NEW -- set at profile save time
```

### FulfillmentResult (new)
```python
class FulfillmentResult(BaseModel):
    criterion: str                    # field name from DynamicField or built-in name
    criterion_type: CriterionType     # how it was evaluated
    fulfillment: Optional[float]      # 0.0-1.0, None if data missing (skip in aggregation)
    importance: ImportanceLevel       # from DynamicField or built-in mapping
    reasoning: list[str]              # 1-3 bullet points explaining the score
    source: Literal["deterministic", "ai"]  # who computed this
```

### ScoreResponse v2 (updated)
```python
class ScoreResponse(BaseModel):
    schema_version: int = 2
    overall_score: int               # 0-100, computed by HybridScorer
    match_tier: Literal["excellent", "good", "fair", "poor"]
    summary_bullets: list[str]       # from Claude (subjective summary of the full listing)
    fulfillments: list[FulfillmentResult]  # replaces categories
    checklist: list[ChecklistItem]   # kept for binary features display
    language: str
```

### SubjectiveEvaluation (Claude output -- new)
```python
class SubjectiveCriterionResult(BaseModel):
    criterion: str                    # must match the criterion name from the prompt
    fulfillment: float = Field(ge=0.0, le=1.0)
    reasoning: list[str] = Field(min_length=1, max_length=3)

class SubjectiveEvaluation(BaseModel):
    criteria: list[SubjectiveCriterionResult]
    summary_bullets: list[str] = Field(min_length=3, max_length=5)
```

---

## Handling Built-in Preferences (budget, rooms, living_space)

The current architecture has a subtle gap: `budget_min/max`, `rooms_min/max`, and `living_space_min/max` are top-level fields on `UserPreferences`, NOT `DynamicField` entries. They need to participate in the new per-criterion fulfillment system.

**Recommendation:** The `HybridScorer` synthesizes virtual `FulfillmentResult` entries for these built-in fields:

| Built-in Field | Criterion Name | Type | Importance Source |
|---------------|----------------|------|-------------------|
| budget_min/max | "Price/Budget" | `price` | `budget_dealbreaker=true` -> CRITICAL, else `preferences.importance.price` |
| rooms_min/max | "Room Count" | `size` | `rooms_dealbreaker=true` -> CRITICAL, else `preferences.importance.size` |
| living_space_min/max | "Living Space" | `size` | `living_space_dealbreaker=true` -> CRITICAL, else `preferences.importance.size` |
| floor_preference | "Floor" | `binary_feature` | LOW (minor preference unless user adds a dynamic field with higher importance) |

This avoids migrating built-in fields into dynamic_fields (which would break the frontend preferences form). The built-in fields are evaluated deterministically without being dynamic_fields.

---

## Suggested Build Order

Dependencies flow downward. Each phase can be built and tested independently.

### Phase 1: Data Model + Classifier
**Files:** `models/preferences.py`, `services/classifier.py`
**What:**
- Add `CriterionType` enum and `criterion_type` field to `DynamicField`
- Write `classify_dynamic_fields()` function with regex/keyword patterns
- Wire into profile save flow (so new/updated profiles get criterion_type on each dynamic field)
- Write unit tests for classifier (price keywords, distance patterns, amenity keywords, subjective fallback)
- Update `IMPORTANCE_WEIGHT_MAP` to new weights: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1

**Why first:** Everything downstream depends on criterion_type being present on dynamic fields. This is the foundation.

### Phase 2: Deterministic Scorer + New Models
**Files:** `services/deterministic.py`, `models/scoring.py`
**What:**
- Add `FulfillmentResult`, `SubjectiveCriterionResult`, `SubjectiveEvaluation` Pydantic models
- Implement `DeterministicScorer` with the five fulfillment formulas
- Implement built-in field fulfillment (budget, rooms, living_space, floor)
- Add `FEATURE_ALIAS_MAP` for German synonyms
- Unit tests: price over/under/within budget, size range, distance decay, binary feature matching, proximity quality

**Why second:** Can be fully tested without touching Claude or the API. Pure functions.

### Phase 3: Subjective Scorer (Claude refactor)
**Files:** `services/claude.py`, `prompts/scoring.py`
**What:**
- Add `score_subjective()` method to `ClaudeScorer` accepting only subjective criteria
- Rewrite system/user prompts: remove category scoring instructions, instruct Claude to return fulfillment (0.0-1.0) per criterion
- Keep existing `score_listing()` method temporarily for rollback safety
- Integration test with mock Claude response

**Why third:** Depends on models from Phase 2. Can test with mocked Claude responses.

### Phase 4: Hybrid Scorer + Router Integration
**Files:** `services/hybrid.py`, `routers/scoring.py`, `models/scoring.py`
**What:**
- Implement `HybridScorer.score()` orchestrating deterministic + subjective
- Weighted aggregation formula with CRITICAL f=0 override
- Missing data skip logic
- Update `ScoreResponse` to v2 schema (add `schema_version`, `fulfillments`)
- Update `score_listing()` router to call `HybridScorer`
- Update `save_analysis()` / `get_analysis()` for new columns
- End-to-end integration test

**Why fourth:** Depends on both deterministic and subjective scorers being ready.

### Phase 5: Database Migration + Cache Versioning
**Files:** Supabase SQL migration, `services/supabase.py`
**What:**
- ALTER TABLE to add `schema_version` and `fulfillment_data` columns
- Old v1 analyses coexist with new v2 analyses (no data migration needed)
- Frontend can still display old v1 cached scores via backward-compat rendering

**Why fifth:** The SQL is independent but testing requires Phase 4 to produce v2 responses.

### Phase 6: Frontend Consumers
**Files:** Web analysis page, extension types, new FulfillmentBreakdown component
**What:**
- Add `schema_version` check to analysis page rendering
- Build `FulfillmentBreakdown` component (per-criterion bars with fulfillment %, source badge, importance indicator)
- Update extension `ScoreResponse` TypeScript interface
- Keep `CategoryBreakdown` for v1 backward compat

**Why last:** Pure consumer of backend changes. No blocking dependencies except the final v2 response shape.

---

## What Claude Still Does vs What It Does Not

| Responsibility | Before (v1) | After (v2) |
|---------------|-------------|------------|
| Overall score (0-100) | Claude generates | Python computes from weighted fulfillments |
| match_tier | Claude assigns | Python derives from score + CRITICAL override |
| Category scores (5 categories) | Claude generates | REMOVED -- replaced by per-criterion fulfillments |
| Subjective criteria evaluation | Claude (as part of full scoring) | Claude (isolated, returns fulfillment 0.0-1.0 per criterion) |
| Summary bullets | Claude generates | Claude generates (kept -- valuable for UX) |
| Price evaluation | Claude compares numbers | Python deterministic formula |
| Size evaluation | Claude compares numbers | Python deterministic formula |
| Binary feature matching | Claude checks listing text | Python set membership check |
| Proximity evaluation | Claude reads injected data section | Python distance_decay + rating_bonus formula |
| Image analysis for condition | Claude with vision | Claude (still needed, via subjective scorer if user has condition-related criteria) |

---

## Open Questions Resolved

1. **"Should Claude be called once or per-criterion?"** -- Once. See Decision 1.
2. **"Where does criterion_type live?"** -- On DynamicField, classified at profile save time. See Decision 2.
3. **"How to migrate analyses table?"** -- Add columns, don't replace. See Decision 3.
4. **"How to version ScoreResponse?"** -- schema_version field in breakdown JSONB. See Decision 4.
5. **"How to normalize binary features?"** -- Direct slug matching (Flatfox uses English slugs). Small alias map for German free-text. See Decision 5.

## Remaining Open Questions

- **Summary bullets when zero subjective criteria:** Should Claude still be called? Recommendation: Yes -- pass deterministic results as context and ask Claude for a natural-language summary. The UX value of human-readable bullets justifies one cheap API call even when all scoring is deterministic.
- **Existing `Importance` model deprecation:** The per-category importance (location/price/size/features/condition) is superseded by per-criterion importance on DynamicField. Keep through v5.0 for built-in field importance mapping (price importance -> budget fulfillment weight). Remove in v6.0 after full frontend migration to per-criterion importance.
- **Floor preference + availability:** These built-in preferences should be scored as binary/range deterministic checks in HybridScorer, similar to budget/rooms/living_space handling. Low complexity, high completeness.

---

## Sources

- Direct codebase analysis (HIGH confidence):
  - `backend/app/models/scoring.py` -- current ScoreResponse, CategoryScore, ChecklistItem models
  - `backend/app/models/preferences.py` -- DynamicField, UserPreferences, ImportanceLevel, IMPORTANCE_WEIGHT_MAP
  - `backend/app/services/claude.py` -- ClaudeScorer.score_listing(), messages.parse() pattern
  - `backend/app/services/proximity.py` -- extract_proximity_requirements(), distance computation, keyword matching
  - `backend/app/routers/scoring.py` -- full scoring pipeline orchestration
  - `backend/app/prompts/scoring.py` -- system/user prompt templates, dealbreaker rules
  - `backend/app/models/listing.py` -- FlatfoxListing.attributes, FlatfoxAttribute.name
  - `backend/app/services/supabase.py` -- get_analysis(), save_analysis(), breakdown JSONB storage
  - `web/src/lib/constants/features.ts` -- FEATURE_SUGGESTIONS with Flatfox slug values
  - `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` -- frontend breakdown consumption pattern
  - `extension/src/types/scoring.ts` -- TypeScript ScoreResponse interface, TIER_COLORS
  - `backend/tests/conftest.py` -- sample listing attributes: "garage", "balconygarden", "parkingspace", etc.
