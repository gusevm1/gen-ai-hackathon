# Phase 28: Deterministic Scorer - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement deterministic fulfillment formulas for all non-subjective criterion types: price, distance, size, binary_feature, and proximity_quality. Also synthesize built-in preferences (budget, rooms, living_space) as virtual FulfillmentResult entries. No Claude calls for any of these — pure Python math. No scoring pipeline integration in this phase (that's Phase 31).

</domain>

<decisions>
## Implementation Decisions

### FEATURE_ALIAS_MAP coverage
- Comprehensive EN + German coverage (~20-30 entries)
- Should include common Flatfox feature slugs and their EN/DE synonyms: balcony/balkon, lift/elevator/aufzug, parking/parkplatz/tiefgarage, cellar/keller, dishwasher/spuelmaschine/geschirrspueler, washing machine/waschmaschine, pets allowed/haustiere erlaubt, garden/garten, terrace/terrasse, new build/neubau, furnished/moebliert, wheelchair/rollstuhlgerecht, etc.
- Lookup is case-insensitive + strip whitespace on BOTH user input term AND Flatfox attribute slug
- Unmatched terms (no alias and no direct slug match) → skip the criterion (consistent with missing-data policy, avoids false f=0.0)

### DS-06 built-in preference importance mapping
- `budget_dealbreaker=True` → importance CRITICAL
- `budget_dealbreaker=False` → importance MEDIUM
- Same logic for `rooms_dealbreaker` and `living_space_dealbreaker`
- When the relevant value is not set at all (e.g. `budget_max=None`, `rooms_min=None`) → skip the virtual entry entirely (no constraint = don't score it)
- For budget: use `budget_max` as the "budget" in the price formula; `budget_min` is ignored for scoring

### DS-03 size/rooms target and symmetric decay
- **Target = minimum** (`living_space_min` for size, `rooms_min` for rooms)
- When actual < min → apply decay formula: `f=min(1.0, (actual/target)^1.5)` (naturally <1.0 for actual<target)
- When actual ≥ min AND actual ≤ max (or max is None) → `f=1.0`
- When actual > max (and max is set) → apply mirror decay: `f=exp(-k * (actual-max) / max)` where k mirrors the "below min" steepness — Claude's discretion on exact k value (suggest same exponent 1.5 as the base formula or a softer decay)
- Same symmetric behavior for rooms: rooms_min as floor, rooms_max as upper soft bound with decay

### Claude's Discretion
- Exact decay constant k for the "above max" mirror formula (suggest making it softer than below-min penalty)
- Module organization: new `services/deterministic_scorer.py` or inline in scorer
- FulfillmentResult Pydantic model field names and structure
- `FEATURE_ALIAS_MAP` specific entry list (comprehensive EN+DE as described above)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DynamicField` (preferences.py): has `name`, `value`, `importance`, `criterion_type` — this is the input per criterion
- `CriterionType` enum (preferences.py): DISTANCE, PRICE, SIZE, BINARY_FEATURE, PROXIMITY_QUALITY, SUBJECTIVE — dispatch key for the scorer
- `IMPORTANCE_WEIGHT_MAP` (preferences.py): {CRITICAL:5, HIGH:3, MEDIUM:2, LOW:1} — already at v5.0 values
- `FlatfoxAttribute.name` (listing.py): raw string slug from Flatfox API — this is what FEATURE_ALIAS_MAP maps to
- `ProximityResult` structures (proximity.py): upstream proximity data already fetched before scorer is called
- `UserPreferences` (preferences.py): `budget_max`, `rooms_min`, `rooms_max`, `living_space_min`, `living_space_max`, `*_dealbreaker` booleans

### Established Patterns
- Pydantic BaseModel for all data structures — FulfillmentResult should follow same pattern
- `ConfigDict(alias_generator=to_camel, populate_by_name=True)` on models that cross the API boundary

### Integration Points
- Phase 31 (Hybrid Aggregator) will import the deterministic scorer and `IMPORTANCE_WEIGHT_MAP`
- Scorer receives: a `DynamicField`, the listing's `FlatfoxListing`, and pre-fetched proximity results
- Built-in preference virtual entries feed into the same weighted aggregation as dynamic criteria

</code_context>

<specifics>
## Specific Ideas

- The "above max" mirror decay should be softer than the "below min" penalty — too large a space is a smaller problem than too small
- FEATURE_ALIAS_MAP: German terms should cover the real Flatfox DE listing vocabulary (balkon, aufzug, tiefgarage, keller, etc.)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-deterministic-scorer*
*Context gathered: 2026-03-30*
