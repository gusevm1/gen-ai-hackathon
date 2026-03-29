# Phase 27: Data Model & Criterion Classifier - Research

**Researched:** 2026-03-30
**Domain:** Python/Pydantic data model extension + FastAPI endpoint + Anthropic structured output
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Classification trigger location:**
- New `POST /classify-criteria` endpoint on FastAPI (EC2)
- Called from Next.js server actions (runs on Vercel servers — EC2 URL is not browser-exposed)
- Direct call from server action to EC2, NOT routed through the Supabase edge function
- Classification runs BEFORE the Supabase profile save: frontend calls `/classify-criteria` → receives enriched `dynamic_fields` with `criterion_type` populated → saves the full enriched preferences to Supabase in a single write
- Supabase always has `criterion_type` set after the first save through this path

**Failure handling:**
- If `/classify-criteria` fails (Claude API error, timeout, etc.), do NOT block the profile save
- Fall back to saving `dynamic_fields` without `criterion_type` (they will be treated as `subjective` by the hybrid scorer)
- User's profile save must always succeed regardless of classification health

**Retroactive profiles:**
- Existing profiles in Supabase with `dynamic_fields` and no `criterion_type` are left as-is
- No migration script; no batch classification on deployment
- The hybrid scorer (Phase 31) treats missing `criterion_type` as `subjective` — this is the safe fallback
- Classification fires on the next time the user edits and saves their profile

**Classification call shape:**
- Single batched Claude call for all `dynamic_fields` in a profile (not one call per criterion)
- Context provided per criterion: `name` + `value` + `importance`
- Returns a list of `{criterion: str, criterion_type: CriterionType}` pairs; unrecognized criteria default to `subjective`
- Use `messages.parse()` with a Pydantic response model for structured output (consistent with scoring pipeline pattern)

**Weight map update:**
- `IMPORTANCE_WEIGHT_MAP` updated from `{CRITICAL: 90, HIGH: 70, MEDIUM: 50, LOW: 30}` to `{CRITICAL: 5, HIGH: 3, MEDIUM: 2, LOW: 1}`
- Safe to do now — the map is defined but never imported anywhere in active paths

### Claude's Discretion
- Exact prompt wording for the classifier (should clearly list all 6 types with brief descriptions)
- Whether to use `haiku` or `sonnet` for classification (haiku likely sufficient — simpler task)
- Response model field naming for the classifier Pydantic output

### Deferred Ideas (OUT OF SCOPE)
- Criterion reclassification UI: allow users to override Claude's assigned `criterion_type` — deferred to v5.1
- Retroactive batch classification script for existing profiles — not needed; subjective fallback is acceptable
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DM-01 | System assigns each DynamicField criterion exactly one of 6 criterion types: `distance`, `price`, `size`, `binary_feature`, `proximity_quality`, `subjective` | `CriterionType` enum added to `preferences.py`; `criterion_type: Optional[CriterionType] = None` field on `DynamicField` |
| DM-02 | Claude LLM classifies each DynamicField to one of the 6 criterion types at profile save time; result stored as `criterion_type` in JSONB; default falls back to `subjective` for ambiguous criteria | New `routers/classifier.py` + `services/classifier.py`; `messages.parse()` pattern; server action injection in `actions.ts` |
| DM-03 | Importance weight map updated to CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 (replaces legacy 90/70/50/30 scale) | In-place edit of `IMPORTANCE_WEIGHT_MAP` in `preferences.py`; existing tests must be updated to match |
</phase_requirements>

---

## Summary

Phase 27 is a focused data model and classification phase with three tight deliverables. The backend work adds a `CriterionType` enum and optional `criterion_type` field to the existing `DynamicField` Pydantic model, creates a new `/classify-criteria` FastAPI router and a lightweight Claude service method that batches all dynamic fields into one `messages.parse()` call, and updates `IMPORTANCE_WEIGHT_MAP` values in place. The frontend work injects a single try/catch call to `/classify-criteria` inside the `saveProfilePreferences` server action (and the two create-profile actions that also persist preferences), enriching the dynamic fields before the Supabase write.

No database migration is required — `criterion_type` is stored inside the existing JSONB `preferences.dynamic_fields` array, so it lands in Supabase automatically when preferences are saved. The `DynamicField.criterion_type = None` default means old records are untouched and will be treated as `subjective` by Phase 31's aggregation engine.

The existing `messages.parse()` pattern from `ClaudeScorer` is a perfect template. The only new decisions are prompt wording and model selection (haiku vs sonnet).

**Primary recommendation:** Follow the `ClaudeScorer` pattern exactly — a new `CriterionClassifier` class in `services/classifier.py` with a single `classify_fields()` async method using `messages.parse()` + a Pydantic output model.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic (AsyncAnthropic) | already installed | LLM structured output via `messages.parse()` | Already used in scoring pipeline — zero new dependencies |
| pydantic BaseModel | already installed | Typed classifier output model | Already used for all data models in this codebase |
| fastapi APIRouter | already installed | New `/classify-criteria` route | Same pattern as `routers/scoring.py` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pydantic `ConfigDict(alias_generator=to_camel)` | already installed | camelCase JSONB compatibility | Required for any model that crosses the Supabase/JS boundary |
| `Optional[CriterionType]` with `None` default | stdlib | Backward-compatible new field | Existing JSONB rows keep working without a migration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `messages.parse()` (structured output) | regex/JSON prompt parse | `messages.parse()` is the established pattern; regex would be fragile and explicitly excluded in REQUIREMENTS.md |
| Single batched call | One call per criterion | Single call is locked decision — cheaper and faster |
| haiku model | sonnet model | Classification is simpler than scoring; haiku is cheaper and faster; sonnet is Claude's discretion fallback if quality is insufficient |

**Installation:** No new packages needed. All dependencies are already in `requirements.txt`.

---

## Architecture Patterns

### Recommended File Changes
```
backend/app/
├── models/preferences.py        # ADD CriterionType enum + criterion_type field on DynamicField + update IMPORTANCE_WEIGHT_MAP
├── routers/classifier.py        # NEW — POST /classify-criteria endpoint
├── services/classifier.py       # NEW — CriterionClassifier class with classify_fields()
└── main.py                      # ADD: import + include_router for classifier

web/src/app/(dashboard)/profiles/
└── actions.ts                   # EDIT saveProfilePreferences, createProfileWithPreferences — inject classify call

web/src/lib/schemas/preferences.ts   # ADD criterionType optional field to dynamicFieldSchema
```

### Pattern 1: CriterionType Enum (Python)
**What:** A string enum that lives in `preferences.py` alongside `ImportanceLevel`
**When to use:** Any code that reads or writes `criterion_type`
```python
# Source: existing ImportanceLevel pattern in backend/app/models/preferences.py
class CriterionType(str, Enum):
    DISTANCE = "distance"
    PRICE = "price"
    SIZE = "size"
    BINARY_FEATURE = "binary_feature"
    PROXIMITY_QUALITY = "proximity_quality"
    SUBJECTIVE = "subjective"
```

### Pattern 2: DynamicField Extension
**What:** Add `criterion_type: Optional[CriterionType] = None` to `DynamicField`
**When to use:** Profile save/load path — must be backward compatible
```python
# Source: backend/app/models/preferences.py — DynamicField already has ConfigDict(alias_generator=to_camel)
class DynamicField(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    value: str = ""
    importance: ImportanceLevel = ImportanceLevel.MEDIUM
    criterion_type: Optional[CriterionType] = None  # NEW — None = unclassified, treated as subjective
```
Note: `to_camel` will serialize this as `criterionType` in JSON, which matches the JS schema update.

### Pattern 3: Classifier Pydantic Output Models
**What:** Two models — one per-criterion result, one wrapping a list — consumed by `messages.parse()`
**When to use:** `CriterionClassifier.classify_fields()` return type
```python
# Source: existing ScoreResponse pattern in backend/app/models/scoring.py
class CriterionClassification(BaseModel):
    criterion: str      # matches the input name exactly for pairing
    criterion_type: CriterionType

class ClassificationResponse(BaseModel):
    classifications: list[CriterionClassification]
```

### Pattern 4: CriterionClassifier Service
**What:** Mirrors `ClaudeScorer` — lazy-init `AsyncAnthropic` client, single async method
**When to use:** Called only from `routers/classifier.py`
```python
# Source: backend/app/services/claude.py — ClaudeScorer pattern
class CriterionClassifier:
    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    def get_client(self) -> AsyncAnthropic:
        if self._client is None:
            self._client = AsyncAnthropic()
        return self._client

    async def classify_fields(
        self,
        fields: list[DynamicField],
    ) -> list[DynamicField]:
        """Classify each DynamicField and return enriched list with criterion_type set."""
        if not fields:
            return fields
        client = self.get_client()
        # Build prompt describing each field with name/value/importance
        # Call messages.parse() with ClassificationResponse
        # Match returned classifications back to input fields by criterion name
        # Default unmatched fields to CriterionType.SUBJECTIVE
        ...

criterion_classifier = CriterionClassifier()
```

### Pattern 5: FastAPI Router for Classifier
**What:** Single `POST /classify-criteria` endpoint
**When to use:** Called from Next.js server action before Supabase write
```python
# Source: backend/app/routers/scoring.py pattern
router = APIRouter(prefix="/classify-criteria", tags=["classification"])

class ClassifyRequest(BaseModel):
    dynamic_fields: list[DynamicField]

class ClassifyResponse(BaseModel):
    dynamic_fields: list[DynamicField]  # enriched with criterion_type

@router.post("", response_model=ClassifyResponse)
async def classify_criteria(request: ClassifyRequest) -> ClassifyResponse:
    enriched = await criterion_classifier.classify_fields(request.dynamic_fields)
    return ClassifyResponse(dynamic_fields=enriched)
```

### Pattern 6: Server Action Injection (TypeScript)
**What:** Try/catch call to `/classify-criteria` before Supabase write; on failure, continue with original fields
**When to use:** Inside `saveProfilePreferences` and `createProfileWithPreferences` in `actions.ts`
```typescript
// Source: web/src/app/(dashboard)/profiles/actions.ts — saveProfilePreferences
export async function saveProfilePreferences(profileId: string, data: Preferences) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let validated = preferencesSchema.parse(data)

  // Classify dynamic fields before saving (DM-02)
  if (validated.dynamicFields.length > 0) {
    try {
      const EC2_URL = process.env.EC2_API_URL  // server-side env var, not NEXT_PUBLIC_
      const res = await fetch(`${EC2_URL}/classify-criteria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dynamicFields: validated.dynamicFields }),
      })
      if (res.ok) {
        const { dynamicFields } = await res.json()
        validated = { ...validated, dynamicFields }
      }
    } catch {
      // Classification failure must not block profile save (DM-02 failure handling)
    }
  }

  const { error } = await supabase.from('profiles').update({ preferences: validated }).eq('id', profileId)
  // ... rest unchanged
}
```

### Pattern 7: Zod Schema Extension (TypeScript)
**What:** Add optional `criterionType` to `dynamicFieldSchema`
**When to use:** Ensures TypeScript types match the enriched JSONB that comes back from Supabase
```typescript
// Source: web/src/lib/schemas/preferences.ts
export const criterionTypeSchema = z.enum([
  'distance', 'price', 'size', 'binary_feature', 'proximity_quality', 'subjective'
]).optional()

export const dynamicFieldSchema = z.object({
  name: z.string().min(1),
  value: z.string().default(''),
  importance: importanceLevelSchema,
  criterionType: criterionTypeSchema,  // NEW — undefined = unclassified
})
```

### Anti-Patterns to Avoid
- **Don't route through Supabase edge function:** Locked decision — direct server action → EC2 call only.
- **Don't block profile save on classification failure:** The try/catch must swallow errors silently; profile save is always the priority.
- **Don't call classify per-criterion:** Single batched call only (locked decision).
- **Don't add `criterion_type` to `Importance` or `UserPreferences` top level:** It belongs on `DynamicField` as a per-field optional attribute.
- **Don't migrate `IMPORTANCE_WEIGHT_MAP` references in the Claude prompt string:** The scoring prompt hardcodes weights as human-readable text; that is NOT changed in Phase 27 — Phase 31 will replace the Claude-generated score with the Python formula that imports this map.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured LLM output | Custom JSON parser + regex | `messages.parse()` with Pydantic model | Already established pattern; handles schema enforcement and retry internally |
| Criterion-to-type mapping | Regex rules or keyword matching | Claude LLM call | Explicitly rejected in REQUIREMENTS.md; regex is brittle for natural-language criterion names |
| camelCase serialization | Manual field aliases | `ConfigDict(alias_generator=to_camel)` | Already on `DynamicField` — new field inherits automatically |

**Key insight:** Everything this phase needs is already in the codebase. It is strictly additive — new enum, new optional field, new router + service, one server action edit.

---

## Common Pitfalls

### Pitfall 1: camelCase Mismatch Between Python and TypeScript
**What goes wrong:** Python `criterion_type` serializes as `criterionType` via `to_camel`, but the `ClassifyRequest` sent from TypeScript also uses `dynamicFields` (camelCase). If the router uses `DynamicField` directly with `populate_by_name=True`, both camelCase input from JS and snake_case field access in Python work. But the response must also serialize as camelCase to match what the frontend expects to save back to Supabase.
**Why it happens:** Supabase JSONB is written from TypeScript using camelCase keys; Python reads it via camelCase aliases; the classify endpoint is a new code path that must follow the same convention.
**How to avoid:** Use `model.model_dump(by_alias=True)` when serializing classifier response, or set `response_model_by_alias=True` on the router. The existing `ScoreRequest` uses plain `dict` for preferences — this new endpoint should use typed `DynamicField` with aliases.
**Warning signs:** Integration test where `criterionType` in response is `None` even when classifier returned a value — means aliasing broken.

### Pitfall 2: Test for IMPORTANCE_WEIGHT_MAP Asserts Old Values
**What goes wrong:** `tests/test_preferences.py::TestImportanceWeightMap` explicitly asserts `CRITICAL == 90, HIGH == 70, MEDIUM == 50, LOW == 30`. Updating the map without updating the test causes an immediate test failure.
**Why it happens:** The test was written to document the current values, not the intended values.
**How to avoid:** Update the test assertions to `CRITICAL == 5, HIGH == 3, MEDIUM == 2, LOW == 1` in the same commit as the map change.
**Warning signs:** `pytest backend/tests/test_preferences.py::TestImportanceWeightMap -x` fails with AssertionError on values.

### Pitfall 3: Classifier Returns Criterion Name That Doesn't Exactly Match DynamicField.name
**What goes wrong:** Claude is instructed to return the criterion name back in the response, but may paraphrase or truncate it. The matching logic joins input names to classification results by string equality — a mismatch means `criterion_type` is never assigned.
**Why it happens:** LLMs occasionally normalize whitespace or capitalization.
**How to avoid:** Prompt must explicitly say "return the criterion field exactly as provided, character for character". Implement the match with a dict keyed on the input name; for any classification where the name doesn't match an input, default to `subjective` and log a warning.
**Warning signs:** All `criterion_type` values come back as `subjective` even for obviously price or distance criteria.

### Pitfall 4: Empty DynamicFields List Sent to Classify Endpoint
**What goes wrong:** Calling `/classify-criteria` with `dynamic_fields: []` is valid but wasteful — should be skipped.
**Why it happens:** Profile save can happen before the user adds any criteria.
**How to avoid:** Guard in both the server action (check `validated.dynamicFields.length > 0` before calling) and in the service (`if not fields: return fields`).
**Warning signs:** Unnecessary Claude API calls and latency on empty profiles.

### Pitfall 5: EC2 URL Not Available in Next.js Server Action
**What goes wrong:** The EC2 base URL must be available as a server-side environment variable. If it's `NEXT_PUBLIC_EC2_API_URL`, it leaks to the client bundle; if it's not set at all in Vercel's environment, the fetch call fails.
**Why it happens:** The edge function previously handled EC2 calls from the Supabase side; direct server action → EC2 is a new call path that needs the env var on Vercel.
**How to avoid:** Use `process.env.EC2_API_URL` (no `NEXT_PUBLIC_` prefix). Verify that this env var is already set in Vercel for the web app (it's used by the scoring edge function path, but that edge function is on Supabase, not Vercel — may need to be added).
**Warning signs:** `fetch` call throws `TypeError: Failed to parse URL` or `ECONNREFUSED` in Vercel function logs.

---

## Code Examples

### Classifier Prompt Template (Discretionary)
```python
# Recommended prompt — lists all 6 types with brief descriptions
CRITERION_TYPES_DESCRIPTION = """
- distance: travel distance/time to a specific location (e.g. "within 10 min of work", "500m from school")
- price: rent or purchase price relative to a budget (e.g. "under 2000 CHF", "max 500k")
- size: physical size of the property in m² or rooms (e.g. "at least 80m²", "3+ rooms")
- binary_feature: a yes/no feature the property either has or doesn't (e.g. "has balcony", "parking", "pets allowed")
- proximity_quality: quality or rating of a nearby amenity, not just distance (e.g. "good schools nearby", "park with nice views")
- subjective: anything qualitative that requires judgment (e.g. "quiet neighborhood", "modern interior", "bright apartment")
"""

def build_classifier_prompt(fields: list[DynamicField]) -> str:
    criteria_lines = "\n".join(
        f"- name: {f.name!r}, value: {f.value!r}, importance: {f.importance.value}"
        for f in fields
    )
    return f"""Classify each user criterion into exactly one of these 6 types:
{CRITERION_TYPES_DESCRIPTION}

Criteria to classify:
{criteria_lines}

Rules:
- Return each criterion name EXACTLY as provided (character for character).
- If a criterion is ambiguous or does not fit any specific type, classify it as "subjective".
- Never invent criterion names not in the input list.
"""
```

### Updating IMPORTANCE_WEIGHT_MAP
```python
# Source: backend/app/models/preferences.py (in-place edit — no import changes)
IMPORTANCE_WEIGHT_MAP: dict[ImportanceLevel, int] = {
    ImportanceLevel.CRITICAL: 5,   # was 90
    ImportanceLevel.HIGH: 3,       # was 70
    ImportanceLevel.MEDIUM: 2,     # was 50
    ImportanceLevel.LOW: 1,        # was 30
}
```

### Registering New Router in main.py
```python
# Source: backend/app/main.py — follow existing pattern
from app.routers import chat, classifier, geocoding, listings, scoring

app.include_router(classifier.router)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Numeric weights 90/70/50/30 | CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 | Phase 27 (this phase) | Enables clean weighted average formula in Phase 31 |
| `DynamicField` has no type info | `criterion_type: Optional[CriterionType]` on `DynamicField` | Phase 27 (this phase) | Phase 28+ scorers can route by type without re-classifying |
| Classification in scoring prompt | Classification at profile save | Phase 27 (this phase) | Type info persisted once, not recomputed on every score call |

**Deprecated/outdated:**
- `IMPORTANCE_WEIGHT_MAP` values of 90/70/50/30: replaced by 5/3/2/1 in this phase. Any test asserting old values must be updated.

---

## Open Questions

1. **Is `EC2_API_URL` set as a Vercel environment variable for the web app?**
   - What we know: The existing scoring pipeline calls the EC2 backend from the Supabase edge function (not from Vercel). The Vercel-hosted Next.js app currently calls Supabase only.
   - What's unclear: Whether `EC2_API_URL` is already in Vercel env vars or only in Supabase secrets.
   - Recommendation: Check Vercel dashboard for this env var before implementing. If absent, add it pointing to `http://63.176.136.105:8000` as a non-public server-side variable.

2. **Model choice: haiku vs sonnet for classifier**
   - What we know: `CLAUDE_MODEL` env var defaults to `claude-haiku-4-5-20251001` in the scoring service. Classification is a simpler, more structured task than scoring.
   - What's unclear: Whether haiku reliably returns the criterion name character-for-character.
   - Recommendation: Start with haiku; the Claude's Discretion note acknowledges this is the planner's call. Add a fallback or a hardcoded model name in the classifier service rather than sharing the scoring model env var.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | pytest + pytest-asyncio (asyncio_mode = "auto") |
| Frontend framework | vitest 2.x (jsdom environment) |
| Backend config | `backend/pyproject.toml` — `[tool.pytest.ini_options] asyncio_mode = "auto"` |
| Backend quick run | `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/test_preferences.py tests/test_classifier.py -x` |
| Backend full suite | `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/ -m "not integration"` |
| Frontend quick run | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run src/__tests__/preferences-schema.test.ts` |
| Frontend full suite | `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DM-01 | `CriterionType` enum has all 6 values; `DynamicField.criterion_type` accepts all 6 and defaults to None | unit | `pytest tests/test_preferences.py::TestCriterionType -x` | ❌ Wave 0 |
| DM-01 | `DynamicField` with `criterion_type=None` round-trips through Pydantic without error | unit | `pytest tests/test_preferences.py::TestDynamicFields -x` | ✅ (extend existing) |
| DM-01 | Zod `dynamicFieldSchema` accepts `criterionType` as optional string enum | unit | `npx vitest run src/__tests__/preferences-schema.test.ts` | ✅ (extend existing) |
| DM-02 | `POST /classify-criteria` returns 200 with enriched `dynamic_fields` for valid input | unit | `pytest tests/test_classifier.py::test_classify_endpoint_success -x` | ❌ Wave 0 |
| DM-02 | `POST /classify-criteria` with empty list returns 200 with empty list | unit | `pytest tests/test_classifier.py::test_classify_empty_fields -x` | ❌ Wave 0 |
| DM-02 | `CriterionClassifier.classify_fields()` defaults unmatched criteria to `subjective` | unit | `pytest tests/test_classifier.py::test_classify_defaults_unmatched -x` | ❌ Wave 0 |
| DM-03 | `IMPORTANCE_WEIGHT_MAP` values are CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1 | unit | `pytest tests/test_preferences.py::TestImportanceWeightMap -x` | ✅ (update assertions) |

### Sampling Rate
- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/test_preferences.py -x`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/backend && python -m pytest tests/ -m "not integration"` + `cd /Users/singhs/gen-ai-hackathon/web && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_classifier.py` — covers DM-02 endpoint and service unit tests (mock `AsyncAnthropic`)
- [ ] `backend/tests/test_preferences.py::TestCriterionType` — new test class for DM-01 enum coverage (add to existing file)
- [ ] Update `backend/tests/test_preferences.py::TestImportanceWeightMap` assertions to new values (DM-03)
- [ ] Update `backend/tests/conftest.py` `SAMPLE_PREFERENCES_JSON` to include `criterionType` on one `dynamicFields` entry (optional — for round-trip coverage)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `backend/app/models/preferences.py` (DynamicField, ImportanceLevel, IMPORTANCE_WEIGHT_MAP)
- Direct codebase inspection — `backend/app/services/claude.py` (ClaudeScorer pattern, `messages.parse()` usage)
- Direct codebase inspection — `backend/app/routers/scoring.py` (FastAPI router pattern)
- Direct codebase inspection — `backend/app/main.py` (router registration pattern)
- Direct codebase inspection — `web/src/app/(dashboard)/profiles/actions.ts` (server action structure)
- Direct codebase inspection — `web/src/lib/schemas/preferences.ts` (Zod dynamicFieldSchema)
- Direct codebase inspection — `backend/tests/test_preferences.py` (existing test structure, assertions to update)
- Direct codebase inspection — `backend/tests/conftest.py` (fixture data, test infrastructure)
- `.planning/phases/27-data-model-criterion-classifier/27-CONTEXT.md` — all implementation decisions

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — DM-01, DM-02, DM-03 specification and explicit exclusions (no regex classifier, no new packages, no per-criterion calls)
- `.planning/STATE.md` — v5.0 architecture decisions (weight scale, missing data strategy, criterion type stored at save time)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and in use; no new libraries
- Architecture: HIGH — patterns directly copied from existing `ClaudeScorer`; integration point in `actions.ts` is clear
- Pitfalls: HIGH — all pitfalls identified from direct code inspection of existing tests and serialization conventions
- Test infrastructure: HIGH — pytest + vitest already configured; new test file needed but framework is known

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — no fast-moving dependencies; all decisions locked)
