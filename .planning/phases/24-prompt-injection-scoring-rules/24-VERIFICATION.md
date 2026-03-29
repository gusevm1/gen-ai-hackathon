---
phase: 24-prompt-injection-scoring-rules
verified: 2026-03-27T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 24: Prompt Injection & Scoring Rules — Verification Report

**Phase Goal:** Claude receives verified nearby data as structured input and scores proximity based only on provided evidence, never guessing.
**Verified:** 2026-03-27
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | When nearby data exists, Claude prompt includes a "Nearby Places Data (Verified)" section with structured results | VERIFIED | `build_user_prompt()` in `scoring.py` lines 355–385: `if nearby_places:` branch appends `## Nearby Places Data (Verified)` with per-query/per-place structured output |
| 2  | When no proximity requirements exist, the nearby places section is omitted entirely from the prompt | VERIFIED | `build_user_prompt()` returns `base` (line 387) when `nearby_places` is falsy; `score_listing()` in `scoring.py` router passes `nearby_data or None` (line 143), and `fetch_all_proximity_data()` returns `{}` on no requirements (PROX-03 gate, proximity.py line 203) |
| 3  | All `search_nearby_places` tool references are removed from Claude prompts and tool definitions | VERIFIED | `claude.py` contains zero references to `search_nearby_places`, `PLACES_TOOL`, `_execute_tool`, `_has_location_criteria`, or `tools=`. System prompt contains `Never call any tool to search for places` — a prohibition, not a definition. The function `search_nearby_places` only exists in `places.py` (infrastructure) and is called from `proximity.py` (pre-fetch pipeline), not from any Claude prompt or tool list |
| 4  | Claude evaluates amenity proximity only on provided data — if not in data, treated as "not found" | VERIFIED | System prompt lines 89–93 (`PROXIMITY EVALUATION RULES`): "Evaluate proximity-based criteria ONLY from the '## Nearby Places Data (Verified)' section"; "If an amenity is not present in that section, score it as 'not found nearby' — do not guess, infer, or search." User prompt also appends the same rule in closing lines (scoring.py lines 381–384) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/services/claude.py` | Single non-iterative `score_listing()` call, no tool machinery | VERIFIED | 104 lines; `score_listing()` calls `client.messages.parse()` once with no tool definitions, no loop, no `_execute_tool`, no `PLACES_TOOL` |
| `backend/app/prompts/scoring.py` | `build_user_prompt()` with `nearby_places` param; `PROXIMITY EVALUATION RULES` in system prompt | VERIFIED | `build_user_prompt()` signature at line 208 includes `nearby_places: dict[str, list[dict]] | None = None`; system prompt lines 89–93 contain `PROXIMITY EVALUATION RULES` block |
| `backend/app/services/proximity.py` | `_AMENITY_KEYWORDS` defined here (not in claude.py) | VERIFIED | `_AMENITY_KEYWORDS` defined at line 28–42; `claude.py` imports nothing from proximity.py and does not define `_AMENITY_KEYWORDS` |
| `backend/app/routers/scoring.py` | Passes `nearby_data` into `claude_scorer.score_listing()` | VERIFIED | Line 143: `result = await claude_scorer.score_listing(listing, preferences, image_urls=image_urls, nearby_places=nearby_data or None)` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `routers/scoring.py` | `claude.py:score_listing()` | `nearby_places=nearby_data or None` | WIRED | Line 143 of scoring.py router passes `nearby_data or None`; `ClaudeScorer.score_listing()` accepts `nearby_places` param at line 57 |
| `claude.py:score_listing()` | `prompts/scoring.py:build_user_prompt()` | `nearby_places=nearby_places` | WIRED | Line 82 of claude.py: `build_user_prompt(listing, preferences, nearby_places=nearby_places)` |
| `build_user_prompt()` | Nearby section in prompt | `if nearby_places:` branch | WIRED | Lines 355–385 of scoring.py prompts: conditional block appends full structured section |
| `proximity.py` | `_AMENITY_KEYWORDS` | Defined at module level | WIRED | Lines 28–42; used by `extract_proximity_requirements()` at line 93 |
| System prompt | Evidence-only rule | `PROXIMITY EVALUATION RULES` block | WIRED | Lines 89–93 of `build_system_prompt()` forbid guessing and restrict evaluation to the injected data section |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| PROMPT-01 | Nearby places data injected as verified section when present | SATISFIED | `build_user_prompt()` `if nearby_places:` block (scoring.py lines 354–385) |
| PROMPT-02 | Section omitted when no proximity requirements | SATISFIED | `fetch_all_proximity_data()` returns `{}` on no requirements; router passes `nearby_data or None`; `build_user_prompt()` skips section when falsy |
| PROMPT-03 | `search_nearby_places` tool removed from all Claude-facing prompts and definitions | SATISFIED | Zero matches for `PLACES_TOOL`, `_execute_tool`, `tools=` in `claude.py`; system prompt forbids tool calls |
| SCORE-01 | Claude scores proximity only from provided data | SATISFIED | `PROXIMITY EVALUATION RULES` in system prompt enforces evidence-only evaluation with explicit "not found nearby" instruction |
| SCORE-02 | `score_listing()` is a single non-iterative Claude call | SATISFIED | `claude.py` is 104 lines; single `await client.messages.parse(...)` call with no loop, no tool processing |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | No stubs, TODOs, or placeholder returns found in any of the four verified files |

### Human Verification Required

No items require human verification. All success criteria are deterministically verifiable from code inspection.

### Gaps Summary

No gaps. All four success criteria are fully implemented:

1. The "## Nearby Places Data (Verified)" section is injected by `build_user_prompt()` when `nearby_places` is truthy, with per-query headers and per-place structured entries including name, distance, rating, and address.

2. The section is absent when `nearby_places` is None or `{}`. The router converts empty dict to `None` via `nearby_data or None`, and `build_user_prompt()` returns `base` unchanged when `nearby_places` is falsy.

3. `search_nearby_places` exists only as an internal Apify wrapper in `places.py` and is called from `proximity.py`'s pre-fetch pipeline — it is never referenced in `claude.py`, the system prompt, or any tool definition list.

4. The system prompt's `PROXIMITY EVALUATION RULES` block (lines 89–93) explicitly instructs Claude to evaluate proximity exclusively from the injected data section and score any absent amenity as "not found nearby".

---

_Verified: 2026-03-27_
_Verifier: Claude (gsd-verifier)_
