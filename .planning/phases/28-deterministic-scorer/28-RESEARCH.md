# Phase 28: Deterministic Scorer - Research

**Researched:** 2026-03-30
**Domain:** Python deterministic math formulas, Pydantic data models, pytest unit testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary:** Implement deterministic fulfillment formulas for all non-subjective criterion types: price, distance, size, binary_feature, and proximity_quality. Also synthesize built-in preferences (budget, rooms, living_space) as virtual FulfillmentResult entries. No Claude calls for any of these — pure Python math. No scoring pipeline integration in this phase (that's Phase 31).

**FEATURE_ALIAS_MAP coverage:**
- Comprehensive EN + German coverage (~20-30 entries)
- Includes common Flatfox feature slugs and their EN/DE synonyms: balcony/balkon, lift/elevator/aufzug, parking/parkplatz/tiefgarage, cellar/keller, dishwasher/spuelmaschine/geschirrspueler, washing machine/waschmaschine, pets allowed/haustiere erlaubt, garden/garten, terrace/terrasse, new build/neubau, furnished/moebliert, wheelchair/rollstuhlgerecht, etc.
- Lookup is case-insensitive + strip whitespace on BOTH user input term AND Flatfox attribute slug
- Unmatched terms (no alias and no direct slug match) → skip the criterion (consistent with missing-data policy, avoids false f=0.0)

**DS-06 built-in preference importance mapping:**
- `budget_dealbreaker=True` → importance CRITICAL
- `budget_dealbreaker=False` → importance MEDIUM
- Same logic for `rooms_dealbreaker` and `living_space_dealbreaker`
- When the relevant value is not set at all (e.g. `budget_max=None`, `rooms_min=None`) → skip the virtual entry entirely
- For budget: use `budget_max` as the "budget" in the price formula; `budget_min` is ignored for scoring

**DS-03 size/rooms target and symmetric decay:**
- Target = minimum (`living_space_min` for size, `rooms_min` for rooms)
- When actual < min → apply decay formula: `f=min(1.0, (actual/target)^1.5)` (naturally <1.0 for actual<target)
- When actual ≥ min AND actual ≤ max (or max is None) → `f=1.0`
- When actual > max (and max is set) → apply mirror decay: `f=exp(-k * (actual-max) / max)` with softer k than below-min penalty

### Claude's Discretion

- Exact decay constant k for the "above max" mirror formula (suggest making it softer than below-min penalty)
- Module organization: new `services/deterministic_scorer.py` or inline in scorer
- FulfillmentResult Pydantic model field names and structure
- `FEATURE_ALIAS_MAP` specific entry list (comprehensive EN+DE as described above)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DS-01 | System computes price fulfillment deterministically: `f=1.0` if `price ≤ budget`, else `f=exp(-2.5 × (price-budget) / budget)`; None/missing price guarded (skip criterion) | Exponential decay via `math.exp`; guard with early return None on missing data |
| DS-02 | System computes distance fulfillment deterministically: `f=1.0` if `actual ≤ target`, else `f=exp(-1.0 × (actual-target) / target)`; None/missing distance guarded (skip criterion) | Same pattern as DS-01 with different constant; `DynamicField.value` carries the target distance string |
| DS-03 | System computes size fulfillment deterministically via power formula with symmetric range handling | `(actual/target)**1.5` for below-min; `f=1.0` within range; mirror exp decay above max |
| DS-04 | System computes binary feature fulfillment via slug set-membership with FEATURE_ALIAS_MAP for German synonyms; `f=1.0` present, `f=0.0` absent, skip if unmatched | `FlatfoxListing.attributes` is `list[FlatfoxAttribute]` where `FlatfoxAttribute.name` is the raw slug string |
| DS-05 | System computes proximity quality fulfillment via hybrid formula combining distance decay and rating bonus; fallback results use fallback distance | ProximityResult data from `fetch_all_proximity_data()` provides `distance_km`, `rating`, `is_fallback` per place |
| DS-06 | Built-in preference fields (budget, rooms, living_space) synthesized as virtual `FulfillmentResult` entries using dealbreaker flags for importance; not migrated into `dynamic_fields` | `UserPreferences` has `budget_max`, `rooms_min`, `rooms_max`, `living_space_min`, `living_space_max`, `*_dealbreaker` booleans |
</phase_requirements>

---

## Summary

Phase 28 is a pure Python math module with zero external dependencies beyond the stdlib `math` module and existing Pydantic models. All formulas are specified precisely in REQUIREMENTS.md and CONTEXT.md — this phase is implementation, not design. The primary work is: (1) define the `FulfillmentResult` Pydantic model, (2) implement five deterministic scorer functions (one per criterion type), (3) implement the built-in preference synthesizer for DS-06, and (4) write comprehensive pytest unit tests covering formula correctness, guard behavior, and FEATURE_ALIAS_MAP coverage.

The codebase from Phase 27 provides every building block needed: `CriterionType` enum, updated `DynamicField` model, `FlatfoxListing.attributes` (list of `FlatfoxAttribute` with raw slug string names), `UserPreferences` with all budget/rooms/living_space fields, `IMPORTANCE_WEIGHT_MAP`, and the proximity data structures from `proximity.py`. No new pip packages are needed. The scorer module is standalone — it does not touch the existing `scoring.py` router or `claude.py` service until Phase 31.

The key risk area is DS-04 (binary feature): `FlatfoxAttribute.name` contains compound slugs like `"balconygarden"`, `"parkingspace"`, `"petsallowed"` (confirmed from `conftest.py` sample data). The `FEATURE_ALIAS_MAP` must map user-facing terms to these exact compound slugs. A two-step lookup (alias map first, then direct slug comparison as fallback, then skip) handles this cleanly.

**Primary recommendation:** Create `backend/app/services/deterministic_scorer.py` as a standalone module with a `FulfillmentResult` model, five typed scorer functions, one built-in synthesizer function, and one dispatch function. Write `backend/tests/test_deterministic_scorer.py` in parallel using TDD (Wave 0 tests first, then implementation).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `math` | stdlib | `math.exp()`, `math.pow()` | Already used throughout backend; zero install cost |
| `pydantic` | Already installed (v2) | `FulfillmentResult` model | All backend models are Pydantic BaseModel — follow existing pattern |
| `pytest` + `pytest-asyncio` | Already installed | Unit tests | `asyncio_mode = "auto"` already configured in pyproject.toml |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `re` | stdlib | Parse distance value strings from `DynamicField.value` | DS-02: user writes "500m" or "2km" in value field; reuse `_DISTANCE_RE` pattern from proximity.py |
| `typing.Optional` | stdlib | Return type for scorer functions | `Optional[float]` signals "skip this criterion" vs 0.0 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `math.exp` | `numpy.exp` | numpy not installed; stdlib is sufficient for scalar math |
| Returning `Optional[float]` | Returning `float` with sentinel -1.0 | Optional is idiomatic Python and matches the "skip criterion" policy stated in HA-02 |

**Installation:**
```bash
# No new packages needed — math is stdlib, pydantic/pytest already installed
```

---

## Architecture Patterns

### Recommended Project Structure

The entire phase lives in two files:

```
backend/
├── app/
│   └── services/
│       └── deterministic_scorer.py   # NEW: FulfillmentResult + scorer functions
└── tests/
    └── test_deterministic_scorer.py  # NEW: pytest unit tests
```

No changes to existing files in this phase. Phase 31 will import from `deterministic_scorer.py`.

### Pattern 1: FulfillmentResult Pydantic Model

**What:** A Pydantic model representing a single criterion's scored outcome. Used both for dynamic_field criteria and built-in preference virtual entries.

**When to use:** Returned by every scorer function and by the built-in synthesizer.

```python
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from app.models.preferences import ImportanceLevel


class FulfillmentResult(BaseModel):
    """Scored fulfillment for a single criterion.

    fulfillment=None means data was missing — skip in aggregation (HA-02).
    criterion_name mirrors DynamicField.name for virtual built-in entries.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    criterion_name: str
    fulfillment: Optional[float] = Field(None, ge=0.0, le=1.0)
    importance: ImportanceLevel
    reasoning: Optional[str] = None  # Claude fills this for subjective; None for deterministic
```

Key design choices:
- `fulfillment=None` (not 0.0) when data is missing — HA-02 excludes None from aggregation
- `importance` carried here so Phase 31 aggregator reads only this model
- `reasoning` is None for deterministic scores (no explanation needed until FE-01)
- `ConfigDict(alias_generator=to_camel)` matches the pattern on `DynamicField`

### Pattern 2: Scorer Function Signatures

**What:** Each criterion type maps to one pure function taking `DynamicField`, `FlatfoxListing`, and optional proximity data. Returns `Optional[float]` (None = skip).

```python
import math
from typing import Optional
from app.models.listing import FlatfoxListing
from app.models.preferences import DynamicField


def score_price(field: DynamicField, listing: FlatfoxListing) -> Optional[float]:
    """DS-01: f=1.0 if price <= budget, else exp(-2.5 * (price-budget)/budget).
    Returns None if price_display or budget (field.value) is missing.
    """
    price = listing.price_display
    if price is None:
        return None
    try:
        budget = float(field.value)
    except (ValueError, TypeError):
        return None
    if budget <= 0:
        return None
    if price <= budget:
        return 1.0
    return math.exp(-2.5 * (price - budget) / budget)


def score_distance(field: DynamicField, listing: FlatfoxListing) -> Optional[float]:
    """DS-02: f=1.0 if actual <= target, else exp(-1.0 * (actual-target)/target).
    Returns None if listing has no coordinates or field.value has no parseable distance.
    """
    # Parse target_km from field.value (reuses _DISTANCE_RE pattern from proximity.py)
    ...


def score_size(field: DynamicField, listing: FlatfoxListing) -> Optional[float]:
    """DS-03: power formula below min, f=1.0 in range, softer exp above max."""
    ...


def score_binary_feature(field: DynamicField, listing: FlatfoxListing) -> Optional[float]:
    """DS-04: 1.0 if attribute slug found in listing, 0.0 if not, None if unmatched alias."""
    ...


def score_proximity_quality(
    field: DynamicField,
    listing: FlatfoxListing,
    proximity_data: dict[str, list[dict]],
) -> Optional[float]:
    """DS-05: hybrid formula: distance_decay + rating_bonus."""
    ...
```

### Pattern 3: Built-in Preference Synthesizer (DS-06)

**What:** Extract virtual `FulfillmentResult` entries from `UserPreferences` fields without touching `dynamic_fields`.

```python
from app.models.preferences import ImportanceLevel, UserPreferences
import math


def synthesize_builtin_results(
    prefs: UserPreferences,
    listing: FlatfoxListing,
) -> list[FulfillmentResult]:
    """DS-06: Produce virtual FulfillmentResult entries for budget, rooms, living_space.

    Skips any built-in whose primary value is None (no constraint = don't score).
    Importance derived from dealbreaker flag: True → CRITICAL, False → MEDIUM.
    """
    results = []

    # Budget
    if prefs.budget_max is not None:
        importance = ImportanceLevel.CRITICAL if prefs.budget_dealbreaker else ImportanceLevel.MEDIUM
        price = listing.price_display
        if price is None:
            f = None
        elif price <= prefs.budget_max:
            f = 1.0
        else:
            f = math.exp(-2.5 * (price - prefs.budget_max) / prefs.budget_max)
        results.append(FulfillmentResult(criterion_name="budget", fulfillment=f, importance=importance))

    # Rooms — similar pattern with size formula
    # Living space — similar pattern with size formula
    ...
    return results
```

### Pattern 4: DS-03 Symmetric Size Formula

The exact formula for each zone:

```python
def score_size(field: DynamicField, listing: FlatfoxListing) -> Optional[float]:
    """DS-03 symmetric size formula.

    Zones:
    - actual < min:  f = (actual/min)^1.5           [naturally < 1.0]
    - min <= actual <= max (or max is None): f = 1.0
    - actual > max:  f = exp(-0.5 * (actual-max)/max)  [softer than below-min]
    """
    actual = listing.surface_living  # for living_space type criteria
    try:
        target_min = float(field.value)   # field.value holds the min
    except (ValueError, TypeError):
        return None
    if target_min <= 0 or actual is None:
        return None

    if actual < target_min:
        return (actual / target_min) ** 1.5
    # Within range or no upper bound: perfect
    return 1.0
```

For rooms, `listing.number_of_rooms` is a string (e.g., `"3.5"`) — must `float()` parse it with guard.

### Pattern 5: DS-05 Proximity Quality Formula

```
f = min(1.0, exp(-1 × distance_km / radius_km) + min(0.2, (rating - 3) / 10))
```

Where:
- `distance_km`: from best matching ProximityResult (`distance_km` field)
- `radius_km`: the user's requested radius, parsed from `field.value` (same regex as proximity.py)
- `rating`: Google rating (1–5), bonus caps at 0.2 for a 5.0-rated place
- Fallback results (`is_fallback=True`): use the fallback's `distance_km` directly (already at expanded radius distance)
- Returns None if `proximity_data` has no entry for the criterion query

Key: the `proximity_data` dict is keyed by cleaned query string (from `extract_proximity_requirements`). Need to match `field.name` to the query key — use the same cleaning logic or keep original `field.name` as key.

### Pattern 6: FEATURE_ALIAS_MAP Structure

```python
# Maps normalized user-facing terms → set of Flatfox attribute slugs
FEATURE_ALIAS_MAP: dict[str, set[str]] = {
    # Balcony
    "balcony": {"balcony", "balconygarden"},
    "balkon": {"balcony", "balconygarden"},
    "terrasse": {"terrace", "balconygarden"},
    "terrace": {"terrace", "balconygarden"},
    # Parking
    "parking": {"parkingspace", "garage", "underground_garage"},
    "parkplatz": {"parkingspace", "garage"},
    "tiefgarage": {"underground_garage", "parkingspace"},
    "garage": {"garage"},
    # Pets
    "pets allowed": {"petsallowed"},
    "haustiere": {"petsallowed"},
    "haustiere erlaubt": {"petsallowed"},
    # Lift / Elevator
    "lift": {"lift"},
    "elevator": {"lift"},
    "aufzug": {"lift"},
    # Cellar / Storage
    "cellar": {"cellar"},
    "keller": {"cellar"},
    "storage": {"cellar"},
    # Dishwasher
    "dishwasher": {"dishwasher"},
    "spuelmaschine": {"dishwasher"},
    "geschirrspueler": {"dishwasher"},
    # Washing machine
    "washing machine": {"washingmachine"},
    "waschmaschine": {"washingmachine"},
    # Garden
    "garden": {"garden", "balconygarden"},
    "garten": {"garden", "balconygarden"},
    # Furnished
    "furnished": {"furnished"},
    "moebliert": {"furnished"},
    # New build
    "new build": {"neubau"},
    "neubau": {"neubau"},
    # Wheelchair
    "wheelchair": {"wheelchair"},
    "rollstuhlgerecht": {"wheelchair"},
    # Cable TV
    "cable": {"cable"},
    "kabel": {"cable"},
    # Other common Flatfox slugs
    "minergie": {"minergie"},
}
```

Lookup logic:
```python
def _resolve_slugs(term: str) -> set[str]:
    """Return set of Flatfox slugs for a user term, or empty set if unrecognized."""
    normalized = term.strip().lower()
    # 1. Check alias map
    if normalized in FEATURE_ALIAS_MAP:
        return FEATURE_ALIAS_MAP[normalized]
    # 2. Direct slug match (user typed exact Flatfox slug)
    return {normalized}  # try direct match; score_binary_feature checks membership


def score_binary_feature(field: DynamicField, listing: FlatfoxListing) -> Optional[float]:
    slugs = _resolve_slugs(field.name)
    listing_slugs = {attr.name.strip().lower() for attr in listing.attributes}
    if not slugs:
        return None  # unrecognized term → skip
    # Check intersection
    if slugs & listing_slugs:
        return 1.0
    return 0.0
```

Wait — per CONTEXT.md: unmatched terms (no alias AND no direct slug match) → skip. So direct slug match IS a valid path (f=0.0 if the slug exists in Flatfox vocabulary but is absent from this listing). Only when the term is completely unrecognizable do we return None.

The corrected logic: try alias map → if found, check intersection → 1.0 or 0.0. If not in alias map, try direct slug match (if the normalized term could plausibly be a Flatfox slug, proceed with that). For unknown terms with no reasonable slug mapping, return None.

### Anti-Patterns to Avoid

- **Returning 0.0 for missing data:** HA-02 explicitly requires None for missing data, not 0.0. A 0.0 would unfairly penalize listings where data is simply unavailable.
- **Returning 0.0 for unrecognized binary feature terms:** The CONTEXT.md decision is clear: skip (None) not penalize (0.0).
- **Mutating DynamicField in place:** Phase 27 established the "return new instances" pattern. FulfillmentResult is a new object; never modify the input field.
- **Importing proximity.py into deterministic_scorer.py:** Proximity data is passed as a `dict[str, list[dict]]` parameter — no circular imports.
- **Capping before formula:** Apply the formula first, then `min(1.0, ...)` only where the formula can exceed 1.0 (proximity quality hybrid).
- **Using listing.rent_gross instead of price_display:** DS-01 uses `price_display` per existing conftest patterns — `price_display` is the canonical "price shown to user" field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distance string parsing ("500m", "2km") | Custom regex | Reuse `_DISTANCE_RE` from `proximity.py` or copy the identical pattern | Pattern already tested and handles all formats used in the app |
| Haversine distance calculation | Custom formula | Reuse `haversine_km` from `places.py` — but Phase 28 doesn't need it (distance data comes pre-computed from proximity pipeline) | n/a for Phase 28 |
| Attribute slug normalization | Custom string cleaning | `.strip().lower()` is sufficient — Flatfox slugs are already lowercase single-token strings | No complex normalization needed |

**Key insight:** This phase is almost entirely prescribed math. The primary intellectual work is faithfully translating the formulas from REQUIREMENTS.md into Python without off-by-one errors in the guard conditions.

---

## Common Pitfalls

### Pitfall 1: rooms as a string field

**What goes wrong:** `listing.number_of_rooms` is typed as `Optional[str]` in `FlatfoxListing` (e.g., `"3.5"`), not `float`. Direct comparison to a float target will fail.

**Why it happens:** Flatfox API returns rooms as a string. Verified in `listing.py` line 75: `number_of_rooms: Optional[str] = None`.

**How to avoid:** Always `float(listing.number_of_rooms)` inside a try/except before comparison. Guard on `None` first.

**Warning signs:** `TypeError: '<' not supported between instances of 'str' and 'float'` in tests.

### Pitfall 2: price_display vs rent_gross for budget comparison

**What goes wrong:** Using `listing.rent_gross` for DS-01 when `price_display` is the user-facing price.

**Why it happens:** The listing model has multiple price fields: `rent_net`, `rent_charges`, `rent_gross`, `price_display`. Conftest sample data shows `price_display=1790` is the displayed total.

**How to avoid:** Use `listing.price_display` as the canonical price. Matches what users see on Flatfox and what `SAMPLE_LISTING_JSON` confirms.

**Warning signs:** Tests passing with mock data but wrong field used.

### Pitfall 3: FEATURE_ALIAS_MAP lookup on compound Flatfox slugs

**What goes wrong:** Flatfox uses compound slugs without separators: `"balconygarden"`, `"parkingspace"`, `"petsallowed"`. User terms like "balcony" or "parking" won't match by substring.

**Why it happens:** `FlatfoxAttribute.name` contains raw API slugs. Confirmed in `SAMPLE_LISTING_JSON`: `{"name": "garage"}, {"name": "balconygarden"}, {"name": "parkingspace"}, {"name": "petsallowed"}, {"name": "cable"}`.

**How to avoid:** `FEATURE_ALIAS_MAP` entries for "balcony" must include `"balconygarden"` in the slug set. Similarly "parking" → `{"parkingspace", "garage"}`.

**Warning signs:** Binary feature always returns 0.0 for "balcony" even when listing has `balconygarden`.

### Pitfall 4: Zero division in formula guard

**What goes wrong:** When `budget=0` or `target=0`, the decay formula divides by zero.

**Why it happens:** Edge case with empty/zero value fields.

**How to avoid:** Guard `if budget <= 0: return None` and `if target <= 0: return None` before any formula computation.

**Warning signs:** `ZeroDivisionError` or `nan` returned from `math.exp`.

### Pitfall 5: proximity_data key mismatch

**What goes wrong:** `fetch_all_proximity_data()` returns keys as cleaned query strings (with distance tokens stripped), but the DS-05 scorer looks up by `field.name` directly.

**Why it happens:** `extract_proximity_requirements()` in `proximity.py` cleans the query string (strips "within", "500m", etc.) before using it as the dict key.

**How to avoid:** The DS-05 scorer needs to apply the same cleaning to `field.name` when looking up in `proximity_data`, OR the scorer can iterate all proximity_data entries and find the closest match. The simplest approach: pass the proximity_data as-is and do a case-insensitive substring match. Alternatively, match on the original `field.name` if the calling code passes proximity_data keyed by field.name (Phase 31 can handle this coordination).

**Warning signs:** DS-05 always returning None even when proximity data exists.

### Pitfall 6: Symmetric DS-03 "above max" decay for rooms

**What goes wrong:** When `prefs.rooms_max=None` (no upper bound), the "above max" decay branch must be skipped entirely — `f=1.0` for any actual ≥ min.

**Why it happens:** `rooms_max` and `living_space_max` are both `Optional` in `UserPreferences`.

**How to avoid:** Check `if max_val is not None and actual > max_val:` before applying mirror decay.

---

## Code Examples

Verified patterns from existing codebase:

### Pydantic Model with camelCase alias (existing pattern)
```python
# Source: backend/app/models/preferences.py lines 88-97
class DynamicField(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    name: str
    value: str = ""
    importance: ImportanceLevel = ImportanceLevel.MEDIUM
    criterion_type: Optional[CriterionType] = None
```

### math.exp usage (stdlib — no import needed beyond `import math`)
```python
import math

f = math.exp(-2.5 * (price - budget) / budget)
```

### ImportanceLevel for built-in fields
```python
# Source: backend/app/models/preferences.py lines 64-69
IMPORTANCE_WEIGHT_MAP = {
    ImportanceLevel.CRITICAL: 5,
    ImportanceLevel.HIGH: 3,
    ImportanceLevel.MEDIUM: 2,
    ImportanceLevel.LOW: 1,
}
```

### Attribute slug access pattern (confirmed from conftest.py)
```python
# listing.attributes is list[FlatfoxAttribute], FlatfoxAttribute.name is the raw slug
# e.g. "balconygarden", "parkingspace", "petsallowed", "cable"
listing_slugs = {attr.name.strip().lower() for attr in listing.attributes}
```

### number_of_rooms is a string
```python
# Source: backend/app/models/listing.py line 75
# number_of_rooms: Optional[str] = None  # NOTE: string, e.g. "3.5"
try:
    rooms = float(listing.number_of_rooms) if listing.number_of_rooms is not None else None
except ValueError:
    rooms = None
```

### Pytest async test pattern (existing in test_classifier.py)
```python
# asyncio_mode = "auto" in pyproject.toml — no @pytest.mark.asyncio needed
async def test_score_price_at_budget():
    from app.services.deterministic_scorer import score_price
    # ...
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude evaluates all criteria including price/size/binary | Deterministic Python formulas for non-subjective criteria | v5.0 architecture decision | Eliminates LLM latency and cost for objective criteria |
| Overall score from Claude | Python weighted aggregation (Phase 31) | v5.0 | Claude never produces overall_score |
| Weights as 0-100 numbers | CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1 | Phase 27 (DM-03) — already implemented | Simpler, more intuitive |

**Deprecated/outdated:**
- `ScoreResponse.categories`: removed in v5.0 schema (Phase 31 replaces with per-criterion `FulfillmentResult`)
- `ChecklistItem.met: bool`: replaced by `fulfillment: float` in the new model

---

## Open Questions

1. **DS-05 proximity_data key matching strategy**
   - What we know: `fetch_all_proximity_data()` keys by cleaned query (distance stripped), `field.name` is the raw user input
   - What's unclear: exact key to use at call site for lookup — Phase 31 coordinates this, but DS-05 scorer needs a consistent contract
   - Recommendation: Have the scorer accept proximity_data keyed by original `field.name` (Phase 31 can remap keys when building the dict), OR have the scorer do best-effort substring matching. Document the contract explicitly in the scorer function docstring.

2. **DS-02 distance data source**
   - What we know: `DynamicField.value` for distance criteria contains strings like "500m" or "2km" (the user's target)
   - What's unclear: where the "actual distance" comes from — the listing doesn't have distance to user's workplace embedded. Phase 31's calling context likely passes actual distance via proximity_data or computes it separately.
   - Recommendation: For now, DS-02 scores distance-type DynamicFields using `proximity_data` if available (like DS-05), or returns None if no distance data is provided. Clarify in the function's docstring that actual distance must be pre-computed by the caller.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (asyncio_mode = "auto") |
| Config file | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/backend && python3.11 -m pytest tests/test_deterministic_scorer.py -x` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/backend && python3.11 -m pytest tests/ -m "not integration"` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DS-01 | Price at-budget returns 1.0 | unit | `pytest tests/test_deterministic_scorer.py::TestPriceScorer::test_at_budget -x` | ❌ Wave 0 |
| DS-01 | Price above budget uses exp decay | unit | `pytest tests/test_deterministic_scorer.py::TestPriceScorer::test_above_budget -x` | ❌ Wave 0 |
| DS-01 | None price returns None | unit | `pytest tests/test_deterministic_scorer.py::TestPriceScorer::test_missing_price -x` | ❌ Wave 0 |
| DS-02 | Distance at-or-under target returns 1.0 | unit | `pytest tests/test_deterministic_scorer.py::TestDistanceScorer -x` | ❌ Wave 0 |
| DS-03 | Size below min uses power formula | unit | `pytest tests/test_deterministic_scorer.py::TestSizeScorer::test_below_min -x` | ❌ Wave 0 |
| DS-03 | Size in range returns 1.0 | unit | `pytest tests/test_deterministic_scorer.py::TestSizeScorer::test_in_range -x` | ❌ Wave 0 |
| DS-03 | Size above max uses softer exp decay | unit | `pytest tests/test_deterministic_scorer.py::TestSizeScorer::test_above_max -x` | ❌ Wave 0 |
| DS-04 | Known slug present returns 1.0 | unit | `pytest tests/test_deterministic_scorer.py::TestBinaryFeatureScorer::test_present -x` | ❌ Wave 0 |
| DS-04 | Known slug absent returns 0.0 | unit | `pytest tests/test_deterministic_scorer.py::TestBinaryFeatureScorer::test_absent -x` | ❌ Wave 0 |
| DS-04 | Unknown term returns None (skip) | unit | `pytest tests/test_deterministic_scorer.py::TestBinaryFeatureScorer::test_unknown -x` | ❌ Wave 0 |
| DS-04 | German synonym maps to compound slug | unit | `pytest tests/test_deterministic_scorer.py::TestBinaryFeatureScorer::test_german_alias -x` | ❌ Wave 0 |
| DS-05 | Proximity quality hybrid formula | unit | `pytest tests/test_deterministic_scorer.py::TestProximityQualityScorer -x` | ❌ Wave 0 |
| DS-05 | Fallback result uses fallback distance | unit | `pytest tests/test_deterministic_scorer.py::TestProximityQualityScorer::test_fallback -x` | ❌ Wave 0 |
| DS-06 | Budget virtual entry with dealbreaker=True → CRITICAL | unit | `pytest tests/test_deterministic_scorer.py::TestBuiltinSynthesizer -x` | ❌ Wave 0 |
| DS-06 | None budget_max → skip entry | unit | `pytest tests/test_deterministic_scorer.py::TestBuiltinSynthesizer::test_none_budget -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `python3.11 -m pytest tests/test_deterministic_scorer.py -x`
- **Per wave merge:** `python3.11 -m pytest tests/ -m "not integration"`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_deterministic_scorer.py` — covers all DS-01 through DS-06 requirements
- [ ] `app/services/deterministic_scorer.py` — the implementation file (created in Wave 1, not Wave 0)

*(Wave 0 creates the test file with failing tests; Wave 1 creates the implementation making them green.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `backend/app/models/preferences.py` — CriterionType enum, DynamicField, UserPreferences, IMPORTANCE_WEIGHT_MAP
- Direct code inspection: `backend/app/models/listing.py` — FlatfoxListing, FlatfoxAttribute, all field types including `number_of_rooms: Optional[str]`
- Direct code inspection: `backend/app/services/proximity.py` — ProximityRequirement, fetch_all_proximity_data(), _DISTANCE_RE, proximity data dict shape
- Direct code inspection: `backend/tests/conftest.py` — SAMPLE_LISTING_JSON confirming Flatfox attribute slug format (balconygarden, parkingspace, petsallowed, cable, garage)
- Direct code inspection: `backend/pyproject.toml` — `asyncio_mode = "auto"` test config
- `.planning/phases/28-deterministic-scorer/28-CONTEXT.md` — all formula specifications, locked decisions

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — DS-01 through DS-06 formula text (authoritative for this project)
- Phase 27 VERIFICATION.md — confirms Phase 27 is complete; all building blocks verified present

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stdlib math + existing Pydantic; no new packages
- Architecture: HIGH — formulas fully specified in CONTEXT.md and REQUIREMENTS.md; codebase patterns are clear from Phase 27
- Pitfalls: HIGH — confirmed from direct code inspection (number_of_rooms as string, compound Flatfox slugs)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain — pure Python math, no external APIs)
