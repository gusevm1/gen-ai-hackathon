# Feature Landscape: Hybrid Deterministic + AI Scoring Engine (v5.0)

**Domain:** Property matching score system (replacing LLM-only scoring with hybrid)
**Researched:** 2026-03-29
**Confidence:** HIGH (based on existing codebase analysis + domain patterns)

## Table Stakes

Features users expect. Missing = product feels broken or regressed from v4.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|-------------|-------|
| **Overall numeric score (0-100) on badge** | Users already see this on Flatfox listings; removing it breaks mental model | Low | ScoreBadge.tsx, SummaryPanel.tsx, ScoreHeader.tsx | Computed via weighted aggregation now, not Claude. Must produce same 0-100 range. |
| **Match tier (excellent/good/fair/poor) with color** | Color-coded badges are the primary scan mechanism in extension | Low | TIER_COLORS in extension + web | Derive from aggregated score using same thresholds (80/60/40). |
| **Per-criterion fulfillment visible on analysis page** | Replacing 5-category breakdown; users need to see WHY score is what it is | Med | CategoryBreakdown.tsx replacement | Each DynamicField criterion shown with its fulfillment (0.0-1.0) + reasoning. |
| **Dealbreaker override visibility** | Users already have dealbreaker toggles; they must see when one fires | Low | ChecklistSection.tsx, ScoreHeader.tsx | When CRITICAL f=0 forces poor tier, the UI must call this out prominently. Not just "poor" -- "poor (dealbreaker: budget exceeded)". |
| **Summary bullets (3-5 key takeaways)** | Users rely on quick scan of pros/cons before clicking through | Med | BulletSummary.tsx | Can be generated from criterion results deterministically (top fulfillments, bottom fulfillments, any dealbreaker). Claude not needed. |
| **Checklist with met/not-met/unknown status** | Existing UX pattern users are trained on | Low | ChecklistSection.tsx | Maps directly to per-criterion fulfillment. met = f >= 0.5, partial = 0.3-0.5, not met = f < 0.3, unknown = skipped. Thresholds are a design choice. |
| **Score caching respects new schema** | v2.0 already has cache; schema change must bump cache version | Low | analyses table, cache key | Cache key must include schema version so old cached scores are not rendered with new UI expecting new fields. |
| **Missing data shown as "skipped" not "0"** | A criterion with no data is NOT a failure. Showing 0 for missing data is misleading and will cause user complaints. | Med | Aggregation logic, UI display | Skipped criteria must be visually distinct from failed criteria. Gray/dimmed, not red. |
| **Reasoning text for each criterion** | Users expect to understand WHY a score was given, especially for subjective criteria | Med | New per-criterion reasoning field | Deterministic criteria: auto-generated explanation ("Listed at CHF 2,100 vs your max CHF 2,500 = 84% match"). Subjective: Claude's reasoning string. |
| **Language consistency (DE/FR/IT/EN)** | Already supported; must not regress. Deterministic reasoning templates need i18n. | Med | Prompt templates, deterministic explanation strings | Subjective criteria still go through Claude with language instruction. Deterministic reasoning needs translated template strings. |

## Differentiators

Features that set the hybrid system apart from the old LLM-only approach. Not expected by users, but add significant value.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|-------------|-------|
| **Criterion type badge (deterministic vs AI)** | Transparency: user sees which scores are computed vs AI-judged. Builds trust per PwC research showing 85% of users want explainability. | Low | New UI element per criterion row | Small badge/icon: calculator icon for deterministic, brain/sparkle icon for subjective. |
| **Instant re-score for deterministic criteria** | When listing data changes or user tweaks preferences, deterministic criteria can update without Claude API call. Saves cost, feels faster. | High | Separate scoring paths, partial cache invalidation | Only re-call Claude for subjective criteria. Major architectural benefit but complex to implement correctly. |
| **Confidence indicator per criterion** | Show users how confident the system is. Deterministic = always high. Subjective = based on Claude's fulfillment granularity. Missing data = explicitly "insufficient data". | Low | UI-only, data already available | Visual metaphor: solid bar for deterministic, gradient/dashed for subjective, empty for skipped. |
| **Weighted importance visualization** | Show how much each criterion contributes to overall score (CRITICAL=5x, HIGH=3x, etc.) | Low | Weight data already in preferences | Small weight multiplier badge or proportional bar width. Helps users understand why a LOW-importance miss barely affects score. |
| **Aggregation formula transparency** | "Your score: 73/100 = (budget 0.8 x 5 + size 0.9 x 3 + ...) / total weight" | Med | New UI component | Expandable "how was this calculated?" section. Powerful for trust. Avoid making it default-visible (info overload). |
| **Criterion-level drill-down** | Click a criterion to see the raw data used (listing value vs preference value, distance calculation, etc.) | Med | Needs listing data passed to frontend | Especially valuable for distance/price criteria where users want to verify the math. |

## Anti-Features

Features to explicitly NOT build. Over-engineering traps for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User-configurable scoring formula weights** | The CRITICAL/HIGH/MEDIUM/LOW system already captures intent. Exposing numeric weights (5/3/2/1) adds complexity without value. Users think in importance tiers, not multipliers. | Keep importance levels as-is. Map to weights internally. |
| **Per-criterion threshold configuration** | Letting users set "what fulfillment counts as met" per criterion is over-engineering. 0.5 is intuitive. | Use fixed thresholds for met/partial/not-met display. Tune internally if needed. |
| **A/B comparison between old and new scoring** | Tempting for validation but doubles frontend complexity and confuses users who see two scores for same listing. | Clean cutover with cache version bump. Old scores simply expire. |
| **Partial Claude fallback for deterministic criteria** | "If deterministic fails, ask Claude" sounds safe but creates unpredictable behavior and cost. If deterministic logic cannot compute, skip the criterion. | Missing data = skip in aggregation. Period. |
| **Score history / trend charts** | Out of scope per PROJECT.md. Adding it now would expand the milestone. | Defer to future milestone (HIST-01/02 already logged as deferred). |
| **Real-time score preview while editing preferences** | Would require running scoring pipeline on every preference change. Too expensive with Claude in the loop for subjective criteria. | Show score after explicit re-score action (FAB click). |
| **Customizable tier thresholds** | Letting users redefine what "excellent" means (e.g., 70 instead of 80) adds configuration burden with no real value. | Fixed tier thresholds: 80/60/40. These are well-calibrated for percentage-based fulfillment. |
| **Separate "AI confidence" score** | Exposing Claude's internal confidence as a separate number is confusing. Users want "how well does this match?" not "how sure is the AI?" | Use the criterion type badge (deterministic vs AI) as implicit confidence signal. |

## Edge Cases

| Edge Case | Impact | Expected Behavior | Implementation Notes |
|-----------|--------|-------------------|---------------------|
| **All criteria are subjective** | Entire score depends on Claude. No deterministic fast path. | Works fine -- all criteria go through Claude batch. Score is 100% AI-derived. Must still compute weighted aggregation from Claude's per-criterion fulfillments (not ask Claude for overall). | Aggregation logic must handle zero deterministic criteria gracefully. |
| **All criteria have missing listing data** | Every criterion skipped. No score computable. | Display "Unable to score -- insufficient listing data" instead of 0. Do NOT show a numeric score. Show which criteria could not be evaluated and why. | Guard in aggregation: if all weights are zero (all skipped), return a sentinel state, not 0. |
| **Single criterion profile** | User has only one DynamicField (e.g., "Has balcony"). Overall score = that one criterion's fulfillment. | Score works but may feel brittle. The score IS the fulfillment of that one criterion, which is actually correct and transparent. | No special casing needed. Weighted average of one item = that item. But UI should indicate "based on 1 criterion" to set expectations. |
| **Single CRITICAL criterion with f=0, all others excellent** | Dealbreaker semantics: match_tier must be "poor" regardless. | Overall numeric score from aggregation might be high (e.g., 70) but tier is forced to "poor". UI must explain: "Dealbreaker violated: [criterion name]". The numeric score and tier will conflict visually. | Recommend capping numeric score at 39 when dealbreaker fires. A "poor" badge showing "70" is confusing. Cap the score so badge number and tier color agree. |
| **All criteria are deterministic (no subjective)** | Claude is never called. Fastest possible score. | Works perfectly. No Claude API cost. Score is fully deterministic and reproducible. | Must handle the case where subjective criteria list is empty and skip Claude call entirely. |
| **Mixed missing: some criteria have data, some don't** | Partial score based on available criteria. | Score based on available criteria only. Skipped criteria listed separately. Numeric score derived from available subset. | Re-normalize weights: if 3 of 5 criteria scored, divide by sum of those 3 weights, not all 5. |
| **Claude returns unexpected fulfillment for subjective** | Claude might return 0.5 when the listing clearly fails a criterion. | Accept Claude's response as-is within the valid range {0.0, 0.1, ..., 1.0}. Structured output with Pydantic validation already constrains the range. | Log anomalies for monitoring but do not second-guess Claude's response in code. |
| **Listing has no images** | Image-dependent subjective criteria (e.g., "modern kitchen") have less signal. | Claude evaluates based on text only. The fulfillment may be lower confidence but is still valid. No special handling needed -- Claude already handles this per existing SYSTEM_PROMPT. | Consider adding a note: "Visual assessment not possible" when no images and subjective criteria exist. |
| **Budget dealbreaker + budget missing from listing** | Listing has no price. Budget criterion cannot be evaluated. | Skip the budget criterion. Do NOT trigger dealbreaker for missing data -- dealbreaker fires only on actual violations (price > max), not on absence of data. | Critical distinction: missing != violation. Only f=0 on a CRITICAL criterion triggers dealbreaker, and f is only set to 0 when data exists and fails. Missing = skip. |
| **User has zero DynamicFields (empty preferences)** | Nothing to score beyond fixed fields (budget, rooms, living_space). | Score based on fixed fields only. If those are also empty, display "No preferences configured" with a link to profile settings. | The fixed fields (budget, rooms, living_space) with their importance levels and dealbreaker toggles may produce a score even without DynamicFields. |
| **Stale cached score with old schema** | User views a listing scored with v4 schema (5-category, overall_score from Claude). | Cache version bump invalidates old scores. Badge shows "stale" state. Re-scoring produces new-schema result. | analyses table needs schema_version column or the cache key must include version. Existing stale-badge infrastructure can be reused for this. |

## Feature Dependencies

```
Criterion type classification (at profile save)
  --> Deterministic scoring formulas
  --> Subjective-only Claude prompt
  --> Per-criterion fulfillment aggregation
       --> Weighted overall score computation
       --> Dealbreaker override logic
       --> Match tier derivation
            --> ScoreBadge update (extension)
            --> ScoreHeader update (web)
       --> Summary bullet generation
            --> BulletSummary update (web)
  --> Per-criterion display component
       --> Replaces CategoryBreakdown.tsx
       --> Shows fulfillment bar + reasoning + type badge
  --> ChecklistSection adaptation
       --> Maps fulfillment to met/partial/not-met
  --> Score cache version bump
       --> Old scores invalidated
       --> Stale badge shows for uncached listings

Binary feature normalization layer
  --> Deterministic match for known features (e.g., "balcony" vs "Balkon")
  --> Claude fallback only for truly ambiguous features
```

## UX Notes: Score Display Transition

### From 5 Categories to Per-Criterion

**Current:** 5 fixed categories (location, price, size, features, condition) each with 0-100 score, weight, reasoning bullets. CategoryBreakdown.tsx renders these as expandable cards with score bars.

**New:** N variable criteria (user-defined DynamicFields + fixed fields) each with 0.0-1.0 fulfillment, importance level, reasoning text, and criterion type (deterministic/subjective).

**Key UX decisions:**
1. **Display fulfillment as percentage (0-100%) not decimal (0.0-1.0)** -- users understand percentages. Internally store as float, display as `Math.round(f * 100)%`.
2. **Group criteria by importance, not alphabetically** -- group CRITICAL criteria first, then HIGH, etc. Within groups, deterministic before subjective.
3. **Expand top criterion and any dealbreaker violations by default** -- mirrors current behavior of expanding top 3 categories.
4. **Keep the overall score circle prominent** -- users anchor on this. The per-criterion breakdown is supporting detail.

### Missing Data vs Zero Score: Visual Language

| State | Numeric Display | Color | Icon | Bar Style |
|-------|----------------|-------|------|-----------|
| Full match (f=1.0) | 100% | Emerald/green | Check | Full solid bar |
| Partial match (f=0.5) | 50% | Amber | Partial circle | Half solid bar |
| No match (f=0.0) | 0% | Red | X | Empty bar with red border |
| Missing/skipped | "--" or "N/A" | Gray | HelpCircle | Dashed outline, no fill |
| Dealbreaker violated | 0% | Red + destructive badge | AlertTriangle | Empty bar + "DEALBREAKER" label |

This visual language prevents the most critical UX confusion: users must never confuse "this criterion was not evaluated" with "this criterion failed."

### Reasoning/Explanation for Mixed Sources

When Claude handles only subjective criteria, the explanation UX must avoid a jarring split:

1. **Deterministic criteria reasoning:** Auto-generated from formula inputs. Template: "[Listing value] vs [your preference]: [fulfillment]% match." Example: "CHF 2,100/mo vs your max CHF 2,500/mo: 84% match." These are always in the user's language (requires i18n templates for DE/FR/IT/EN).

2. **Subjective criteria reasoning:** Claude's natural language response. Already in the user's language via the prompt instruction.

3. **Consistent formatting:** Both types should render identically in the UI -- same text style, same card structure. The only visible difference is the small type badge (calculator vs sparkle icon). Avoid making deterministic explanations look "robotic" -- use natural phrasing in templates.

### Extension Badge: What Changes

The ScoreBadge currently shows `score.overall_score` (integer) and `score.match_tier` (string). The new system computes these values server-side via weighted aggregation, so the badge component needs minimal changes:

- `overall_score` field still exists, now computed by backend aggregation
- `match_tier` field still exists, now derived from aggregated score (with dealbreaker override)
- Badge component itself: **no visual change needed**
- SummaryPanel: needs update to show per-criterion fulfillment instead of category scores

### Score Response Schema Migration

**Current ScoreResponse fields to keep:**
- `overall_score` (now computed, not from Claude)
- `match_tier` (now computed, with dealbreaker override)
- `summary_bullets` (now generated from criterion results)
- `checklist` (maps to per-criterion fulfillment)
- `language`

**Current fields to remove:**
- `categories` (replaced by per-criterion fulfillment list)

**New fields to add:**
- `criteria_results`: list of `{name, type, fulfillment, importance, reasoning, skipped, is_dealbreaker_violation}`
- `dealbreaker_triggered`: boolean
- `dealbreaker_criterion`: string (name of the criterion that triggered dealbreaker, if any)
- `criteria_evaluated`: int (count of non-skipped criteria)
- `criteria_total`: int (total criteria count)
- `schema_version`: int (for cache compatibility)

## Sources

- Existing codebase analysis: `backend/app/models/scoring.py`, `backend/app/prompts/scoring.py`, `backend/app/models/preferences.py`
- Frontend consumers: `web/src/components/analysis/CategoryBreakdown.tsx`, `ScoreHeader.tsx`, `ChecklistSection.tsx`, `BulletSummary.tsx`
- Extension consumers: `extension/src/types/scoring.ts`, `extension/src/entrypoints/content/components/ScoreBadge.tsx`
- Analysis page: `web/src/app/(dashboard)/analysis/[listingId]/page.tsx`
- [Trust in Transparency: How Explainable AI Shapes User Perceptions](https://arxiv.org/html/2510.04968v1)
- [Deterministic AI Architecture: Why It Matters in 2025](https://www.kubiya.ai/blog/deterministic-ai-architecture)
- [The Secret to Making AI Feel Transparent Lies in UX Design](https://articles.ux-primer.com/the-secret-to-making-ai-feel-transparent-lies-in-ux-design-140ddeee6733)
- [Weighted Scoring Model: Step-by-Step Implementation Guide](https://productschool.com/blog/product-fundamentals/weighted-scoring-model)
- [AI Property Score on Investorlift](https://community.investorlift.com/getting-started-17/ai-property-score-instantly-identify-high-quality-real-estate-deals-on-investorlift-798)
- [FRED: How Missing Values Are Treated in Aggregation](https://fredhelp.stlouisfed.org/fred/data/understanding-the-data/how-are-missing-values-treated-in-average-sum-and-end-of-period-aggregation-methods-2/)
