---
phase: 24
plan: "01"
subsystem: backend
tags: [claude, prompt-engineering, proximity, scoring, tool-removal]
dependency_graph:
  requires: [23-01]
  provides: [PROMPT-01, PROMPT-02, PROMPT-03, SCORE-01, SCORE-02]
  affects: [claude.py, prompts/scoring.py, routers/scoring.py, proximity.py]
tech_stack:
  added: []
  patterns: [prompt-injection, non-iterative-scoring, pre-fetched-context]
key_files:
  created: []
  modified:
    - backend/app/services/proximity.py
    - backend/app/services/claude.py
    - backend/app/prompts/scoring.py
    - backend/app/routers/scoring.py
decisions:
  - "_AMENITY_KEYWORDS relocated to proximity.py so import direction is proximity->claude (not circular)"
  - "score_listing() simplified to single messages.parse() call — no agentic loop, no tool_choice args"
  - "nearby_data or None used at router boundary so empty dict {} never injects an empty section into prompt"
metrics:
  duration_minutes: 22
  completed_date: "2026-03-27"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 24 Plan 01: Prompt Injection & Scoring Rules Summary

**One-liner:** Replaced Claude's runtime search_nearby_places tool-calling loop with a single non-iterative API call that receives pre-fetched Google Places data injected as a structured "## Nearby Places Data (Verified)" section in the user prompt.

## What Was Built

- **`_AMENITY_KEYWORDS` relocation** — moved from `claude.py` to `proximity.py`, reversing import direction and eliminating the cross-import that would have broken Phase 23 when `claude.py` was cleaned up.
- **Tool machinery removal** — deleted `PLACES_TOOL`, `_has_location_criteria()`, `_execute_tool()`, `MAX_LOOP_ITERATIONS`, and the agentic for-loop from `claude.py`. Removed unused `import json`, `import re`, and `from app.services.places import search_nearby_places`.
- **Simplified `score_listing()`** — single `client.messages.parse()` call, no `tools` or `tool_choice` arguments.
- **New system prompt block** — `PROXIMITY EVALUATION RULES:` replaces `NEARBY PLACES SEARCH:`. Instructs Claude to evaluate from provided data only, score missing amenities as "not found nearby", never call any tool.
- **`build_user_prompt()` prompt injection** — accepts `nearby_places: dict[str, list[dict]] | None = None`. When truthy, appends a `## Nearby Places Data (Verified)` section with per-query `### {query}` subsections, numbered results (name, distance_km, rating, review_count, address), and a closing guard instruction.
- **Call chain threading** — `score_listing()` now accepts `nearby_places` and passes it to `build_user_prompt()`; router passes `nearby_data or None` so an empty dict does not inject an empty section.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Relocate _AMENITY_KEYWORDS to proximity.py | c1421b1 | proximity.py, claude.py |
| 2 | Remove tool machinery + update system prompt | dbeb623 | claude.py, prompts/scoring.py |
| 3 | Inject nearby places into prompt + thread call chain | 47d7417 | prompts/scoring.py, claude.py, routers/scoring.py |

## Verification Results (EC2)

All four success criteria passed on EC2 after deployment:

- `All imports: OK` — `_AMENITY_KEYWORDS`, `ClaudeScorer`, `score_listing`, `build_user_prompt`, `build_system_prompt` all import cleanly
- `score_listing structure: PASS` — no banned symbols; exactly one `messages.parse()` call
- `System prompt: PASS` — `PROXIMITY EVALUATION RULES` present, `search_nearby_places` absent, `not found nearby` present
- `score_listing signature: OK` — `nearby_places` param confirmed in `score_listing()`
- Backend health check: `{"status":"healthy","service":"homematch-api"}`

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Fulfilled

- **PROMPT-01**: `build_user_prompt()` injects `## Nearby Places Data (Verified)` section when `nearby_places` is provided.
- **PROMPT-02**: Section is absent when `nearby_places` is `None` or empty dict (coerced to `None` at router).
- **PROMPT-03**: `nearby_data` threaded from router's proximity fetch into `score_listing()` and through to the prompt builder.
- **SCORE-01**: System prompt replaced with `PROXIMITY EVALUATION RULES:` — instructs Claude to evaluate from provided section only.
- **SCORE-02**: Explicit "not found nearby" rule in system prompt; closing guard in prompt section for absent amenities.

## Self-Check: PASSED

- `backend/app/services/proximity.py` — modified, _AMENITY_KEYWORDS defined at line 28
- `backend/app/services/claude.py` — rewritten, single messages.parse() call, nearby_places param present
- `backend/app/prompts/scoring.py` — build_user_prompt accepts nearby_places, PROXIMITY EVALUATION RULES in system prompt
- `backend/app/routers/scoring.py` — passes nearby_data or None to score_listing()
- Commits c1421b1, dbeb623, 47d7417 all present in git log
