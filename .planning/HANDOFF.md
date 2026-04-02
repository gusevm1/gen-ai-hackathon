# Handoff Document: Hybrid Scoring Engine — Merging Two Approaches

## Context

Two parallel efforts have converged toward the same goal — replacing expensive per-listing Claude calls with a fast, deterministic scoring pipeline:

1. **Our work (v6.0 architecture):** Pre-computed ListingProfiles via zipcode-batched enrichment pipeline + 1086-line deterministic scorer + OpenRouter gap-fill. Code exists locally, tested on 8051 (27 listings, 12 min, all saved to Supabase).

2. **Collaborators' plan (v5.0 roadmap):** Criterion classifier + deterministic formulas (exponential decay) + Claude subjective-only + weighted aggregation. Fully specified in requirements (24 items), no code yet.

This document records everything built, compares the two approaches, and provides a reference for creating a merged GSD milestone.

---

## Part 1: What Has Been Built (Our Work)

### Enrichment Pipeline (Tested, Working)

| File | Lines | Status | What It Does |
|------|-------|--------|-------------|
| `backend/scripts/analyze_zipcode.sh` | 240 | ✅ Tested | Orchestrates per-zipcode enrichment (fetches IDs, batches, calls claude CLI) |
| `backend/scripts/zipcode_research_prompt.md` | 400 | ✅ Tested | Opus prompt: 3 shared sonnet agents + N haiku image agents |
| `backend/scripts/haversine.py` | 55 | ✅ Tested | Computes lat/lng distances for amenity proximity |
| `backend/scripts/save_research.py` | 196 | ✅ Existing | Converts research JSON → ListingProfile → upserts to Supabase |
| `backend/scripts/extract_page_data.py` | 68 | ✅ Existing | Extracts images + prices from Flatfox HTML pages |

**Test results (8051 Schwamendingen):**
- 27/27 listings enriched and saved to Supabase in 12m 20s
- 3 sonnet + 27 haiku = 30 agent calls (vs 108 with old pipeline, 72% reduction)
- All on Max subscription ($0 extra cost)
- Quality: 21/21 amenities with haversine distances per listing, condition scores 0-88, market comparisons per room count

### Scoring Backend (Code Complete, Not Deployed)

| File | Lines | Status | What It Does |
|------|-------|--------|-------------|
| `backend/app/models/listing_profile.py` | 155 | ✅ Complete | Pydantic model: objective data + condition + neighborhood + amenities + market context |
| `backend/app/services/deterministic_scorer.py` | 1086 | ✅ Complete | Pure Python scorer: 5 categories (price/size/location/features/condition), keyword→amenity/score mappings (40+ DE+EN), importance weighting, dealbreaker logic |
| `backend/app/services/gap_detector.py` | 78 | ✅ Complete | Finds checklist items deterministic scorer couldn't answer ([GAP] markers) |
| `backend/app/services/openrouter.py` | 373 | ✅ Complete | Gemini Flash via OpenRouter for cheap gap-fill (~$0.0075/listing) |
| `backend/app/services/listing_profile_db.py` | 119 | ✅ Complete | Supabase CRUD: get/save/get_unanalyzed/get_stale profiles |
| `backend/app/services/listing_analyzer.py` | 415 | ✅ Complete | Full research pipeline: Flatfox API → images → description → amenities → save |
| `backend/app/services/flatfox_poller.py` | 137 | ✅ Complete | Discover new listings from Flatfox search API |
| `backend/app/routers/scoring.py` | 257 | ✅ Modified | Orchestrator: cache → Layer 2 deterministic → Layer 3 gap-fill → Claude fallback |
| `supabase/migrations/005_listing_profiles.sql` | — | ⏳ Not applied | Creates `listing_profiles` table with indexes |
| `supabase/migrations/006_add_research_json.sql` | — | ⏳ Not applied | Adds `research_json` JSONB column |

### Data on Disk

- `backend/scripts/output/` — 27 JSON files for zipcode 8051 (already saved to Supabase via `save_research.py`)
- `/tmp/zipcode_8051_area.json` — shared area research (neighborhood + amenities with lat/lng + market rents by room count)
- `/tmp/zipcode_8051_pks.txt` — 28 listing IDs for reuse with `--skip-fetch`

### Architecture: Three-Layer Pipeline

```
Extension → score-proxy edge function → POST /score (EC2)
  │
  ├─ Cache hit? → return cached ScoreResponse
  │
  ├─ Layer 2: ListingProfile exists?
  │   ├─ YES → score_deterministic(profile, preferences)
  │   │         → detect_gaps(checklist)
  │   │         → OpenRouter gap-fill (Gemini Flash, ~$0.0075)
  │   │         → return ScoreResponse
  │   │
  │   └─ NO → Layer 4 fallback
  │
  └─ Layer 4 (Fallback): _score_with_claude()
      → Flatfox API → geocode → Apify proximity → Claude scoring
      → return ScoreResponse (~$0.06, 6-10 seconds)
```

---

## Part 2: Collaborators' v5.0 Plan (Requirements Only, No Code)

### Architecture: Criterion-Routed Hybrid

```
Profile save → Claude classifies each DynamicField → criterion_type stored
                                                          │
Score request → route each criterion by type:             │
  ├─ price/distance/size/binary_feature/proximity_quality │
  │   → Deterministic formulas (pure Python)              │
  │   → FulfillmentResult(fulfillment: 0.0-1.0)          │
  │                                                       │
  └─ subjective                                           │
      → Batched Claude call (single messages.parse())     │
      → SubjectiveCriterionResult(fulfillment, reasoning) │
                                                          │
  Weighted aggregation: score = Σ(w×f)/Σ(w) × 100        │
  CRITICAL f=0 → poor tier, cap at 39                     │
  → ScoreResponse v2 (schema_version: 2)                  │
```

### 24 Requirements (All TBD)

**Data Model (DM-01 to DM-03):** Criterion type enum on DynamicField, Claude classification at profile save, weight scale CRITICAL=5/HIGH=3/MEDIUM=2/LOW=1

**Deterministic Scorer (DS-01 to DS-06):** Price `exp(-2.5×Δ/budget)`, distance `exp(-1×Δ/target)`, size `(actual/target)^1.5`, binary feature slug matching with FEATURE_ALIAS_MAP, proximity quality `exp(-1×Δ/r) + rating_bonus`, built-in fields as virtual FulfillmentResults

**Subjective Scorer (SS-01 to SS-04):** ClaudeSubjectiveResponse pydantic model, batched call (skip if zero subjective), Claude returns fulfillment only (never overall_score), summary bullets always generated

**Hybrid Aggregation (HA-01 to HA-04):** Weighted average formula, missing data excluded, CRITICAL override, ScoreResponse v2 schema (categories removed, criteria_results added)

**Database (DB-01 to DB-03):** schema_version in breakdown JSONB, cache rejects v1, fulfillment_data column added

**Frontend (FE-01 to FE-04):** FulfillmentBreakdown component, checklist met/partial/not-met from fulfillment thresholds (≥0.7/0.3-0.69/<0.3), extension types updated, schema_version branching

---

## Part 3: Side-by-Side Comparison

| Aspect | Our v6.0 (Built) | Collaborators' v5.0 (Planned) | Verdict |
|--------|-------------------|-------------------------------|---------|
| **Data source** | Pre-computed ListingProfile (enrichment pipeline) | Live Flatfox API data at score time | **Ours is better** — eliminates API latency, enables offline scoring |
| **Enrichment** | Zipcode-batched (3 shared + N image agents) | None planned | **Ours fills a gap** — v5.0 assumes data exists but doesn't say where from |
| **Criterion routing** | Keyword-based mapping (40+ keywords → amenity/score/style fields) | Claude classifies criterion_type at profile save (6 types) | **v5.0 is cleaner** — explicit type enum vs fuzzy keyword matching |
| **Price formula** | Linear decay (100→70 within range, 0 if over) | Exponential decay `exp(-2.5×Δ/budget)` | **v5.0 is more principled** — smoother curve, no cliff |
| **Distance formula** | Linear (based on haversine km) | Exponential decay `exp(-1×Δ/target)` | **v5.0 is more principled** |
| **Size formula** | Linear (based on sqm/rooms difference) | Power formula `(actual/target)^1.5` | **v5.0 is more principled** |
| **Binary features** | Keyword search in attributes + description | Slug set-membership + FEATURE_ALIAS_MAP | **v5.0 is cleaner** — explicit slugs vs fuzzy text search |
| **Proximity quality** | Haversine distance → linear score | `exp(-1×Δ/r) + min(0.2, (rating-3)/10)` | **v5.0 adds rating bonus** — ours has better distance data from pre-computation |
| **Subjective criteria** | Marked [GAP] → OpenRouter Gemini Flash | Claude batched call → per-criterion fulfillment | **Both valid** — v5.0 uses Claude (better quality), ours uses Gemini (cheaper) |
| **Weight scale** | Legacy (90/70/50/30) | New (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1) | **v5.0** — should adopt |
| **Dealbreaker logic** | Caps overall to 15 | CRITICAL f=0 → poor tier, cap at 39 | **v5.0** — should adopt |
| **Response schema** | ScoreResponse with 5 categories | ScoreResponse v2 (criteria_results, no categories) | **v5.0** — cleaner per-criterion breakdown |
| **Gap handling** | detect_gaps → OpenRouter fill | Missing data → skip in aggregation | **Ours is more complete** — actually answers gaps vs just skipping |
| **Frontend** | No changes planned | FulfillmentBreakdown, schema_version branching | **v5.0** — needed for proper UX |
| **Cost per scoring** | ~$0.0075 (Gemini gap-fill) or $0 (no gaps) | ~$0.03-0.06 (Claude subjective) or $0 (all deterministic) | **Ours is cheaper** but v5.0 has better subjective quality |
| **Latency** | ~100-200ms (deterministic + gap-fill) | ~1-3s (if Claude call needed) or ~50ms (all deterministic) | **Comparable** |

### Key Insight

The two approaches are **complementary, not competing:**

- **Our v6.0 provides the DATA layer** — pre-computed ListingProfiles with enriched amenity coordinates, condition scores, market context. Without this, v5.0 has no data to score against.
- **v5.0 provides the SCORING layer** — cleaner criterion routing, better formulas, proper weighted aggregation, v2 response schema.

**The merged approach:**
1. Keep our enrichment pipeline + ListingProfile pre-computation (Layer 1)
2. Adopt v5.0's criterion classification at profile save time (DM-01, DM-02)
3. Replace our linear scoring formulas with v5.0's exponential decay (DS-01 through DS-06)
4. Adopt v5.0's weight scale and CRITICAL override (DM-03, HA-03)
5. Keep our gap detection + OpenRouter as a cheap Layer 3 for missing data
6. Use Claude subjective-only for genuinely subjective criteria (SS-01 through SS-04)
7. Adopt v5.0's ScoreResponse v2 and frontend changes (HA-04, FE-*)
8. Apply our DB migrations (005, 006) + v5.0's DB changes (DB-01 through DB-03)

---

## Part 4: Immediate Actions Before GSD Milestone

### 4a. Upload 8051 Data to EC2

```bash
# Copy enriched JSONs to EC2
scp -i ~/.ssh/project_key.pem backend/scripts/output/85*.json \
  ubuntu@63.176.136.105:~/gen-ai-hackathon/backend/scripts/output/

# Verify on EC2
ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 \
  "ls ~/gen-ai-hackathon/backend/scripts/output/85*.json | wc -l"
```

### 4b. Apply DB Migrations

```bash
# Migration 005: listing_profiles table
npx supabase db push --linked  # or apply manually

# Migration 006: research_json column
# (additive ALTER, safe to run)
```

### 4c. Deploy Backend with New Scoring Code

```bash
# Push to main, then deploy
ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 \
  "cd gen-ai-hackathon && git pull && pkill -f uvicorn; cd backend && \
   nohup /home/ubuntu/gen-ai-hackathon/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &"
```

### 4d. Set OPENROUTER_API_KEY on EC2

```bash
ssh -i ~/.ssh/project_key.pem ubuntu@63.176.136.105 \
  "echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/gen-ai-hackathon/backend/.env"
```

---

## Part 5: Recommended GSD Milestone Structure

### Milestone: v5.0 Pre-Computed Hybrid Scoring Engine

**Goal:** Fast, accurate, $0-marginal-cost scoring for Zürich listings using pre-computed ListingProfiles + deterministic formulas + Claude subjective-only fallback.

**Phase A: Data Foundation (deploy what's built)**
- Apply migrations 005 + 006
- Push backend code (deterministic scorer, gap detector, OpenRouter, scoring router)
- Set OPENROUTER_API_KEY on EC2
- Deploy + verify /score endpoint uses deterministic path for 8051 listings
- Upload enriched JSONs to EC2

**Phase B: Criterion Classifier (from v5.0 DM-*)**
- Add criterion_type enum to DynamicField
- Claude classification at profile save time
- New weight scale (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1)

**Phase C: Scoring Formula Upgrade (from v5.0 DS-*)**
- Replace linear formulas with exponential decay (price, distance, size)
- Add proximity quality formula with rating bonus
- Binary feature slug matching with FEATURE_ALIAS_MAP
- Built-in fields as virtual FulfillmentResults
- CRITICAL f=0 override (poor tier, cap at 39)

**Phase D: Claude Subjective-Only (from v5.0 SS-*)**
- ClaudeSubjectiveResponse model
- Batched call for subjective criteria only
- Skip Claude entirely if all criteria are deterministic
- Summary bullets always generated

**Phase E: Response Schema v2 + DB (from v5.0 HA-*, DB-*)**
- ScoreResponse v2: criteria_results, schema_version, no categories
- Weighted aggregation in Python (not Claude)
- schema_version in analyses table
- Cache version gating (reject v1)
- fulfillment_data column

**Phase F: Frontend (from v5.0 FE-*)**
- FulfillmentBreakdown component
- Checklist met/partial/not-met from fulfillment thresholds
- Extension types updated (additive)
- schema_version branching on analysis page

**Phase G: Enrichment Scale-Out**
- Run zipcode pipeline for all 25 Zürich zipcodes (~1,792 listings)
- Set up periodic re-enrichment (weekly cron or manual)
- Monitor coverage: % of score requests hitting deterministic path vs Claude fallback

---

## Part 6: Key Files Reference

### Our Code (to push)
- `backend/app/models/listing_profile.py` — ListingProfile Pydantic model
- `backend/app/services/deterministic_scorer.py` — 1086-line deterministic scorer
- `backend/app/services/gap_detector.py` — gap detection
- `backend/app/services/openrouter.py` — OpenRouter Gemini Flash client
- `backend/app/services/listing_profile_db.py` — Supabase CRUD
- `backend/app/services/listing_analyzer.py` — full research pipeline
- `backend/app/services/flatfox_poller.py` — Flatfox polling
- `backend/app/routers/scoring.py` — scoring endpoint (modified)
- `backend/app/main.py` — main app (modified)
- `backend/app/services/places.py` — places service (modified)
- `backend/scripts/analyze_zipcode.sh` — zipcode enrichment script
- `backend/scripts/zipcode_research_prompt.md` — orchestrator prompt
- `backend/scripts/haversine.py` — distance calculator
- `supabase/migrations/005_listing_profiles.sql` — listing_profiles table
- `supabase/migrations/006_add_research_json.sql` — research_json column

### Collaborators' v5.0 Spec (reference)
- `.planning/ROADMAP.md` — v5.0 phases 27-32
- `.planning/REQUIREMENTS.md` — 24 requirements (DM/DS/SS/HA/DB/FE)
- `.planning/STATE.md` — current state tracking

### Current Production Code (to modify)
- `backend/app/prompts/scoring.py` — Claude prompt (needs subjective-only refactor)
- `backend/app/services/proximity.py` — proximity service (recently updated with fallback)
- `extension/src/types/scoring.ts` — TypeScript types (needs v2 additions)
- `web/src/components/analysis/ChecklistSection.tsx` — checklist UI (needs fulfillment thresholds)

---

## Part 7: Quality Assessment (8051 Test Data)

**What works well:**
- 100% amenities have haversine-accurate distances (21/21 per listing)
- Transit distances correctly vary per listing (98m to 567m)
- Market comparisons per room count (e.g., 4.5r at CHF 2,210 = "below" avg CHF 3,500)
- Condition scores have good spread (0-88) with style detection
- 3-5 insights + 3-5 concerns per listing

**Known limitations of zipcode-batched approach:**
- Noise score is identical for all listings in a zipcode (40/100 for all 27)
- Neighborhood character text is identical for all listings
- Non-residential listings slip through (parking spots, commercial)

**Impact on scoring:** Noise uniformity may shift scores by 2-5 points. For a badge-based extension UI, this is acceptable. The per-listing proximity distances (the main scoring driver) are more accurate than the old per-listing pipeline because they use haversine math on real coordinates rather than web search estimates.
