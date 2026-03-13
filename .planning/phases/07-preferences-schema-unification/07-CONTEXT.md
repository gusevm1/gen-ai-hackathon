# Phase 7 Context: Preferences Schema Unification

## Vision

Define a single canonical preferences schema used by all layers (frontend Zod, backend Pydantic, Supabase JSONB). Replace the current divergent schemas (web dashboard vs extension wizard vs backend) with one source of truth. Update the Claude scoring prompt to use structured importance levels and dealbreaker semantics.

The extension wizard is being deprecated. The web app becomes the sole preferences UI (Phase 9 builds the form). This phase defines the data contract that Phase 9's form writes to.

## Canonical Schema (agreed with user)

```
Standard Filters:
  location: string                                      # "Zurich"
  offerType: "RENT" | "SALE"                           # default RENT
  objectCategory: "APARTMENT" | "HOUSE" | "ANY"        # default ANY

Numeric Ranges (each with dealbreaker toggle):
  budgetMin: number | null
  budgetMax: number | null
  budgetDealbreaker: boolean                           # default false
  roomsMin: number | null
  roomsMax: number | null
  roomsDealbreaker: boolean                            # default false
  livingSpaceMin: number | null
  livingSpaceMax: number | null
  livingSpaceDealbreaker: boolean                      # default false

Additional Filters:
  floorPreference: "any" | "ground" | "not_ground"    # default any
  availability: "any" | "immediately" | "1m"..."12m"   # default any
  features: string[]                                   # typed chips: balcony, elevator, parking, etc.

Soft Criteria:
  softCriteria: string[]                               # free text tags

Category Importance (replaces 0-100 weight sliders):
  importance: {
    location: "critical" | "high" | "medium" | "low"   # default medium
    price: "critical" | "high" | "medium" | "low"      # default medium
    size: "critical" | "high" | "medium" | "low"       # default medium
    features: "critical" | "high" | "medium" | "low"   # default medium
    condition: "critical" | "high" | "medium" | "low"  # default medium
  }

Language:
  language: "de" | "en" | "fr" | "it"                  # default de
```

## What This Phase Builds

1. **Shared Zod schema** — single canonical definition, importable by web app. Located in a shared location or duplicated with a generation script.
2. **Backend Pydantic model** — `UserPreferences` updated to match canonical schema. Accepts camelCase from JSONB. New fields: `budgetDealbreaker`, `roomsDealbreaker`, `livingSpaceDealbreaker`, `floorPreference`, `availability`, `importance` (replaces `weights`). Drop `selected_features` (merged into `features`).
3. **Claude prompt update** — `build_user_prompt()` emits importance levels and dealbreaker flags instead of numeric weights. Example output in prompt:
   ```
   **Category Importance:**
   - Location: CRITICAL
   - Price: HIGH (Budget is a DEALBREAKER — hard ceiling)
   - Size: MEDIUM
   - Features: LOW
   - Condition: MEDIUM

   **Dealbreakers (score 0 if violated):**
   - Budget max: CHF 2,500/month (HARD LIMIT)
   - Rooms min: 3 (HARD LIMIT)
   ```
4. **Migration of existing preferences JSONB** — existing profiles in the DB have the old schema. The backend must handle both old-format (weights as numbers) and new-format (importance as strings) gracefully during transition, OR a data migration script updates existing rows.

## Key Decisions

- **Dealbreaker semantics**: When a dealbreaker constraint is violated, Claude should score that category at 0 and the overall match tier should be "poor" regardless of other scores.
- **Importance mapping**: critical=90, high=70, medium=50, low=30 for any internal weighting Claude does. But the prompt uses the words, not numbers.
- **Backward compatibility**: Old preferences without `importance` field should default all categories to "medium" and all dealbreakers to false.
- **`weights` → `importance`**: The old `weights` object (0-100 ints) is replaced by `importance` (4-level strings). The web dashboard form (Phase 9) will use importance chips instead of sliders.

## Files Likely Modified

- `backend/app/models/preferences.py` — Pydantic model rewrite
- `backend/app/prompts/scoring.py` — Claude prompt with importance + dealbreakers
- `web/src/lib/schemas/preferences.ts` — Canonical Zod schema
- `backend/tests/test_score_endpoint.py` — Updated test payloads
- `backend/tests/test_scoring.py` — Updated mock preferences

## What This Phase Does NOT Build

- No UI changes (Phase 9 builds the form)
- No profile CRUD (Phase 9)
- No layout/navigation changes (Phase 8)
- Extension wizard is untouched (deprecated, will be removed later)
