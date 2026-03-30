# Merge Pitfalls: ListingProfile Pipeline + CriterionType Deterministic Scorer

**Domain:** Merging pre-computed ListingProfile scoring (v6.0 local work) with CriterionType-routed deterministic scorer (v5.0 Phase 28 committed code)
**Researched:** 2026-03-30
**Confidence:** HIGH -- all pitfalls verified against actual codebase: `deterministic_scorer.py` (439 lines, Phase 28 committed), `listing_profile.py` (155 lines, local), `gap_detector.py` (78 lines, local), `openrouter.py` (373 lines, local), `scoring.py` router (179 lines, committed), edge function `score-proxy/index.ts` (157 lines), extension `ScoreBadge.tsx`, `App.tsx`, `api.ts`, analysis page, and all DB migrations.

**Scope:** This document covers ONLY pitfalls specific to merging these two approaches. For generic v5.0 scoring pitfalls (cache schema migration, frontend consumer breakage, etc.), see the previous version of this file in git history.

---

## Critical Pitfalls

Mistakes that cause silent wrong scores, data corruption, or production outages when merging the two systems.

---

### Pitfall 1: FlatfoxListing vs ListingProfile -- Input Model Mismatch

**What goes wrong:**
The Phase 28 deterministic scorer (`backend/app/services/deterministic_scorer.py`) takes `FlatfoxListing` as input for every scoring function. The function signatures are:

```python
def score_price(field: DynamicField, listing: FlatfoxListing) -> Optional[float]
def score_distance(field: DynamicField, listing: FlatfoxListing, actual_km: Optional[float]) -> Optional[float]
def score_size(field: DynamicField, listing: FlatfoxListing) -> Optional[float]
def score_binary_feature(field: DynamicField, listing: FlatfoxListing) -> Optional[float]
def score_proximity_quality(field: DynamicField, listing: FlatfoxListing, proximity_data: dict) -> Optional[float]
def synthesize_builtin_results(prefs: UserPreferences, listing: FlatfoxListing) -> list[FulfillmentResult]
```

The ListingProfile model (`backend/app/models/listing_profile.py`) has the same data but different field names and types:

| Data | FlatfoxListing | ListingProfile | Mismatch |
|------|---------------|----------------|----------|
| Price | `price_display: Optional[int]` | `price: Optional[int]` | **Field name differs** |
| Area | `surface_living: Optional[int]` | `sqm: Optional[int]` | **Field name differs** |
| Rooms | `number_of_rooms: Optional[str]` (STRING!) | `rooms: Optional[float]` | **Name AND type differ** |
| Attributes | `attributes: list[FlatfoxAttribute]` (objects with `.name`) | `attributes: list[str]` (plain strings) | **Structure differs** |
| Slug | `slug: str` | `slug: str` | OK |
| Latitude/Longitude | `latitude/longitude: Optional[float]` | Same | OK |
| Condition data | NOT present | `condition_score`, `natural_light_score`, etc. | **LP has richer data** |
| Amenities | NOT present | `amenities: dict[str, AmenityCategory]` | **LP has richer data** |

**Specific field-level breakage if you try to pass ListingProfile where FlatfoxListing is expected:**

1. **`score_price` (line 201):** reads `listing.price_display`. ListingProfile has `price`, not `price_display`. Returns `None` (skips criterion), so budget checks silently stop working. Every listing appears to have no price data.

2. **`score_size` (line 275):** reads `listing.surface_living`. ListingProfile has `sqm`. Returns `None`, so size checks silently stop working.

3. **`score_binary_feature` (line 182):** does `{attr.name.strip().lower() for attr in listing.attributes}`. ListingProfile's `attributes` is `list[str]`, not `list[FlatfoxAttribute]`. This will raise `AttributeError: 'str' object has no attribute 'name'` -- a runtime crash, not a silent failure.

4. **`synthesize_builtin_results` (line 387-392):** reads `listing.price_display` for budget, `listing.number_of_rooms` for rooms (and casts it to float from string), `listing.surface_living` for space. All three are named/typed differently in ListingProfile.

**Why it happens:**
The collaborator's Phase 28 scorer was developed against the existing `FlatfoxListing` model (which is what the current production scoring router feeds in). The local ListingProfile was developed in parallel as a richer data model for pre-computed data. Neither team knew about the other's field naming choices.

**Consequences:**
- Budget/size scoring silently returns None for all ListingProfile-based scores (score ignores these criteria, inflating scores)
- Binary feature scoring crashes with `AttributeError` (500 error to extension)
- Rooms scoring reads wrong field, gets `AttributeError` on the string type mismatch

**Prevention:**
Build an adapter function (NOT a rewrite of Phase 28) that converts `ListingProfile` to a `FlatfoxListing`-compatible object. Two approaches:

**Approach A -- Thin adapter (recommended):**
```python
# backend/app/services/listing_profile_adapter.py

from app.models.listing import FlatfoxListing, FlatfoxAttribute
from app.models.listing_profile import ListingProfile

def listing_profile_to_flatfox(profile: ListingProfile) -> FlatfoxListing:
    """Convert a ListingProfile to FlatfoxListing for Phase 28 scorer consumption.

    Maps field names and normalizes types so the deterministic scorer
    functions work without modification.
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
        price_display=profile.price,                          # price -> price_display
        rent_net=profile.rent_net,
        rent_charges=profile.rent_charges,
        rent_gross=profile.price if profile.offer_type == "RENT" else None,
        surface_living=profile.sqm,                           # sqm -> surface_living
        number_of_rooms=str(profile.rooms) if profile.rooms else None,  # float -> str
        floor=profile.floor,
        street=profile.address,
        zipcode=profile.zipcode,
        city=profile.city,
        latitude=profile.latitude,
        longitude=profile.longitude,
        state=profile.canton,
        country=profile.country,
        attributes=[FlatfoxAttribute(name=a) for a in profile.attributes],  # str -> FlatfoxAttribute
        is_furnished=profile.is_furnished,
        is_temporary=profile.is_temporary,
        year_built=profile.year_built,
        year_renovated=profile.year_renovated,
        moving_date_type=profile.moving_date_type,
        moving_date=profile.moving_date,
        description=profile.description,
        short_title=profile.title,
    )
```

**Approach B -- Protocol/interface (over-engineered for now):**
Define a protocol that both models implement. Requires modifying Phase 28 scorer to use the protocol, which means rewriting tested code.

**Approach A is better** because it preserves Phase 28's tested code untouched and centralizes the mapping in one place.

**Warning signs:** Any test that passes a ListingProfile to a function typed `FlatfoxListing` without the adapter will silently produce wrong results (except `score_binary_feature` which crashes).

**Detection:** Add a type check assertion at the top of the scoring router's deterministic path: `assert isinstance(listing, FlatfoxListing), f"Expected FlatfoxListing, got {type(listing)}"`.

**Phase:** Address in Phase 31 (Hybrid Scorer & Router Integration) -- this is the phase that wires the two systems together.

---

### Pitfall 2: Gap Detection Convention Mismatch -- [GAP] Markers vs fulfillment=None

**What goes wrong:**
Two incompatible conventions for "missing data" exist:

**Our gap detector** (`backend/app/services/gap_detector.py` lines 51-54):
```python
if item.met is not None:
    continue
if not item.note.startswith("[GAP]"):
    continue
```
It looks for `ChecklistItem` objects where `met=None` AND `note` starts with `"[GAP]"`. These are items our old 1086-line deterministic scorer produced.

**Phase 28 scorer** (`backend/app/services/deterministic_scorer.py` lines 31-47):
```python
class FulfillmentResult(BaseModel):
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    reasoning: Optional[str] = None
```
It returns `FulfillmentResult` objects where `fulfillment=None` means data was unavailable. There are no `[GAP]` markers, no `ChecklistItem` objects, and no `met` field.

**The gap detector cannot consume Phase 28 output** because:
1. It expects `list[ChecklistItem]` (with `criterion`, `met`, `note` fields)
2. Phase 28 returns `list[FulfillmentResult]` (with `criterion_name`, `fulfillment`, `importance`, `reasoning`)
3. Even if you converted FulfillmentResult to ChecklistItem, Phase 28 never sets `note` to `"[GAP]..."` -- it just sets `fulfillment=None`
4. The gap detector's matching logic (`dynamic_by_name[criterion_lower]`) relies on `ChecklistItem.criterion` matching `DynamicField.name` exactly. Phase 28's `FulfillmentResult.criterion_name` uses the same field names, so this would work IF the models were bridged.

**Why it happens:**
Gap detector was written for the old 1086-line scorer that produced ChecklistItem + [GAP] conventions. Phase 28 was written to a different spec (FulfillmentResult model). Neither knew about the other.

**Consequences:**
- Gap detector finds zero gaps (empty list), even when Phase 28 returns `fulfillment=None` for multiple criteria
- OpenRouter gap-fill never runs, even for criteria that genuinely need LLM help
- Those criteria get `fulfillment=None` in aggregation, which means they are skipped (per HA-02)
- Scores computed from fewer criteria than necessary, potentially inflated or deflated

**Prevention:**
Rewrite `detect_gaps` to consume `list[FulfillmentResult]` instead of `list[ChecklistItem]`:

```python
def detect_gaps(
    results: list[FulfillmentResult],
    preferences: UserPreferences,
) -> list[dict]:
    """Find criteria that couldn't be scored deterministically.

    A gap is any FulfillmentResult where fulfillment is None.
    """
    dynamic_by_name = {
        df.name.strip().lower(): df for df in preferences.dynamic_fields
    }

    gaps = []
    for result in results:
        if result.fulfillment is not None:
            continue

        criterion_lower = result.criterion_name.strip().lower()
        matched_field = dynamic_by_name.get(criterion_lower)

        if matched_field:
            gaps.append({
                "field_name": result.criterion_name,
                "field_value": matched_field.value or matched_field.name,
                "importance": matched_field.importance.value,
            })
        else:
            gaps.append({
                "field_name": result.criterion_name,
                "field_value": result.criterion_name,
                "importance": "medium",
            })

    return gaps
```

**Warning signs:** If gap-fill costs drop to $0.00 per listing after merge, gaps are not being detected.

**Detection:** Log `len(gaps)` in the scoring router. If it's consistently 0 for listings you know have missing data, the bridge is broken.

**Phase:** Address in Phase 31 (Hybrid Scorer & Router Integration).

---

### Pitfall 3: OpenRouter Gap-Fill Returns score/met/note but Aggregation Needs fulfillment

**What goes wrong:**
The OpenRouter gap-fill pipeline returns results in the OLD format:
```python
# openrouter.py line 211
return {
    "field_name": gap["field_name"],
    "score": int(parsed.get("score", 50)),  # 0-100 integer
    "met": parsed.get("met"),               # bool | None
    "note": str(parsed.get("note", "...")),
}
```

But the Phase 31 weighted aggregation formula needs `fulfillment` (0.0-1.0 float):
```
score = (sum of weight * fulfillment) / (sum of weights) * 100
```

If you naively plug OpenRouter's `score: 75` into the aggregation as `fulfillment=75`, you get:
- A single criterion with weight=5 and "fulfillment"=75 produces: `(5 * 75) / 5 * 100 = 7500`
- The overall_score exceeds the 0-100 bound and either crashes (Pydantic validation `ge=0, le=100`) or gets clamped nonsensically

If you use `met` (True/False/None) instead, you lose granularity -- no partial fulfillment.

**Why it happens:**
The OpenRouter service was designed for the old system where gap-fill produced `ChecklistItem` updates (met/note). The Phase 28 FulfillmentResult model was not designed with gap-fill in mind -- it assumes all non-None values come from deterministic formulas.

**Consequences:**
- If `score` is used as `fulfillment`: Pydantic validation crash or absurd overall scores
- If `met` is used (True=1.0, False=0.0): loss of partial fulfillment (a listing 70% meeting a criterion is scored as 100%)
- If gap results are ignored: criteria with gaps are skipped, distorting the weighted average

**Prevention:**
Modify `merge_gap_results` (or add a new function) that converts OpenRouter's 0-100 score to 0.0-1.0 fulfillment:

```python
def gap_result_to_fulfillment(gap_result: dict) -> float:
    """Convert OpenRouter's 0-100 score to 0.0-1.0 fulfillment."""
    score = gap_result.get("score", 50)
    return round(min(1.0, max(0.0, score / 100.0)), 1)
```

Also update the OpenRouter prompt to request fulfillment directly:
```
"Respond with a JSON array: [{"field_name": "...", "fulfillment": <0.0-1.0>, "reasoning": "..."}]"
```

This way gap results natively fit the FulfillmentResult model.

**Warning signs:** Overall scores exceeding 100 or Pydantic `ValidationError` on `fulfillment` field bounds.

**Detection:** Add `assert 0.0 <= f <= 1.0` for every fulfillment value before aggregation.

**Phase:** Address in Phase 31 alongside gap detector rewrite.

---

### Pitfall 4: Cache Invalidation -- Same listing+profile, Different Algorithm, Stale Scores

**What goes wrong:**
The cache key is `(user_id, listing_id, profile_id)` with upsert on conflict (see `002_profiles_schema.sql` line 56: `unique(user_id, listing_id, profile_id)`). When the scoring algorithm changes from Claude-generated to deterministic+aggregation:

1. A listing previously scored by Claude gets `overall_score: 72` stored in `analyses.score` and `analyses.breakdown`.
2. After deploying the new scorer, the same listing+profile returns `overall_score: 65` (different formula).
3. But the edge function cache check (`score-proxy/index.ts` lines 94-115) returns the cached v1 result BEFORE the request reaches the backend.
4. The user sees the old Claude score, not the new deterministic score.
5. Since `stale` is `false` on the cached row (it was valid when written), it never gets re-scored.

**This is worse than just stale data** because:
- The extension has already displayed v1 badges for 8051+ listings across all users
- The `score` column in `analyses` has Claude-generated values
- The `breakdown` column has v1 schema (with `categories`, no `criteria_results`)
- When v2 scores start appearing for NEW listings, users see two different scoring scales on the same page -- some badges from Claude (softer scores), some from deterministic (different distribution)

**Why it happens:**
Phase 30 (DB-01) adds `schema_version` to the `breakdown` JSONB and Phase 31 (DB-02) adds cache rejection for `schema_version < 2`. But this protection exists only in the BACKEND (`scoring.py` router). The EDGE FUNCTION has its own independent cache check (lines 94-115 of `score-proxy/index.ts`) that reads `analyses` directly and returns `breakdown` without checking `schema_version`.

**This means the edge function will happily return v1 cached scores forever**, bypassing the backend's version check entirely.

**Consequences:**
- Users see old Claude scores for previously-scored listings
- Mixed v1/v2 scores on same page (different scales, confusing)
- New score algorithm deployed but appears to do nothing for existing listings
- Only `force_rescore=true` (FAB long-press) would bypass the edge function cache

**Prevention (both layers required):**

**Backend (Phase 31):** Already planned per DB-02. Add to `get_analysis` in `supabase.py`:
```python
def get_analysis(self, user_id, profile_id, listing_id):
    result = self.get_client().table("analyses")...
    if result.data:
        breakdown = result.data.get("breakdown", {})
        if breakdown.get("schema_version", 0) < 2:
            return None  # force re-score
        return breakdown
    return None
```

**Edge function (NOT in Phase 30/31 plans -- MUST ADD):** The edge function must ALSO check schema_version:
```typescript
if (cached && !cached.stale) {
  const schemaVersion = cached.breakdown?.schema_version ?? 0;
  if (schemaVersion >= 2) {
    return new Response(JSON.stringify(cached.breakdown), ...);
  }
  // v1 cache -- fall through to backend for re-score
}
```

**Nuclear option (simpler but destructive):** Run a one-time SQL update to mark all existing analyses as stale:
```sql
UPDATE analyses SET stale = true WHERE (breakdown->>'schema_version')::int IS DISTINCT FROM 2;
```
This forces re-scoring for all existing listings on next request. Combined with the edge function `stale` check (line 103: `if (cached && !cached.stale)`), this clears the entire cache without code changes.

**Warning signs:** After deploying the new scorer, check if any response still contains `"categories"` in the breakdown. If yes, stale v1 responses are leaking through.

**Detection:** Add `X-HomeMatch-Schema-Version` response header from the edge function.

**Phase:** MUST be addressed in Phase 30 (edge function update) AND Phase 31 (backend cache check). Missing the edge function update is the most likely oversight because DB-02 only mentions backend cache logic.

---

### Pitfall 5: ALLOW_CLAUDE_FALLBACK Default -- Accidental Per-Request Claude Costs

**What goes wrong:**
The scoring router (`backend/app/routers/scoring.py`) currently calls `claude_scorer.score_listing()` for EVERY listing (the entire current scoring pipeline). In the merged architecture, Claude should only be called for:
1. Subjective criteria (Phase 29, SS-02: batched call)
2. Summary bullets when all criteria are deterministic (Phase 29, SS-04: minimal call)
3. Full fallback when no ListingProfile exists (legacy path)

If the `ALLOW_CLAUDE_FALLBACK` environment variable is not explicitly set to control fallback behavior, the default path matters enormously:

- **Default=True (dangerous):** Every listing without a ListingProfile (i.e., NOT in the pre-enriched set of 27 listings in zipcode 8051) falls through to the full Claude scoring pipeline. With ~1,792 Zurich listings and only 27 enriched, that's 1,765 listings hitting Claude at ~$0.06 each = **$106 per full-city scoring sweep**.

- **Default=False (safe but degraded):** Unenriched listings return an error or empty response. Users see no scores for most listings. The extension shows loading skeletons that never resolve.

Neither default is acceptable. The correct behavior is a tiered response:
1. ListingProfile exists -> deterministic + gap-fill ($0.0075)
2. No ListingProfile, subjective criteria only -> minimal Claude call (~$0.01)
3. No ListingProfile, full fallback -> Claude full scoring (~$0.06) ONLY if explicitly opted in

**Why it happens:**
The existing router has a single code path that always calls Claude. Adding the ListingProfile path creates a fork, but the fallback default is not specified anywhere in the v5.0 requirements. Someone deploying will forget to set the env var, and the default behavior determines cost.

**Consequences:**
- Default=True: Potentially $100+ in Claude API costs on first deployment if users score multiple pages
- Default=False: Users see broken experience for 98.5% of listings (1765/1792)
- Forgetting to set the env var: Behavior depends on code default, which may change between deploys

**Prevention:**

1. **Make Claude fallback explicit in the router**, with a logged warning:
```python
ALLOW_CLAUDE_FALLBACK = os.environ.get("ALLOW_CLAUDE_FALLBACK", "false").lower() == "true"

# In the scoring router:
if not listing_profile:
    if ALLOW_CLAUDE_FALLBACK:
        logger.warning(
            "No ListingProfile for listing %d -- falling back to Claude ($0.06)",
            request.listing_id,
        )
        return await _score_with_claude(listing, preferences, ...)
    else:
        raise HTTPException(
            status_code=422,
            detail=f"Listing {request.listing_id} has not been enriched yet. Score unavailable."
        )
```

2. **Add a cost-tracking log line** for every Claude fallback call:
```python
logger.warning("CLAUDE_FALLBACK listing=%d cost=~$0.06", listing.pk)
```

3. **Set ALLOW_CLAUDE_FALLBACK=false on EC2 by default.** Only enable after verifying enrichment coverage.

4. **Add a startup log line** that reports the env var state:
```python
logger.info("ALLOW_CLAUDE_FALLBACK=%s", ALLOW_CLAUDE_FALLBACK)
```

**Warning signs:** Claude API costs spike after deployment. Backend logs show "CLAUDE_FALLBACK" entries for many listings.

**Detection:** Monitor `ANTHROPIC_API_KEY` usage on the Claude API dashboard. If costs exceed $1/day, fallback is running unchecked.

**Phase:** Address in Phase 31 (router integration). This is a deployment safety concern, not a code complexity concern.

---

### Pitfall 6: Uniform Noise/Neighborhood Data Producing Uniform Scores

**What goes wrong:**
The HANDOFF.md (Part 7) documents known data limitations from the zipcode-batched enrichment:
- **Noise score is identical for all 27 listings in zipcode 8051:** 40/100
- **Neighborhood character text is identical for all listings**

This means any user criterion about noise ("ruhige Lage", "quiet location") or neighborhood character will produce the SAME fulfillment score for every listing in the same zipcode. Since Zurich has ~25 zipcodes and each zipcode will be enriched as a batch, this pattern scales:
- ~1,792 listings / 25 zipcodes = ~72 listings per zipcode average
- Within each zipcode, noise-related and neighborhood-related criteria contribute the same fulfillment value

For a user with "quiet location" as a CRITICAL criterion (weight=5):
- Every listing in the same zipcode gets the same fulfillment for this criterion
- The overall score distribution compresses -- listings differentiate ONLY on price/size/distance/features/condition
- If the user has multiple neighborhood criteria, the compression is worse

**Quantified impact:**
With 10 criteria total and 2 uniform criteria (noise + neighborhood), those 2 criteria contribute (2 * weight) / (sum of all weights) of the total score. With medium importance (weight=2): `(2*2) / (10*2) = 20%` of the score is static per zipcode. With high importance (weight=3): `(2*3) / (10*3) = 20%` still. The ratio is constant regardless of weight, but the absolute spread of scores shrinks.

If the true noise difference between two listings is 20 points (e.g., street-facing vs courtyard), and both show 40/100, the scorer misattributes 20 points of differentiation. For badge tiers (excellent/good/fair/poor), a 5-7 point swing can change the tier.

**Why it happens:**
The zipcode enrichment pipeline uses shared area research (one Sonnet agent researches the zipcode, then N Haiku agents analyze individual listings). Noise and neighborhood are area-level attributes, not per-listing. This is a fundamental data architecture limitation, not a bug.

**Consequences:**
- Listings on a quiet side street score identically to listings on a busy main road (within same zipcode)
- Users may distrust scores if they know one apartment is noisier than another but scores don't reflect it
- Badge tier distribution within a zipcode is compressed, reducing the tool's discrimination value

**Prevention:**
1. **Accept the limitation for v5.0** -- document in user-facing summary bullets: "Noise assessment is based on neighborhood averages, not building-specific data"
2. **Reduce weight of uniform criteria** -- in the deterministic scorer, detect when multiple listings share the exact same neighborhood scores and log a warning
3. **Phase-specific enrichment upgrade (v5.1):** Per-listing noise estimates using Google Street View noise mapping or OpenStreetMap road proximity data. This is too complex for the initial merge.
4. **In Claude summary bullets (SS-04):** Instruct Claude to note when noise data appears uniform -- "Note: Noise assessment is a neighborhood average; this building faces a main road and may be noisier."

**Warning signs:** All listings in user's search results show identical scores for noise-related criteria.

**Detection:** In the scoring router, log a warning if >80% of listings in a single scoring batch have identical `noise_level_estimate`.

**Phase:** Accept for Phase 31 (initial merge). Flag for v5.1 as a data quality improvement.

---

## Moderate Pitfalls

Mistakes that cause degraded experience, harder debugging, or require rework but don't cause data corruption.

---

### Pitfall 7: OpenRouter Downtime -- No Graceful Degradation

**What goes wrong:**
The OpenRouter service (`backend/app/services/openrouter.py`) has a 60-second timeout per request (line 147). When OpenRouter is unreachable:

1. **Batch call fails** (line 296-297): exception caught, falls back to individual calls
2. **Individual calls fail** (line 216): exception caught, returns `{"score": 50, "met": None, "note": "Could not evaluate"}`
3. But the caller doesn't know these are fallback results vs real evaluations

The 60-second timeout means if OpenRouter is down, EACH gap-fill attempt blocks for 60 seconds before failing. With 5 gaps, that's 5 minutes of blocking (batch attempt + 5 individual attempts = 6 * 60s = 360 seconds). The extension shows a loading skeleton for 6 minutes before the score appears.

**The scoring router does not have a circuit breaker.** Every subsequent request also blocks for 60+ seconds. Under load (10 concurrent users scoring), this exhausts FastAPI's thread pool and blocks ALL endpoints, including `/health`.

**Why it happens:**
OpenRouter is a third-party API aggregator with no SLA guarantee. The current code has timeout + fallback but no circuit breaker pattern to fast-fail after detecting persistent failure.

**Consequences:**
- 1-6 minute scoring latency when OpenRouter is down (vs ~200ms normal)
- Thread pool exhaustion under concurrent load
- Health check timeout -> EC2 appears dead
- Gap results default to `score: 50, met: None` which is misleading (50 is "average" but the real answer is "unknown")

**Prevention:**

1. **Add a circuit breaker** with exponential backoff:
```python
class OpenRouterService:
    def __init__(self):
        self._client = None
        self._consecutive_failures = 0
        self._circuit_open_until = 0.0  # timestamp

    async def _call_openrouter(self, prompt: str) -> str:
        import time
        if time.time() < self._circuit_open_until:
            raise RuntimeError("OpenRouter circuit open -- skipping gap-fill")
        try:
            result = await self._do_call(prompt)
            self._consecutive_failures = 0
            return result
        except Exception:
            self._consecutive_failures += 1
            if self._consecutive_failures >= 3:
                backoff = min(300, 30 * (2 ** (self._consecutive_failures - 3)))
                self._circuit_open_until = time.time() + backoff
            raise
```

2. **Reduce timeout to 15 seconds** (from 60). Gap-fill prompts are small; if OpenRouter hasn't responded in 15s, it won't.

3. **Skip gap-fill when circuit is open** -- return `fulfillment=None` for gap criteria (they get excluded from aggregation per HA-02). This is better than a fake `score: 50`.

4. **Log when gap-fill is skipped** so operators know OpenRouter is down:
```python
logger.warning("OpenRouter circuit open -- %d gaps skipped for listing %d", len(gaps), listing_id)
```

**Warning signs:** Scoring latency spikes to >30s. Backend logs show repeated OpenRouter timeout errors.

**Detection:** Add a Prometheus-style counter for OpenRouter success/failure/skip. Alert if failure rate exceeds 50% over 5 minutes.

**Phase:** Address in Phase 31. The circuit breaker is ~30 lines of code and prevents cascading failures.

---

### Pitfall 8: Extension Expects Full ScoreResponse -- No "Not Enriched" State

**What goes wrong:**
The extension's `api.ts` (line 51) casts the response as `ScoreResponse`:
```typescript
const data = (await res.json()) as ScoreResponse;
```

The `ScoreBadge.tsx` unconditionally renders `score.overall_score` (line 67) and `score.match_tier` (line 22). There is no handling for:

1. **HTTP 422 response** (listing not enriched, ALLOW_CLAUDE_FALLBACK=false): The extension's error handling (`api.ts` lines 43-48) throws an error, which `App.tsx` catches and shows as `"X listing(s) failed to score"`. The user sees loading skeletons that never resolve for unenriched listings, mixed with successful badges for enriched ones. This looks broken.

2. **Partial enrichment**: If 3 of 20 visible listings are enriched and 17 are not, the user sees 3 badges and 17 loading skeletons (or 17 "failed" messages). The loading skeletons persist until cleanup (line 272-275 of `App.tsx`), at which point they just disappear -- no explanation.

3. **"Beta" badge concept**: The milestone context mentions an extension "beta" badge for unenriched listings. No such component exists in the extension code. The `ScoreBadge` component only renders scored listings.

**Why it happens:**
The extension was designed for a world where every score request produces a `ScoreResponse` (either live-scored or cached). The concept of "listing not yet enriched" didn't exist before the ListingProfile system.

**Consequences:**
- Users see a mix of scores and blank spots -- looks like the extension is broken
- No way to communicate "this listing hasn't been analyzed yet" vs "scoring failed"
- User frustration: "Why does it work for some listings but not others?"

**Prevention:**

1. **Return a specific response code for "not enriched"** instead of 422:
```python
# Backend returns a 200 with a special response shape:
if not listing_profile and not ALLOW_CLAUDE_FALLBACK:
    return ScoreResponse(
        overall_score=0,
        match_tier="poor",
        summary_bullets=["This listing has not been enriched yet."],
        categories=[],
        checklist=[],
        language=preferences.language,
        enrichment_status="pending",  # new field
    )
```

OR better:

2. **Add a "not enriched" badge component** to the extension:
```typescript
// extension/src/types/scoring.ts -- add to ScoreResponse:
export interface ScoreResponse {
  // ... existing fields ...
  enrichment_status?: 'ready' | 'pending' | 'error';
}
```
```typescript
// In ScoreBadge, check enrichment_status:
if (score.enrichment_status === 'pending') {
  return <PendingBadge listingId={listingId} />;
}
```

3. **Or simplest: don't show anything for unenriched listings.** The extension already filters out failed requests (line 272-275 of `App.tsx`). Just let them fail silently. This is the least-effort approach but provides no user feedback.

**Warning signs:** User reports "extension only works for some listings" or "loading dots never go away."

**Detection:** Check error rate in extension console logs after deployment.

**Phase:** Phase 32 (Frontend Consumers). The extension type update is already planned in FE-03, but the "not enriched" state handling needs to be added to the requirements.

---

### Pitfall 9: DB Migration Ordering -- 005/006 Must Deploy Before Any ListingProfile Code

**What goes wrong:**
The scoring router imports `listing_profile_db.py` which queries the `listing_profiles` table. If the backend code is deployed before migrations 005 and 006 are applied:

1. FastAPI starts successfully (imports are lazy -- `listing_profile_db` is only imported on first use)
2. First score request triggers `listing_profile_db.get_by_listing_id()` which runs `SELECT * FROM listing_profiles WHERE listing_id = ?`
3. Supabase returns `PostgrestAPIError: relation "listing_profiles" does not exist`
4. The error propagates up as a 500 error to the edge function and extension

**This is worse than a clean startup failure** because:
- The backend appears healthy (`/health` returns 200)
- The error only manifests on the first score request
- The edge function returns 502 to the extension
- The extension shows "Backend unreachable" or "Scoring failed"
- Debugging requires checking backend logs on EC2

Additionally, migration 005 creates the `listing_profiles` table, and 006 adds the `research_json` column. If 006 is applied before 005, it fails (`ALTER TABLE listing_profiles ADD COLUMN` on a nonexistent table). If 005 is applied but the Phase 30 migration (adding `schema_version` to `analyses.breakdown`) is not, the cache version check in Phase 31 code reads `breakdown.schema_version` which is `undefined` -- this is handled gracefully (defaults to 0, triggers re-score), but only if the code handles `undefined` correctly.

**Why it happens:**
Supabase migrations are applied in alphabetical/numeric order by filename. But code deploys (git pull + restart) happen independently of migration deploys (supabase db push). There's no automated check that migrations are up-to-date before code starts.

**Consequences:**
- 500 errors on all score requests if migrations aren't applied first
- Silent table existence errors that look like backend crashes
- If Phase 30 migration is forgotten, cache version gating doesn't work (but fails gracefully)

**Prevention:**

1. **Add a startup health check** that verifies table existence:
```python
# In main.py lifespan:
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify critical tables exist
    import asyncio
    from app.services.supabase import supabase_service
    try:
        client = supabase_service.get_client()
        # This will fail fast if table doesn't exist
        client.table("listing_profiles").select("id").limit(1).execute()
        logger.info("listing_profiles table verified")
    except Exception as e:
        logger.error("CRITICAL: listing_profiles table not found -- apply migration 005 first: %s", e)
        # Don't crash -- let the backend start but log loudly
    yield
    ...
```

2. **Deploy in order:** Always: migrations first, then code. Document this in the deploy script:
```bash
# DEPLOY CHECKLIST:
# 1. npx supabase db push --linked  (applies 005, 006, Phase 30 migration)
# 2. git push to main
# 3. SSH deploy script (git pull + restart)
```

3. **Name migrations with phase prefixes** so ordering is explicit:
- `005_listing_profiles.sql` (existing)
- `006_add_research_json.sql` (existing)
- `007_schema_version_and_fulfillment.sql` (Phase 30 -- must come before Phase 31 code)

**Warning signs:** 500 errors on score requests immediately after deployment, but /health returns 200.

**Detection:** Add a `GET /readiness` endpoint that checks all required tables exist (separate from `/health` which just confirms the process is running).

**Phase:** Phase 30 (Database Schema Prep) should include the migration ordering protocol. Phase 31 code MUST NOT merge before Phase 30 migrations are applied.

---

### Pitfall 10: Proximity Data Bridge -- ListingProfile amenities vs Phase 28 proximity_data

**What goes wrong:**
Phase 28's `score_proximity_quality` function (line 326-359) expects `proximity_data` as a `dict[str, list[dict]]` where:
```python
proximity_data = {
    "supermarket": [{"distance_km": 0.3, "rating": 4.5, "is_fallback": False}],
    "gym": [{"distance_km": 1.2, "rating": 3.8, "is_fallback": True}],
}
```

ListingProfile stores proximity data in a completely different structure:
```python
amenities: dict[str, AmenityCategory]
# where AmenityCategory has:
#   results: list[AmenityResult]
#   AmenityResult has: name, distance_km, rating, review_count, address, type
```

The key differences:
1. **Different dict value types:** Phase 28 expects `list[dict]` with flat keys; ListingProfile has `AmenityCategory` objects with `AmenityResult` objects
2. **Key naming might differ:** Phase 28 uses the field name from DynamicField.name as the key. ListingProfile uses category names like "supermarket", "public_transport". These may not match if the user typed "Supermarkt" (German) but the category is keyed as "supermarket".
3. **No `is_fallback` flag in ListingProfile:** The AmenityResult model has no fallback concept -- it stores all results within the search radius.

If you pass `ListingProfile.amenities` to `score_proximity_quality`, it will fail because:
```python
entries = proximity_data.get(field.name)  # returns AmenityCategory, not list[dict]
entry = entries[0]  # AmenityCategory is not subscriptable
```

**Why it happens:**
Phase 28's proximity scorer was designed to consume the output of the Phase 26 proximity pipeline (`fetch_all_proximity_data`), which returns `dict[str, list[dict]]`. ListingProfile's amenities come from the research agent's Google Places scraping, which stores richer structured data.

**Consequences:**
- `TypeError: 'AmenityCategory' object is not subscriptable` -- runtime crash
- All proximity_quality criteria fail to score
- OR if caught silently, proximity returns None, criteria excluded from aggregation

**Prevention:**
Add a converter in the adapter module:

```python
def listing_profile_amenities_to_proximity_data(
    profile: ListingProfile,
) -> dict[str, list[dict]]:
    """Convert ListingProfile amenities to Phase 28 proximity_data format."""
    proximity_data = {}
    for category_key, category in profile.amenities.items():
        entries = []
        for result in category.results:
            entries.append({
                "distance_km": result.distance_km,
                "rating": result.rating or 3.0,
                "is_fallback": False,  # pre-computed data is never fallback
                "name": result.name,
            })
        # Sort by distance (nearest first) to match Phase 28's expectation
        entries.sort(key=lambda x: x.get("distance_km") or float("inf"))
        if entries:
            proximity_data[category_key] = entries
    return proximity_data
```

Also need to handle the German/English key mapping:
```python
# DynamicField.name might be "Supermarkt" but amenity key is "supermarket"
AMENITY_KEY_ALIASES = {
    "supermarkt": "supermarket",
    "oeffentlicher_verkehr": "public_transport",
    "ov": "public_transport",
    "offentlicher verkehr": "public_transport",
    "schule": "school",
    "fitnesscenter": "gym",
    "fitness": "gym",
    "apotheke": "pharmacy",
    "spital": "hospital",
    "krankenhaus": "hospital",
    "park": "park",
    "kindergarten": "kindergarten",
    "restaurant": "restaurant",
}
```

**Warning signs:** All proximity_quality criteria return `None` (fulfillment=None) even when ListingProfile has amenity data.

**Detection:** Log when `score_proximity_quality` returns None along with whether amenity data existed in the profile.

**Phase:** Address in Phase 31, as part of the adapter module from Pitfall 1.

---

### Pitfall 11: Two Incompatible Weight Scales in Cache

**What goes wrong:**
Existing cached analyses (v1) store category weights using the old scale in the `breakdown` JSONB:
```json
{
  "categories": [
    {"name": "price", "weight": 70, "score": 85, ...},
    {"name": "location", "weight": 90, "score": 62, ...}
  ]
}
```

New v2 analyses use the new weight scale (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1):
```json
{
  "criteria_results": [
    {"criterion_name": "budget", "fulfillment": 0.85, "importance": "high", ...}
  ]
}
```

The analysis page (`web/src/app/(dashboard)/analysis/[listingId]/page.tsx` lines 74-97) and the analyses list page both read from the `analyses` table. When FE-04 (schema_version branching) is implemented, v1 responses render the old category breakdown and v2 responses render the new fulfillment view. But:

1. The `analyses` list page (`/analyses`) shows `score` column for all analyses. V1 scores were Claude-generated (typically 55-85 range). V2 scores are formula-generated (potentially different distribution). Mixed in the same list, scores from different algorithms are compared as if equivalent.

2. The `CategoryBreakdown.tsx` component (line 33-38) maps old weight values to importance labels: `weight >= 70 -> "Critical"`. The new system uses `CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1`. If someone accidentally renders v2 weights (5) through the v1 CategoryBreakdown component, `getImportanceLabel(5)` returns `{label: "Low", variant: "outline"}` because `5 < 30`.

**Why it happens:**
Two parallel weight scale systems existed. The cache retains old values. Frontend branching on `schema_version` is planned but the analysis LIST page (not the detail page) doesn't have schema_version branching planned in the requirements.

**Consequences:**
- Analysis list shows mixed-algorithm scores as if comparable
- If schema_version branching is incomplete, v2 weights render as "Low" importance in the v1 component

**Prevention:**
1. **FE-04 must cover the analyses LIST page too**, not just the detail page. Add visual indicator: "v1" tag on old analyses.
2. **Consider a one-time cache bust** (SQL update to `stale=true` on all analyses, per Pitfall 4's nuclear option). This eliminates mixed-version display entirely.
3. **The analysis page should detect v2 weights** and not pass them to `CategoryBreakdown`:
```typescript
const schemaVersion = breakdown.schema_version ?? 1;
if (schemaVersion >= 2) {
  // Render FulfillmentBreakdown
} else {
  // Render CategoryBreakdown
}
```

**Phase:** Phase 32 (Frontend Consumers). Ensure FE-04 covers both detail AND list pages.

---

## Minor Pitfalls

Issues that cause confusion, extra debugging time, or minor UX problems.

---

### Pitfall 12: ListingProfile attributes Field -- list[str] vs Flatfox API Response

**What goes wrong:**
The ListingProfile model defines `attributes: list[str]` (line 84). But the enrichment pipeline saves attributes from Flatfox API, which returns objects: `[{"name": "balcony"}, {"name": "lift"}]`. Depending on how the save_research.py script processes attributes, they might be stored as:
- `["balcony", "lift"]` (correct -- extracted names)
- `[{"name": "balcony"}, {"name": "lift"}]` (wrong -- raw API objects)

If stored as dicts, the adapter from Pitfall 1 would create `FlatfoxAttribute(name={"name": "balcony"})` -- the name becomes a dict representation instead of a string. `score_binary_feature` would then try to match `"{'name': 'balcony'}"` against the FEATURE_ALIAS_MAP, find no match, and return None.

**Prevention:** Verify `save_research.py` extracts attribute names as strings. Add validation in ListingProfile:
```python
@field_validator("attributes", mode="before")
@classmethod
def normalize_attributes(cls, v):
    if not v:
        return []
    return [item["name"] if isinstance(item, dict) else str(item) for item in v]
```

**Phase:** Address in Phase 31 adapter code.

---

### Pitfall 13: OpenRouter API Key Not Set on EC2 -- Silent Failure

**What goes wrong:**
`openrouter.py` line 152-155:
```python
def _get_api_key(self) -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        logger.error("OPENROUTER_API_KEY is not set in environment")
    return key
```

When the key is missing, it logs an error but returns an empty string. The API call proceeds with `Authorization: Bearer ` (empty bearer token). OpenRouter returns 401. The batch call fails, falls back to individual calls, those also fail, and all gaps get `{"score": 50, "met": None, "note": "Could not evaluate"}`. The scoring pipeline continues as if gap-fill returned neutral results.

The user never sees an error. The scores are subtly wrong because genuinely subjective criteria that needed LLM evaluation are all scored at 50/100 (0.5 fulfillment if converted).

**Prevention:**
1. Fail fast at startup if gap-fill is enabled but key is missing:
```python
# In lifespan:
if not os.environ.get("OPENROUTER_API_KEY"):
    logger.warning("OPENROUTER_API_KEY not set -- gap-fill will be disabled")
```

2. Track in the response whether gap-fill actually ran:
```json
{"gap_fill_status": "success" | "skipped_no_key" | "failed_api_error"}
```

**Phase:** Phase 31. Add to deployment checklist in Phase 30 docs.

---

### Pitfall 14: Price Field Confusion -- rent_gross vs price_display vs price

**What goes wrong:**
Three different "price" fields exist across the system:

| Model | Price Field | Meaning |
|-------|-----------|---------|
| FlatfoxListing | `price_display` | Displayed price (may be stale from API) |
| FlatfoxListing | `rent_gross` | Monthly gross rent (API value, often stale) |
| ListingProfile | `price` | rent_gross or purchase price (enriched) |
| Scoring router | `listing.rent_gross = wp.rent_gross` | Web-scraped override (most accurate) |

The current scoring router (lines 126-138) overrides API prices with web-scraped prices:
```python
if wp.rent_gross is not None and wp.rent_gross != listing.rent_gross:
    listing.rent_gross = wp.rent_gross
    listing.price_display = wp.rent_gross
```

But ListingProfile's `price` was set at enrichment time, potentially weeks ago. The web-scraped price might have changed since enrichment. The adapter (Pitfall 1) maps `profile.price -> listing.price_display`, bypassing the web-scraping override.

**Consequences:**
- Stale prices in ListingProfile produce wrong price fulfillment scores
- A listing reduced from CHF 3,000 to CHF 2,500 still shows the old price in the deterministic score

**Prevention:**
In the hybrid scoring router, when using a ListingProfile, STILL fetch the current web price and override:
```python
# Fetch current web price even when using ListingProfile
page_data = await flatfox_client.get_listing_page_data(profile.slug, profile.listing_id)
wp = page_data.web_prices
if wp.rent_gross is not None:
    adapted_listing.price_display = wp.rent_gross
    adapted_listing.rent_gross = wp.rent_gross
```

This adds ~500ms latency but ensures price accuracy. Alternatively, add a `price_last_checked` timestamp to ListingProfile and only re-scrape if stale (>24h).

**Phase:** Phase 31. This is a data freshness concern that compounds over time.

---

### Pitfall 15: Edge Function Double-Cache -- Stale Results Served Despite Backend Re-score

**What goes wrong:**
Both the edge function AND the backend check the cache independently:

1. **Edge function** (lines 94-115): `SELECT ... FROM analyses WHERE user_id=X AND listing_id=Y AND profile_id=Z`
2. **Backend** (lines 43-54): `supabase_service.get_analysis(user_id, profile_id, listing_id)`

When a listing is re-scored (e.g., after schema version bump), the flow is:
1. Edge function checks cache -> finds v1 entry with `stale=false`
2. Edge function returns cached v1 response (never reaches backend)
3. Backend's schema_version check never runs

Even if the backend correctly rejects v1 cache entries, the edge function has already short-circuited. The only way to bypass is `force_rescore=true`.

**This is the same issue as Pitfall 4** but from the edge function perspective. Listed separately because the fix requires edge function deployment (different deployment process than backend).

**Prevention:** See Pitfall 4. The edge function MUST check schema_version.

**Phase:** Phase 30 (deploy edge function update alongside DB migration).

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 30 (DB Schema Prep) | Migration ordering: listing_profiles (005) and schema_version migration must deploy before any Phase 31 code | Deploy migrations first, verify with `SELECT count(*) FROM listing_profiles`, document in deploy script |
| Phase 30 (DB Schema Prep) | Edge function cache bypass: DB-02 only mentions backend cache check, not edge function | Add schema_version check to score-proxy edge function AND redeploy it in Phase 30 |
| Phase 31 (Hybrid Scorer) | FlatfoxListing/ListingProfile mismatch: passing wrong model to scorer functions | Build `listing_profile_to_flatfox` adapter, add type assertion at router level |
| Phase 31 (Hybrid Scorer) | Gap detection finds zero gaps because it looks for [GAP] markers in ChecklistItem | Rewrite `detect_gaps` to consume FulfillmentResult (fulfillment=None) |
| Phase 31 (Hybrid Scorer) | OpenRouter returns 0-100 score but aggregation needs 0.0-1.0 fulfillment | Convert `score/100` to fulfillment, or update OpenRouter prompt to return fulfillment directly |
| Phase 31 (Hybrid Scorer) | ALLOW_CLAUDE_FALLBACK defaults to True, causing unexpected Claude costs | Default to False, log every fallback call with cost estimate |
| Phase 31 (Hybrid Scorer) | Proximity data format mismatch: AmenityCategory objects vs flat dicts | Add `amenities_to_proximity_data` converter to adapter module |
| Phase 31 (Hybrid Scorer) | OpenRouter down = 6-minute scoring delay per listing | Add circuit breaker (3 failures -> skip gap-fill), reduce timeout to 15s |
| Phase 31 (Hybrid Scorer) | Price stale in ListingProfile (enriched weeks ago) | Re-scrape web price even when using ListingProfile |
| Phase 32 (Frontend) | Extension shows loading skeletons for unenriched listings | Either add "pending" badge or return graceful empty response |
| Phase 32 (Frontend) | Mixed v1/v2 scores in analyses list, different algorithms look comparable | Add visual indicator for score version on analyses list page |
| Phase 32 (Frontend) | v2 weights (5/3/2/1) rendered through v1 CategoryBreakdown shows wrong labels | schema_version branching must cover BOTH detail and list pages |
| All phases | Uniform noise/neighborhood scores (40/100 for all in zipcode) | Accept for v5.0, document limitation, flag for per-listing enrichment in v5.1 |

---

## Integration Test Checklist

Before declaring the merge complete, verify these scenarios:

1. **ListingProfile exists, all criteria deterministic:** Score computed without any LLM call, returned in <200ms
2. **ListingProfile exists, some criteria subjective:** Deterministic + Claude subjective + aggregation
3. **ListingProfile exists, some criteria have gaps:** Deterministic + gap detection + OpenRouter fill + aggregation
4. **ListingProfile does NOT exist, ALLOW_CLAUDE_FALLBACK=false:** Returns 422 or graceful "not enriched" response
5. **ListingProfile does NOT exist, ALLOW_CLAUDE_FALLBACK=true:** Full Claude fallback path still works
6. **Cached v1 analysis:** Edge function AND backend both reject it, trigger re-score
7. **Cached v2 analysis:** Edge function returns it immediately
8. **OpenRouter down:** Circuit breaker activates, scoring completes without gap-fill, criteria with gaps excluded from aggregation
9. **OPENROUTER_API_KEY missing:** Logged warning at startup, gap-fill skipped gracefully
10. **Extension renders v1 cached score:** CategoryBreakdown shown
11. **Extension renders v2 new score:** FulfillmentBreakdown shown
12. **Analysis list shows mix of v1 and v2:** Each clearly labeled with version indicator

---

## Sources

All pitfalls verified against actual source code in the repository:

- `backend/app/services/deterministic_scorer.py` -- Phase 28 committed scorer (439 lines)
- `backend/app/models/listing_profile.py` -- ListingProfile model (local, 155 lines)
- `backend/app/services/gap_detector.py` -- Gap detector (local, 78 lines)
- `backend/app/services/openrouter.py` -- OpenRouter client (local, 373 lines)
- `backend/app/routers/scoring.py` -- Scoring router (committed, 179 lines)
- `backend/app/models/scoring.py` -- ScoreResponse/ChecklistItem models (62 lines)
- `backend/app/models/preferences.py` -- UserPreferences/DynamicField/CriterionType (220 lines)
- `backend/app/models/listing.py` -- FlatfoxListing model (111 lines)
- `backend/app/services/supabase.py` -- Cache read/write (157 lines)
- `backend/app/services/claude.py` -- Claude scorer (104 lines)
- `supabase/functions/score-proxy/index.ts` -- Edge function (157 lines)
- `extension/src/types/scoring.ts` -- Extension TypeScript types (41 lines)
- `extension/src/entrypoints/content/components/ScoreBadge.tsx` -- Badge component (79 lines)
- `extension/src/entrypoints/content/App.tsx` -- Extension app (299 lines)
- `extension/src/lib/api.ts` -- Extension API client (94 lines)
- `web/src/components/analysis/CategoryBreakdown.tsx` -- Category UI (125 lines)
- `web/src/components/analysis/ChecklistSection.tsx` -- Checklist UI (104 lines)
- `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` -- Analysis page (141 lines)
- `supabase/migrations/002_profiles_schema.sql` -- analyses table schema
- `supabase/migrations/005_listing_profiles.sql` -- listing_profiles table
- `.planning/HANDOFF.md` -- Data quality assessment, side-by-side comparison
- `.planning/REQUIREMENTS.md` -- v5.0 requirements (24 items)
- `.planning/ROADMAP.md` -- Phase dependencies and ordering
