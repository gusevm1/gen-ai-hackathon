# Phase 7: Preferences Schema Unification - Research

**Researched:** 2026-03-13
**Domain:** Schema unification (Zod 4 + Pydantic 2), Claude prompt engineering, backward-compatible JSONB migration
**Confidence:** HIGH

## Summary

Phase 7 replaces three divergent preference schemas (web Zod, extension Zod, backend Pydantic) with a single canonical schema. The web app's `preferencesSchema` in Zod 4 becomes the source of truth. The backend Pydantic model is rewritten to match, and the Claude scoring prompt is updated to use structured importance levels (`critical`/`high`/`medium`/`low`) with dealbreaker semantics instead of numeric 0-100 weights.

The core challenge is backward compatibility: existing `profiles.preferences` JSONB rows use the old schema (with `weights` as `{location: 80, price: 70, ...}` and `selectedFeatures` as a separate array). The new schema introduces `importance` (4-level strings), `budgetDealbreaker`/`roomsDealbreaker`/`livingSpaceDealbreaker` (booleans), `floorPreference`, `availability`, and `features` (replaces `selectedFeatures`). The backend Pydantic model must gracefully handle both old and new formats during transition.

No UI changes are in scope -- Phase 9 builds the form. The extension wizard is deprecated and untouched. This phase is purely a data contract + backend prompt update.

**Primary recommendation:** Define the canonical Zod schema in `web/src/lib/schemas/preferences.ts`, rewrite the backend Pydantic model to match, update the Claude prompt to use importance levels + dealbreaker semantics, and add backward-compatibility parsing for old-format JSONB.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dealbreaker semantics: When a dealbreaker constraint is violated, Claude should score that category at 0 and the overall match tier should be "poor" regardless of other scores.
- Importance mapping: critical=90, high=70, medium=50, low=30 for any internal weighting Claude does. But the prompt uses the words, not numbers.
- Backward compatibility: Old preferences without `importance` field should default all categories to "medium" and all dealbreakers to false.
- `weights` to `importance`: The old `weights` object (0-100 ints) is replaced by `importance` (4-level strings). The web dashboard form (Phase 9) will use importance chips instead of sliders.
- Extension wizard is untouched (deprecated, will be removed later).
- No UI changes (Phase 9 builds the form).
- No profile CRUD (Phase 9).
- No layout/navigation changes (Phase 8).

### Claude's Discretion
- Where to locate the canonical schema file (shared location vs web/src/lib/schemas)
- How to handle backward compatibility (migration script vs runtime fallback)
- Prompt formatting details for importance levels and dealbreakers

### Deferred Ideas (OUT OF SCOPE)
- UI for preferences form (Phase 9)
- Profile CRUD operations (Phase 9)
- Extension popup changes (Phase 10)
- Layout/navigation overhaul (Phase 8)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PREF-13 | Web/extension/backend preference schemas unified into canonical superset | Canonical Zod schema in web app + matching Pydantic model with alias_generator for camelCase. Extension schema is deprecated -- no changes needed. |
| PREF-14 | Claude prompt updated to use structured importance levels and all preference fields | `build_user_prompt()` rewritten to emit importance levels, dealbreaker flags, and all new fields (floorPreference, availability, features). System prompt updated with dealbreaker scoring rules. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.6 | TypeScript schema validation (canonical source of truth) | Already used by both web and extension |
| Pydantic | 2.12.5 | Python model validation (backend mirror of Zod schema) | Already used by FastAPI backend |
| FastAPI | latest | Backend API framework | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest | latest | Backend test runner | Test Pydantic model parsing + prompt generation |
| vitest | 4.0.18 | Web test runner | Test Zod schema validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual Pydantic mirror | JSON Schema generation from Zod -> Pydantic | Over-engineering for 1 schema; manual sync is fine for this scale |
| Shared npm package | Duplicate schema in web | Monorepo package adds complexity; web is the single canonical location |

## Architecture Patterns

### Recommended Project Structure
```
web/src/lib/schemas/
  preferences.ts          # CANONICAL Zod schema (single source of truth)

backend/app/models/
  preferences.py          # Pydantic mirror with backward compatibility

backend/app/prompts/
  scoring.py              # Updated prompt with importance levels + dealbreakers

backend/tests/
  conftest.py             # Updated SAMPLE_PREFERENCES_JSON (new + old format fixtures)
  test_prompts.py         # Tests for new prompt format
  test_preferences.py     # NEW: Tests for Pydantic model parsing (old + new formats)
```

### Pattern 1: Pydantic Backward-Compatible Model with Validators

**What:** The `UserPreferences` Pydantic model accepts both old-format (weights as 0-100 ints) and new-format (importance as 4-level strings) JSONB. A `model_validator` detects old format and converts at parse time.

**When to use:** When existing DB rows have the old schema and must work without a data migration.

**Example:**
```python
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, Literal
from enum import Enum


class ImportanceLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Importance(BaseModel):
    location: ImportanceLevel = ImportanceLevel.MEDIUM
    price: ImportanceLevel = ImportanceLevel.MEDIUM
    size: ImportanceLevel = ImportanceLevel.MEDIUM
    features: ImportanceLevel = ImportanceLevel.MEDIUM
    condition: ImportanceLevel = ImportanceLevel.MEDIUM


class UserPreferences(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    # Standard filters
    location: str = ""
    offer_type: OfferType = OfferType.RENT
    object_category: ObjectCategory = ObjectCategory.ANY
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    budget_dealbreaker: bool = False
    rooms_min: Optional[float] = None
    rooms_max: Optional[float] = None
    rooms_dealbreaker: bool = False
    living_space_min: Optional[int] = None
    living_space_max: Optional[int] = None
    living_space_dealbreaker: bool = False

    # Additional filters (new)
    floor_preference: Literal["any", "ground", "not_ground"] = "any"
    availability: str = "any"
    features: list[str] = Field(default_factory=list)

    # Soft criteria
    soft_criteria: list[str] = Field(default_factory=list)

    # Importance (replaces weights)
    importance: Importance = Field(default_factory=Importance)

    # Language
    language: str = "de"

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_format(cls, data):
        """Convert old-format preferences to new format at parse time."""
        if isinstance(data, dict):
            # Migrate weights -> importance
            if "weights" in data and "importance" not in data:
                # Old format had numeric weights; map to importance levels
                data["importance"] = {
                    "location": "medium",
                    "price": "medium",
                    "size": "medium",
                    "features": "medium",
                    "condition": "medium",
                }
            # Migrate selectedFeatures -> features
            if "selectedFeatures" in data and "features" not in data:
                data["features"] = data.pop("selectedFeatures")
            elif "selected_features" in data and "features" not in data:
                data["features"] = data.pop("selected_features")
        return data
```

### Pattern 2: Structured Importance in Claude Prompt

**What:** The user prompt section emits human-readable importance levels and explicit dealbreaker constraints instead of numeric weights.

**When to use:** Always -- this replaces the old `Category weights (0-100 importance)` section.

**Example:**
```python
def _format_importance_section(prefs: UserPreferences) -> str:
    """Format importance levels and dealbreakers for Claude prompt."""
    lines = ["**Category Importance:**"]
    imp = prefs.importance
    for cat in ["location", "price", "size", "features", "condition"]:
        level = getattr(imp, cat).value.upper()
        lines.append(f"- {cat.title()}: {level}")

    # Dealbreakers section
    dealbreakers = []
    if prefs.budget_dealbreaker and prefs.budget_max:
        dealbreakers.append(f"- Budget max: CHF {prefs.budget_max:,} (HARD LIMIT)")
    if prefs.rooms_dealbreaker and prefs.rooms_min:
        dealbreakers.append(f"- Rooms min: {prefs.rooms_min} (HARD LIMIT)")
    if prefs.living_space_dealbreaker and prefs.living_space_min:
        dealbreakers.append(f"- Living space min: {prefs.living_space_min} sqm (HARD LIMIT)")

    if dealbreakers:
        lines.append("")
        lines.append("**Dealbreakers (score 0 if violated):**")
        lines.extend(dealbreakers)

    return "\n".join(lines)
```

### Pattern 3: Canonical Zod Schema with Defaults

**What:** The Zod schema defines every field with sensible defaults so it can parse both empty objects (new profiles) and partial objects (old profiles with missing new fields).

**When to use:** The `preferencesSchema` in `web/src/lib/schemas/preferences.ts`.

**Example:**
```typescript
import { z } from 'zod'

const importanceLevelSchema = z.enum(['critical', 'high', 'medium', 'low']).default('medium')

export const preferencesSchema = z.object({
  // Standard filters
  location: z.string().default(''),
  offerType: z.enum(['RENT', 'SALE']).default('RENT'),
  objectCategory: z.enum(['APARTMENT', 'HOUSE', 'ANY']).default('ANY'),

  // Numeric ranges with dealbreaker toggles
  budgetMin: z.number().nullable().default(null),
  budgetMax: z.number().nullable().default(null),
  budgetDealbreaker: z.boolean().default(false),
  roomsMin: z.number().nullable().default(null),
  roomsMax: z.number().nullable().default(null),
  roomsDealbreaker: z.boolean().default(false),
  livingSpaceMin: z.number().nullable().default(null),
  livingSpaceMax: z.number().nullable().default(null),
  livingSpaceDealbreaker: z.boolean().default(false),

  // Additional filters
  floorPreference: z.enum(['any', 'ground', 'not_ground']).default('any'),
  availability: z.string().default('any'),
  features: z.array(z.string()).default([]),

  // Soft criteria
  softCriteria: z.array(z.string()).default([]),

  // Importance (replaces weights)
  importance: z.object({
    location: importanceLevelSchema,
    price: importanceLevelSchema,
    size: importanceLevelSchema,
    features: importanceLevelSchema,
    condition: importanceLevelSchema,
  }).default({
    location: 'medium',
    price: 'medium',
    size: 'medium',
    features: 'medium',
    condition: 'medium',
  }),

  // Language
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
})
```

### Anti-Patterns to Avoid

- **Keeping `weights` alongside `importance`:** The Pydantic model should NOT have both `weights` and `importance` fields. The `model_validator` converts old format at parse time; the model only exposes `importance`.
- **Mutating DB rows in this phase:** No data migration. The backend handles both formats at runtime. A migration script could be added later, but is not needed now.
- **Changing the `ScoreResponse` model:** The Claude response format (CategoryScore with `weight` field) stays as-is for now. Claude will still output per-category weights based on importance mapping. Changing the response model would break the extension and web app display.
- **Touching the extension:** The extension wizard is deprecated. Do not modify `extension/src/schema/profile.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| camelCase/snake_case conversion | Manual field mapping | Pydantic `alias_generator=to_camel` + `populate_by_name=True` | Already in use, handles both directions |
| Schema validation | Manual if/else checks | Zod 4 `.default()` + `.nullable()` + Pydantic validators | Type-safe, auto-generates TypeScript types |
| Old-to-new format migration | Per-field if/else in router | Pydantic `model_validator(mode="before")` | Runs before field validation, single place for all conversions |

**Key insight:** Pydantic's `model_validator(mode="before")` is the correct place for schema migration logic. It runs before any field validation, allowing you to reshape the raw dict from JSONB into the expected format.

## Common Pitfalls

### Pitfall 1: Pydantic alias_generator and `importance` Nested Model
**What goes wrong:** The `Importance` nested model might not apply `to_camel` aliasing correctly when nested inside `UserPreferences`.
**Why it happens:** Pydantic 2's `alias_generator` on a parent model does NOT propagate to nested models by default.
**How to avoid:** The `Importance` model uses simple, non-compound field names (location, price, size, features, condition) that are the same in camelCase and snake_case. No aliasing needed for the inner model. But if inner model field names ever use underscores, add `ConfigDict` to the inner model too.
**Warning signs:** Validation errors when parsing JSONB with camelCase keys for nested objects.

### Pitfall 2: `selectedFeatures` vs `features` Field Name Change
**What goes wrong:** Old preferences JSONB has `selectedFeatures`, new schema has `features`. If the `model_validator` doesn't handle this, old profiles lose their selected features.
**Why it happens:** Field rename without migration.
**How to avoid:** The `model_validator(mode="before")` must explicitly check for `selectedFeatures` and rename it to `features` before field validation.
**Warning signs:** Features list is empty for old profiles that had `selectedFeatures` populated.

### Pitfall 3: CategoryScore.weight in ScoreResponse
**What goes wrong:** The `CategoryScore` model in `scoring.py` has a `weight` field (0-100 int). If the prompt tells Claude to use importance levels but the response model expects numeric weights, Claude may output inconsistent data.
**Why it happens:** The prompt says "CRITICAL" but the response schema expects `weight: int`.
**How to avoid:** Keep the `CategoryScore.weight` field as-is. Update the prompt to tell Claude the internal numeric mapping: critical=90, high=70, medium=50, low=30. Claude will output the mapped numeric weight in the response. The field `description` on `CategoryScore.weight` should be updated to mention importance levels.
**Warning signs:** Claude outputs 0 or random numbers for weight field, or validation errors on the response.

### Pitfall 4: Zod 4 `.default()` on `.object()` Nested Schema
**What goes wrong:** In Zod 4, `.default()` on an object schema might not merge defaults for individual fields when a partial object is provided.
**Why it happens:** Zod 4 `.default()` replaces the entire value when undefined, not when partially provided.
**How to avoid:** Use `.default()` on the outer object with a complete default value object, and also use `.default()` on each inner field. When parsing `{ importance: { location: "high" } }`, the inner fields like `price` should still default to "medium" via the `importanceLevelSchema` default.
**Warning signs:** Missing importance fields when only some are provided.

### Pitfall 5: System Prompt Not Updated with Dealbreaker Rules
**What goes wrong:** Only the user prompt mentions dealbreakers, but the system prompt doesn't instruct Claude on dealbreaker scoring behavior.
**Why it happens:** The system prompt in `build_system_prompt()` defines the general scoring rules. If dealbreaker rules are only in the user prompt, Claude may not consistently enforce them.
**How to avoid:** Add explicit dealbreaker scoring rules to the system prompt: "When a dealbreaker constraint is violated, score that category at 0 and assign match_tier 'poor' regardless of other scores."
**Warning signs:** Claude scores a property as "good" even when budget dealbreaker is violated.

### Pitfall 6: Old Profiles with `weights` Causing Pydantic Validation Errors
**What goes wrong:** Old profiles have `weights: {location: 80, price: 70, ...}`. If the `model_validator` doesn't remove `weights` from the dict, Pydantic will try to validate it against the new model which no longer has a `weights` field, causing an error.
**Why it happens:** Extra fields in the JSONB that don't exist on the model.
**How to avoid:** In the `model_validator`, after migrating `weights` to `importance`, delete `weights` from the dict. Alternatively, the model should use `model_config = ConfigDict(extra="ignore")` to silently drop unknown fields.
**Warning signs:** Pydantic `ValidationError` with "extra fields not permitted" for `weights`.

## Code Examples

### Current State: Files That Change

**Current `web/src/lib/schemas/preferences.ts`** (14 fields, uses `weights` and `selectedFeatures`):
- `weights`: `z.object({location: z.number(), ...})` with 0-100 ints
- `selectedFeatures`: `z.array(z.string())`
- Missing: `budgetDealbreaker`, `roomsDealbreaker`, `livingSpaceDealbreaker`, `floorPreference`, `availability`, `importance`

**Current `backend/app/models/preferences.py`** (13 fields, uses `Weights` class and `selected_features`):
- `weights`: `Weights` (inner BaseModel with 0-100 ints)
- `selected_features`: `list[str]`
- Missing: all dealbreaker fields, `floor_preference`, `availability`, `importance`

**Current `backend/app/prompts/scoring.py`** (prompt uses `prefs.weights.location` etc.):
- User prompt section: `Category weights (0-100 importance): Location: {prefs.weights.location}`
- Missing: dealbreaker section, importance levels, floor preference, availability

### New Canonical Schema (Zod 4)

```typescript
// web/src/lib/schemas/preferences.ts
import { z } from 'zod'

const importanceLevel = z.enum(['critical', 'high', 'medium', 'low']).default('medium')

export const preferencesSchema = z.object({
  location: z.string().default(''),
  offerType: z.enum(['RENT', 'SALE']).default('RENT'),
  objectCategory: z.enum(['APARTMENT', 'HOUSE', 'ANY']).default('ANY'),
  budgetMin: z.number().nullable().default(null),
  budgetMax: z.number().nullable().default(null),
  budgetDealbreaker: z.boolean().default(false),
  roomsMin: z.number().nullable().default(null),
  roomsMax: z.number().nullable().default(null),
  roomsDealbreaker: z.boolean().default(false),
  livingSpaceMin: z.number().nullable().default(null),
  livingSpaceMax: z.number().nullable().default(null),
  livingSpaceDealbreaker: z.boolean().default(false),
  floorPreference: z.enum(['any', 'ground', 'not_ground']).default('any'),
  availability: z.string().default('any'),
  features: z.array(z.string()).default([]),
  softCriteria: z.array(z.string()).default([]),
  importance: z.object({
    location: importanceLevel,
    price: importanceLevel,
    size: importanceLevel,
    features: importanceLevel,
    condition: importanceLevel,
  }).default({
    location: 'medium',
    price: 'medium',
    size: 'medium',
    features: 'medium',
    condition: 'medium',
  }),
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
})

export type Preferences = z.infer<typeof preferencesSchema>
```

### New Backend Pydantic Model

```python
# backend/app/models/preferences.py
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, Literal
from enum import Enum


class ImportanceLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class OfferType(str, Enum):
    RENT = "RENT"
    SALE = "SALE"


class ObjectCategory(str, Enum):
    APARTMENT = "APARTMENT"
    HOUSE = "HOUSE"
    ANY = "ANY"


class Importance(BaseModel):
    location: ImportanceLevel = ImportanceLevel.MEDIUM
    price: ImportanceLevel = ImportanceLevel.MEDIUM
    size: ImportanceLevel = ImportanceLevel.MEDIUM
    features: ImportanceLevel = ImportanceLevel.MEDIUM
    condition: ImportanceLevel = ImportanceLevel.MEDIUM


IMPORTANCE_WEIGHT_MAP = {
    ImportanceLevel.CRITICAL: 90,
    ImportanceLevel.HIGH: 70,
    ImportanceLevel.MEDIUM: 50,
    ImportanceLevel.LOW: 30,
}


class UserPreferences(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",  # Silently drop unknown fields (e.g. old "weights")
    )

    location: str = ""
    offer_type: OfferType = OfferType.RENT
    object_category: ObjectCategory = ObjectCategory.ANY
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    budget_dealbreaker: bool = False
    rooms_min: Optional[float] = None
    rooms_max: Optional[float] = None
    rooms_dealbreaker: bool = False
    living_space_min: Optional[int] = None
    living_space_max: Optional[int] = None
    living_space_dealbreaker: bool = False
    floor_preference: Literal["any", "ground", "not_ground"] = "any"
    availability: str = "any"
    features: list[str] = Field(default_factory=list)
    soft_criteria: list[str] = Field(default_factory=list)
    importance: Importance = Field(default_factory=Importance)
    language: str = "de"

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_format(cls, data):
        if isinstance(data, dict):
            # selectedFeatures -> features
            if "selectedFeatures" in data and "features" not in data:
                data["features"] = data.pop("selectedFeatures")
            elif "selected_features" in data and "features" not in data:
                data["features"] = data.pop("selected_features")
            # weights -> importance (default all to medium for old format)
            if "weights" in data and "importance" not in data:
                data["importance"] = {
                    "location": "medium",
                    "price": "medium",
                    "size": "medium",
                    "features": "medium",
                    "condition": "medium",
                }
        return data
```

### Updated Claude System Prompt (dealbreaker rules)

```python
# Addition to build_system_prompt()
"""
DEALBREAKER RULES:
- When the user marks a constraint as a DEALBREAKER (HARD LIMIT), and the listing \
violates that constraint, you MUST:
  1. Score that category at 0.
  2. Set the overall match_tier to "poor" regardless of other category scores.
  3. Explicitly state the dealbreaker violation in summary_bullets.
- A budget dealbreaker means the listing price EXCEEDS the user's maximum -- score price at 0.
- A rooms dealbreaker means the listing has FEWER rooms than the user's minimum -- score size at 0.
- A living space dealbreaker means the listing has LESS space than the user's minimum -- score size at 0.

IMPORTANCE LEVELS:
- Category importance is expressed as: CRITICAL, HIGH, MEDIUM, LOW.
- Use these to weight your overall score calculation. CRITICAL categories matter most.
- For the weight field in each category response, use: critical=90, high=70, medium=50, low=30.
"""
```

### Updated User Prompt Section

```python
def build_user_prompt(listing: FlatfoxListing, prefs: UserPreferences) -> str:
    # ... (listing formatting stays the same) ...

    # New preferences section
    return f"""## User Preferences

**Location:** {prefs.location or "No preference"}
**Type:** {prefs.offer_type.value} | {prefs.object_category.value}
**Budget:** {_fmt_range(prefs.budget_min, prefs.budget_max, "CHF ")}{" (DEALBREAKER)" if prefs.budget_dealbreaker else ""}
**Rooms:** {_fmt_range(prefs.rooms_min, prefs.rooms_max)}{" (DEALBREAKER)" if prefs.rooms_dealbreaker else ""}
**Living space:** {_fmt_range(prefs.living_space_min, prefs.living_space_max, suffix=" sqm")}{" (DEALBREAKER)" if prefs.living_space_dealbreaker else ""}
**Floor preference:** {prefs.floor_preference}
**Availability:** {prefs.availability}
**Desired features:** {", ".join(prefs.features) if prefs.features else "None"}
**Soft criteria:** {", ".join(prefs.soft_criteria) if prefs.soft_criteria else "None"}

{_format_importance_section(prefs)}

---

## Listing Data
... (same as before) ...
"""
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `weights: {location: 80}` (0-100 ints) | `importance: {location: "high"}` (4-level enum) | This phase | More intuitive for users; cleaner prompt for Claude |
| `selectedFeatures: string[]` | `features: string[]` | This phase | Unified naming with extension schema |
| No dealbreaker concept | `budgetDealbreaker: bool` etc. | This phase | Hard constraints produce instant "poor" match tier |
| No floor/availability prefs | `floorPreference`, `availability` | This phase | Fields that extension had but web/backend ignored |

**Deprecated/outdated:**
- `Weights` class (0-100 ints): Replaced by `Importance` class (4-level enum)
- `selected_features` field: Renamed to `features`
- `weightInputs` (extension only): Not carried forward; extension wizard is deprecated

## Open Questions

1. **Should `CategoryScore.weight` field type change?**
   - What we know: Currently `weight: int` (0-100). Claude outputs a number. The prompt will tell Claude to use the importance-to-weight mapping (critical=90, high=70, etc.).
   - What's unclear: Should the response field be renamed to `importance` or keep `weight`?
   - Recommendation: Keep `weight: int` as-is to avoid breaking the extension and web app UI components that read this field. Update the field description only. This is a separate concern from PREF-13/PREF-14.

2. **Should the `language` field use Literal type instead of str?**
   - What we know: Currently `language: str = "de"` in Pydantic. Zod schema constrains to `de|en|fr|it`.
   - What's unclear: Should Pydantic also enforce the enum?
   - Recommendation: Yes, use `Literal["de", "en", "fr", "it"]` for parity with Zod. Low risk.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (backend) | pytest with pytest-asyncio (auto mode) |
| Framework (web) | vitest 4.0.18 with jsdom |
| Config file (backend) | `backend/pyproject.toml` ([tool.pytest.ini_options]) |
| Config file (web) | `web/vitest.config.mts` |
| Quick run command (backend) | `cd backend && python3 -m pytest tests/ -x -q` |
| Quick run command (web) | `cd web && npx vitest run` |
| Full suite command | Both above sequentially |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREF-13a | New Zod schema accepts canonical fields with defaults | unit | `cd web && npx vitest run src/__tests__/preferences-schema.test.ts` | Exists (needs update) |
| PREF-13b | New Zod schema rejects invalid importance levels | unit | Same file as above | Exists (needs update) |
| PREF-13c | Pydantic model parses new-format JSONB | unit | `cd backend && python3 -m pytest tests/test_preferences.py -x` | Does NOT exist (Wave 0) |
| PREF-13d | Pydantic model parses old-format JSONB (backward compat) | unit | Same file as above | Does NOT exist (Wave 0) |
| PREF-13e | `selectedFeatures` migrated to `features` at parse time | unit | Same file as above | Does NOT exist (Wave 0) |
| PREF-14a | Claude prompt includes importance levels (not numeric weights) | unit | `cd backend && python3 -m pytest tests/test_prompts.py -x` | Exists (needs update) |
| PREF-14b | Claude prompt includes dealbreaker flags | unit | Same file as above | Exists (needs update) |
| PREF-14c | Claude prompt includes floor preference and availability | unit | Same file as above | Exists (needs update) |
| PREF-14d | System prompt includes dealbreaker scoring rules | unit | Same file as above | Exists (needs update) |
| PREF-14e | Full scoring endpoint works with new preferences format | integration | `cd backend && python3 -m pytest tests/test_score_endpoint.py -x` | Exists (needs update) |

### Sampling Rate
- **Per task commit:** `cd backend && python3 -m pytest tests/ -x -q` + `cd web && npx vitest run`
- **Per wave merge:** Full suite (same as above -- both are fast: ~1.2s + ~0.5s)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_preferences.py` -- NEW file for Pydantic model parsing tests (PREF-13c, PREF-13d, PREF-13e)
- [ ] `backend/tests/conftest.py` -- Update `SAMPLE_PREFERENCES_JSON` to new format + add `LEGACY_PREFERENCES_JSON` fixture
- [ ] `web/src/__tests__/preferences-schema.test.ts` -- Update tests for new fields (dealbreakers, importance, floorPreference)
- [ ] `backend/tests/test_prompts.py` -- Update test fixtures and assertions for new prompt format

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `web/src/lib/schemas/preferences.ts`, `backend/app/models/preferences.py`, `backend/app/prompts/scoring.py` -- direct read of current implementation
- Codebase inspection: `extension/src/schema/profile.ts` -- extension's divergent schema fields identified
- Codebase inspection: `backend/tests/conftest.py` -- current test fixture format (old JSONB shape)
- Codebase inspection: `supabase/functions/score-proxy/index.ts` -- edge function passes `profile.preferences` JSONB directly to backend
- Pydantic 2.12.5 docs: `model_validator(mode="before")`, `ConfigDict(extra="ignore")`, `alias_generator`
- Zod 4.3.6: `.default()`, `.enum()`, `.nullable()` behavior verified via installed version

### Secondary (MEDIUM confidence)
- CONTEXT.md: User-agreed canonical schema structure, importance levels, dealbreaker semantics
- STATE.md: Project history, previous phase decisions

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified versions in package.json, requirements.txt, and running instances
- Architecture: HIGH - based on direct codebase inspection of all affected files
- Pitfalls: HIGH - identified from actual code patterns and Pydantic 2 behavior
- Prompt engineering: MEDIUM - dealbreaker enforcement relies on Claude following instructions correctly; may need iteration

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no external API changes expected)

**Baseline test counts:**
- Backend: 57 tests passing (pytest)
- Web: 36 tests passing (vitest)
- Extension: Not run (not in scope for this phase)
