# Phase 11: Dynamic Preference Schema - Research

**Researched:** 2026-03-15
**Domain:** Schema evolution (Zod + Pydantic + Supabase JSONB + Claude prompt engineering)
**Confidence:** HIGH

## Summary

Phase 11 introduces a `dynamicFields` array to the existing preferences schema, replacing the current `softCriteria` (plain string array) with structured objects containing `name`, `value`, and `importance` level. This is a schema-evolution task across four layers: Zod (web), Pydantic (backend), Claude scoring prompt, and Supabase JSONB storage. No database migration is needed because preferences are stored as JSONB -- the schema change is purely in application code and prompt templates.

The existing codebase already has strong patterns for this kind of work: the v1.0-to-v1.1 migration from numeric weights to importance levels (Phase 7) established backward-compatible `model_validator` patterns in Pydantic and canonical Zod schemas in the web app. The `softCriteria` field currently holds free-text strings like "near Bahnhof" -- these need automatic migration to `dynamicFields` format with a default importance of "medium". The scoring prompt already renders soft criteria as a comma-separated list; it needs a new "Custom Criteria" section with weighted rendering where critical fields get more emphasis.

**Primary recommendation:** Add `dynamicFields` alongside `softCriteria` (keeping softCriteria temporarily for backward compat), add a model_validator to migrate softCriteria -> dynamicFields, update the scoring prompt to render dynamic fields with importance-weighted formatting, and update the Zod schema + UI to use dynamicFields instead of softCriteria.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHM-01 | User preferences support dynamic AI-generated fields with importance levels (critical/high/medium/low) replacing softCriteria | DynamicField type definition in Zod + Pydantic; importance levels already exist as `ImportanceLevel` enum in backend |
| SCHM-02 | Zod schema (web) includes DynamicField type with name, value, and importance | New `dynamicFieldSchema` Zod object with `.array().default([])` in `preferencesSchema`; replaces `softCriteria` array |
| SCHM-03 | Pydantic model (backend) includes dynamic_fields with proper validation (not silently dropped) | New `DynamicField` BaseModel + `dynamic_fields: list[DynamicField]` field in `UserPreferences`; validated via Pydantic, not silently ignored |
| SCHM-04 | Claude scoring prompt renders dynamic fields as weighted custom criteria section | New `_format_dynamic_fields_section()` in `scoring.py` replacing the current soft criteria line; importance levels mapped to prompt weight language |
| SCHM-05 | Existing softCriteria data migrates to dynamicFields format via backward-compat migration | `model_validator(mode="before")` in Pydantic migrates `softCriteria` strings to `DynamicField` objects with `importance="medium"`; Zod `.transform()` or validator does the same |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.6 | Web-side schema validation | Already in use; defines `preferencesSchema` |
| Pydantic | 2.12.5 | Backend model validation | Already in use; defines `UserPreferences` model |
| react-hook-form | 7.71.2 | Form state management | Already in use; drives preferences form |
| @hookform/resolvers | 5.2.2 | Zod-to-RHF bridge | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase JS | 2.99.0 | JSONB read/write | Already in use; profiles.preferences column |
| FastAPI | latest | Backend API framework | Already in use; scoring endpoint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate dynamicFields column in DB | JSONB within existing preferences | JSONB is simpler -- no DB migration needed, schema is app-layer concern |
| JSON Schema validation at DB level | App-layer validation only | App-layer is sufficient; Supabase JSONB has no schema constraints currently |

## Architecture Patterns

### Recommended Project Structure
No new files needed. All changes are modifications to existing files:
```
web/src/lib/schemas/preferences.ts        # Add dynamicFieldSchema + dynamicFields field
web/src/components/preferences/           # Update soft-criteria-section.tsx -> dynamic-fields UI
backend/app/models/preferences.py         # Add DynamicField model + migration validator
backend/app/prompts/scoring.py            # Add _format_dynamic_fields_section()
backend/tests/conftest.py                 # Add sample data with dynamicFields
backend/tests/test_preferences.py         # Add migration + validation tests
web/src/__tests__/preferences-schema.test.ts  # Add dynamicFields tests
```

### Pattern 1: DynamicField Type
**What:** A structured object type replacing free-text soft criteria strings.
**When to use:** Every layer that touches preferences.

**Zod (web):**
```typescript
// Source: Existing pattern in web/src/lib/schemas/preferences.ts
export const dynamicFieldSchema = z.object({
  name: z.string().min(1),
  value: z.string().default(''),
  importance: importanceLevelSchema,  // reuse existing enum: 'critical' | 'high' | 'medium' | 'low'
})

export type DynamicField = z.infer<typeof dynamicFieldSchema>
```

**Pydantic (backend):**
```python
# Source: Existing pattern in backend/app/models/preferences.py
class DynamicField(BaseModel):
    """A single dynamic preference field with name, value, and importance."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    name: str
    value: str = ""
    importance: ImportanceLevel = ImportanceLevel.MEDIUM
```

### Pattern 2: Backward-Compatible Migration (softCriteria -> dynamicFields)
**What:** Auto-migrate old string-array softCriteria to structured dynamicFields.
**When to use:** In model validators, runs on every JSONB parse.

**Pydantic approach (proven pattern from Phase 7):**
```python
@model_validator(mode="before")
@classmethod
def migrate_legacy_format(cls, data: dict) -> dict:
    # ... existing migrations ...

    # Migrate softCriteria -> dynamicFields
    if "softCriteria" in data and "dynamicFields" not in data:
        soft = data.get("softCriteria", [])
        data["dynamicFields"] = [
            {"name": criterion, "value": "", "importance": "medium"}
            for criterion in soft
            if isinstance(criterion, str) and criterion.strip()
        ]
    # Also handle snake_case variant
    if "soft_criteria" in data and "dynamic_fields" not in data and "dynamicFields" not in data:
        soft = data.get("soft_criteria", [])
        data["dynamicFields"] = [
            {"name": criterion, "value": "", "importance": "medium"}
            for criterion in soft
            if isinstance(criterion, str) and criterion.strip()
        ]
    return data
```

**Zod approach (web-side):**
```typescript
// In preferencesSchema, handle migration via superRefine or transform is complex.
// Simpler: do migration at the point of consumption (profile page load).
// The profile edit page already does: preferencesSchema.parse(profile.preferences ?? {})
// Add a pre-parse migration function:
export function migratePreferences(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.softCriteria && !raw.dynamicFields) {
    raw.dynamicFields = (raw.softCriteria as string[])
      .filter(s => typeof s === 'string' && s.trim())
      .map(s => ({ name: s, value: '', importance: 'medium' }))
  }
  return raw
}
```

### Pattern 3: Importance-Weighted Prompt Rendering
**What:** Render dynamic fields in the Claude scoring prompt with importance weighting.
**When to use:** In `build_user_prompt()` in `scoring.py`.

```python
def _format_dynamic_fields_section(prefs: UserPreferences) -> str:
    """Format dynamic fields as weighted custom criteria for Claude."""
    if not prefs.dynamic_fields:
        return ""

    # Group by importance for clear prompt structure
    by_importance = {"critical": [], "high": [], "medium": [], "low": []}
    for field in prefs.dynamic_fields:
        label = f"{field.name}: {field.value}" if field.value else field.name
        by_importance[field.importance.value].append(label)

    lines = ["\n**Custom Criteria (by importance):**"]
    importance_labels = {
        "critical": "CRITICAL (must have)",
        "high": "HIGH (strongly preferred)",
        "medium": "MEDIUM (nice to have)",
        "low": "LOW (minor preference)",
    }
    for level in ["critical", "high", "medium", "low"]:
        items = by_importance[level]
        if items:
            lines.append(f"\n{importance_labels[level]}:")
            for item in items:
                lines.append(f"  - {item}")

    return "\n".join(lines)
```

### Anti-Patterns to Avoid
- **Removing softCriteria immediately:** Keep it in the Pydantic model (as optional) during the transition. The model_validator converts it to dynamicFields. Removing it would break parsing of existing JSONB data.
- **Storing dynamicFields as a separate DB column:** The preferences are already JSONB; dynamicFields is just a new key inside that JSON object. No DB migration needed.
- **Relying on the Zod default to handle migration:** The Zod `.default([])` only works when the key is absent. For existing data with softCriteria, a pre-parse migration step is needed.
- **Rendering all dynamic fields with equal weight in the prompt:** The whole point is importance-weighted rendering. Critical items should be clearly marked as "must have" while low items are "minor preference."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom validation logic | Zod 4 + Pydantic v2 | Already in use; built-in validation, defaults, type inference |
| camelCase <-> snake_case | Manual key mapping | Pydantic `alias_generator=to_camel` | Already configured in UserPreferences model |
| Form state management | Manual state tracking | react-hook-form + zodResolver | Already in use; handles arrays, validation, dirty tracking |
| Data migration | One-time SQL script | model_validator (Pydantic) + migratePreferences (TS) | Runtime migration handles all cases: new data, old data, re-saved data |

**Key insight:** This is a schema evolution task, not a new feature. The existing patterns (importance levels, model_validator, Zod schemas) already solve 80% of the problem. Follow the established patterns.

## Common Pitfalls

### Pitfall 1: Pydantic extra="ignore" Silently Dropping dynamicFields
**What goes wrong:** If `dynamicFields` is not explicitly declared in the Pydantic model, the `extra="ignore"` config will silently discard it from JSONB input.
**Why it happens:** The model already has `extra="ignore"` to handle unknown legacy keys. A new field that isn't declared is treated as "extra."
**How to avoid:** Add `dynamic_fields: list[DynamicField] = Field(default_factory=list)` to `UserPreferences` with the proper alias (`dynamicFields` via `to_camel`).
**Warning signs:** Backend tests pass but dynamic fields never appear in the scoring prompt.

### Pitfall 2: Zod Parse vs Transform Ordering
**What goes wrong:** Zod `.default([])` runs before `.transform()`, so migration logic in a transform may not fire correctly.
**Why it happens:** Zod 4 applies defaults before transforms. If both `softCriteria` and `dynamicFields` have defaults, the migration transform sees `dynamicFields` as `[]` (not undefined) and skips migration.
**How to avoid:** Do migration BEFORE calling `preferencesSchema.parse()` -- use a standalone `migratePreferences()` function at the call sites (profile page load, form save).
**Warning signs:** New profiles work fine but old profiles with softCriteria show empty dynamic fields.

### Pitfall 3: Scoring Prompt Not Using dynamicFields
**What goes wrong:** The user prompt still references `prefs.soft_criteria` instead of `prefs.dynamic_fields`, so dynamic fields with importance levels are rendered as a flat comma-separated list without weighting.
**Why it happens:** Developer updates the schema but forgets to update the prompt builder.
**How to avoid:** Replace the soft criteria line in `build_user_prompt()` with `_format_dynamic_fields_section()`. Update system prompt to reference "Custom Criteria" section. Add a test that verifies dynamic fields appear with importance labels in the generated prompt.
**Warning signs:** Scoring results don't differentiate between critical and low-importance custom criteria.

### Pitfall 4: Form Array Field Rendering with react-hook-form
**What goes wrong:** Adding/removing dynamic fields causes re-renders or index mismatches, leading to data loss or stale values.
**Why it happens:** react-hook-form's `useFieldArray` requires specific key handling for array fields. Using manual index-based approaches (like the current softCriteria section) works but is fragile with objects.
**How to avoid:** Use `useFieldArray` from react-hook-form for `dynamicFields`. It handles add/remove/swap operations correctly and provides stable `id` keys for React rendering.
**Warning signs:** Removing a middle field causes the last field's values to appear in the wrong position.

### Pitfall 5: Checklist Items in ScoreResponse
**What goes wrong:** The Claude scoring response's `checklist` field currently evaluates softCriteria items and features. If dynamicFields replaces softCriteria but the system prompt still says "evaluate soft criteria as a checklist," Claude may skip dynamic fields.
**Why it happens:** The system prompt references "soft criteria" explicitly.
**How to avoid:** Update the system prompt to reference "custom criteria" (dynamic fields) instead of "soft criteria." Ensure the `ChecklistItem` model still works for dynamic field evaluation.
**Warning signs:** Checklist in score response is empty or only contains features, not custom criteria.

## Code Examples

Verified patterns from the existing codebase:

### Adding dynamicFields to Zod Schema
```typescript
// File: web/src/lib/schemas/preferences.ts
// Source: Existing preferencesSchema pattern

export const dynamicFieldSchema = z.object({
  name: z.string().min(1),
  value: z.string().default(''),
  importance: importanceLevelSchema,
})

export type DynamicField = z.infer<typeof dynamicFieldSchema>

export const preferencesSchema = z.object({
  // ... existing fields ...

  // Keep softCriteria for backward compat (will be migrated at load time)
  softCriteria: z.array(z.string()).default([]),

  // New structured dynamic fields
  dynamicFields: z.array(dynamicFieldSchema).default([]),

  // ... rest of existing fields ...
})
```

### Adding DynamicField to Pydantic Model
```python
# File: backend/app/models/preferences.py
# Source: Existing UserPreferences pattern

class DynamicField(BaseModel):
    """A single dynamic preference field with importance level."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    name: str
    value: str = ""
    importance: ImportanceLevel = ImportanceLevel.MEDIUM


class UserPreferences(BaseModel):
    # ... existing fields ...

    # Soft criteria (legacy -- migrated to dynamic_fields on load)
    soft_criteria: list[str] = Field(default_factory=list)

    # Dynamic fields with importance (replaces soft_criteria)
    dynamic_fields: list[DynamicField] = Field(default_factory=list)

    # ... existing fields ...
```

### useFieldArray for Dynamic Fields UI
```typescript
// File: web/src/components/preferences/dynamic-fields-section.tsx
// Source: react-hook-form docs + existing soft-criteria-section.tsx pattern

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'

export function DynamicFieldsSection({ form }: { form: UseFormReturn<Preferences> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'dynamicFields',
  })

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <Input
            {...form.register(`dynamicFields.${index}.name`)}
            placeholder="Criterion name"
          />
          <Input
            {...form.register(`dynamicFields.${index}.value`)}
            placeholder="Details (optional)"
          />
          <Select
            value={form.watch(`dynamicFields.${index}.importance`)}
            onValueChange={(v) => form.setValue(`dynamicFields.${index}.importance`, v)}
          >
            {/* importance level options */}
          </Select>
          <Button variant="ghost" size="icon" onClick={() => remove(index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm"
        onClick={() => append({ name: '', value: '', importance: 'medium' })}>
        + Add Criterion
      </Button>
    </div>
  )
}
```

### Updated Scoring Prompt
```python
# File: backend/app/prompts/scoring.py
# Replaces the soft criteria line in build_user_prompt()

# OLD:
# **Soft criteria:** {", ".join(prefs.soft_criteria) if prefs.soft_criteria else "None"}

# NEW:
# {_format_dynamic_fields_section(prefs)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `softCriteria: string[]` | `dynamicFields: DynamicField[]` | Phase 11 (this phase) | Structured criteria with per-field importance |
| Flat comma-separated prompt | Importance-grouped prompt section | Phase 11 (this phase) | Better Claude scoring differentiation |
| Manual index array management | `useFieldArray` for object arrays | Phase 11 (this phase) | More robust form handling |

**Deprecated/outdated:**
- `softCriteria` field: Keep in schema for backward compat but stop using in UI and prompt. Migration converts to dynamicFields.
- `weight-sliders.tsx` and `soft-criteria.tsx`: Appear to be unused duplicates of `importance-section.tsx` and `soft-criteria-section.tsx`. Can be cleaned up.

## Open Questions

1. **Should softCriteria be removed from the Zod/Pydantic schema entirely?**
   - What we know: The model_validator handles migration at parse time. Keeping softCriteria means both old and new data parse correctly.
   - What's unclear: Whether to strip softCriteria from the save path (so re-saving always produces dynamicFields-only JSONB).
   - Recommendation: Keep `softCriteria` in the schema with `default([])` but do NOT render it in the UI. On save, the form only produces `dynamicFields`. The model_validator migrates old data on read. After all profiles are re-saved, softCriteria naturally disappears. This is the safest approach.

2. **Should the `checklist` field in ScoreResponse be updated?**
   - What we know: Currently, `ChecklistItem` evaluates both soft criteria and features. The dynamic fields replace soft criteria.
   - What's unclear: Whether Claude should produce one checklist combining features + dynamic fields, or separate sections.
   - Recommendation: Keep single checklist. Update the system prompt to say "evaluate each custom criterion and desired feature individually" instead of "soft criterion." The `ChecklistItem` model structure (criterion, met, note) works perfectly for dynamic fields.

3. **What should the `value` field in DynamicField contain?**
   - What we know: Requirements say "name, value, and importance." The name is the criterion label (e.g., "Near public transport"). The value provides details.
   - What's unclear: Is value always a string? Could it be a number or boolean?
   - Recommendation: Keep as free-text string. Phase 12 (Chat-Based Preference Discovery) will generate these from AI conversation. A string is flexible enough for "Within 500m of train station" or "Yes" or "3+ options nearby."

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (backend) | pytest + pytest-asyncio (asyncio_mode="auto") |
| Framework (web) | vitest 3.x + @testing-library/react |
| Config file (backend) | `backend/pyproject.toml` |
| Config file (web) | `web/vitest.config.ts` |
| Quick run command (backend) | `cd backend && python -m pytest tests/test_preferences.py tests/test_prompts.py -x` |
| Quick run command (web) | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` |
| Full suite command (backend) | `cd backend && python -m pytest tests/ -x` |
| Full suite command (web) | `cd web && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHM-01 | dynamicFields with name/value/importance stored in preferences | unit | `cd backend && python -m pytest tests/test_preferences.py -x -k "dynamic"` | Needs new tests |
| SCHM-02 | Zod schema includes DynamicField type and validates correctly | unit | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` | Exists, needs new test cases |
| SCHM-03 | Pydantic model includes dynamic_fields, validates, doesn't drop silently | unit | `cd backend && python -m pytest tests/test_preferences.py -x -k "dynamic"` | Exists, needs new test cases |
| SCHM-04 | Scoring prompt renders dynamic fields with importance weighting | unit | `cd backend && python -m pytest tests/test_prompts.py -x -k "dynamic"` | Exists, needs new test cases |
| SCHM-05 | softCriteria auto-migrates to dynamicFields on parse | unit | `cd backend && python -m pytest tests/test_preferences.py -x -k "migrate"` | Exists, needs new test case |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_preferences.py tests/test_prompts.py -x` + `cd web && npx vitest run src/__tests__/preferences-schema.test.ts`
- **Per wave merge:** Full backend + web test suites
- **Phase gate:** All test suites green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test cases in `backend/tests/test_preferences.py` -- DynamicField parsing, validation, migration from softCriteria
- [ ] New test cases in `backend/tests/test_prompts.py` -- dynamic fields rendered with importance in prompt
- [ ] New test cases in `web/src/__tests__/preferences-schema.test.ts` -- dynamicFields schema validation, defaults, round-trip
- [ ] Update `backend/tests/conftest.py` -- add SAMPLE_PREFERENCES_JSON with dynamicFields

*(Existing test infrastructure covers all phase requirements -- only new test cases needed, no new framework setup)*

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - All source files read directly:
  - `web/src/lib/schemas/preferences.ts` (Zod schema)
  - `backend/app/models/preferences.py` (Pydantic model)
  - `backend/app/prompts/scoring.py` (Claude prompt builder)
  - `backend/app/services/claude.py` (scoring client)
  - `backend/app/models/scoring.py` (ScoreResponse model)
  - `supabase/functions/score-proxy/index.ts` (edge function)
  - `supabase/migrations/002_profiles_schema.sql` (DB schema)
  - All UI components in `web/src/components/preferences/`
  - All test files in `backend/tests/` and `web/src/__tests__/`

### Secondary (MEDIUM confidence)
- Pydantic v2 model_validator pattern -- verified working in existing codebase (Phase 7 migration)
- react-hook-form useFieldArray -- standard API for array-of-objects form fields
- Zod 4 object/array schemas -- already used extensively in the codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, versions verified
- Architecture: HIGH - follows established patterns from Phase 7 schema unification
- Pitfalls: HIGH - identified from direct codebase analysis of existing patterns
- Migration strategy: HIGH - model_validator pattern already proven in this codebase

**Research date:** 2026-03-15
**Valid until:** indefinite (schema evolution of existing codebase, no external dependencies changing)
