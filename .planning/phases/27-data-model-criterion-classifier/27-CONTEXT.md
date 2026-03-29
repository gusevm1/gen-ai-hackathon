# Phase 27: Data Model & Criterion Classifier - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `criterion_type` to `DynamicField`, classify all dynamic criteria via a single Claude call at profile save time, and update the importance weight map to the v5.0 scale. This phase delivers the data model foundation the hybrid scorer (Phase 31) depends on — no scoring logic changes.

</domain>

<decisions>
## Implementation Decisions

### Classification trigger location
- New `POST /classify-criteria` endpoint on FastAPI (EC2)
- Called from Next.js server actions (runs on Vercel servers — EC2 URL is not browser-exposed)
- Direct call from server action to EC2, NOT routed through the Supabase edge function
- Classification runs BEFORE the Supabase profile save: frontend calls `/classify-criteria` → receives enriched `dynamic_fields` with `criterion_type` populated → saves the full enriched preferences to Supabase in a single write
- Supabase always has `criterion_type` set after the first save through this path

### Failure handling
- If `/classify-criteria` fails (Claude API error, timeout, etc.), do NOT block the profile save
- Fall back to saving `dynamic_fields` without `criterion_type` (they will be treated as `subjective` by the hybrid scorer)
- User's profile save must always succeed regardless of classification health

### Retroactive profiles
- Existing profiles in Supabase with `dynamic_fields` and no `criterion_type` are left as-is
- No migration script; no batch classification on deployment
- The hybrid scorer (Phase 31) treats missing `criterion_type` as `subjective` — this is the safe fallback
- Classification fires on the next time the user edits and saves their profile

### Classification call shape
- Single batched Claude call for all `dynamic_fields` in a profile (not one call per criterion)
- Context provided per criterion: `name` + `value` + `importance` (e.g., `name='near gym', value='within 500m', importance='high'`)
- Value field often encodes the constraint (distance, threshold), making it critical for accurate type assignment
- Returns a list of `{criterion: str, criterion_type: CriterionType}` pairs; unrecognized criteria default to `subjective`
- Use `messages.parse()` with a Pydantic response model for structured output (consistent with scoring pipeline pattern)

### Weight map update
- `IMPORTANCE_WEIGHT_MAP` in `preferences.py` updated from `{CRITICAL: 90, HIGH: 70, MEDIUM: 50, LOW: 30}` to `{CRITICAL: 5, HIGH: 3, MEDIUM: 2, LOW: 1}` in this phase
- Safe to do now — the map is defined but never imported anywhere; actual weights are hardcoded in the Claude prompt string (which is NOT changed in this phase)
- Phase 31 will import this map when building the weighted aggregation formula

### Claude's Discretion
- Exact prompt wording for the classifier (should clearly list all 6 types with brief descriptions)
- Whether to use `haiku` or `sonnet` for classification (classification is simpler than scoring — haiku likely sufficient)
- Response model field naming for the classifier Pydantic output

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DynamicField` (preferences.py): BaseModel with `name`, `value`, `importance` — add `criterion_type: Optional[CriterionType] = None` here
- `IMPORTANCE_WEIGHT_MAP` (preferences.py): Defined but unused — update values in-place, no import changes needed
- `messages.parse()` pattern in `claude.py`: Already established for structured Claude output — reuse for classifier
- `actions.ts` (web/src/app/(dashboard)/profiles/): All profile saves flow through here — this is where the `/classify-criteria` call gets injected

### Established Patterns
- Pydantic `BaseModel` with `messages.parse()` for structured Claude responses — use same pattern for classifier output
- `ConfigDict(alias_generator=to_camel, populate_by_name=True)` on preference models — DynamicField already uses this
- FastAPI router pattern: new `routers/classifier.py` following same structure as `routers/scoring.py`
- Server actions call EC2 directly (pattern not yet established but technically safe since server actions run on Vercel)

### Integration Points
- `actions.ts` → call `/classify-criteria` → enrich `dynamic_fields` → save to Supabase
- `preferences.py`: `DynamicField` gets new optional `criterion_type` field
- `preferences.py`: `IMPORTANCE_WEIGHT_MAP` values updated to 5/3/2/1
- New `routers/classifier.py` registered in `main.py`
- New `services/classifier.py` (or method on `claude.py`) handles the Claude call

</code_context>

<specifics>
## Specific Ideas

- The 6 criterion types to classify into: `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective`
- `criterion_type` stored as an optional field on `DynamicField` — None means unclassified (treated as subjective)
- Phase 31 imports `IMPORTANCE_WEIGHT_MAP` to compute weighted aggregation — the map must be correct before that phase ships

</specifics>

<deferred>
## Deferred Ideas

- Criterion reclassification UI: allow users to override Claude's assigned `criterion_type` — already in REQUIREMENTS.md as deferred to v5.1
- Retroactive batch classification script for existing profiles — decided not needed; subjective fallback is acceptable

</deferred>

---

*Phase: 27-data-model-criterion-classifier*
*Context gathered: 2026-03-29*
