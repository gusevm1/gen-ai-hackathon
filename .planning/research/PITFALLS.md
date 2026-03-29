# Domain Pitfalls: v5.0 Hybrid Scoring Engine

**Domain:** Replacing LLM-generated scores with deterministic formulas + AI subjective evaluation in a cached, multi-consumer system
**Researched:** 2026-03-29
**Milestone:** v5.0 Hybrid Scoring Engine
**Confidence:** HIGH (all pitfalls verified against codebase evidence -- scoring.py, preferences.py, listing.py, scoring router, edge function, extension types, frontend analysis page, analyses list page)

---

## Critical Pitfalls

Mistakes that cause data corruption, user-visible breakage across the 3 consumers (extension badge, extension summary panel, web analysis page), or scoring errors that produce wrong results silently.

---

### Pitfall 1: Cached Analyses Have Old ScoreResponse Schema -- Frontend Crashes on Missing Fields

**What goes wrong:**
The `analyses` table stores the full `ScoreResponse` as JSONB in the `breakdown` column. Existing cached rows have the v1.1 schema: `{ overall_score, match_tier, summary_bullets, categories: [{name, score, weight, reasoning}], checklist, language }`. The v5.0 schema removes `categories` (replaced by per-criterion fulfillment) and changes `overall_score` from Claude-generated to formula-computed. After deploying v5.0, cached rows still have the old schema. Three consumers read `breakdown` directly:

1. **Web analysis page** (`/analysis/[listingId]/page.tsx` line 74-90): casts `breakdown` to a typed object expecting `categories` array with `score` and `weight` fields. `CategoryBreakdown` component renders `cat.score` as text and `cat.weight` as an importance label. With v5.0 schema, `categories` is gone -- the component receives `undefined`, the `categories.map()` call is guarded by `if (!categories || categories.length === 0) return null` so it silently shows nothing. The user sees a blank analysis page with no category breakdown.

2. **Web analyses list** (`/analyses/page.tsx` line 102-108): reads `breakdown.match_tier` with fallback `getTierFromScore(analysis.score)`. This survives because it falls back to the `score` column. But the `score` column itself (line 82 of `supabase.py`) is written as `score_data["overall_score"]` -- if v5.0 renames or recomputes this field, the `score` column in the DB still has the old Claude-generated value. Old and new scores coexist in the same list, using different scales.

3. **Chrome extension** (`ScoreBadge.tsx` line 67): renders `score.overall_score` directly in the badge circle. The extension casts the API response as `ScoreResponse` (`api.ts` line 51). If the new schema changes the field name or removes it, the badge shows `undefined` or `NaN`.

**Why it happens:**
No cache versioning mechanism exists. The edge function returns cached `breakdown` JSONB verbatim (line 105 of `score-proxy/index.ts`). There is no schema version field in the analyses table. Old and new records are indistinguishable.

**Consequences:**
- Analysis pages show blank category section for all previously-scored listings
- Extension badges show stale scores from old algorithm mixed with new deterministic scores
- Users see inconsistent scoring: same listing scored twice shows different algorithms' results
- No way to distinguish which algorithm produced a cached result

**Prevention:**
1. Add a `schema_version: int` column to the `analyses` table (default 1 for existing rows, 2 for v5.0)
2. In the edge function cache check, filter by schema version: `.eq("schema_version", CURRENT_SCHEMA_VERSION)` -- old rows become cache misses, triggering fresh scoring
3. Make ALL frontend consumers backward-compatible: check for both old and new fields with fallbacks
4. Do NOT delete old cached analyses -- they are still valid as historical records. Add a migration flag but do not bulk-delete
5. The `score` column in `analyses` table must always contain the numeric score regardless of schema version, since the analyses list page uses it directly

**Detection:**
- `CategoryBreakdown` renders nothing (empty div) on previously-scored listings
- Extension badge shows a number but analysis page shows different/missing data
- Backend logs show `ScoreResponse.model_validate(cached)` failing with ValidationError for old rows

**Phase to address:** FIRST phase -- schema migration and cache versioning must ship before any ScoreResponse changes.

---

### Pitfall 2: Division by Zero in Deterministic Formulas

**What goes wrong:**
Three specific division-by-zero scenarios in the proposed deterministic formulas:

1. **Size formula when target=0:** If `living_space_min` and `living_space_max` are both None (user didn't set a preference), and the formula computes `f = actual / target`, target resolves to 0 or None. `living_space_min` defaults to `None` in `UserPreferences` (line 119 of preferences.py). A naive formula like `f = listing.surface_living / prefs.living_space_max` crashes with ZeroDivisionError when `living_space_max` is None.

2. **Price formula when budget_max=0 or None:** Same pattern. `budget_max` defaults to `None` (line 115). The formula `f = 1 - (price - budget_max) / budget_max` divides by zero if budget_max is 0 or crashes if None.

3. **Weighted aggregation when no criteria have scores:** If ALL criteria are skipped (missing data for all deterministic criteria, no subjective criteria), the aggregation formula `overall_score = sum(f_i * w_i) / sum(w_i)` divides by zero because `sum(w_i) = 0`.

**Why it happens:**
The `UserPreferences` model allows all numeric fields to be None. This is by design -- users can leave fields blank. The deterministic formulas must handle None inputs gracefully, but it is easy to forget that EVERY numeric preference field can be None.

**Consequences:**
- Unhandled exception returns 500 to the edge function, which returns 502 to the extension
- User sees scoring error for listings that previously scored fine with Claude (which handled None values via natural language)
- Regression compared to v1.1 where Claude never crashed on missing data

**Prevention:**
1. Guard every formula with None checks: if the preference field needed for the formula is None, SKIP that criterion (return `None` for fulfillment, exclude from aggregation)
2. Guard the aggregation denominator: `if sum(w_i) == 0: return default_score` (or return None with "insufficient data" tier)
3. Write unit tests for EVERY formula with None inputs: `test_price_formula_budget_max_none`, `test_size_formula_no_preference`, `test_aggregation_all_skipped`
4. Use the `living_space_min` / `living_space_max` / `budget_min` / `budget_max` pattern consistently: if both min and max are None, skip the criterion entirely

**Detection:**
- 500 errors in backend logs with `ZeroDivisionError` or `TypeError: unsupported operand type(s) for /: 'int' and 'NoneType'`
- Listings that scored successfully in v1.1 now fail in v5.0 for users with sparse preferences

**Phase to address:** Deterministic formula implementation phase -- every formula function must have None-input tests before integration.

---

### Pitfall 3: CRITICAL f=0 Override Logic Applied at Wrong Layer

**What goes wrong:**
The v5.0 spec says: "If any criterion with importance=CRITICAL has fulfillment f=0, force match_tier='poor' regardless of overall_score." This override must happen AFTER all criteria are scored but BEFORE the response is returned. There are three places this could be implemented, and choosing the wrong one causes bugs:

1. **Inside individual formula functions** (wrong): Each formula returns `f=0` but does not know about other criteria. It cannot set `match_tier` because it operates on a single criterion.

2. **Inside the aggregation function** (partially right): The aggregation sees all fulfillment values and weights. It can check for CRITICAL f=0. But if the aggregation function both computes the overall_score AND overrides match_tier, the tier override might be reversed by a later `tier = get_tier(overall_score)` call in the router.

3. **In the scoring router after aggregation** (right place, but fragile): The router calls the aggregation function, gets the overall_score, computes match_tier from score ranges, THEN checks for CRITICAL f=0 override. But the match_tier computation is currently done by Claude in the response -- in v5.0 it moves to Python. If the tier computation and the override are in separate functions called sequentially, a future developer might reorder them.

**Why it happens:**
The dealbreaker logic in v1.1 is enforced by Claude's system prompt (line 70-76 of `scoring.py` prompt): "When the user marks a constraint as a DEALBREAKER... Set the overall match_tier to 'poor'." Claude handles this atomically. Moving it to Python code means the atomic "score + tier + override" must be implemented as an explicit multi-step procedure.

**Consequences:**
- A listing that violates a CRITICAL criterion (e.g., price is 2x budget with budget marked CRITICAL) gets `match_tier="good"` because the score is still high from other criteria
- Extension badge shows green/blue for a listing that should be red
- User trusts the badge, visits the listing, discovers it violates their top priority
- Trust in the scoring system destroyed

**Prevention:**
1. Implement the full scoring pipeline as a SINGLE function that returns `(overall_score, match_tier, criteria_results)` -- never separate score computation from tier assignment
2. The function's last step before returning: `if any(c.importance == CRITICAL and c.fulfillment == 0 for c in criteria_results): match_tier = "poor"`
3. Write a test: `test_critical_f0_overrides_match_tier` -- set price CRITICAL, listing price 3x budget, verify match_tier=="poor" even if other criteria score 100
4. Write a second test: `test_critical_f_nonzero_no_override` -- set price CRITICAL, listing price within budget, verify match_tier is NOT forced to "poor"
5. Add a comment in the code: `# INVARIANT: This override MUST be the last step before returning. Do not move.`

**Detection:**
- Listings violating CRITICAL criteria show non-poor badges
- Analysis page shows "poor" in text but badge shows green (if override is only applied on one consumer path)

**Phase to address:** Aggregation formula phase -- implement score+tier+override as an atomic unit with dedicated tests.

---

### Pitfall 4: Binary Feature Matching Fails on German Flatfox Attribute Names

**What goes wrong:**
The user preference `features: list[str]` contains UI-selected features like `["Balcony", "Elevator", "Dishwasher"]`. The Flatfox API returns attributes as `FlatfoxAttribute` objects with German `.name` fields: `"Balkon"`, `"Lift"`, `"Geschirrspueler"`, `"Minergie"`, `"Rollstuhlgaengig"`. The deterministic binary feature formula needs to check: "does the listing have the feature the user wants?" A naive `feature.lower() in [a.name.lower() for a in listing.attributes]` fails because `"balcony" != "balkon"`.

The current system avoids this entirely -- Claude reads both the English feature name and the German attribute list and matches them semantically in the prompt. Moving to deterministic matching requires an explicit mapping layer.

**Why it happens:**
Flatfox is a Swiss platform. Its API returns attributes in German (and sometimes French/Italian depending on the listing region). The web app's feature selection UI uses English labels (or the user's chosen language). There is no normalization layer between the two vocabularies.

Real Flatfox attribute names observed in the codebase and API:
- `Balkon` (Balcony), `Lift` (Elevator), `Geschirrspueler` (Dishwasher)
- `Waschmaschine` (Washing machine), `Tumbler` (Dryer), `Parkplatz` (Parking)
- `Minergie` (Swiss energy standard -- no direct English equivalent)
- `Rollstuhlgaengig` (Wheelchair accessible)
- Some attributes have no standard translation: `Cheminee` (Fireplace, but French loan)

**Consequences:**
- All binary feature checks return "not met" even when the listing has the feature
- Fulfillment for binary features is systematically 0, dragging down overall scores
- Users see all their desired features marked as unmet, think the scoring is broken
- Regression: v1.1 Claude correctly matched "Balcony" to "Balkon" via semantic understanding

**Prevention:**
1. Build a static normalization map: `FEATURE_ALIAS_MAP = {"balcony": ["balkon", "balcon"], "elevator": ["lift", "aufzug"], "dishwasher": ["geschirrspueler", "geschirrspüler", "lave-vaisselle"], ...}`
2. Normalize both sides to lowercase before matching
3. For features NOT in the map, fall back to Claude with a focused prompt: "Does attribute X match feature Y? Answer true/false." -- this is cheap (10 tokens) and handles edge cases
4. Populate the map by fetching 50+ real Flatfox listings and collecting all unique attribute names. The Flatfox API vocabulary is finite (probably 30-50 unique attribute names)
5. Handle umlaut normalization: `ue -> u-umlaut`, `ae -> a-umlaut`, `oe -> o-umlaut` (Flatfox sometimes uses ASCII transliteration, sometimes Unicode)

**Detection:**
- All binary feature scores return 0 despite listings having relevant attributes
- Comparison test: score a listing with Claude (v1.1) and deterministic (v5.0), binary features diverge significantly
- The normalization map has fewer entries than the set of unique Flatfox attribute names across test listings

**Phase to address:** Binary feature matching phase -- build and validate the normalization map BEFORE integrating into the scoring pipeline. Use real Flatfox data, not guesses.

---

### Pitfall 5: ScoreResponse Schema Change Breaks Extension Without Version Gate

**What goes wrong:**
The Chrome extension has its own copy of the `ScoreResponse` interface (`extension/src/types/scoring.ts`). It is manually kept in sync with the backend Pydantic model. The v5.0 changes to `ScoreResponse` include:
- Removing `categories: CategoryScore[]` (5 fixed categories with score/weight/reasoning)
- Adding per-criterion fulfillment fields (new shape)
- Potentially changing `overall_score` from int (0-100) to a float (0.0-1.0) or keeping int but with different semantics

The extension is deployed via manual sideloading. Users must rebuild and reload the extension manually. There is NO auto-update mechanism. If the backend deploys v5.0 first:

1. Old extension calls score-proxy, gets a v5.0 response
2. Extension casts response as old `ScoreResponse` type
3. `score.overall_score` might be present (backward compat) but `score.categories` is undefined
4. `SummaryPanel` renders `summary_bullets` -- this survives if the field name is unchanged
5. `ScoreBadge` renders `score.overall_score` in the badge -- survives if field name unchanged
6. User clicks "See full analysis" link to web app -- the web analysis page is already updated (Vercel auto-deploys), so the analysis page works
7. BUT: if any field name changes (e.g., `overall_score` -> `score`), the badge shows `undefined`

The REAL problem: the extension user has a stale extension that cannot parse v5.0 responses. They see broken badges until they manually rebuild. There is no mechanism to notify them.

**Why it happens:**
The extension is sideloaded (not on Chrome Web Store). There is no auto-update path. The backend and web app deploy automatically (EC2 + Vercel), but the extension is frozen at the user's last build.

**Consequences:**
- Extension badges break for all existing users until they manually rebuild
- No notification mechanism tells users to update
- If the user does not rebuild, the extension is permanently broken against the new API
- Demo to Bellevia pilot fails if they have the old extension

**Prevention:**
1. **Keep `overall_score` and `match_tier` field names unchanged** -- these are consumed by the badge and are the minimum viable response shape
2. **Keep `summary_bullets` field name unchanged** -- consumed by the summary panel
3. Add new fields (per-criterion fulfillment data) alongside old fields, do not remove old fields in the first deployment
4. Add an API version header: `X-HomeMatch-API-Version: 2` in the score-proxy response. The extension can check this and show a "Please update your extension" banner if the version is higher than expected
5. Deploy in phases: (a) backend returns BOTH old and new fields, (b) update extension to use new fields, (c) after all users have updated, remove old fields

**Detection:**
- Extension badge shows `undefined` or `NaN` instead of a number
- Extension console shows TypeScript-level type errors or undefined property access
- Users report "scoring stopped working" after a backend deployment

**Phase to address:** ScoreResponse schema change phase -- design the response shape to be backward-compatible FIRST, then plan the extension migration as a follow-up.

---

### Pitfall 6: Criterion Type Classification Non-Determinism at Save Time

**What goes wrong:**
The v5.0 design classifies each `DynamicField` into a `criterion_type` (price, size, binary_feature, proximity, or subjective) at profile save time, not at scoring time. This classification determines which formula is used. The classification is done by Claude (or a rules-based classifier). If the classification is wrong, the wrong formula is applied permanently:

- User adds "max CHF 2500/month" as a dynamic field. Classifier labels it `subjective` instead of `price`. Claude evaluates it subjectively instead of using the deterministic price formula. The score is inconsistent across rescores because Claude is non-deterministic.
- User adds "near a Coop" as a dynamic field. Classifier labels it `binary_feature` instead of `proximity`. The binary feature matcher looks for "Coop" in listing attributes (which are structural features like "Balkon", not nearby businesses). The check always returns false.

**Why it happens:**
Natural language criterion descriptions are ambiguous. "Good public transport" could be `proximity` (near a train station) or `subjective` (Claude evaluates transport quality from description). "Modern kitchen" is `subjective` (requires visual analysis) but could be confused with `binary_feature` (check for "Einbaukueche" attribute). The classifier must handle this ambiguity correctly for every user-generated criterion.

**Consequences:**
- Wrong formula applied permanently (until user re-saves profile)
- Deterministic criteria misclassified as subjective get non-deterministic scores (defeats the purpose of v5.0)
- Subjective criteria misclassified as deterministic get wrong scores (formula cannot evaluate "nice neighborhood")
- User has no visibility into classification -- they do not see `criterion_type` in the UI

**Prevention:**
1. Build a rules-based pre-classifier that handles obvious cases: contains "CHF" or currency -> `price`, contains "sqm" or "m2" -> `size`, matches known feature names -> `binary_feature`, contains distance/proximity keywords ("near", "within", "close to", "walking distance") -> `proximity`. Everything else -> `subjective`
2. For ambiguous cases, use Claude with a focused classification prompt (cheap, 50 tokens output). Include few-shot examples of each type
3. Store the classified `criterion_type` on the `DynamicField` in the preferences JSONB so it is visible and debuggable
4. Allow manual override in the UI: show the inferred type as a subtle badge next to each dynamic field, let the user correct it
5. Write classification tests with 20+ real-world criterion strings covering edge cases

**Detection:**
- A criterion like "max CHF 2000" scored by Claude as subjective instead of deterministic price formula
- Same listing rescored twice produces different scores for criteria that should be deterministic
- Debug log shows criterion_type for each dynamic field -- verify manually against expectations

**Phase to address:** Criterion classification phase -- build and validate the classifier BEFORE integrating it into the scoring pipeline.

---

## Moderate Pitfalls

---

### Pitfall 7: IMPORTANCE_WEIGHT_MAP Values Change Silently Between v1.1 and v5.0

**What goes wrong:**
v1.1 uses `IMPORTANCE_WEIGHT_MAP = {CRITICAL: 90, HIGH: 70, MEDIUM: 50, LOW: 30}` (line 48-53 of preferences.py). These weights are passed to Claude in the system prompt as `weight` field values. The v5.0 spec proposes different weights for aggregation: `CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1`. If the `IMPORTANCE_WEIGHT_MAP` constant is updated in-place, the Claude prompt (which still uses `IMPORTANCE_WEIGHT_MAP` for the `weight` field instruction in the system prompt line 87) will tell Claude to use `weight=5` instead of `weight=90`, confusing Claude's scoring.

Even if the prompt is updated too, existing test assertions (`test_preferences.py` lines 136-140) will break. And the frontend `CategoryBreakdown` component uses `getImportanceLabel(weight)` with thresholds `>=70` for Critical, `>=50` for High (line 33-37 of CategoryBreakdown.tsx). If weights change to 1-5, all labels will show "Low".

**Why it happens:**
The same constant serves two purposes: (1) weight values sent to Claude in the prompt, and (2) weight values used in the deterministic aggregation formula. These need different scales if the aggregation formula changes.

**Consequences:**
- `CategoryBreakdown` importance labels all show "Low" for every category
- Claude prompt tells Claude to use wrong weight values
- Test suite breaks on weight value assertions
- Subtle: the old `analyses.breakdown` JSONB has `weight: 90` in category entries; new ones would have `weight: 5` -- inconsistent display

**Prevention:**
1. Create a NEW constant for v5.0 aggregation weights: `AGGREGATION_WEIGHTS = {CRITICAL: 5, HIGH: 3, MEDIUM: 2, LOW: 1}`
2. Keep `IMPORTANCE_WEIGHT_MAP` unchanged for backward compatibility with cached analyses and any remaining Claude prompt usage
3. Update the frontend `getImportanceLabel` to accept either scale, or change it to read the importance level name directly from the new response format instead of deriving it from numeric weights
4. If `categories` is removed from ScoreResponse, the `CategoryBreakdown` component needs a complete rewrite anyway -- do not try to make old weight thresholds work with new data

**Detection:**
- All importance badges in CategoryBreakdown show "Low"
- Test `test_importance_weight_map` fails after constant change
- Claude response has unexpected weight values

**Phase to address:** Schema migration phase -- define new constants WITHOUT modifying existing ones.

---

### Pitfall 8: Supabase JSONB Migration for DynamicField.criterion_type Breaks Frontend Parsing

**What goes wrong:**
Adding `criterion_type: str` to `DynamicField` in the backend Pydantic model is safe because Pydantic defaults handle missing fields. But the preferences JSONB in Supabase already contains `dynamicFields` arrays without `criterionType`. Three things can go wrong:

1. **Frontend Zod schema validation fails:** If the Zod schema is updated to require `criterionType` before existing JSONB is migrated, loading any profile with old-format dynamic fields will throw a validation error. The preferences form will not render. The user cannot access their preferences.

2. **Backend classification writes camelCase but reads snake_case:** The `DynamicField` model has `alias_generator=to_camel` and `populate_by_name=True`. When serialized to JSONB via the frontend (camelCase), the field is `criterionType`. When the backend writes it, it might serialize as `criterion_type` (snake_case Pydantic default) if `model_dump()` is called without `by_alias=True`. The JSONB ends up with mixed naming: some fields with `criterionType`, others with `criterion_type`.

3. **The `migrate_legacy_format` validator does not handle missing criterion_type:** The existing validator (lines 143-202 of preferences.py) migrates old formats but does not add `criterionType` to existing dynamic fields. Fields saved before v5.0 will have `{name, value, importance}` but no `criterionType`. If classification happens at save time, re-saving triggers classification. But if the user never re-saves, their dynamic fields are never classified, and the scoring pipeline does not know which formula to use.

**Why it happens:**
JSONB schema evolution in Supabase has no built-in migration tooling. The application layer must handle all backward compatibility. The camelCase/snake_case duality in `DynamicField` adds a naming hazard.

**Consequences:**
- Profiles page crashes for users with existing dynamic fields (Zod validation error)
- Mixed camelCase/snake_case in JSONB causes fields to appear missing depending on which layer reads them
- Unclassified dynamic fields default to... what? If `criterion_type` defaults to `"subjective"`, price criteria are scored by Claude instead of deterministically. If it defaults to None, the scoring pipeline crashes

**Prevention:**
1. Add `criterion_type` as Optional with default None to both Pydantic and Zod schemas
2. In the scoring pipeline, treat `criterion_type=None` as "needs classification" and run the classifier on-the-fly (then optionally save back)
3. Add a migration in `migrate_legacy_format`: if `dynamicFields` exist but items lack `criterionType`, add `criterionType: null` to each
4. Always use `by_alias=True` when serializing DynamicField to JSONB (consistent camelCase)
5. Write a test: load preferences JSONB from before v5.0 (no criterionType), verify parsing succeeds and criterion_type is None

**Detection:**
- Preferences form shows blank/error for profiles with dynamic fields
- Backend logs show Pydantic `ValidationError` on preferences with missing `criterionType`
- JSONB contains both `criterionType` and `criterion_type` keys in the same object

**Phase to address:** Schema migration phase -- add criterion_type as Optional[None] FIRST, then build classification logic.

---

### Pitfall 9: Scoring Pipeline Becomes Partially Synchronous, Breaking the Async Flow

**What goes wrong:**
The current scoring pipeline is fully async: `await claude_scorer.score_listing(...)`. The v5.0 pipeline mixes deterministic computation (CPU-bound, synchronous) with Claude API calls (IO-bound, async). If the deterministic formulas are implemented as regular Python functions called inside the async router, they block the event loop for the duration of computation. For a single listing, this is negligible (microseconds). But for batch scoring (10+ listings in parallel), synchronous formula computation for all criteria of all listings could accumulate, especially if the binary feature normalization involves string matching against a large map.

More critically: if subjective criteria use `await claude_scorer.score_listing()` but deterministic criteria use synchronous functions, the orchestration must be hybrid. A naive implementation might `await` Claude for ALL criteria (including deterministic ones) because the developer wraps everything in the same async pipeline.

**Why it happens:**
Mixing sync and async code in FastAPI is a common source of bugs. The deterministic formulas are pure computation and do not need to be async. But calling them alongside `await claude_scorer.score_listing()` requires careful orchestration.

**Consequences:**
- Event loop blocked during formula computation (minor for single listings, noticeable for batch)
- Unnecessary Claude API calls if deterministic criteria are accidentally routed to Claude
- Increased latency if deterministic and subjective scoring run sequentially instead of in parallel

**Prevention:**
1. Structure the pipeline as: (a) classify criteria, (b) compute ALL deterministic fulfillments synchronously, (c) `await` Claude for subjective fulfillments ONLY, (d) aggregate. Steps (b) and (c) can run in parallel since they are independent
2. For batch scoring, run deterministic computation for all listings first (fast), then batch Claude calls for subjective criteria
3. Do NOT wrap deterministic functions in `asyncio.to_thread()` unless profiling shows they take >1ms -- the overhead of thread dispatch exceeds the computation time for simple formulas
4. Keep a clear separation: `deterministic_scorer.py` (sync functions) and `claude_scorer.py` (async class). Do not mix them in the same module

**Detection:**
- Backend response time for deterministic-only listings (no subjective criteria) is suspiciously close to Claude API latency (~1-2 seconds) instead of near-instant
- `asyncio` event loop warnings in logs about long-running synchronous code

**Phase to address:** Pipeline orchestration phase -- design the hybrid flow architecture before implementing individual formulas.

---

### Pitfall 10: The `save_analysis` Function Hardcodes `overall_score` Key for the `score` Column

**What goes wrong:**
`supabase_service.save_analysis()` (line 82 of supabase.py) extracts `score_data["overall_score"]` and writes it to the `score` column in the `analyses` table. The analyses list page (`/analyses/page.tsx` line 142) renders this `score` column directly in the badge. If v5.0 changes the key name (e.g., to `computed_score`) or changes the score range (e.g., from 0-100 int to 0.0-1.0 float), the `save_analysis` function will:

1. KeyError on `score_data["overall_score"]` if the key is renamed
2. Save a float like `0.73` to the `score` column (which is integer type in Postgres), causing a type error or silent truncation to `0`
3. Save a value on a different scale, making old and new scores incomparable in the analyses list

**Why it happens:**
The `save_analysis` function was written for v1.1's ScoreResponse and hardcodes the key access pattern. It does not use Pydantic model serialization -- it operates on the raw dict from `result.model_dump()`.

**Consequences:**
- 500 error on save (KeyError) -- scoring succeeds but result is not cached
- Score column has 0 for all v5.0 analyses (float truncation)
- Analyses list shows misleading badge numbers

**Prevention:**
1. Keep `overall_score` as the field name in the new ScoreResponse -- it serves the same purpose
2. Keep the score as int 0-100 -- changing to float provides no user benefit and breaks the `score` column type
3. If the score computation changes range, add a conversion step in `save_analysis`: `score=int(round(score_data["overall_score"] * 100))` if using 0-1 internally
4. Update `save_analysis` to use the Pydantic model directly instead of dict access: `score=result.overall_score`

**Detection:**
- Backend logs show `KeyError: 'overall_score'` in the save_analysis exception handler
- Analyses list shows `0` for all newly scored listings
- Score column in DB has unexpected values

**Phase to address:** ScoreResponse schema change phase -- update save_analysis alongside the model change, not after.

---

### Pitfall 11: Proximity Quality Formula Double-Counts Distance

**What goes wrong:**
The v5.0 spec mentions a "proximity quality hybrid formula (distance decay + rating bonus)." If this formula is `f = distance_decay(d) * (1 + rating_bonus(r))`, and `distance_decay` already penalizes far distances, but the nearby_places data returned by the Apify/Google Places integration already filters by radius, the distance decay might be unnecessarily harsh. A place at 0.9 km when the user requested 1.0 km radius is "just barely within range" but the distance decay function might give it a low score (e.g., `f = 1 - 0.9/1.0 = 0.1`). The user expected "within 1 km" to mean binary pass/fail, not a linear penalty.

**Why it happens:**
The current system has Claude interpret proximity results with nuance. A place at 0.9 km within a 1.0 km radius is "very close, well within range." A deterministic formula cannot apply this nuance unless designed carefully.

**Consequences:**
- Proximity scores are systematically lower than Claude's scores for the same data
- Users perceive the scoring as harsher after v5.0
- Listings that Claude rated "excellent proximity" now get "fair" from the formula

**Prevention:**
1. Define the distance decay clearly: `f = max(0, 1 - (d / max_radius))` is a linear decay that gives 1.0 at d=0 and 0.0 at d=max_radius. This makes anything within radius get a positive score, with closer being better
2. For binary "within X km" criteria, use a step function: `f = 1.0 if d <= max_radius else 0.0`. No decay
3. Let the criterion type determine the formula shape: `proximity_binary` vs `proximity_quality`
4. Compare formula results against Claude's scores for 10 test cases before deploying. If the formula is systematically 20+ points lower, adjust the decay curve

**Detection:**
- Proximity criterion scores are systematically lower in v5.0 than v1.1
- Users report "proximity scoring got worse" after the update
- Test comparison shows formula gives f=0.1 for a place at 900m when user requested 1km

**Phase to address:** Proximity formula phase -- validate against Claude baseline before integrating.

---

## Minor Pitfalls

---

### Pitfall 12: Claude Subjective Fulfillment Prompt Returns Score Outside Expected Range

**What goes wrong:**
The v5.0 design has Claude return `fulfillment in {0.0...1.0}` for subjective criteria. Claude currently returns `score: int` in 0-100 range (line 19 of scoring.py). Changing the expected output format requires updating the structured output schema. If the Pydantic model constrains fulfillment to `ge=0.0, le=1.0` but Claude returns `0.85` as a string or returns `85` (old habit from 0-100 scale), the `messages.parse()` call might accept it (85 > 1.0, validation error) or reject it.

**Prevention:**
- Add explicit instruction in the prompt: "Return fulfillment as a decimal between 0.0 and 1.0, where 1.0 means fully met"
- Include few-shot examples in the prompt
- If Claude returns values > 1.0, add a post-processing guard: `fulfillment = min(1.0, fulfillment / 100) if fulfillment > 1.0 else fulfillment`

---

### Pitfall 13: Frontend CategoryBreakdown Component Has No Replacement Planned

**What goes wrong:**
Removing `categories` from ScoreResponse means the `CategoryBreakdown` component (web/src/components/analysis/CategoryBreakdown.tsx, 124 lines) renders nothing. But no replacement component is designed for the new per-criterion fulfillment view. The analysis page becomes visually empty between the summary bullets and the checklist.

**Prevention:**
- Design the replacement component BEFORE removing categories from the response
- Consider a "Criteria Breakdown" component that shows each criterion with its fulfillment bar, type (deterministic/subjective), and reasoning
- The new component should handle both old (cached) and new response formats, or the analysis page should detect the schema version and render the appropriate component

---

### Pitfall 14: Missing Data Criterion Skip Inflates Overall Score

**What goes wrong:**
The v5.0 spec says: "Missing data -> skip criterion in weighted aggregation." If 3 of 5 criteria are skipped because the listing has no data, the overall score is computed from only 2 criteria. If those 2 happen to be well-matched, the score is artificially high. Example: listing has no price, no size, no features data -- only location and condition are scoreable. Both score 90. Overall: 90. But the listing is missing critical information the user cares about.

**Prevention:**
- Set a minimum number of scored criteria threshold (e.g., at least 2 criteria must have data for a score to be meaningful)
- If below threshold, return a special tier: "insufficient_data" instead of computing a misleading score
- Show a badge indicating data completeness: "Score based on 2/5 criteria"
- Weight the confidence: if important criteria are skipped, penalize the score or flag it

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema migration / cache versioning | Old cached analyses have v1.1 schema (Pitfall 1) | Add schema_version column, filter cache by version |
| Schema migration / DynamicField | criterion_type missing in existing JSONB (Pitfall 8) | Optional[None] default, on-the-fly classification fallback |
| Deterministic formula implementation | Division by zero on None preferences (Pitfall 2) | Guard every formula, skip criteria with None inputs |
| Deterministic formula implementation | Proximity formula double-counts distance (Pitfall 11) | Define decay curve explicitly, compare against Claude baseline |
| Binary feature matching | German attribute name mismatch (Pitfall 4) | Static normalization map + Claude fallback for unknowns |
| Criterion classification | Misclassification of ambiguous criteria (Pitfall 6) | Rules-based pre-classifier + Claude for ambiguous + manual override |
| Aggregation formula | CRITICAL f=0 override at wrong layer (Pitfall 3) | Atomic score+tier+override function, dedicated test |
| Aggregation formula | Missing data inflates score (Pitfall 14) | Minimum criteria threshold, "insufficient_data" tier |
| ScoreResponse schema change | Extension breaks without version gate (Pitfall 5) | Keep field names, add new fields alongside old ones |
| ScoreResponse schema change | save_analysis hardcodes key names (Pitfall 10) | Keep overall_score name, update save_analysis |
| Weight constants | IMPORTANCE_WEIGHT_MAP dual-purpose conflict (Pitfall 7) | New AGGREGATION_WEIGHTS constant, keep old unchanged |
| Pipeline orchestration | Sync/async mixing blocks event loop (Pitfall 9) | Separate deterministic (sync) and subjective (async), run in parallel |
| Frontend update | CategoryBreakdown has no replacement (Pitfall 13) | Design replacement component before removing categories |

---

## Integration Gotchas

| Integration Point | What Breaks | Correct Approach |
|-------------------|-------------|------------------|
| Edge function cache -> v5.0 response | Returns old v1.1 JSONB verbatim to extension | Add schema_version filter to cache query |
| `save_analysis` -> `analyses.score` column | KeyError or type mismatch if field name/type changes | Keep `overall_score` as int 0-100, update save_analysis |
| Extension `ScoreResponse` TypeScript -> backend Pydantic | Extension has stale type definition, no auto-update | Keep field names backward-compatible, add API version header |
| Frontend `CategoryBreakdown` -> `breakdown.categories` | Component renders nothing when categories removed | Detect schema version, render appropriate component |
| Frontend `getImportanceLabel(weight)` -> weight thresholds | Thresholds (>=70, >=50, >=30) assume old 30-90 scale | Use new constant or read importance level name directly |
| `DynamicField` serialization -> JSONB | Mixed camelCase/snake_case for criterion_type | Always use `by_alias=True` for JSONB serialization |
| Deterministic price formula -> `UserPreferences.budget_max` | budget_max is None (user didn't set it) | Skip criterion when preference field is None |
| Binary feature formula -> `listing.attributes[].name` | German names don't match English feature names | Normalization map + umlaut handling + Claude fallback |

---

## Testing Strategy for Hybrid Scoring

### Unit Tests (Per Formula)

| Formula | Critical Test Cases |
|---------|-------------------|
| Price fulfillment | budget_max=None (skip), price=budget_max (f=1.0), price=2*budget_max (f=0), price=0 (f=1.0), SALE vs RENT price interpretation |
| Size fulfillment | living_space_min=None AND max=None (skip), exact match (f=1.0), half the minimum (f=0), surface_living=None on listing (skip) |
| Binary feature | All features matched (f=1.0), none matched (f=0), partial match (f=0.6), empty feature list (skip), German attribute names, umlaut variations |
| Proximity | Within radius (f=1.0 or decay), outside radius (f=0), no coordinates (skip), rating bonus caps, zero radius (edge case) |
| Aggregation | All criteria scored (normal), all criteria skipped (return default), CRITICAL f=0 override, single criterion only, mixed weights |

### Integration Tests (Pipeline)

| Scenario | What to Verify |
|----------|---------------|
| Listing with all data available | Deterministic criteria use formulas, subjective use Claude, aggregation correct |
| Listing with sparse data | Missing data criteria skipped, remaining criteria scored, no division by zero |
| Profile with no dynamic fields | Falls back to standard scoring (price/size from standard fields only) |
| Profile with CRITICAL dealbreaker violated | match_tier forced to "poor", overall_score reflects violation |
| Old cached analysis loaded | Frontend renders old format correctly without crash |
| Re-score after v5.0 deploy | New score replaces old cached score, schema_version=2 |

### Cross-Consumer Consistency Tests

| Consumer | Test |
|----------|------|
| Extension badge | Render with v5.0 response: badge shows number, tier color correct |
| Extension summary | Render with v5.0 response: bullets display correctly |
| Web analysis page | Render with v5.0 response: new criteria breakdown component works |
| Web analysis page | Render with v1.1 cached response: fallback rendering works |
| Web analyses list | Mix of v1.1 and v5.0 analyses: both render correctly in same list |

### Regression Tests (v1.1 Parity)

Score 10 real Flatfox listings with both v1.1 (Claude-only) and v5.0 (hybrid) using identical preferences. Compare:
- Overall scores: should be within 15 points (not exact match, but same ballpark)
- match_tier: should agree for 8/10 listings
- CRITICAL dealbreaker handling: must agree for 10/10 listings
- Binary features: must agree for 8/10 features (allowing for normalization gaps)

---

## "Looks Done But Isn't" Checklist

- [ ] **Cache versioning:** Deploy v5.0 backend, load a pre-existing analysis page -- verify it shows old data correctly, not a blank/crashed page
- [ ] **CRITICAL override:** Score a listing that violates a CRITICAL criterion -- verify badge shows "poor" (red), not "good" (blue)
- [ ] **Binary feature German matching:** Score a listing with "Balkon" attribute when user wants "Balcony" -- verify it shows as met
- [ ] **Division by zero:** Score a listing with a profile that has NO budget, NO room, NO size preferences -- verify no 500 error
- [ ] **Extension backward compat:** Use OLD extension (pre-v5.0) against NEW backend -- verify badge still renders a number and tier
- [ ] **save_analysis:** Score a listing, check the `analyses` table `score` column -- verify it contains the correct integer
- [ ] **Aggregation with skipped criteria:** Score a listing where 3 of 5 criteria have no data -- verify score is reasonable (not inflated to 95+)
- [ ] **DynamicField JSONB:** Load a profile with old dynamic fields (no criterionType) -- verify preferences form loads without error
- [ ] **Weight constants:** Check CategoryBreakdown component -- verify importance labels show correct names (Critical/High/Medium/Low), not all "Low"
- [ ] **Proximity formula:** Score a listing with a place at 0.9 km when user requested 1.0 km -- verify fulfillment is high (>0.5), not 0.1

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Old cache breaks frontend (Pitfall 1) | LOW | Add schema_version column, deploy migration, old rows become cache misses |
| Division by zero (Pitfall 2) | LOW | Add None guards, redeploy, no data loss |
| CRITICAL override missing (Pitfall 3) | MEDIUM | Fix aggregation function, redeploy, re-score affected listings |
| German feature mismatch (Pitfall 4) | MEDIUM | Build normalization map, redeploy, re-score listings; old scores still valid |
| Extension breaks (Pitfall 5) | HIGH for users | Cannot force-update sideloaded extensions; must contact users individually |
| Misclassified criteria (Pitfall 6) | MEDIUM | Fix classifier, re-classify by re-saving profiles; scores are wrong until re-scored |
| Weight constant conflict (Pitfall 7) | LOW | Add new constant, revert old, redeploy; 15-minute fix |
| JSONB migration (Pitfall 8) | LOW | Make criterion_type Optional, deploy; no data loss |
| save_analysis crash (Pitfall 10) | MEDIUM | Scores computed but not cached; fix and redeploy; re-score to populate cache |

---

## Sources

- Direct codebase analysis (HIGH confidence):
  - `backend/app/models/scoring.py` -- ScoreResponse and CategoryScore schema (lines 15-61)
  - `backend/app/models/preferences.py` -- UserPreferences with Optional fields, DynamicField with alias_generator, IMPORTANCE_WEIGHT_MAP (lines 48-53, 66-80, 91-202)
  - `backend/app/models/listing.py` -- FlatfoxAttribute.name is German (lines 32-36, 89)
  - `backend/app/routers/scoring.py` -- cache check, Claude call, save_analysis flow (lines 42-178)
  - `backend/app/services/supabase.py` -- save_analysis hardcodes score_data["overall_score"] (line 82)
  - `backend/app/services/claude.py` -- messages.parse() with output_format=ScoreResponse (line 85-93)
  - `backend/app/prompts/scoring.py` -- system prompt with IMPORTANCE LEVELS section (line 86-87), dealbreaker rules (lines 70-77)
  - `supabase/functions/score-proxy/index.ts` -- cache returns breakdown verbatim (line 105), no schema version filter
  - `extension/src/types/scoring.ts` -- TypeScript ScoreResponse mirror, TIER_COLORS (lines 6-40)
  - `extension/src/entrypoints/content/components/ScoreBadge.tsx` -- renders score.overall_score and score.match_tier (lines 67, 72-76)
  - `extension/src/entrypoints/content/components/SummaryPanel.tsx` -- renders score.summary_bullets (line 49)
  - `extension/src/lib/api.ts` -- casts response as ScoreResponse (line 51)
  - `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` -- casts breakdown to typed object with categories (lines 74-97)
  - `web/src/components/analysis/CategoryBreakdown.tsx` -- renders categories with getImportanceLabel thresholds (lines 33-37)
  - `web/src/components/analysis/ChecklistSection.tsx` -- renders checklist items with met/partial/false states
  - `web/src/app/(dashboard)/analyses/page.tsx` -- reads analysis.score and breakdown.match_tier (lines 102-110)

---
*Pitfalls research for: HomeMatch v5.0 -- Hybrid Deterministic + AI Scoring Engine*
*Researched: 2026-03-29*
