# Feature Landscape: Hybrid Scoring Pipeline (Merged v5.0 + v6.0)

**Domain:** Multi-layer property scoring pipeline with pre-computed data, deterministic formulas, gap-fill, and gated Claude fallback
**Researched:** 2026-03-30
**Confidence:** HIGH (based on existing codebase analysis, HANDOFF.md comparison, built+tested code in `backend/`, and domain pattern research)

---

## Table Stakes

Features users expect. Missing = product feels broken, regressed, or cost-unpredictable.

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| 1 | **Multi-layer scoring pipeline (cache -> deterministic -> gap-fill -> fallback)** | The scoring router must try the cheapest path first and only escalate when data is missing. Without this ordering, every request hits Claude ($0.06/listing) or OpenRouter ($0.0075/listing) unnecessarily. | Med | `scoring.py` router already has cache check; `deterministic_scorer.py` + `gap_detector.py` + `openrouter.py` exist; `listing_profile_db.py` provides profile lookup | The router (`scoring.py`) must be rewritten to orchestrate: (1) cache hit? return, (2) ListingProfile exists? run deterministic scorer, (3) gaps detected? fill via OpenRouter, (4) `ALLOW_CLAUDE_FALLBACK=true`? run Claude, (5) else return partial score. Current router goes straight to Claude after cache miss. |
| 2 | **ALLOW_CLAUDE_FALLBACK env var (default false)** | Without gating, any listing without a ListingProfile falls through to the old Claude path at $0.06/call. In production, this must be opt-in to prevent unexpected costs. The env var pattern is the simplest feature gate that does not require a feature flag service. | Low | `os.environ.get("ALLOW_CLAUDE_FALLBACK", "false")` in `scoring.py` | Check once at module load or per-request. Default `false` means non-enriched listings get a partial/unavailable response instead of a Claude call. This is a kill switch, not a feature flag -- it gates an entire code path. No external service needed. |
| 3 | **Grey "beta" badge for non-enriched listings** | When `ALLOW_CLAUDE_FALLBACK=false` and no ListingProfile exists, the extension must communicate "we cannot score this listing yet" without showing an error or a misleading score. A grey badge with "beta" or "N/A" is the standard pattern for incomplete/unavailable states in browser extensions. | Low | Extension `ScoreBadge.tsx`, new `UnavailableBadge.tsx` or sentinel response from backend | Two options: (a) backend returns a sentinel ScoreResponse with `match_tier="unavailable"` and `overall_score=-1`, or (b) backend returns HTTP 204/404 and extension renders a local grey badge. Option (b) is cleaner -- the backend should not pretend to have a score when it does not. Extension renders a distinct component. |
| 4 | **Claude subjective-only scorer (Phase 29)** | Genuinely subjective criteria ("quiet neighborhood", "modern kitchen feel") cannot be evaluated deterministically. Claude must handle these, but ONLY these -- never numeric scores, never overall scores. | High | SS-01 through SS-04 requirements; new `ClaudeSubjectiveResponse` Pydantic model; rewritten prompt in `backend/app/prompts/scoring.py`; existing image analysis and proximity data formatting must be preserved | This is the highest-complexity table-stakes feature. The prompt rewrite must preserve: sale vs rent price distinction, language rules, image analysis guidance, proximity data section format. Claude returns `SubjectiveCriterionResult(criterion, fulfillment, reasoning)` per subjective criterion. Batched into one `messages.parse()` call. |
| 5 | **Weighted aggregation engine (Phase 31)** | The overall score must be computed deterministically in Python, not by Claude. Formula: `score = (sum(w * f) / sum(w)) * 100` with CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 weights. | Med | Phase 28 FulfillmentResult model (done), Phase 29 SubjectiveCriterionResult (needed), IMPORTANCE_WEIGHT_MAP (done in `preferences.py`) | Missing data (fulfillment=None) excluded from both numerator and denominator. CRITICAL f=0 forces `match_tier="poor"` and caps score at 39. This is straightforward arithmetic with one important edge case: all criteria skipped = no score computable. |
| 6 | **ScoreResponse v2 with backward compatibility** | The response schema changes from 5-category breakdown to per-criterion fulfillment. Extension and web consumers must handle both v1 (cached) and v2 (new) responses without breaking. | Med | HA-04 requirement; `schema_version` field; `criteria_results` replaces `categories` | The additive migration pattern: keep `overall_score`, `match_tier`, `summary_bullets` field names unchanged. Add `schema_version: 2` and `criteria_results: list[CriterionResult]`. Remove `categories` (breaking change). Frontend branches on `schema_version`. Extension TypeScript types are additive-only since badge only reads `overall_score` + `match_tier`. |
| 7 | **Summary bullets generation** | Users rely on 3-5 pro/con bullets for quick scan. Must be generated even when all criteria are deterministic (no Claude call). | Med | SS-04 requirement; either a separate minimal Claude call for bullets-only, or deterministic bullet generation from fulfillment results | Two strategies: (a) always call Claude for bullets (even when all scoring is deterministic), or (b) generate bullets deterministically from top/bottom fulfillment results. Strategy (a) is simpler and higher quality. Strategy (b) is $0 cost but requires i18n templates (DE/FR/IT/EN). Recommend (a) with a BulletsOnlyResponse model for the Claude call. |
| 8 | **Score cache version gating** | Old v1 cached scores must not be served with the new v2 frontend. Cache reads must reject `schema_version < 2` entries and trigger re-score. | Low | DB-01, DB-02 requirements; `analyses` table `breakdown` JSONB needs `schema_version` field | The existing cache check in `scoring.py` line 42-53 returns `ScoreResponse.model_validate(cached)`. After v2 ships, this validation will fail on v1 entries because `criteria_results` is missing. Explicit version check is safer than relying on validation failure: check `cached.get("schema_version", 1) >= 2` before returning. |
| 9 | **Database migrations (005 + 006 + v2 schema prep)** | The `listing_profiles` table and `research_json` column must exist before the deterministic scorer can look up pre-computed data. The `fulfillment_data` and `schema_version` columns must exist before v2 scores are saved. | Low | Migrations 005 (listing_profiles table), 006 (research_json column), new migration for DB-01 + DB-03 (fulfillment_data + schema_version) | All migrations are additive (CREATE TABLE, ALTER TABLE ADD COLUMN). No destructive changes. Deploy before any scoring code that references these tables/columns. |

## Differentiators

Features that set the hybrid system apart. Not expected by users, but add significant value.

| # | Feature | Value Proposition | Complexity | Dependencies | Notes |
|---|---------|-------------------|------------|--------------|-------|
| 1 | **Pre-computed ListingProfile data layer** | The enrichment pipeline (zipcode-batched) pre-computes condition scores, amenity distances (haversine), market context, and neighborhood data. This is the DATA that makes deterministic scoring possible. Without it, every criterion falls to Claude or gets skipped. | Already built | `listing_profile.py`, `listing_analyzer.py`, `listing_profile_db.py`, `flatfox_poller.py`; 27 listings in 8051 already enriched | This is the foundation the v5.0 plan assumed but never specified how to build. Coverage expansion (beyond 8051) is a future concern but not a blocker for the pipeline. |
| 2 | **OpenRouter Gemini Flash gap-fill** | When the deterministic scorer cannot answer a criterion (missing data in ListingProfile), a cheap LLM ($0.0075/listing) fills the gap using listing description text. This is 8x cheaper than Claude and fills information holes that would otherwise be skipped. | Already built | `openrouter.py` (373 lines), `gap_detector.py` (78 lines); `OPENROUTER_API_KEY` env var on EC2 | The gap-fill outputs `score/met/note` per gap. For v2, this should be adapted to output `fulfillment` (0.0-1.0) instead of `score` (0-100). The `merge_gap_results` function updates checklist items. For v2, it should produce `FulfillmentResult` entries instead. |
| 3 | **Criterion type transparency in UI** | Show users which scores are computed deterministically (calculator icon) vs AI-judged (sparkle icon). Builds trust. | Low | `criterion_type` field already stored on DynamicField (Phase 27 done); passed through to `CriterionResult` in response | No backend work needed beyond including `criterion_type` in the response. Frontend renders appropriate icon per criterion. |
| 4 | **Instant deterministic re-score** | When all of a user's criteria are non-subjective, re-scoring is instant (~50ms) and $0. No Claude call, no OpenRouter call. | Low (inherent) | Deterministic scorer + weighted aggregation; only triggers if zero subjective criteria | This is an emergent benefit of the architecture, not a separate feature to build. The pipeline naturally skips expensive calls when not needed. |
| 5 | **Partial score for non-enriched listings** | Instead of "unavailable", show a partial score based on whatever the listing API data provides (price, rooms, sqm, attributes). Built-in preferences (budget, rooms, living_space) can always be scored deterministically from Flatfox API data. | Med | `synthesize_builtin_results()` (done); need to wire it to work without a ListingProfile | Currently the deterministic path requires a ListingProfile lookup. A "lite" path could run `synthesize_builtin_results()` + `score_binary_feature()` against raw Flatfox listing data, producing a partial score for built-in fields only. Better than "unavailable" for most users. |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full feature flag service (LaunchDarkly, GrowthBook)** | The only thing being gated is the Claude fallback path. A boolean env var (`ALLOW_CLAUDE_FALLBACK`) is sufficient. Adding a feature flag service for one toggle is over-engineering. | Env var checked at request time. Restart backend to change. |
| **Automatic Claude fallback for deterministic failures** | If the deterministic scorer cannot compute a fulfillment (missing data), falling through to Claude per-criterion creates unpredictable cost and latency. | Missing data = skip criterion in aggregation. Gap-fill via OpenRouter handles the rest. Claude is only for subjective criteria, never as a deterministic fallback. |
| **Dual badge rendering (v1 + v2 side by side)** | Showing both old and new scores confuses users and doubles rendering complexity. | Clean cutover: cache version bump invalidates old scores. Users see grey "rescoring needed" state until new scores are computed. |
| **Extension-side scoring logic** | Moving aggregation or deterministic formulas to the extension adds code duplication and trust issues (client-computed scores are tamperable). | All scoring stays server-side. Extension is a display layer only. |
| **Real-time ListingProfile updates** | Triggering re-enrichment when a listing changes on Flatfox is complex (webhook or polling) and not needed for hackathon scope. | Enrichment is batch-mode (per-zipcode). Staleness is acceptable for 1-2 week intervals. |
| **OpenRouter model auto-routing** | OpenRouter's auto-router is non-deterministic -- same prompt may hit different models. For reproducible gap-fill, pin to a specific model. | Pin to `google/gemini-2.0-flash-001` explicitly (already done in `openrouter.py` line 31). |
| **ScoreResponse v1 deprecation headers** | Adding `Deprecation: true` and `Sunset` headers is an API best practice for public APIs but unnecessary for an internal API consumed only by the extension and web app. | Cache version gating is sufficient. Old v1 entries silently trigger re-score. |

## Feature Dependencies (Implementation Order)

```
ALREADY DONE (Phases 27-28):
  CriterionType enum + classification at profile save [Phase 27]
  Deterministic scorer formulas (DS-01 through DS-06) [Phase 28]
  FulfillmentResult model [Phase 28]
  IMPORTANCE_WEIGHT_MAP (CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1) [Phase 27]
  ListingProfile model + DB CRUD [v6.0 built code]
  Gap detector + OpenRouter gap-fill [v6.0 built code]
  Enrichment pipeline (8051 tested) [v6.0 built code]

NEEDS BUILDING (Phases 29-32, adjusted):

Phase 29: Deploy Data Foundation + Wire Pipeline
  Apply DB migrations (005, 006) ──────────────────┐
  Set OPENROUTER_API_KEY on EC2 ───────────────────┤
  Rewrite scoring.py router to multi-layer flow ───┤
  ALLOW_CLAUDE_FALLBACK env var ───────────────────┤
  Grey "beta" badge in extension ──────────────────┘
    (All independent, deploy together as one unit)

Phase 30: Claude Subjective-Only Scorer
  ClaudeSubjectiveResponse Pydantic model ─────────┐
  Rewritten scoring prompt (fulfillment-only) ─────┤
  Batched messages.parse() for subjective criteria ┤
  BulletsOnlyResponse for deterministic-only case ─┤
  Skip Claude if zero subjective criteria ─────────┘
    Depends on: Phase 29 (router must route subjective criteria)

Phase 31: Aggregation Engine + ScoreResponse v2
  Weighted aggregation formula ────────────────────┐
  CRITICAL override (f=0 -> poor, cap 39) ─────────┤
  Missing data exclusion in aggregation ───────────┤
  ScoreResponse v2 schema (criteria_results) ──────┤
  schema_version field in analyses JSONB ──────────┤
  Cache version gating (reject v1) ────────────────┤
  fulfillment_data column migration ───────────────┘
    Depends on: Phase 30 (subjective fulfillment values needed)

Phase 32: Frontend Consumers
  Extension TypeScript types (additive v2 shape) ──┐
  Extension grey/beta badge component ─────────────┤
  FulfillmentBreakdown component (analysis page) ──┤
  ChecklistSection threshold update (>=0.7/0.3) ───┤
  schema_version branching (v1 legacy rendering) ──┘
    Depends on: Phase 31 (ScoreResponse v2 must be defined)
```

## Detailed Feature Analysis

### Feature 1: Multi-Layer Scoring Pipeline

**What it is:** The `scoring.py` router orchestrates a waterfall of increasingly expensive scoring paths. Each layer is tried in order; the first to produce a complete result wins.

**Layers:**
1. **Cache** (cost: $0, latency: ~10ms): Check `analyses` table for existing score with `schema_version >= 2`.
2. **Deterministic** (cost: $0, latency: ~50ms): Look up `ListingProfile` from `listing_profiles` table. Run `score_deterministic()` for all non-subjective criteria. Run `synthesize_builtin_results()` for budget/rooms/sqm.
3. **Gap-fill** (cost: ~$0.0075, latency: ~500ms): Run `detect_gaps()` on any criteria the deterministic scorer could not answer. Send gaps to OpenRouter Gemini Flash via `fill_gaps()`. Merge results back.
4. **Claude subjective** (cost: ~$0.03-0.06, latency: ~2-5s): Batch all `subjective`-type criteria into a single Claude `messages.parse()` call. Returns per-criterion fulfillment + reasoning. Only runs if subjective criteria exist.
5. **Claude fallback** (cost: ~$0.06, latency: ~6-10s): Old full-Claude path. Gated by `ALLOW_CLAUDE_FALLBACK=true`. Only runs when no ListingProfile exists AND the env var allows it.

**Current state:** The existing `scoring.py` (179 lines) goes: cache check -> Flatfox fetch -> geocode -> proximity fetch -> Claude score -> save. It needs to be restructured to insert layers 2-4 between cache check and Claude.

**Implementation pattern:** The router should be a linear waterfall, not nested if/else. Each layer returns either a complete `ScoreResponse` (short-circuit) or partial results that feed the next layer. The existing `scoring.py` is 179 lines; the new version will be ~250-300 lines.

### Feature 2: ALLOW_CLAUDE_FALLBACK Env Var

**What it is:** A boolean environment variable that gates whether the old full-Claude scoring path is available as a last resort. When `false` (default), listings without pre-computed data get a partial or unavailable response instead of an expensive Claude call.

**Pattern:** This is the simplest form of a "kill switch" operational flag. No feature flag service needed. The env var is read once at module load:

```python
ALLOW_CLAUDE_FALLBACK = os.environ.get("ALLOW_CLAUDE_FALLBACK", "false").lower() == "true"
```

**Why env var, not feature flag service:** The ConfigCat blog on feature flags vs environment variables notes that env vars are appropriate for "simple on/off switches that don't need runtime toggling." This flag is changed by operators (not end users), changes infrequently (once at deploy), and has a single binary state. A feature flag service would add a dependency, a dashboard, and latency (SDK init) for no benefit.

**Default false rationale:** Cost safety. If the backend deploys before enrichment covers all zipcodes, the default prevents surprise Claude charges. Operators explicitly opt in by setting `ALLOW_CLAUDE_FALLBACK=true` when they are comfortable with the cost.

### Feature 3: Grey "Beta" Badge for Non-Enriched Listings

**What it is:** When the scoring pipeline cannot produce a score (no ListingProfile, Claude fallback disabled), the extension shows a grey badge with a "beta" or "N/A" label instead of a colored score badge.

**Expected behavior:**
- Badge is grey/muted, clearly distinct from scored badges (green/blue/amber/red)
- Text reads "N/A" or "--" (not "0" -- zero implies "evaluated and terrible")
- Clicking the grey badge shows a tooltip/panel: "This listing hasn't been analyzed yet. Scoring is available for select Zurich neighborhoods."
- No error state, no loading spinner -- this is an intentional "not yet available" state

**Implementation:** The extension already has visual state precedent: `isStale` with `isPrefStale` (grey/greyed-out) and `isProfileStale` (amber ring). The "unavailable" state follows the same pattern but is a third distinct state.

Backend returns one of:
- HTTP 200 with `ScoreResponse` where `match_tier="unavailable"` (new sentinel tier) and `overall_score=-1`
- Or HTTP 204 No Content (cleaner, but requires extension to handle non-200)

Recommend the sentinel approach because it flows through the existing `ScoreResponse` pipeline without special HTTP status handling. The extension checks `score.match_tier === "unavailable"` and renders `UnavailableBadge` instead of `ScoreBadge`.

**Scope note:** The user constraint says "Test scope: 8051 Schwamendingen (27 pre-enriched listings)." All other listings will show grey badges until enrichment expands. This is acceptable for a hackathon demo if the demo is conducted on 8051 listings.

### Feature 4: OpenRouter as Gap-Fill

**What it is:** The `openrouter.py` service (already built, 373 lines) sends unanswered criteria to Gemini 2.0 Flash via OpenRouter for cheap evaluation. Currently outputs `score/met/note` per gap.

**Adaptation needed for v2:** The current gap-fill returns `score: int (0-100)` and `met: bool|null`. For the v2 pipeline, it should return `fulfillment: float (0.0-1.0)` to match `FulfillmentResult`. The conversion is trivial: `fulfillment = score / 100.0`. But the prompt should be updated to ask for fulfillment directly rather than converting after the fact.

**Cost analysis:**
- Gemini 2.0 Flash via OpenRouter: ~$0.10/M input tokens, ~$0.40/M output tokens
- Average gap-fill prompt: ~500 input tokens, ~200 output tokens per batch
- Per-listing cost: ~$0.0075 (from HANDOFF.md testing)
- At 27 test listings: ~$0.20 total
- At 1,792 Zurich listings: ~$13.44 total

**Deterministic model pinning:** The `openrouter.py` already pins to `google/gemini-2.0-flash-001` (line 31). This is correct. OpenRouter's auto-routing is non-deterministic (different models may handle the same prompt on different days). For reproducible scoring, always pin the model.

**Fallback behavior:** If OpenRouter is unreachable, the service returns safe defaults (`met=None, score=50, note="Could not evaluate"`). For v2, this should return `fulfillment=None` so the criterion is skipped in aggregation rather than penalized.

### Feature 5: ScoreResponse v2 with Backward Compatibility

**What it is:** The response schema evolves from 5 fixed categories to N per-criterion fulfillment results, with a `schema_version` field for cache compatibility.

**v1 schema (current):**
```python
class ScoreResponse(BaseModel):
    overall_score: int          # 0-100, from Claude
    match_tier: str             # excellent/good/fair/poor
    summary_bullets: list[str]  # 3-5 bullets, from Claude
    categories: list[CategoryScore]  # 5 fixed categories
    checklist: list[ChecklistItem]   # met/not-met/unknown
    language: str
```

**v2 schema (new):**
```python
class ScoreResponse(BaseModel):
    overall_score: int          # 0-100, computed by Python aggregation
    match_tier: str             # excellent/good/fair/poor/unavailable
    summary_bullets: list[str]  # 3-5 bullets
    criteria_results: list[CriterionResult]  # NEW: per-criterion breakdown
    checklist: list[ChecklistItem]  # preserved for compatibility
    language: str
    schema_version: int = 2     # NEW: version discriminator
    dealbreaker_triggered: bool = False  # NEW
    dealbreaker_criterion: Optional[str] = None  # NEW
```

**Backward compatibility strategy:** The tolerant reader pattern. The extension badge only reads `overall_score` and `match_tier` -- both field names are unchanged, so the badge works with v1 and v2 responses without modification. The analysis page (web) branches on `schema_version`: v1 renders legacy `CategoryBreakdown`, v2 renders new `FulfillmentBreakdown`. This is the standard additive migration pattern.

**Cache migration:** No SQL data migration needed. The `analyses` table stores scores as JSONB. Existing v1 entries lack `schema_version`. The cache read checks: if `schema_version` is missing or < 2, treat as cache miss and re-score. Old v1 entries naturally expire as listings are re-scored.

**Extension TypeScript types:** Additive only. The existing `ScoreResponse` interface keeps all current fields. New fields (`criteria_results`, `schema_version`, `dealbreaker_triggered`) are added as optional. This is a non-breaking TypeScript change.

## Edge Cases and Boundary Conditions

| Edge Case | Pipeline Layer | Expected Behavior | Implementation |
|-----------|---------------|-------------------|----------------|
| ListingProfile exists but has zero amenity data | Layer 2 (deterministic) | Distance/proximity criteria return `fulfillment=None` (skip). Built-in fields (budget, rooms, sqm) still score normally. | `get_amenity_distance()` returns `None` -> scorer returns `None` -> aggregation skips. |
| All criteria are subjective | Layer 4 (Claude) | All criteria go to Claude batch. Deterministic scorer produces zero results. Aggregation uses only Claude fulfillments. | Pipeline naturally handles: deterministic results list is empty, subjective list is full. |
| OpenRouter key not set | Layer 3 (gap-fill) | `_get_api_key()` logs error, gap-fill returns safe defaults, gaps remain as "skipped" in aggregation. | Existing graceful degradation in `openrouter.py`. |
| ALLOW_CLAUDE_FALLBACK=false and no ListingProfile | Layer 5 blocked | Backend returns sentinel response (`match_tier="unavailable"`). Extension shows grey badge. | The router must handle this case explicitly and not raise an HTTP error. |
| Listing has price but no ListingProfile | Mixed | Budget criterion scores deterministically from Flatfox API data (via `synthesize_builtin_results`). Other criteria are unavailable. | Built-in fields use listing data directly, not ListingProfile. They always work if the listing has the relevant field. |
| Cache has v1 entry, backend now serves v2 | Cache layer | Cache check sees `schema_version=1` (or missing), treats as miss, re-scores with v2 pipeline. Old v1 entry remains in DB but is never served. | Version check before `ScoreResponse.model_validate(cached)`. |
| Claude returns fulfillment outside 0.0-1.0 range | Layer 4 | Pydantic validation on `SubjectiveCriterionResult` rejects invalid values. The `messages.parse()` structured output constrains this, but a `field_validator` with clamping is the safety net. | `fulfillment: float = Field(ge=0.0, le=1.0)` + round to 0.1 step post-parse. |
| Zero criteria evaluable (all skipped) | Aggregation | Cannot compute a score. Return `overall_score=0`, `match_tier="poor"`, with a note: "Insufficient data to evaluate this listing." | Guard in aggregation: `if sum_weights == 0: return sentinel_response`. |

## MVP Recommendation

**For the hackathon demo (8051 Schwamendingen, 27 pre-enriched listings):**

Prioritize in this exact order:

1. **Deploy data foundation** (migrations + env vars + push built code) -- enables everything else
2. **Rewrite scoring router** (multi-layer pipeline) -- the core architectural change
3. **Claude subjective-only scorer** (Phase 29 SS-01 through SS-04) -- needed for criteria the deterministic scorer cannot handle
4. **Weighted aggregation + ScoreResponse v2** (Phase 31 HA-01 through HA-04) -- produces the final score
5. **Grey "unavailable" badge** -- minimal extension change for non-enriched listings
6. **Cache version gating** (DB-01, DB-02) -- prevents stale v1 scores from appearing
7. **Extension TypeScript types update** (FE-03) -- additive, non-breaking
8. **Frontend FulfillmentBreakdown** (FE-01, FE-04) -- analysis page update

**Defer to post-hackathon:**
- FE-02 (ChecklistSection threshold update) -- met/partial/not-met thresholds are cosmetic
- Enrichment scale-out (other Zurich zipcodes) -- demo uses 8051 only
- Partial scoring for non-enriched listings (differentiator #5) -- nice-to-have, not needed for demo

## Sources

- Existing codebase analysis: `backend/app/routers/scoring.py`, `backend/app/services/deterministic_scorer.py`, `backend/app/services/gap_detector.py`, `backend/app/services/openrouter.py`, `backend/app/models/listing_profile.py`, `backend/app/models/scoring.py`
- Extension consumers: `extension/src/types/scoring.ts`, `extension/src/entrypoints/content/components/ScoreBadge.tsx`, `extension/src/entrypoints/content/App.tsx`
- [Feature Flags: What They Are, How They Work, and Why They Matter (2026)](https://blog.growthbook.io/what-are-feature-flags/)
- [Beyond Environment Variables: When to Use Feature Flags | ConfigCat](https://configcat.com/blog/feature-flags-vs-environment-variables/)
- [Versioning Best Practices in REST API Design | Speakeasy](https://www.speakeasy.com/api-design/versioning)
- [Best Practices for Designing Backward-Compatible REST APIs | ABP.IO](https://abp.io/community/articles/best-practices-for-designing-backward-compatible-rest-apis-in-a-microservice-solution-for-.net-developers-9rzlb4q6)
- [API Versioning & Schema Evolution | Vidhya Sagar Thakur](https://www.vidhyasagarthakur.engineer/blog/api-versioning-and-schema-evolution-url-vs-header-versioning-backward-compatibility-migration-strategies-and-contract-testing)
- [What 1,200 Production Deployments Reveal About LLMOps in 2025 | ZenML](https://www.zenml.io/blog/what-1200-production-deployments-reveal-about-llmops-in-2025)
- [OpenRouter Review 2025: Multi-Model LLM Gateway | Skywork](https://skywork.ai/blog/openrouter-review-2025/)
- [A Practical Guide to OpenRouter | Miles K., Medium](https://medium.com/@milesk_33/a-practical-guide-to-openrouter-unified-llm-apis-model-routing-and-real-world-use-d3c4c07ed170)
- HANDOFF.md side-by-side comparison of v5.0 and v6.0 approaches
- REQUIREMENTS.md v5.0 requirements (DM/DS/SS/HA/DB/FE)
