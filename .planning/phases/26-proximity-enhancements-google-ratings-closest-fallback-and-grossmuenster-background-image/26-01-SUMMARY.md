# Plan 26-01 Summary: Backend Closest-Fallback + Partial-Met Scoring

**Status:** Complete
**Commits:** a4f46e4, 5347900

## What Was Built

### Task 1 — Closest-fallback logic in `proximity.py`

When `fetch_nearby_places` returns an empty list (no results within the requested radius), a second Apify search is performed at `radius_km * 2`. The single nearest result (sorted by `distance_km`) is returned tagged with `is_fallback=True`. If the expanded search also returns nothing, an empty list is returned. All existing results from successful searches are tagged `is_fallback=False`. Fallback results are cached under the expanded radius key.

### Task 2 — PARTIAL MET RULES in `scoring.py`

Added a `PARTIAL MET RULES` block to `build_user_prompt` that explicitly instructs the LLM scorer:
- If a place IS found within the requested radius → `met: true`
- If only a fallback result exists (outside the radius):
  - Importance = CRITICAL → `met: false`
  - Importance = HIGH / MEDIUM / LOW → `met: "partial"`
- If no results at all → `met: false`

Fallback places are annotated with `[FALLBACK — outside requested radius]` in the prompt text.

## Key Files Modified

- `backend/app/services/proximity.py` — fallback logic in `fetch_nearby_places`
- `backend/app/prompts/scoring.py` — PARTIAL MET RULES block + fallback annotation

## Self-Check: PASSED
