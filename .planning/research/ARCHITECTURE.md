# Architecture: ListingProfile Integration with v5.0 Hybrid Scoring Pipeline

**Project:** HomeMatch v5.0 -- Phase 29-32 Integration
**Researched:** 2026-03-30
**Confidence:** HIGH (all recommendations derived from reading committed + untracked code, both code paths verified locally)

---

## Executive Summary

Two parallel code paths must merge: the committed v5.0 deterministic scorer (Phase 28, 439 lines) operates on `FlatfoxListing` (live API data), while the untracked v6.0 data layer produces `ListingProfile` (pre-computed enriched data with amenity distances, condition scores, and market context). The core integration challenge is that the Phase 28 scorer functions take `FlatfoxListing` as input, but the richest scoring data lives in `ListingProfile`.

**The answer is not to replace one with the other.** Both data sources are needed:
- `FlatfoxListing` provides live, authoritative data (price, rooms, sqm, attributes) fetched at score time.
- `ListingProfile` provides enriched data (amenity distances, condition scores, neighborhood context, market comparisons) that cannot be obtained at score time without expensive research.

Phase 31 (Hybrid Scorer & Router) must bridge these by feeding the right data source to each scorer function, with `ListingProfile` enriching what `FlatfoxListing` cannot provide.

---

## Question 1: Scoring Router Orchestration Flow

### Current Production Flow (committed)

```
POST /score
  |
  +-> Cache check (analyses table, breakdown JSONB)
  |     Hit? -> return ScoreResponse (v1)
  |
  +-> Fetch FlatfoxListing (live API)
  +-> Geocode if missing coords
  +-> Fetch proximity data (Apify, per-requirement)
  +-> Fetch listing images (HTML scrape)
  +-> Override stale API prices with web-scraped prices
  +-> Claude full scoring (score_listing -> ScoreResponse v1)
  +-> Save analysis
  +-> Return ScoreResponse
```

### Target Integrated Flow (Phases 29-32)

```
POST /score (listing_id, user_id, profile_id, preferences)
  |
  +-> [STEP 0] Cache check
  |     Hit with schema_version >= 2? -> return cached ScoreResponse v2
  |     Hit with schema_version < 2 (or missing)? -> treat as miss (DB-02)
  |
  +-> [STEP 1] Fetch FlatfoxListing (live API) -- always, for authoritative price/rooms/sqm
  +-> [STEP 1a] Geocode if missing coords
  +-> [STEP 1b] Override API prices with web-scraped prices (existing logic)
  +-> [STEP 1c] Fetch listing images (existing logic)
  |
  +-> [STEP 2] ListingProfile lookup (listing_profiles table)
  |     Found? -> profile = ListingProfile
  |     Not found? -> profile = None
  |
  +-> [STEP 3] Proximity data resolution
  |     IF profile exists AND profile.amenities is populated:
  |       -> Convert profile.amenities to proximity_data dict (no Apify call)
  |     ELSE:
  |       -> Fetch proximity data via Apify (existing pipeline, requires coords)
  |
  +-> [STEP 4] Parse preferences -> UserPreferences (with criterion_type on DynamicFields)
  |
  +-> [STEP 5] Deterministic scoring
  |     +-> synthesize_builtin_results(prefs, listing) -> [FulfillmentResult, ...]
  |     +-> For each dynamic_field with criterion_type != subjective:
  |           Route to score_price/score_distance/score_size/score_binary_feature/score_proximity_quality
  |           -> [FulfillmentResult, ...]
  |
  +-> [STEP 6] Subjective scoring (SS-01 through SS-04)
  |     +-> Collect dynamic_fields where criterion_type == subjective
  |     +-> IF any subjective criteria exist:
  |           -> Single Claude messages.parse() call
  |           -> ClaudeSubjectiveResponse -> [FulfillmentResult, ...]
  |     +-> ELSE:
  |           -> No Claude call for criteria
  |
  +-> [STEP 7] Summary bullets (SS-04)
  |     +-> IF Claude was called in Step 6: summary_bullets already returned
  |     +-> ELSE: Minimal Claude call for natural-language summary
  |           (pass deterministic results as context)
  |
  +-> [STEP 8] Aggregation (HA-01 through HA-04)
  |     +-> Merge deterministic + subjective FulfillmentResults
  |     +-> Weighted average: sum(w*f) / sum(w) * 100
  |     +-> CRITICAL override: any CRITICAL with f=0 -> poor, cap at 39
  |     +-> Missing data (f=None): exclude from both numerator and denominator
  |     +-> Derive match_tier from score
  |     +-> Build ScoreResponse v2
  |
  +-> [STEP 9] Save analysis (schema_version=2, fulfillment_data, breakdown)
  +-> [STEP 10] Return ScoreResponse v2
```

### Key Decisions in the Flow

**Cache version gating (DB-02):** The cache check in Step 0 rejects v1 cached analyses. This forces a re-score through the new pipeline. Existing v1 analyses remain in the DB for backward-compatible rendering (FE-04) but are never returned from the scoring endpoint once the hybrid scorer is deployed.

**ListingProfile is optional, not required:** The flow works without a ListingProfile. When absent, distance/proximity_quality criteria use live Apify data (slower but functional), and condition/neighborhood enrichment is unavailable (those criteria fall through to the subjective scorer or return None). This maintains the Claude fallback path for unenriched listings.

**No separate "Layer 3 gap-fill" in the integrated flow:** The v6.0 gap detector + OpenRouter gap-fill pipeline is superseded by the v5.0 approach where missing data is simply skipped in aggregation (HA-02) and genuinely subjective criteria are handled by Claude (SS-01). The gap detector remains useful for diagnostics but is not in the critical scoring path.

---

## Question 2: How ListingProfile Data Feeds Deterministic Scorer Functions

### The Impedance Mismatch

The Phase 28 deterministic scorer functions have these signatures:

```python
score_price(field: DynamicField, listing: FlatfoxListing) -> Optional[float]
score_distance(field: DynamicField, listing: FlatfoxListing, actual_km: Optional[float]) -> Optional[float]
score_size(field: DynamicField, listing: FlatfoxListing) -> Optional[float]
score_binary_feature(field: DynamicField, listing: FlatfoxListing) -> Optional[float]
score_proximity_quality(field: DynamicField, listing: FlatfoxListing, proximity_data: dict) -> Optional[float]
synthesize_builtin_results(prefs: UserPreferences, listing: FlatfoxListing) -> list[FulfillmentResult]
```

Every function takes `FlatfoxListing`. But `ListingProfile` contains data `FlatfoxListing` does not:
- **Amenity distances** (pre-computed haversine from enrichment) -- needed by `score_distance` and `score_proximity_quality`
- **Condition/neighborhood scores** -- not consumed by any current scorer function (subjective territory)
- **Market context** (avg_rent_for_area, price_vs_market) -- not consumed by any current scorer function

### Resolution: ListingProfile Enriches the Call Site, Not the Scorer Functions

**Do NOT change the scorer function signatures.** The Phase 28 scorer is correct and well-tested (41 tests passing). Instead, the Phase 31 hybrid scorer (the orchestrator) uses ListingProfile to prepare the *arguments* passed to scorer functions.

Here is the mapping:

| Scorer Function | `FlatfoxListing` provides | `ListingProfile` provides | Integration Point |
|----------------|--------------------------|--------------------------|-------------------|
| `score_price` | `listing.price_display` (authoritative) | `profile.price` (may be stale) | **Use FlatfoxListing only.** Live price is authoritative; override with web-scraped price as existing code does. |
| `score_size` | `listing.surface_living` (authoritative) | `profile.sqm` (may be stale) | **Use FlatfoxListing only.** Live dimensions are authoritative. |
| `score_binary_feature` | `listing.attributes` (authoritative) | `profile.attributes` (list[str]) | **Use FlatfoxListing only.** Live attributes are authoritative. Flatfox attributes are `FlatfoxAttribute` objects; profile attributes are plain strings. |
| `score_distance` | N/A (needs `actual_km` from caller) | `profile.amenities[category].nearest_km` | **ListingProfile provides `actual_km`.** If profile has amenity data for the criterion's category, pass `profile.get_amenity_distance(category)` as `actual_km`. Otherwise, compute from live proximity data. |
| `score_proximity_quality` | N/A (needs `proximity_data` from caller) | `profile.amenities[category].results` | **ListingProfile provides `proximity_data`.** Convert `AmenityCategory.results` to the dict format expected by `score_proximity_quality`. |
| `synthesize_builtin_results` | All builtin fields (price, rooms, sqm) | N/A | **Use FlatfoxListing only.** Built-in fields are always from live data. |

### Concrete Integration Code (Phase 31 Hybrid Scorer)

```python
# In hybrid_scorer.py

from app.models.listing_profile import ListingProfile
from app.models.listing import FlatfoxListing
from app.models.preferences import DynamicField, CriterionType, UserPreferences
from app.services.deterministic_scorer import (
    FulfillmentResult, score_price, score_distance, score_size,
    score_binary_feature, score_proximity_quality, synthesize_builtin_results,
)

def _resolve_actual_km(
    field: DynamicField,
    profile: ListingProfile | None,
    live_proximity: dict[str, list[dict]],
) -> float | None:
    """Resolve actual distance in km for a distance criterion.

    Priority:
    1. ListingProfile amenity data (pre-computed, haversine-accurate)
    2. Live proximity data from Apify
    3. None (skip criterion)
    """
    category = _infer_amenity_category(field.name)  # maps "school" -> "school", etc.

    if profile and category:
        dist = profile.get_amenity_distance(category)
        if dist is not None:
            return dist

    # Fallback to live proximity data
    entries = live_proximity.get(field.name) or live_proximity.get(field.name.strip().lower())
    if entries:
        distances = [e.get("distance_km") for e in entries if e.get("distance_km") is not None]
        if distances:
            return min(distances)

    return None


def _resolve_proximity_data(
    field: DynamicField,
    profile: ListingProfile | None,
    live_proximity: dict[str, list[dict]],
) -> dict[str, list[dict]]:
    """Resolve proximity data for a proximity_quality criterion.

    Priority:
    1. ListingProfile amenity data (pre-computed)
    2. Live proximity data from Apify
    """
    category = _infer_amenity_category(field.name)

    if profile and category:
        amenity_cat = profile.amenities.get(category)
        if amenity_cat and amenity_cat.results:
            # Convert AmenityResult to the dict format score_proximity_quality expects
            converted = [
                {
                    "distance_km": r.distance_km,
                    "rating": r.rating,
                    "is_fallback": False,
                }
                for r in amenity_cat.results
            ]
            return {field.name: converted}

    # Fallback to live proximity data (already in correct format)
    if field.name in live_proximity:
        return {field.name: live_proximity[field.name]}

    return {}


def score_deterministic(
    listing: FlatfoxListing,
    prefs: UserPreferences,
    profile: ListingProfile | None,
    live_proximity: dict[str, list[dict]],
) -> list[FulfillmentResult]:
    """Score all deterministic criteria, using ListingProfile when available."""
    results: list[FulfillmentResult] = []

    # Built-in fields (always from FlatfoxListing)
    results.extend(synthesize_builtin_results(prefs, listing))

    # Dynamic fields
    for field in prefs.dynamic_fields:
        if field.criterion_type == CriterionType.SUBJECTIVE or field.criterion_type is None:
            continue  # handled by Claude

        f: float | None = None

        if field.criterion_type == CriterionType.PRICE:
            f = score_price(field, listing)

        elif field.criterion_type == CriterionType.SIZE:
            f = score_size(field, listing)

        elif field.criterion_type == CriterionType.BINARY_FEATURE:
            f = score_binary_feature(field, listing)

        elif field.criterion_type == CriterionType.DISTANCE:
            actual_km = _resolve_actual_km(field, profile, live_proximity)
            f = score_distance(field, listing, actual_km)

        elif field.criterion_type == CriterionType.PROXIMITY_QUALITY:
            prox_data = _resolve_proximity_data(field, profile, live_proximity)
            f = score_proximity_quality(field, listing, prox_data)

        results.append(FulfillmentResult(
            criterion_name=field.name,
            fulfillment=f,
            importance=field.importance,
        ))

    return results
```

### Category Inference for ListingProfile Amenities

`ListingProfile.amenities` uses category keys like `"supermarket"`, `"public_transport"`, `"school"`, `"gym"`, `"restaurant"`, `"park"`, `"hospital"`, `"kindergarten"`, `"pharmacy"`.

The DynamicField `.name` is free-text (e.g., "near primary school", "gym within 500m"). A mapping function is needed:

```python
_AMENITY_CATEGORY_MAP: dict[str, str] = {
    "school": "school",
    "schule": "school",
    "gym": "gym",
    "fitness": "gym",
    "fitnessstudio": "gym",
    "supermarket": "supermarket",
    "supermarkt": "supermarket",
    "transport": "public_transport",
    "tram": "public_transport",
    "bus": "public_transport",
    "bahn": "public_transport",
    "bahnhof": "public_transport",
    "park": "park",
    "hospital": "hospital",
    "spital": "hospital",
    "kindergarten": "kindergarten",
    "kita": "kindergarten",
    "pharmacy": "pharmacy",
    "apotheke": "pharmacy",
    "restaurant": "restaurant",
    # ... extend as needed
}

def _infer_amenity_category(field_name: str) -> str | None:
    """Infer ListingProfile amenity category key from a DynamicField name."""
    name_lower = field_name.strip().lower()
    for keyword, category in _AMENITY_CATEGORY_MAP.items():
        if keyword in name_lower:
            return category
    return None
```

This is essentially the same pattern as `_AMENITY_KEYWORDS` in `proximity.py` but returns a category key instead of a boolean match.

---

## Question 3: Deployment Order

### Dependency Graph

```
                    DB Migration 005
                   (listing_profiles table)
                          |
                          v
               DB Migration 006          DB Migration: schema_version +
              (research_json column)      fulfillment_data on analyses
                          |                         |
                          v                         v
              Upload 8051 enriched data    Backend code: Phase 29-31
                          |                         |
                          v                         v
              Set OPENROUTER_API_KEY     Push backend code + restart
              on EC2 .env                          |
                                                   v
                                          Extension types update (Phase 32)
                                                   v
                                          Web frontend update (Phase 32)
```

### Exact Deployment Sequence

**Step 1: Apply DB migrations (safe, additive)**

```bash
# Migration 005: listing_profiles table (new table, no impact on existing)
npx supabase db push --linked

# Migration 006: research_json column (additive ALTER, safe)
# Already included in push if both migrations are in supabase/migrations/

# Migration: schema_version + fulfillment_data on analyses (Phase 30)
# Write new migration file BEFORE deploying backend:
# supabase/migrations/007_schema_version.sql
```

**Step 2: Set OPENROUTER_API_KEY on EC2 (optional for gap-fill fallback)**

```bash
ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 \
  "echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/gen-ai-hackathon/backend/.env"
```

This is optional because the integrated flow does not use OpenRouter in the critical path. It is only needed if you keep the gap-fill as a diagnostic/fallback.

**Step 3: Push backend code + restart**

```bash
# Push to main, then deploy
ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 \
  "cd gen-ai-hackathon && git pull && pkill -f uvicorn; cd backend && \
   nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn \
   app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &"
```

**Step 4: Verify health**

```bash
ssh -i ~/.ssh/homematch-key.pem ubuntu@63.176.136.105 \
  "curl -s http://localhost:8000/health"
```

**Step 5: Upload enriched data (for 8051 listings)**

The 27 enriched JSONs for zipcode 8051 are already in Supabase from the batch run. If new enrichment data needs uploading:

```bash
scp -i ~/.ssh/homematch-key.pem backend/scripts/output/85*.json \
  ubuntu@63.176.136.105:~/gen-ai-hackathon/backend/scripts/output/
```

**Step 6: Deploy frontend changes (Phase 32)**

Frontend changes auto-deploy on push to main (Vercel).

### Critical Ordering Constraint

**DB migration 007 (schema_version + fulfillment_data) MUST be applied BEFORE the Phase 31 hybrid scorer code ships.** If the backend writes `schema_version: 2` to `breakdown` JSONB before the column exists, the write will silently succeed (JSONB is schemaless), but the `fulfillment_data` column must exist for separate storage. The Phase 30 requirement (DB-01, DB-03) explicitly states this.

**Safe ordering principle:** Migrations are additive (new table, new columns). They can be applied at any time without breaking existing code. Apply them first.

---

## Question 4: Extension Handling of "Not Enriched" Listings

### Current Behavior

The extension calls `POST /score` for every listing the user clicks the FAB on. The scoring endpoint returns a `ScoreResponse` regardless of whether a `ListingProfile` exists, because the Claude fallback handles unenriched listings.

### What Changes with the Hybrid Scorer

With the hybrid scorer, unenriched listings still get scored, but the scoring quality differs:

| Scenario | Deterministic Scoring | Subjective Scoring | Quality |
|----------|----------------------|-------------------|---------|
| **ListingProfile exists** | Full: price + size + binary + distance + proximity_quality all from pre-computed data | Claude for subjective only | Best: fast, accurate, cheap |
| **ListingProfile absent, coords available** | Partial: price + size + binary from live data; distance + proximity_quality from live Apify | Claude for subjective only | Good: slower (Apify calls), still accurate |
| **ListingProfile absent, no coords** | Minimal: price + size + binary only; distance + proximity_quality return None (skipped) | Claude for subjective only | Acceptable: some criteria missing from aggregation |

### Beta Badge Implementation

**Recommendation: Do NOT add a separate "not enriched" response type.** The extension should not need to know about ListingProfile internals. Instead, use the existing `ScoreResponse` fields to signal enrichment status.

Two approaches, in order of preference:

**Approach A (recommended): Add `enrichment_status` field to ScoreResponse v2**

```python
class ScoreResponse(BaseModel):
    schema_version: int = 2
    overall_score: int
    match_tier: Literal["excellent", "good", "fair", "poor"]
    summary_bullets: list[str]
    criteria_results: list[CriterionResult]
    language: str
    enrichment_status: Literal["full", "partial", "basic"] = "basic"
    # full: ListingProfile exists, all enrichment data available
    # partial: ListingProfile exists but some categories missing
    # basic: no ListingProfile, scored from live data only
```

The extension can then conditionally render:

```typescript
// In badge rendering
if (response.schema_version >= 2 && response.enrichment_status === 'basic') {
  // Show "Beta" label on the badge
  badgeLabel = `${response.overall_score} Beta`;
} else {
  badgeLabel = `${response.overall_score}`;
}
```

**Approach B (simpler): Use criteria_results count as a proxy**

If a large proportion of criteria have `fulfillment: null`, the listing was likely not enriched. The extension counts non-null criteria:

```typescript
const scored = response.criteria_results.filter(c => c.fulfillment !== null).length;
const total = response.criteria_results.length;
const coverage = scored / total;
if (coverage < 0.5) {
  // Show beta badge -- too many criteria could not be evaluated
}
```

This is fragile (a profile with few criteria would look unenriched) and not recommended for production. Use Approach A.

### Extension TypeScript Changes (FE-03)

```typescript
// extension/src/types/scoring.ts -- ADDITIVE changes only

export interface CriterionResult {
  criterion_name: string;
  fulfillment: number | null; // 0.0-1.0, null = missing data
  importance: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string | null;
}

export interface ScoreResponse {
  schema_version?: number; // 1 (legacy) or 2 (new), undefined treated as 1
  overall_score: number;
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[];
  // v1 fields (kept for backward compat)
  categories?: CategoryScore[];
  checklist?: ChecklistItem[];
  // v2 fields (new)
  criteria_results?: CriterionResult[];
  enrichment_status?: 'full' | 'partial' | 'basic';
  language: string;
}
```

All v1 fields become optional (with `?`). All v2 fields are also optional. The extension renders based on what is present, never crashes on missing fields.

---

## Component Boundaries

### Components That Do NOT Change

| Component | File | Why Unchanged |
|-----------|------|--------------|
| `FlatfoxListing` model | `backend/app/models/listing.py` | Represents live API data; authoritative for price/rooms/sqm/attributes |
| `DynamicField` model | `backend/app/models/preferences.py` | Already has `criterion_type` from Phase 27 |
| `CriterionType` enum | `backend/app/models/preferences.py` | Already has all 6 types from Phase 27 |
| `IMPORTANCE_WEIGHT_MAP` | `backend/app/models/preferences.py` | Already updated to CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 |
| 5 scorer functions | `backend/app/services/deterministic_scorer.py` | Phase 28 is verified (41 tests); signatures are correct |
| `CriterionClassifier` | `backend/app/services/classifier.py` | Phase 27 is verified; classification at profile save |
| `listing_profile_db.py` | `backend/app/services/listing_profile_db.py` | CRUD for listing_profiles table; works as-is |

### Components That Change

| Component | File | Change |
|-----------|------|--------|
| `ScoreResponse` | `backend/app/models/scoring.py` | Add `schema_version`, `criteria_results`, `enrichment_status`; make `categories` optional |
| `score_listing()` router | `backend/app/routers/scoring.py` | Replace Claude-only call with hybrid orchestration flow |
| `ClaudeScorer` | `backend/app/services/claude.py` | Add `score_subjective()` method (Phase 29) |
| Scoring prompts | `backend/app/prompts/scoring.py` | Rewrite for subjective-only evaluation (Phase 29) |
| `save_analysis()` | `backend/app/services/supabase.py` | Store `schema_version` and `fulfillment_data` |
| `get_analysis()` | `backend/app/services/supabase.py` | Return `schema_version` for cache gating |
| Extension types | `extension/src/types/scoring.ts` | Additive v2 fields (Phase 32) |
| Analysis page | `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` | Branch on schema_version (Phase 32) |

### New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `HybridScorer` | `backend/app/services/hybrid_scorer.py` | Orchestrates deterministic + subjective + aggregation (Phase 31) |
| `SubjectiveCriterionResult` | `backend/app/models/scoring.py` | Pydantic model for Claude subjective output (Phase 29) |
| `ClaudeSubjectiveResponse` | `backend/app/models/scoring.py` | Pydantic parse target for subjective Claude call (Phase 29) |
| `BulletsOnlyResponse` | `backend/app/models/scoring.py` | Pydantic parse target for summary-only Claude call (Phase 29) |
| `CriterionResult` | `backend/app/models/scoring.py` | Per-criterion result in ScoreResponse v2 (Phase 31) |
| `FulfillmentBreakdown` | `web/src/components/analysis/FulfillmentBreakdown.tsx` | v2 analysis page rendering (Phase 32) |
| Migration 007 | `supabase/migrations/007_schema_version.sql` | schema_version + fulfillment_data columns (Phase 30) |

---

## Phase Adjustment Recommendations

### Phase 29: Subjective Scorer (unchanged scope, add ListingProfile context)

The Claude subjective scorer should receive ListingProfile enrichment data when available. This means the updated prompt should include condition scores, neighborhood character, and market context from ListingProfile alongside the standard listing data.

```python
# In ClaudeScorer.score_subjective():
# If ListingProfile exists, add enrichment context to the prompt:
#   - condition_score, natural_light_score, kitchen/bathroom scores
#   - neighborhood_character, noise_level_estimate
#   - price_vs_market context
# This gives Claude richer data for subjective evaluation.
```

**No change to Phase 29 scope.** The ListingProfile context is passed as optional prompt enrichment, not a required input.

### Phase 30: Database Schema Prep (unchanged)

Migration 007 adds `schema_version` and `fulfillment_data` to `analyses` table. Straightforward, no ListingProfile interaction.

### Phase 31: Hybrid Scorer & Router (CRITICAL -- must include ListingProfile bridge)

This is where the integration happens. Phase 31 must:

1. **Add ListingProfile lookup** to the scoring router (Step 2 in the flow).
2. **Implement `_resolve_actual_km` and `_resolve_proximity_data`** helper functions that prefer ListingProfile data over live Apify data.
3. **Implement `_infer_amenity_category`** mapping from field name to ListingProfile amenity key.
4. **Implement the `score_deterministic` orchestration function** that routes each criterion to the correct scorer with the correct data source.
5. **Implement weighted aggregation** (HA-01 through HA-04).
6. **Add `enrichment_status`** computation based on ListingProfile availability.

### Phase 32: Frontend Consumers (add beta badge for unenriched listings)

The extension should check `enrichment_status` and optionally display a "Beta" indicator for listings scored without full enrichment data.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Replacing FlatfoxListing with ListingProfile in Scorer Functions

**What:** Changing `score_price(field, listing)` to `score_price(field, profile)`.
**Why bad:** ListingProfile data may be stale (enriched days ago). FlatfoxListing is fetched live and has authoritative current prices. Also breaks 41 passing tests.
**Instead:** Use FlatfoxListing for all data that FlatfoxListing provides (price, rooms, sqm, attributes). Use ListingProfile only for data FlatfoxListing lacks (amenity distances, condition scores, market context).

### Anti-Pattern 2: Making ListingProfile Required

**What:** Failing the scoring request if ListingProfile is not found.
**Why bad:** Only 27 listings in zipcode 8051 are enriched. Thousands of other Zurich listings would be unscorable. The Claude fallback path (and the partial-enrichment path) must remain functional.
**Instead:** ListingProfile is an optimization. When absent, scoring degrades gracefully (fewer deterministic criteria, more Claude involvement, slightly less accurate proximity data).

### Anti-Pattern 3: Running Gap-Fill and Subjective Scoring in Parallel

**What:** Calling OpenRouter gap-fill and Claude subjective scoring simultaneously.
**Why bad:** These serve different purposes. Gap-fill (v6.0) fills missing deterministic data. Subjective scoring (v5.0) evaluates qualitative criteria. Running both creates contradictory results for the same criterion.
**Instead:** Choose one path. The v5.0 approach (skip missing data in aggregation, Claude for subjective only) is cleaner and more predictable. Keep OpenRouter gap-fill as an optional diagnostic tool, not in the critical scoring path.

### Anti-Pattern 4: Converting ListingProfile to FlatfoxListing

**What:** Building a fake FlatfoxListing from ListingProfile data to pass to scorer functions.
**Why bad:** ListingProfile attributes are `list[str]` but FlatfoxListing attributes are `list[FlatfoxAttribute]`. ListingProfile rooms is `float` but FlatfoxListing number_of_rooms is `str`. Price semantics differ. The conversion would be lossy and error-prone.
**Instead:** Always fetch the real FlatfoxListing. Use ListingProfile as a supplement, not a replacement.

---

## Data Flow Diagram (Detailed)

```
                         Extension                          Web App
                            |                                  |
                            v                                  v
                     score-proxy edge function          (future: API route)
                            |
                            v
                    POST /score (EC2 FastAPI)
                            |
              +-------------+-------------+
              |                           |
              v                           v
    [Cache check]              [Fetch FlatfoxListing]
    analyses table                 Flatfox API
    breakdown JSONB                    |
              |                        v
              |               [Geocode if needed]
              |                        |
              v                        v
    schema_version < 2?      [Fetch images + web prices]
    -> treat as cache miss             |
              |                        v
              v               [ListingProfile lookup]
    schema_version >= 2?       listing_profiles table
    -> return cached                   |
                                       v
                              ListingProfile found?
                              /                    \
                           YES                      NO
                            |                        |
                            v                        v
              Use profile.amenities      Fetch live proximity
              for distance/proximity     from Apify + cache
                            |                        |
                            +--------+---------------+
                                     |
                                     v
                        [Parse UserPreferences]
                        (with criterion_type from Phase 27)
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
          [Deterministic Scoring]          [Subjective Scoring]
          score_price(field, listing)       Claude messages.parse()
          score_size(field, listing)        -> per-criterion fulfillment
          score_binary(field, listing)      -> summary_bullets
          score_distance(field, listing,
            actual_km=profile.amenities    OR
            actual_km=live_proximity)
          score_proximity(field, listing,
            prox_data=profile.amenities   OR
            prox_data=live_proximity)
          synthesize_builtins(prefs, listing)
                    |                                 |
                    +----------------+----------------+
                                     |
                                     v
                          [Weighted Aggregation]
                          sum(w*f) / sum(w) * 100
                          CRITICAL override
                          Missing data exclusion
                                     |
                                     v
                          ScoreResponse v2
                          {schema_version: 2,
                           overall_score,
                           match_tier,
                           summary_bullets,
                           criteria_results,
                           enrichment_status}
                                     |
                              +------+------+
                              |             |
                              v             v
                        Save to DB    Return to caller
                        (analyses)
```

---

## Scalability Considerations

| Concern | With 27 enriched (now) | With 1,792 enriched (target) | With 10K+ enriched |
|---------|----------------------|-----------------------------|--------------------|
| ListingProfile lookup latency | ~10ms (Supabase query by indexed listing_id) | ~10ms (same index) | ~10ms (same index) |
| Cache hit rate (v2) | ~0% (no v2 analyses cached yet) | High after initial scoring wave | Very high |
| Claude call rate | ~90% of requests (most listings unenriched) | ~30% (only subjective criteria) | ~20% (fewer subjective criteria as enrichment improves) |
| Apify call rate | ~90% (fallback for unenriched) | ~10% (only for unenriched listings) | ~5% |
| Cost per scoring | ~$0.03-0.06 (Claude-heavy) | ~$0.01-0.02 (mostly deterministic) | ~$0.005 (rare Claude calls) |

---

## Sources

All findings derived from direct codebase analysis (HIGH confidence):

- `backend/app/services/deterministic_scorer.py` -- Phase 28 verified scorer (439 lines, 41 tests passing)
- `backend/app/models/listing_profile.py` -- ListingProfile model (155 lines, amenities dict structure)
- `backend/app/models/listing.py` -- FlatfoxListing model (111 lines, attributes as FlatfoxAttribute objects)
- `backend/app/models/preferences.py` -- DynamicField with criterion_type, CriterionType enum, IMPORTANCE_WEIGHT_MAP
- `backend/app/models/scoring.py` -- Current ScoreResponse v1, CategoryScore, ChecklistItem
- `backend/app/routers/scoring.py` -- Current scoring endpoint (257 lines, full pipeline)
- `backend/app/services/classifier.py` -- CriterionClassifier (Phase 27, batched Claude classification)
- `backend/app/services/listing_profile_db.py` -- ListingProfile CRUD (119 lines)
- `backend/app/services/gap_detector.py` -- Gap detection (77 lines, [GAP] marker pattern)
- `backend/app/services/openrouter.py` -- OpenRouter gap-fill client (372 lines)
- `backend/app/services/claude.py` -- ClaudeScorer.score_listing() (current production)
- `backend/app/services/proximity.py` -- Proximity pipeline, extract_proximity_requirements
- `supabase/migrations/005_listing_profiles.sql` -- listing_profiles table DDL
- `supabase/migrations/006_add_research_json.sql` -- research_json column ALTER
- `extension/src/types/scoring.ts` -- Current TypeScript ScoreResponse interface
- `.planning/HANDOFF.md` -- Three-layer pipeline architecture, side-by-side comparison
- `.planning/ROADMAP.md` -- Phase dependencies and success criteria
- `.planning/REQUIREMENTS.md` -- 24 requirements (DM/DS/SS/HA/DB/FE)
- `.planning/phases/28-deterministic-scorer/28-VERIFICATION.md` -- Phase 28 verification report (10/10)
