# Phase 26: Proximity Enhancements — Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance the Apify nearby-places pipeline with two improvements:
1. **Closest fallback** — when no places are found within the requested radius, search up to 2× the radius and surface the single nearest result so the user knows how close the nearest option is.
2. **Ratings in LLM text** — Google review ratings already reach the LLM via the existing prompt injection (no frontend changes needed).

The Grossmünster background image has already been implemented (image copied to `web/public/zurich_bg_grossmuenster.webp`, wired into `SectionCredits` and `auth/page.tsx`). It is out of scope for this phase.

This phase touches: backend scoring prompt, backend proximity service, and the frontend `ChecklistSection` component (new `"partial"` met state).

</domain>

<decisions>
## Implementation Decisions

### Closest fallback logic
- **D-01:** When `fetch_nearby_places` returns an empty list (no results within `radius_km`), perform a second Apify search with `radius_km * 2` as the expanded radius.
- **D-02:** From the expanded search, return only the **single nearest** result (sorted by `distance_km`). Do not return top-3 — one clear near-miss is cleaner.
- **D-03:** The result is tagged as a fallback so the scorer can distinguish "found within range" from "found outside range".
- **D-04:** If the expanded search also returns nothing, the fallback is empty — score as fully not met.

### Fallback radius cap
- **D-05:** Fallback radius = 2× the original requested radius. No additional cap beyond this — the 2× multiplier is the extent.

### Scoring rule: met / partial / false based on importance
- **D-06:** The LLM scorer applies this rule when fallback data is present (nearest place is OUTSIDE the requested radius):
  - Importance = **critical** → `met: false` (red ✗) — strict, requirement not met
  - Importance = **high / medium / low** → `met: "partial"` (amber ⚠) — near-miss, worth considering
- **D-07:** When a place IS found within the requested radius → `met: true` (green ✓) regardless of importance.
- **D-08:** When fallback is also empty → `met: false` regardless of importance.
- **D-09:** The LLM prompt must explicitly instruct the scorer to apply this importance-based rule when fallback data is present.

### Rating display
- **D-10:** Ratings are already fetched (`totalScore` → `rating`) and already injected into the LLM prompt in `scoring.py`. No frontend changes needed — Claude naturally includes ratings in the checklist `note` text.
- **D-11:** No new frontend rating component or star rendering is required.

### Frontend: new "partial" met state
- **D-12:** Add `"partial"` as a valid value for the `met` field in `ChecklistItem` (currently `boolean | null`). New type: `boolean | null | "partial"`.
- **D-13:** Frontend maps `met="partial"` → amber/yellow styling with a warning ⚠ or ✗ icon in amber color (not red, not gray).
- **D-14:** The `getStatusIndicator` function in `ChecklistSection.tsx` must handle `met === "partial"` → amber color + warning icon.

### Claude's Discretion
- Exact amber hex/Tailwind class to use (should match the existing design system — check `globals.css` or Tailwind config)
- Whether to use `AlertTriangle` or a custom amber ✗ icon from lucide-react
- Caching behavior for fallback results (cache the fallback result under the expanded radius key)

</decisions>

<specifics>
## Specific Ideas

- User example: "Starbucks required within 5km, nearest found at 5.2km → if importance=medium, show amber ⚠ with note: 'No Starbucks within 5km — nearest is 5.2km at Zurich HB (Rating: 4.1, 892 reviews)'"
- The user's framing: "the user would be happy to see a 5.2km result and ready to compromise" — the partial state signals a near-miss worth evaluating, not a hard failure.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proximity pipeline
- `backend/app/services/proximity.py` — ProximityRequirement model, `fetch_nearby_places`, `fetch_all_proximity_data`; fallback logic goes here
- `backend/app/services/places.py` — Apify integration, `search_nearby_places`; expanded-radius call uses this
- `backend/app/prompts/scoring.py` — `build_user_prompt`, nearby places section builder, LLM scoring instructions; fallback prompt wording and `met="partial"` rule go here

### Frontend checklist
- `web/src/components/analysis/ChecklistSection.tsx` — `ChecklistItem` type, `getStatusIndicator`, rendering; `"partial"` state goes here
- `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` — how checklist data flows from API response to `ChecklistSection`

No external specs or ADRs — all requirements are captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `search_nearby_places` in `places.py` — already accepts `radius_km`; call it a second time with `radius_km * 2` for the fallback
- `haversine_km` in `places.py` — already used in `proximity.py` for distance computation; reuse for sorting fallback results by distance
- `ChecklistSection.tsx` `getStatusIndicator` — add `met === "partial"` branch here; pattern already established for `true/false/null`

### Established Patterns
- Proximity result dict shape: `{name, address, rating, review_count, distance_km}` — fallback result uses same shape, add a `is_fallback: true` flag
- Apify results always go through cache check first (CACHE-05/06 in `proximity.py`) — fallback search should also check/write cache under the expanded radius key
- `met` field comes from the Claude LLM response JSON — the prompt must define `"partial"` as a valid value and when to use it

### Integration Points
- `fetch_nearby_places` → returns `list[dict]`; fallback is triggered when this returns `[]`
- `build_user_prompt` → receives `nearby_places: dict[str, list[dict]]`; prompt section must communicate fallback context to the scorer
- `ChecklistItem.met` type in `page.tsx` and `ChecklistSection.tsx` must both be updated to allow `"partial"`

</code_context>

<deferred>
## Deferred Ideas

- Top-3 closest fallback results — user chose single nearest result only
- Frontend star rating component — user chose natural LLM text only
- Expanding fallback beyond 2× radius — out of scope

</deferred>

---

*Phase: 26-proximity-enhancements-google-ratings-closest-fallback-and-grossmuenster-background-image*
*Context gathered: 2026-03-29*
