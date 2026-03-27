# Phase 24 Research: Prompt Injection & Scoring Rules

**Researched:** 2026-03-27
**Domain:** Claude prompt engineering, scoring pipeline, tool removal
**Confidence:** HIGH (based on direct codebase inspection)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROMPT-01 | Verified nearby data injected into build_user_prompt as structured "## Nearby Places Data (Verified)" section | build_user_prompt() accepts (listing, prefs) — needs nearby_places: dict param added |
| PROMPT-02 | Section only added when nearby data exists — omitted entirely when no proximity requirements | Conditional append: `if nearby_places:` guard before section build |
| PROMPT-03 | All search_nearby_places tool references removed from Claude prompts and tool definitions | PLACES_TOOL dict + _has_location_criteria + _execute_tool + use_tool logic in score_listing() all removed |
| SCORE-01 | Claude scoring prompt updated: only evaluate amenity proximity on provided data | System prompt NEARBY PLACES SEARCH block (lines 89–93) must be replaced with data-driven instruction |
| SCORE-02 | Claude scoring prompt updated: if amenity not in data → treat as "not found", never guess | Explicit rule added to system prompt and optionally to user prompt closing instruction |
</phase_requirements>

---

## build_user_prompt() Structure

**File:** `backend/app/prompts/scoring.py`, lines 208–344

**Current signature:**
```python
def build_user_prompt(listing: FlatfoxListing, prefs: UserPreferences) -> str:
```

**What it builds (in order):**
1. `## User Preferences` block — location, type, budget, rooms, living space, floor, availability, features, importance levels, dealbreakers, dynamic fields
2. `---` separator
3. `## Listing Data` block — title, address, coordinates, canton, type, price, rooms, living space, floor, year built, year renovated, available, features/attributes, furnished, temporary, description (truncated to 2000 chars)
4. `---` separator
5. Closing instruction: "Evaluate this listing against the user's preferences. Score each of the 5 categories..."

**Where it is called:**
- `backend/app/services/claude.py`, line 151, inside `ClaudeScorer.score_listing()`:
  ```python
  content.append(
      {"type": "text", "text": build_user_prompt(listing, preferences)}
  )
  ```

**Key detail:** The function ends with a hard-coded closing instruction string on line 341–344. That instruction is the natural place to append the nearby data section — it is the last thing Claude reads before generating its response.

---

## search_nearby_places Tool Definition

**File:** `backend/app/services/claude.py`

**PLACES_TOOL dict — lines 52–74:**
```python
PLACES_TOOL = {
    "name": "search_nearby_places",
    "description": "...",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", ...},
            "radius_km": {"type": "number", "default": 1.0, ...},
        },
        "required": ["query"],
    },
}
```

**Where it is injected into API calls (lines 177–179):**
```python
if use_tool and iteration == 0:
    api_kwargs["tools"] = [PLACES_TOOL]
    api_kwargs["tool_choice"] = {"type": "auto"}
```

**The gate logic (lines 157–159):**
```python
has_coords = listing.latitude is not None and listing.longitude is not None
has_criteria = _has_location_criteria(preferences)
use_tool = has_coords and has_criteria
```

**_has_location_criteria (lines 77–85):** scans `preferences.dynamic_fields` for amenity keywords using `_AMENITY_KEYWORDS` regex.

**_execute_tool (lines 88–102):** handles the `tool_use` stop_reason — calls `search_nearby_places()` from `app.services.places`, returns JSON string back to Claude.

**Tool response loop (lines 188–231):** Handles `tool_use` stop_reason, appends `tool_result` message, then continues loop without offering tools again. Loop is capped at `MAX_LOOP_ITERATIONS = 3`.

**All components to remove for PROMPT-03:**
- Module-level `PLACES_TOOL` dict (lines 52–74)
- Module-level `_AMENITY_KEYWORDS` regex (lines 36–50)
- `_has_location_criteria()` function (lines 77–85)
- `_execute_tool()` function (lines 88–102)
- `has_coords`, `has_criteria`, `use_tool` variables (lines 157–159)
- `if use_tool:` logger.info block (lines 161–164)
- Entire agentic loop's `tool_use` branch (lines 188–231)
- `use_tool` guard on `api_kwargs["tools"]` and `api_kwargs["tool_choice"]` (lines 177–179)
- Import of `search_nearby_places` from `app.services.places` (line 27)

---

## score_data → Claude Flow

**Full data flow:**

```
POST /score (scoring.py router)
  │
  ├─ step 1: fetch listing (FlatfoxListing)
  ├─ step 1a: geocode if missing coords
  ├─ step 1b/1c: nearby_data = fetch_all_proximity_data(lat, lon, _prefs_for_proximity)
  │             Returns dict[str, list[dict]] e.g. {"near primary school": [...], "gym": [...]}
  │             Returns {} if no proximity requirements or no coords
  │
  ├─ step 2: preferences = UserPreferences.model_validate(request.preferences)
  ├─ step 3: image_urls fetched
  ├─ step 4: prices overridden
  │
  ├─ step 5: claude_scorer.score_listing(listing, preferences, image_urls=image_urls)
  │           ← nearby_data is NOT currently passed into this call
  │
  └─ step 6: score_data = result.model_dump()
             if nearby_data:
                 score_data["nearby_places"] = nearby_data  ← stored to Supabase only
```

**The gap:** `nearby_data` is fetched in the router (step 1b/1c) but never passed into `claude_scorer.score_listing()` or `build_user_prompt()`. It is only attached to `score_data` after scoring for Supabase persistence.

**What Phase 24 must fix:** Pass `nearby_data` into `score_listing()` → into `build_user_prompt()` so Claude can read it before generating scores.

---

## Current Proximity Scoring Logic

**System prompt** (`build_system_prompt()`, lines 89–93):
```
NEARBY PLACES SEARCH:
- When the search_nearby_places tool is available, you MAY use it to verify proximity-based criteria.
- Call the tool AT MOST ONCE. Choose the most important proximity criterion to verify.
- If results are empty or the tool errors, score based on available listing data and note the limitation.
- Do NOT call the tool for criteria assessable from listing data alone (balcony, parking, etc.)
```

This is the only place Claude is told how to handle proximity. There is no injection of pre-fetched proximity results anywhere in the current prompt construction. Claude currently either:
1. Calls `search_nearby_places` at scoring time (runtime tool call) — the agentic loop path
2. Scores proximity from listing text alone (no tool call) — the no-coords or no-criteria path

**After Phase 24**, path (1) must be replaced by: Claude reads the pre-fetched data from the prompt and evaluates strictly from it.

---

## nearby_places Integration Point

**Shape of nearby_data returned by fetch_all_proximity_data():**
```python
{
    "near primary school": [
        {
            "name": "Primarschule Wiedikon",
            "address": "Birmensdorferstrasse 12, 8003 Zürich",
            "rating": 4.2,
            "review_count": 88,
            "distance_km": 0.34,
        },
        ...  # up to 5 results per query
    ],
    "gym": [
        {
            "name": "Fitnesspark Zürich",
            "address": "...",
            "rating": 4.5,
            "review_count": 210,
            "distance_km": 0.61,
        }
    ]
}
```

**Integration requires two changes:**

**1. build_user_prompt() signature extension:**
```python
def build_user_prompt(
    listing: FlatfoxListing,
    prefs: UserPreferences,
    nearby_places: dict[str, list[dict]] | None = None,
) -> str:
```

**2. Appending the section to the return string (conditional on data presence):**
The section should be inserted between the `## Listing Data` block and the closing evaluation instruction, or appended before it. Placing it just before the closing instruction keeps it close to the scoring request.

**3. score_listing() signature extension:**
```python
async def score_listing(
    self,
    listing: FlatfoxListing,
    preferences: UserPreferences,
    image_urls: list[str] | None = None,
    nearby_places: dict[str, list[dict]] | None = None,
) -> ScoreResponse:
```

**4. Router call site (scoring.py line 142):**
```python
result = await claude_scorer.score_listing(
    listing, preferences, image_urls=image_urls, nearby_places=nearby_data or None
)
```

---

## Recommended Approach

### Step 1 — Extend build_user_prompt() (PROMPT-01, PROMPT-02)

Add `nearby_places: dict[str, list[dict]] | None = None` parameter. When truthy, append a new section to the prompt before the closing evaluation instruction:

```
---

## Nearby Places Data (Verified)

The following results were fetched from Google Places before this evaluation.
Evaluate all proximity-based criteria EXCLUSIVELY from this data.

### near primary school
1. Primarschule Wiedikon — 0.34 km | Rating: 4.2 (88 reviews)
   Birmensdorferstrasse 12, 8003 Zürich
2. ...

### gym
1. Fitnesspark Zürich — 0.61 km | Rating: 4.5 (210 reviews)
   ...

If an amenity is NOT listed above, treat it as "not found nearby" — do not guess or infer from listing description.
```

When `nearby_places` is None or empty (`{}`), the section is omitted entirely.

### Step 2 — Update system prompt (SCORE-01, SCORE-02)

Replace the `NEARBY PLACES SEARCH:` block in `build_system_prompt()` (lines 89–93) with:

```
PROXIMITY EVALUATION RULES:
- Evaluate proximity-based criteria ONLY from the "## Nearby Places Data (Verified)" section in the user prompt.
- If an amenity is not present in that section, score it as "not found nearby" — do not guess, infer, or search.
- Never call any tool to search for places. No tool is available for this purpose.
- If the "## Nearby Places Data (Verified)" section is absent, the user has no proximity requirements — skip proximity evaluation entirely.
```

### Step 3 — Remove tool infrastructure (PROMPT-03)

In `claude.py`, delete:
- `PLACES_TOOL` dict
- `_AMENITY_KEYWORDS` regex
- `_has_location_criteria()` function
- `_execute_tool()` function
- `use_tool` / `has_criteria` / `has_coords` variables
- The `if use_tool and iteration == 0:` block that injects `tools`/`tool_choice` into `api_kwargs`
- The entire `if response.stop_reason == "tool_use":` branch
- The `import search_nearby_places from app.services.places` line (line 27)
- The `import re` and `import json` lines if no longer used elsewhere

The agentic loop simplifies to a single iteration: send → parse → return. `MAX_LOOP_ITERATIONS` becomes unnecessary but can be left as dead code or removed.

### Step 4 — Thread nearby_places through score_listing()

Add `nearby_places` parameter to `score_listing()` and pass it into `build_user_prompt()`.

### Step 5 — Pass nearby_data from router

In `scoring.py`, change step 5 call to pass `nearby_places=nearby_data or None`.

---

## Key Files

| File | Lines | Relevance |
|------|-------|-----------|
| `backend/app/prompts/scoring.py` | 208–344 | `build_user_prompt()` — add param + nearby section |
| `backend/app/prompts/scoring.py` | 19–93 | `build_system_prompt()` — replace NEARBY PLACES SEARCH block |
| `backend/app/services/claude.py` | 36–50 | `_AMENITY_KEYWORDS` — remove |
| `backend/app/services/claude.py` | 52–74 | `PLACES_TOOL` dict — remove |
| `backend/app/services/claude.py` | 77–85 | `_has_location_criteria()` — remove |
| `backend/app/services/claude.py` | 88–102 | `_execute_tool()` — remove |
| `backend/app/services/claude.py` | 125–240 | `score_listing()` — add param, remove tool loop branch |
| `backend/app/routers/scoring.py` | 141–148 | Step 5 call site — add `nearby_places=nearby_data or None` |

---

## Risks & Pitfalls

### 1. nearby_data passed as empty dict vs None
The router currently computes `nearby_data: dict = {}` as default (scoring.py line 93). Calling `score_listing(..., nearby_places={})` would pass a falsy dict, which is correct if `build_user_prompt` guards with `if nearby_places:`. However, calling it with `nearby_places=nearby_data or None` converts `{}` to `None` explicitly — either approach is fine but must be consistent.

### 2. Removing re and json imports
`claude.py` imports `re` (for `_AMENITY_KEYWORDS`) and `json` (for `_execute_tool`). After removal, verify neither is used elsewhere in the file before deleting the imports.

### 3. Simplified loop no longer needs MAX_LOOP_ITERATIONS
Once the `tool_use` branch is removed, the loop degenerates to a single pass. The `for iteration in range(MAX_LOOP_ITERATIONS)` can be replaced with a direct API call. This is a cleanup opportunity but not strictly required — the loop with one pass works fine.

### 4. Backward compatibility for build_user_prompt callers
`build_user_prompt` is imported in `claude.py`. Adding `nearby_places=None` as a keyword-only default means no existing call sites break. Confirmed: only one call site exists (claude.py line 151).

### 5. proximity.py still imports _AMENITY_KEYWORDS from claude.py
`backend/app/services/proximity.py` line 22: `from app.services.claude import _AMENITY_KEYWORDS`. If `_AMENITY_KEYWORDS` is removed from `claude.py`, this import will break `proximity.py`. Resolution: move `_AMENITY_KEYWORDS` to `proximity.py` (it was already there conceptually) and remove the import in `claude.py`. Or keep the regex in `claude.py` but remove only the tool-related code. Either way, the import chain must be resolved.

### 6. Prompt length increase
Each proximity query adds ~5–10 lines to the prompt. For a user with 5 amenity criteria and 5 results each, that is ~250 additional lines. Well within Claude's context window and the `max_tokens=4096` output budget.

### 7. Claude ignoring the injected data
If the system prompt still references tool use, Claude may ignore the data section and try to call a non-existent tool, causing `end_turn` without a score. The system prompt replacement (Step 2) is therefore a hard dependency of the data injection (Step 1) — both must land in the same deploy.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `backend/app/prompts/scoring.py` (lines 1–363)
- Direct inspection of `backend/app/services/claude.py` (lines 1–251)
- Direct inspection of `backend/app/routers/scoring.py` (lines 1–172)
- Direct inspection of `backend/app/services/proximity.py` (lines 1–195)
- Direct inspection of `backend/app/services/places.py` (lines 1–91)
- Direct inspection of `backend/app/models/preferences.py` (lines 1–203)

---

## Metadata

**Confidence breakdown:**
- Code structure: HIGH — all files read directly
- Integration approach: HIGH — data shapes and call chains fully traced
- Risk assessment: HIGH — import dependency and loop simplification verified from source

**Research date:** 2026-03-27
**Valid until:** Until any of the 6 key files above are modified
