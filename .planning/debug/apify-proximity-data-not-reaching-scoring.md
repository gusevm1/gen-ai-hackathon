---
status: awaiting_human_verify
trigger: "apify-proximity-data-not-reaching-scoring"
created: 2026-03-28T00:00:00Z
updated: 2026-03-28T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — Two bugs in deployed proximity.py prevent keyword detection: (1) missing starbucks/coffee/coffeeshop keywords, (2) radius only parsed from field.value not field.name. Local changes fix both but are not deployed.
test: Tested keyword regex against "Starbucks within 5km" — no match on deployed code
expecting: Deploying local changes will fix the issue
next_action: Deploy local proximity.py changes to EC2

## Symptoms

expected: When a user asks about proximity to Starbucks, the system should extract coordinates, call Apify, return results, and pass them to the LLM scorer.
actual: Scoring system reports "No 'Nearby Places Data (Verified)' section provided in user preferences" — proximity data never reaches scorer.
errors: "No 'Nearby Places Data (Verified)' section provided in user preferences — proximity to Starbucks cannot be evaluated from available data"
reproduction: Run an analysis with a proximity criterion like "Starbucks within 5km (CRITICAL must-have)"
started: Feature built across phases 22, 23, 24. Never worked end-to-end. API key recently added but still not working.

## Eliminated

- hypothesis: APIFY_TOKEN not set
  evidence: Token confirmed present in /home/ubuntu/gen-ai-hackathon/backend/.env, dotenv loaded at app startup
  timestamp: 2026-03-28

- hypothesis: Proximity pipeline not wired into scoring router
  evidence: scoring.py router calls fetch_all_proximity_data and passes nearby_data to claude_scorer.score_listing
  timestamp: 2026-03-28

- hypothesis: Coordinates unavailable (so proximity block is skipped)
  evidence: Not the primary cause — keyword matching fails first, before the coordinate check even matters
  timestamp: 2026-03-28

## Evidence

- timestamp: 2026-03-28
  checked: backend/app/services/proximity.py (deployed on EC2 vs local)
  found: EC2 version missing starbucks/coffee/coffeeshop keywords in _AMENITY_KEYWORDS regex. extract_proximity_requirements only gates on keyword match (no distance-only gate).
  implication: "Starbucks within 5km" as field name produces no keyword match → returns [] → no Apify call

- timestamp: 2026-03-28
  checked: _parse_radius_km in deployed code
  found: Takes only (value: str) — only checks field.value, not field.name. If radius is in field.name ("Starbucks within 5km"), it's ignored and defaults to 1.0km.
  implication: Even if keyword matched, wrong radius would be used for "Starbucks within 5km" style names

- timestamp: 2026-03-28
  checked: Local git diff for proximity.py
  found: Local uncommitted changes add starbucks/coffee/coffeeshop to keyword list, add has_distance OR gate, and update _parse_radius_km to accept *texts variadic (checks field.value AND field.name)
  implication: Local changes directly address both bugs but have NOT been deployed to EC2

- timestamp: 2026-03-28
  checked: Keyword regex test on EC2
  found: "Starbucks within 5km" (name) + "CRITICAL must-have" (value) → keyword=False, distance in value=False → no match on deployed code
  implication: extract_proximity_requirements returns [] for Starbucks criterion, no Apify call made

## Resolution

root_cause: Two bugs in deployed proximity.py: (1) _AMENITY_KEYWORDS regex missing starbucks/coffee/coffeeshop — "Starbucks within 5km" as a field name produces no keyword match, so extract_proximity_requirements returns [] and no Apify call is ever made. (2) _parse_radius_km only reads field.value, not field.name, so radius encoded in field names (e.g. "Starbucks within 5km") is ignored and defaults to 1.0km. Both bugs exist in the deployed EC2 version but are fixed in local uncommitted changes.
fix: Deploy local proximity.py changes (already authored) to EC2: adds starbucks/coffee/coffeeshop keywords, adds has_distance OR gate, and makes _parse_radius_km variadic to check both field.value and field.name.
verification: Tested extract_proximity_requirements on deployed EC2 server with "Starbucks within 5km" as field name — returns 2 requirements with correct query="Starbucks" and radius_km=5.0. Backend healthy post-deploy. Commit c9e07dc on main.
files_changed: [backend/app/services/proximity.py]
