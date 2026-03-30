# Phase 31: Hybrid Scorer & Router Integration - Research

**Researched:** 2026-03-30
**Domain:** FastAPI scoring pipeline integration, weighted aggregation, cache versioning
**Confidence:** HIGH

## Summary

Phase 31 is the integration phase that wires together all previously-built components (Phases 27-30) into a working scoring pipeline. The scoring router (`backend/app/routers/scoring.py`) must be rewritten to: (1) look up pre-computed ListingProfile data from Supabase, (2) adapt it to FlatfoxListing format so the Phase 28 deterministic scorer runs unmodified, (3) route subjective criteria through the Phase 29 OpenRouter scorer, (4) aggregate all fulfillment results via weighted average, (5) apply CRITICAL override rules, (6) return a ScoreResponse v2 with `schema_version: 2`, and (7) gracefully degrade when no ListingProfile exists.

This is primarily a code integration phase -- no new libraries are needed. All building blocks exist: `deterministic_scorer.py` (Phase 28), `claude.py` subjective scorer (Phase 29), `listing_profile_db.py` (existing), `IMPORTANCE_WEIGHT_MAP` (Phase 27), and the DB migrations (Phase 30). The work is: writing `profile_adapter.py`, rewriting the scoring router, updating `ScoreResponse` and cache logic, updating the edge function, and updating the OpenRouter model constant.

**Primary recommendation:** Structure the implementation as three plans: (1) profile adapter + ScoreResponse v2 model + aggregation engine, (2) scoring router rewrite + ALLOW_CLAUDE_FALLBACK gating + OpenRouter model update, (3) cache version gating in both backend and edge function.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INT-03 | ListingProfile lookup + adapter converts to FlatfoxListing format for deterministic scorer | New `profile_adapter.py` module; field mapping documented below in Architecture Patterns |
| INT-04 | ALLOW_CLAUDE_FALLBACK=false + no ListingProfile -> return enrichment_status="unavailable" | Env var gating in scoring router; new field on ScoreResponse |
| INT-05 | OpenRouter model constant updated to google/gemini-2.5-flash-lite | Single-line change in `openrouter.py` (line 31) |
| HA-01 | Weighted average: score = (sum weight*fulfillment) / (sum weights) * 100 | IMPORTANCE_WEIGHT_MAP already exists in preferences.py; aggregation function documented below |
| HA-02 | None fulfillment excluded from both numerator and denominator | FulfillmentResult.fulfillment is Optional[float]; filter before aggregation |
| HA-03 | CRITICAL f=0 forces match_tier="poor" and caps score at 39 | Post-aggregation check; uses ImportanceLevel.CRITICAL + IMPORTANCE_WEIGHT_MAP |
| HA-04 | ScoreResponse v2: schema_version=2, criteria_results list, no categories, field names preserved | Update ScoreResponse model; add CriterionResult model; add schema_version + enrichment_status fields |
| DB-02 | Cache reads reject schema_version < 2; edge function cache also checks | Backend: check breakdown.schema_version in get_analysis; Edge: add schema_version check before returning cached |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | existing | Scoring endpoint | Already in use |
| Pydantic v2 | existing | Model validation, ScoreResponse v2 | Already in use; ConfigDict + alias_generator pattern |
| supabase-py | existing | ListingProfile lookup, cache reads/writes | Already in use via SupabaseService singleton |
| httpx | existing | OpenRouter calls (via claude.py scorer) | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| asyncio | stdlib | to_thread for sync Supabase calls | Wrap all supabase_service and listing_profile_db calls |
| math | stdlib | Exponential decay formulas (already in deterministic_scorer) | Already imported |

### Alternatives Considered
None -- this is purely integration of existing components. No new dependencies needed.

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
├── models/
│   ├── scoring.py              # UPDATE: ScoreResponse v2 + CriterionResult model
│   ├── listing_profile.py      # UNCHANGED: ListingProfile model
│   └── listing.py              # UNCHANGED: FlatfoxListing model
├── services/
│   ├── profile_adapter.py      # NEW: ListingProfile -> FlatfoxListing conversion
│   ├── hybrid_scorer.py        # NEW: Aggregation engine (weighted average + CRITICAL override)
│   ├── deterministic_scorer.py # UNCHANGED: Phase 28 scorer
│   ├── claude.py               # MINOR: Rename singleton (optional), already uses OpenRouter
│   ├── openrouter.py           # UPDATE: Model constant change (line 31)
│   ├── listing_profile_db.py   # UNCHANGED: get_listing_profile()
│   └── supabase.py             # UPDATE: get_analysis adds schema_version check
├── routers/
│   └── scoring.py              # REWRITE: Full pipeline orchestration
supabase/functions/
└── score-proxy/index.ts        # UPDATE: Add schema_version cache check
```

### Pattern 1: Profile Adapter (INT-03)

**What:** Converts a `ListingProfile` into a `FlatfoxListing` so the Phase 28 deterministic scorer functions work unmodified. The deterministic scorer takes `FlatfoxListing` as input -- rather than refactoring all scorer functions to accept ListingProfile, we create an adapter.

**When to use:** Every time a ListingProfile is found in Supabase and needs to be scored.

**Key field mappings (ListingProfile -> FlatfoxListing):**

```python
# profile_adapter.py
from app.models.listing import FlatfoxAttribute, FlatfoxListing
from app.models.listing_profile import ListingProfile


def adapt_profile_to_listing(profile: ListingProfile) -> FlatfoxListing:
    """Convert a ListingProfile to a FlatfoxListing for deterministic scorer.

    The deterministic scorer (Phase 28) expects FlatfoxListing. Rather than
    modify all scorer functions, we adapt the ListingProfile fields.
    """
    return FlatfoxListing(
        pk=profile.listing_id,
        slug=profile.slug,
        url=f"https://flatfox.ch/en/flat/{profile.slug}/",
        short_url=f"https://flatfox.ch/en/flat/{profile.slug}/",
        status="ACTIVE",
        offer_type=profile.offer_type,
        object_category=profile.object_category,
        object_type=profile.object_type,
        # Pricing
        price_display=profile.price,
        rent_net=profile.rent_net,
        rent_charges=profile.rent_charges,
        rent_gross=profile.price if profile.offer_type == "RENT" else None,
        # Titles
        description_title=profile.title,
        description=profile.description,
        # Dimensions
        surface_living=profile.sqm,
        number_of_rooms=str(profile.rooms) if profile.rooms is not None else None,
        floor=profile.floor,
        # Location
        street=profile.address,
        zipcode=profile.zipcode,
        city=profile.city,
        latitude=profile.latitude,
        longitude=profile.longitude,
        state=profile.canton,
        country=profile.country,
        # Features -- convert list[str] to list[FlatfoxAttribute]
        attributes=[FlatfoxAttribute(name=attr) for attr in profile.attributes],
        is_furnished=profile.is_furnished,
        is_temporary=profile.is_temporary,
        # Dates
        year_built=profile.year_built,
        year_renovated=profile.year_renovated,
        moving_date=profile.moving_date,
        moving_date_type=profile.moving_date_type,
    )
```

**Critical detail:** `ListingProfile.attributes` is `list[str]` (e.g., `["balcony", "parking"]`) while `FlatfoxListing.attributes` is `list[FlatfoxAttribute]`. The adapter must wrap each string in `FlatfoxAttribute(name=attr)`. The deterministic scorer's `score_binary_feature` accesses `listing.attributes` as `{attr.name.strip().lower() for attr in listing.attributes}`, so this wrapping is essential.

**Critical detail:** `ListingProfile.rooms` is `Optional[float]` while `FlatfoxListing.number_of_rooms` is `Optional[str]` (e.g., "3.5"). Must convert with `str()`.

### Pattern 2: Proximity Data Adapter

**What:** The deterministic scorer's `score_proximity_quality()` expects `proximity_data: dict[str, list[dict]]` keyed by field name. The ListingProfile stores amenities as `dict[str, AmenityCategory]` with structured `AmenityResult` objects. Need to bridge.

**When to use:** When converting ListingProfile amenity data for proximity scoring.

```python
def adapt_profile_amenities(profile: ListingProfile) -> dict[str, list[dict]]:
    """Convert ListingProfile amenities to the format score_proximity_quality expects.

    score_proximity_quality expects: dict[str, list[dict]] where each dict has
    "distance_km", "rating", "is_fallback" keys.
    """
    result: dict[str, list[dict]] = {}
    for category, amenity_cat in profile.amenities.items():
        result[category] = [
            {
                "name": r.name,
                "distance_km": r.distance_km,
                "rating": r.rating,
                "review_count": r.review_count,
                "address": r.address,
                "is_fallback": False,  # Pre-computed data is never fallback
            }
            for r in amenity_cat.results
        ]
    return result
```

### Pattern 3: Weighted Aggregation Engine (HA-01, HA-02, HA-03)

**What:** Computes final score from list of FulfillmentResults. Excludes None fulfillment. Applies CRITICAL override.

```python
from app.models.preferences import IMPORTANCE_WEIGHT_MAP, ImportanceLevel
from app.services.deterministic_scorer import FulfillmentResult


def compute_weighted_score(
    results: list[FulfillmentResult],
) -> tuple[int, str]:
    """Compute weighted average score and match tier.

    Returns (overall_score, match_tier).

    HA-01: score = (sum weight*fulfillment) / (sum weights) * 100
    HA-02: None fulfillment excluded from both numerator and denominator
    HA-03: CRITICAL f=0 forces poor tier, caps at 39
    """
    # HA-03: Check for CRITICAL criterion with f=0
    critical_zero = any(
        r.importance == ImportanceLevel.CRITICAL and r.fulfillment == 0.0
        for r in results
        if r.fulfillment is not None
    )

    # HA-02: Filter to results with non-None fulfillment
    scored = [r for r in results if r.fulfillment is not None]

    if not scored:
        return 0, "poor"

    # HA-01: Weighted average
    numerator = sum(
        IMPORTANCE_WEIGHT_MAP[r.importance] * r.fulfillment
        for r in scored
    )
    denominator = sum(
        IMPORTANCE_WEIGHT_MAP[r.importance]
        for r in scored
    )

    raw_score = round((numerator / denominator) * 100)

    # HA-03: Cap at 39 if CRITICAL criterion not met
    if critical_zero:
        raw_score = min(raw_score, 39)
        return raw_score, "poor"

    # Derive match tier from score
    if raw_score >= 80:
        tier = "excellent"
    elif raw_score >= 60:
        tier = "good"
    elif raw_score >= 40:
        tier = "fair"
    else:
        tier = "poor"

    return raw_score, tier
```

### Pattern 4: ScoreResponse v2 Schema (HA-04)

**What:** Updated ScoreResponse with new fields. Backward compatible field names preserved.

```python
# Added to models/scoring.py

class CriterionResult(BaseModel):
    """Per-criterion result in the v2 ScoreResponse."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    criterion_name: str
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    importance: str  # "critical", "high", "medium", "low"
    weight: int  # Numeric weight (5, 3, 2, 1)
    reasoning: Optional[str] = None


class ScoreResponse(BaseModel):
    """Complete scoring response -- v2 hybrid scorer."""
    overall_score: int = Field(ge=0, le=100)
    match_tier: Literal["excellent", "good", "fair", "poor"]
    summary_bullets: list[str] = Field(min_length=3, max_length=5)
    # v2 fields
    criteria_results: list[CriterionResult] = Field(default_factory=list)
    schema_version: int = Field(default=2)
    enrichment_status: Optional[str] = None  # "available", "unavailable"
    # v1 backward compat (kept but empty for v2)
    categories: list[CategoryScore] = Field(default_factory=list)
    checklist: list[ChecklistItem] = Field(default_factory=list)
    language: str = Field(description="Language code")
```

**Key decisions:**
- `categories` and `checklist` kept as empty lists for v2 (backward compat with any code that accesses them)
- `schema_version: 2` is the discriminator for frontend branching
- `enrichment_status` is only set to `"unavailable"` for the no-ListingProfile case (INT-04)
- Field names `overall_score`, `match_tier`, `summary_bullets` are PRESERVED (HA-04)

### Pattern 5: Scoring Router Pipeline (Full Rewrite)

**What:** The new pipeline orchestrates all components.

```
POST /score request
  |
  +-- 0. Cache check: get_analysis() with schema_version >= 2 filter (DB-02)
  |     Hit? -> return cached
  |
  +-- 1. ListingProfile lookup from Supabase (INT-03)
  |     |
  |     +-- Found: adapt to FlatfoxListing
  |     |     |
  |     |     +-- 2. Run deterministic scorer on all non-subjective criteria
  |     |     +-- 3. Run subjective scorer via OpenRouter (Phase 29)
  |     |     +-- 4. Merge results: deterministic FulfillmentResults + subjective FulfillmentResults
  |     |     +-- 5. Compute weighted score (HA-01/02/03)
  |     |     +-- 6. Build ScoreResponse v2 (HA-04)
  |     |     +-- 7. Save to analyses table with schema_version: 2
  |     |     +-- 8. Return response
  |     |
  |     +-- Not found (INT-04):
  |           |
  |           +-- ALLOW_CLAUDE_FALLBACK=true? -> old Claude pipeline (preserved)
  |           +-- ALLOW_CLAUDE_FALLBACK=false? -> return enrichment_status="unavailable"
```

### Pattern 6: Cache Version Gating (DB-02)

**Backend (supabase.py):**
```python
def get_analysis(self, user_id, profile_id, listing_id):
    result = (
        client.table("analyses")
        .select("breakdown")
        .eq("user_id", user_id)
        .eq("listing_id", listing_id)
        .eq("profile_id", profile_id)
        .maybeSingle()
        .execute()
    )
    if result.data:
        breakdown = result.data.get("breakdown")
        # DB-02: Reject stale v1 cache entries
        if breakdown and breakdown.get("schema_version", 0) >= 2:
            return breakdown
    return None
```

**Edge function (score-proxy/index.ts):**
```typescript
if (cached && !cached.stale) {
  // DB-02: Reject v1 cached entries
  const schemaVersion = cached.breakdown?.schema_version ?? 0;
  if (schemaVersion >= 2) {
    return new Response(JSON.stringify(cached.breakdown), { ... });
  }
  // Fall through to backend for re-scoring
}
```

### Anti-Patterns to Avoid

- **Modifying deterministic_scorer.py to accept ListingProfile directly:** This breaks the clean Phase 28 interface. Use the adapter pattern instead.
- **Running the old Flatfox API fetch + geocoding + proximity pipeline when ListingProfile exists:** The whole point is to avoid this. Only the fallback path should fetch from Flatfox.
- **Setting enrichment_status on successful scores:** Only use `"unavailable"` for the no-profile case. Successful v2 responses should omit it or set `"available"`.
- **Forgetting to exclude proximity_data lookup for adapted listings:** The adapted FlatfoxListing from profile already has all proximity data. Don't re-fetch from Apify.
- **Using f=0.5 for missing data:** Requirement HA-02 explicitly says skip (None), not default. This was a key architecture decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weight mapping | Custom weight dict | `IMPORTANCE_WEIGHT_MAP` from `preferences.py` | Already exists, Phase 27 created it |
| Fulfillment result model | New model | `FulfillmentResult` from `deterministic_scorer.py` | Already exists, Phase 28 created it |
| Subjective scoring | Custom LLM call | `claude_scorer.score_listing()` from `claude.py` | Already exists, Phase 29 created it |
| ListingProfile DB lookup | Custom query | `get_listing_profile()` from `listing_profile_db.py` | Already exists |
| JSON parsing for OpenRouter | Custom parser | `_parse_json_response()` in `claude.py` | Already handles markdown fences |

**Key insight:** This phase is purely integration. Every building block exists. The risk is in the wiring, not the components.

## Common Pitfalls

### Pitfall 1: FlatfoxListing.attributes Type Mismatch
**What goes wrong:** ListingProfile stores attributes as `list[str]` but FlatfoxListing expects `list[FlatfoxAttribute]`. If you pass strings directly, the deterministic scorer's `score_binary_feature` will crash when accessing `.name`.
**Why it happens:** Different serialization decisions between the two models.
**How to avoid:** The profile adapter MUST wrap each string: `FlatfoxAttribute(name=attr)`.
**Warning signs:** `AttributeError: 'str' object has no attribute 'name'` in scoring logs.

### Pitfall 2: number_of_rooms Type Mismatch
**What goes wrong:** ListingProfile stores rooms as `Optional[float]` (e.g., 3.5) but FlatfoxListing stores it as `Optional[str]` (e.g., "3.5"). The deterministic scorer's `synthesize_builtin_results` calls `float(listing.number_of_rooms)` which works with strings but the adapter must convert.
**Why it happens:** Flatfox API returns rooms as a string.
**How to avoid:** Adapter converts: `str(profile.rooms) if profile.rooms is not None else None`.

### Pitfall 3: Edge Function Cache Bypass Forgotten
**What goes wrong:** Backend gets schema_version check but edge function doesn't. Users get stale v1 responses from edge function cache even after backend is updated.
**Why it happens:** Two caching layers exist -- edge function checks BEFORE forwarding to backend.
**How to avoid:** Both `supabase.py:get_analysis()` and `score-proxy/index.ts` must check schema_version.
**Warning signs:** Users see old category-based scores instead of per-criterion fulfillment.

### Pitfall 4: Proximity Data Key Mismatch
**What goes wrong:** User's DynamicField.name might be "Supermarket within 500m" but ListingProfile amenities key is "supermarket". The `score_proximity_quality` function looks up by `field.name` which won't match.
**Why it happens:** The proximity scoring pipeline in the old code uses the DynamicField.name directly as the key. Pre-computed amenities use normalized category keys.
**How to avoid:** The scoring router must map DynamicField names to amenity category keys. Current `fetch_all_proximity_data` already does this mapping -- the adapted pipeline needs similar logic OR the subjective scorer handles proximity criteria that can't be matched deterministically.
**Warning signs:** Proximity criteria always return None fulfillment despite data being in the profile.

### Pitfall 5: Empty summary_bullets on Unavailable Response
**What goes wrong:** When returning `enrichment_status="unavailable"`, the ScoreResponse still requires `min_length=3` for summary_bullets. Returning an empty list causes Pydantic validation failure.
**Why it happens:** ScoreResponse model enforces min_length=3 for summary_bullets.
**How to avoid:** For the "unavailable" path, either relax the summary_bullets constraint (make min_length=0) or generate placeholder bullets like ["Scoring not yet available for this listing's area"].

### Pitfall 6: CRITICAL Override Logic Placement
**What goes wrong:** CRITICAL check is applied before aggregation, causing wrong score.
**Why it happens:** Tempting to short-circuit early.
**How to avoid:** First compute the full weighted average, THEN apply the cap. The cap modifies the score, it doesn't replace the aggregation.

### Pitfall 7: Stale OpenRouter Model in openrouter.py (Layer 3 Gap-Fill)
**What goes wrong:** INT-05 updates the model in claude.py (subjective scorer) but forgets the OTHER OpenRouter client in `openrouter.py` (Layer 3 gap-fill) which still has `google/gemini-2.0-flash-001` on line 31.
**Why it happens:** Two separate OpenRouter clients exist for different purposes.
**How to avoid:** Update BOTH files: `openrouter.py` line 31 AND verify `claude.py` line 39 (already correct).

## Code Examples

### Deterministic Scoring Loop (Scoring all non-subjective criteria)

```python
# Source: deterministic_scorer.py patterns + Phase 27 CriterionType routing
from app.models.preferences import CriterionType, DynamicField
from app.services.deterministic_scorer import (
    FulfillmentResult,
    score_binary_feature,
    score_distance,
    score_price,
    score_proximity_quality,
    score_size,
    synthesize_builtin_results,
)


def score_deterministic_criteria(
    listing: FlatfoxListing,
    preferences: UserPreferences,
    proximity_data: dict[str, list[dict]],
) -> list[FulfillmentResult]:
    """Score all deterministic criteria for a listing."""
    results: list[FulfillmentResult] = []

    # Built-in fields (budget, rooms, living_space) -> DS-06
    results.extend(synthesize_builtin_results(preferences, listing))

    # Dynamic fields routed by criterion_type
    for field in preferences.dynamic_fields:
        ct = field.criterion_type
        fulfillment: Optional[float] = None

        if ct == CriterionType.PRICE:
            fulfillment = score_price(field, listing)
        elif ct == CriterionType.DISTANCE:
            fulfillment = score_distance(field, listing, actual_km=None)  # Need actual_km from proximity
        elif ct == CriterionType.SIZE:
            fulfillment = score_size(field, listing)
        elif ct == CriterionType.BINARY_FEATURE:
            fulfillment = score_binary_feature(field, listing)
        elif ct == CriterionType.PROXIMITY_QUALITY:
            fulfillment = score_proximity_quality(field, listing, proximity_data)
        elif ct == CriterionType.SUBJECTIVE or ct is None:
            continue  # Handled by subjective scorer

        results.append(FulfillmentResult(
            criterion_name=field.name,
            fulfillment=fulfillment,
            importance=field.importance,
        ))

    return results
```

### FulfillmentResult to CriterionResult Conversion

```python
def to_criterion_result(fr: FulfillmentResult) -> CriterionResult:
    """Convert internal FulfillmentResult to API-facing CriterionResult."""
    return CriterionResult(
        criterion_name=fr.criterion_name,
        fulfillment=fr.fulfillment,
        importance=fr.importance.value,
        weight=IMPORTANCE_WEIGHT_MAP[fr.importance],
        reasoning=fr.reasoning,
    )
```

### Unavailable Response (INT-04)

```python
import os

ALLOW_CLAUDE_FALLBACK = os.environ.get("ALLOW_CLAUDE_FALLBACK", "false").lower() == "true"

# In the scoring router, when no ListingProfile exists:
if not ALLOW_CLAUDE_FALLBACK:
    return ScoreResponse(
        overall_score=0,
        match_tier="poor",
        summary_bullets=[
            "Scoring is not yet available for this listing's area.",
            "Pre-computed listing data has not been generated for this property.",
            "Check back later as coverage expands.",
        ],
        criteria_results=[],
        schema_version=2,
        enrichment_status="unavailable",
        categories=[],
        checklist=[],
        language=preferences.language,
    )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude scores every criterion per listing | Deterministic formulas for 5 types, OpenRouter for subjective only | Phase 28-29 (2026-03-30) | ~$0 per scoring vs ~$0.06 per Claude call |
| 5 category scores (location/price/size/features/condition) | Per-criterion fulfillment (0.0-1.0) | Phase 28 (2026-03-30) | More granular, transparent scoring |
| Numeric weights (90/70/50/30) | CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 | Phase 27 (2026-03-29) | Simpler, more meaningful scale |
| Claude generates overall_score | Python computes weighted average | Phase 31 (this phase) | Deterministic, reproducible |
| `google/gemini-2.0-flash-001` | `google/gemini-2.5-flash-lite` | Phase 31 (this phase) | Gemini 2.0 Flash deprecated June 2026 |

**Deprecated/outdated:**
- `openrouter.py` OPENROUTER_MODEL constant: Still set to `google/gemini-2.0-flash-001` -- must update to `google/gemini-2.5-flash-lite` (INT-05)
- `ScoreResponse.categories`: Removed in v2 (kept as empty list for backward compat)
- `ScoreResponse.checklist`: Replaced by `criteria_results` in v2

## Open Questions

1. **Distance scoring for pre-computed profiles**
   - What we know: `score_distance()` requires `actual_km` parameter which in the old pipeline came from live proximity data fetch. With ListingProfile, proximity distances are pre-computed in `profile.amenities`.
   - What's unclear: How to map a DynamicField with criterion_type=distance to a specific amenity category key in the profile. E.g., user says "Within 1km of a gym" -- this needs to map to `profile.amenities["gym"].nearest_km`.
   - Recommendation: Extract the amenity category from the field name using keyword matching (similar to how `fetch_all_proximity_data` works) or treat distance criteria as proximity_quality if they have proximity data, falling back to subjective if not.

2. **summary_bullets generation when ListingProfile has no subjective criteria**
   - What we know: Phase 29's claude.py has a "bullets-only" path (PATH B) when zero subjective criteria exist. It still calls OpenRouter.
   - What's unclear: Should we always call OpenRouter for bullets even when all criteria are deterministic? Or generate static bullets from deterministic results?
   - Recommendation: Always call OpenRouter for bullets -- they need natural language and the cost is minimal. The bullets-only call uses `max_tokens=1024`, costs ~$0.001.

3. **save_analysis breakdown field structure**
   - What we know: `supabase_service.save_analysis()` stores the entire score_data dict in `breakdown` JSONB. It also extracts `score_data["overall_score"]` into the `score` column.
   - What's unclear: Should `fulfillment_data` column (migration 007) be populated separately, or is `criteria_results` in the breakdown JSONB sufficient?
   - Recommendation: Populate both: `breakdown` gets the full ScoreResponse (including criteria_results + schema_version=2), and `fulfillment_data` gets just the criteria_results array for efficient frontend queries.

## Sources

### Primary (HIGH confidence)
- `backend/app/services/deterministic_scorer.py` -- FulfillmentResult model, all scorer functions, synthesize_builtin_results
- `backend/app/services/claude.py` -- SubjectiveScorer (ClaudeScorer), score_listing() returning (list[FulfillmentResult], list[str])
- `backend/app/models/scoring.py` -- ScoreResponse, SubjectiveCriterionResult, SubjectiveResponse
- `backend/app/models/listing_profile.py` -- ListingProfile, AmenityCategory, AmenityResult
- `backend/app/models/preferences.py` -- IMPORTANCE_WEIGHT_MAP, CriterionType, ImportanceLevel, DynamicField
- `backend/app/models/listing.py` -- FlatfoxListing, FlatfoxAttribute
- `backend/app/services/listing_profile_db.py` -- get_listing_profile()
- `backend/app/services/supabase.py` -- get_analysis(), save_analysis()
- `backend/app/routers/scoring.py` -- Current scoring router (to be rewritten)
- `backend/app/services/openrouter.py` -- OPENROUTER_MODEL constant (to be updated)
- `supabase/functions/score-proxy/index.ts` -- Edge function cache logic (to be updated)
- `.planning/REQUIREMENTS.md` -- INT-03/04/05, HA-01/02/03/04, DB-02 specifications
- `.planning/STATE.md` -- Architecture decisions, Phase 30 outcomes

### Secondary (MEDIUM confidence)
- `.planning/HANDOFF.md` -- Integration strategy, architecture overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- all building blocks exist, verified by reading every source file
- Pitfalls: HIGH -- identified from direct code inspection of type mismatches and dual-cache architecture
- Aggregation formula: HIGH -- explicitly specified in REQUIREMENTS.md (HA-01, HA-02, HA-03)
- Profile adapter: HIGH -- field-by-field mapping verified against both ListingProfile and FlatfoxListing models

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- no external API changes expected)
