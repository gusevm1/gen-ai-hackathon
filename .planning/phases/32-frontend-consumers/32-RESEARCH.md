# Phase 32: Frontend Consumers - Research

**Researched:** 2026-03-30
**Domain:** Next.js web app (analysis page) + Chrome extension (WXT/React) -- consuming v2 ScoreResponse
**Confidence:** HIGH

## Summary

Phase 32 updates two frontend consumers (Next.js web app and Chrome extension) to display the new v2 ScoreResponse format from the hybrid scoring pipeline. The v2 response replaces the old `categories` (5 category-level scores) and `checklist` (boolean met/unmet) arrays with `criteria_results` (per-criterion fulfillment floats with weights and reasoning) and adds `schema_version` and `enrichment_status` fields.

The web app analysis page (`/analysis/[listingId]`) currently renders `CategoryBreakdown` and `ChecklistSection` from the `breakdown` JSONB stored in the `analyses` Supabase table. The page is a Server Component that reads data directly from Supabase. The change requires: (1) a new `FulfillmentBreakdown` component for v2 data, (2) updating `ChecklistSection` to derive met/partial/not-met from fulfillment floats, (3) branching on `schema_version` at the page level, and (4) keeping legacy rendering for v1 cached analyses.

The Chrome extension uses WXT framework with Shadow DOM per-badge injection. It has a `ScoreResponse` TypeScript interface in `src/types/scoring.ts` that must be updated additively (new optional fields, old fields preserved). The extension must also render a grey "beta" badge when `enrichment_status === "unavailable"`. The `ScoreBadge` and `SummaryPanel` components need awareness of the new state.

**Primary recommendation:** Branch the analysis page on `schema_version` field from the `breakdown` JSONB. Build a new `FulfillmentBreakdown` component for v2, keep existing `CategoryBreakdown` for v1. Update extension types additively. Handle `enrichment_status="unavailable"` as a distinct badge variant with grey styling.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FE-01 | New `FulfillmentBreakdown` component renders per-criterion name, fulfillment score, weight, and reasoning | New component using `criteria_results` array from v2 ScoreResponse. CriterionResult shape: `{criterion_name, fulfillment, importance, weight, reasoning}`. Uses existing Card/Badge UI primitives. |
| FE-02 | ChecklistSection updated for fulfillment float thresholds: met (>=0.7), partial (0.3-0.69), not-met (<0.3) | Existing ChecklistSection accepts `{criterion, met: boolean\|null, note}`. For v2, derive these from criteria_results fulfillment floats instead. Can reuse same visual components with threshold-based status derivation. |
| FE-03 | Extension TypeScript types updated for v2 ScoreResponse (additive only) | Add optional `schema_version`, `criteria_results`, `enrichment_status` to existing `ScoreResponse` interface. Existing fields (`overall_score`, `match_tier`, `summary_bullets`) unchanged. |
| FE-04 | Analysis page branches on `schema_version`: v1 renders legacy, v2 renders fulfillment breakdown | `breakdown` JSONB already stores all fields. Check `breakdown.schema_version`: if >= 2, render FulfillmentBreakdown; else render CategoryBreakdown + legacy ChecklistSection. |
| FE-05 | Extension renders grey "beta" badge for `enrichment_status="unavailable"` | New badge variant in ScoreBadge component. When enrichment_status is "unavailable", show grey badge with "Beta" label instead of score circle. SummaryPanel shows informational message. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Web app framework | Already in use (web/package.json) |
| React | 19.2.3 (web) / 19.2.4 (ext) | UI library | Already in use |
| WXT | 0.20.18 | Chrome extension framework | Already in use (extension/wxt.config.ts) |
| Tailwind CSS | v4 (web) / v3.4 (ext) | Styling | Already in use |
| lucide-react | 0.577.0 | Icons | Already in use for Check, X, HelpCircle, etc. |
| shadcn/ui | v4 | UI components (Card, Badge) | Already in use in both web and extension |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.0.18 | Testing | Already configured in both projects |
| class-variance-authority | 0.7.1 | Badge variants | Already in use for Badge component |

### Alternatives Considered
None -- this phase uses existing stack exclusively. No new dependencies needed.

## Architecture Patterns

### Existing Analysis Page Structure (web)
```
web/src/
├── app/(dashboard)/analysis/[listingId]/
│   ├── page.tsx            # Server Component, reads Supabase, renders analysis
│   └── loading.tsx         # Loading skeleton
├── components/analysis/
│   ├── ScoreHeader.tsx     # Score circle + tier badge (unchanged)
│   ├── BulletSummary.tsx   # Key takeaways bullets (unchanged)
│   ├── CategoryBreakdown.tsx  # v1: 5 categories with scores (KEEP for v1 cache)
│   ├── ChecklistSection.tsx   # v1: boolean checklist (UPDATE for v2 fulfillment)
│   └── FulfillmentBreakdown.tsx  # NEW: v2 per-criterion fulfillment view
```

### Existing Extension Content Script Structure
```
extension/src/
├── types/scoring.ts           # ScoreResponse interface (UPDATE additively)
├── entrypoints/content/
│   ├── App.tsx                # Main content script (UPDATE for unavailable state)
│   └── components/
│       ├── ScoreBadge.tsx     # Badge on listing cards (UPDATE for beta badge)
│       ├── SummaryPanel.tsx   # Expandable panel (UPDATE for unavailable)
│       ├── LoadingSkeleton.tsx # Loading state (unchanged)
│       └── Fab.tsx            # Floating action button (unchanged)
```

### Pattern 1: Schema Version Branching (FE-04)
**What:** The analysis page reads `schema_version` from the `breakdown` JSONB and conditionally renders v1 or v2 components.
**When to use:** When the same database column stores data in two different shapes.
**Example:**
```typescript
// In page.tsx -- Server Component
const schemaVersion = (breakdown.schema_version as number) ?? 1;

// Left column: breakdown view branches on schema version
{schemaVersion >= 2 ? (
  <FulfillmentBreakdown criteriaResults={criteriaResults} />
) : (
  <CategoryBreakdown categories={categories} />
)}

// Right column: checklist also branches
{schemaVersion >= 2 ? (
  <ChecklistSection checklist={deriveFulfillmentChecklist(criteriaResults)} />
) : (
  <ChecklistSection checklist={checklist} />
)}
```

### Pattern 2: Fulfillment-to-Checklist Derivation (FE-02)
**What:** Convert v2 `criteria_results` (float fulfillment) into the existing `ChecklistItem` shape for reuse of ChecklistSection.
**When to use:** When you want to reuse an existing visual component with new data shapes.
**Example:**
```typescript
// Utility function to derive ChecklistItem[] from CriterionResult[]
function deriveFulfillmentChecklist(criteriaResults: CriterionResult[]): ChecklistItem[] {
  return criteriaResults
    .filter(cr => cr.fulfillment !== null && cr.fulfillment !== undefined)
    .map(cr => ({
      criterion: cr.criterion_name,
      met: cr.fulfillment >= 0.7 ? true : cr.fulfillment >= 0.3 ? "partial" : false,
      note: cr.reasoning ?? "",
    }));
}
```

### Pattern 3: Additive TypeScript Interface Extension (FE-03)
**What:** Add optional fields to the existing ScoreResponse interface so v1 responses still type-check.
**When to use:** When backend adds new fields but old responses in cache lack them.
**Example:**
```typescript
// extension/src/types/scoring.ts
export interface CriterionResult {
  criterion_name: string;
  fulfillment: number | null;
  importance: string;  // "critical" | "high" | "medium" | "low"
  weight: number;
  reasoning: string | null;
}

export interface ScoreResponse {
  overall_score: number;
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[];
  categories: CategoryScore[];
  checklist: ChecklistItem[];
  language: string;
  // v2 additions (all optional for backward compatibility)
  schema_version?: number;
  criteria_results?: CriterionResult[];
  enrichment_status?: 'available' | 'unavailable' | 'fallback' | null;
}
```

### Pattern 4: Grey Beta Badge for Unavailable Enrichment (FE-05)
**What:** When `enrichment_status === "unavailable"`, render a distinct grey badge instead of the normal score badge.
**When to use:** When the backend signals data is not yet available for a listing's area.
**Example:**
```typescript
// In ScoreBadge.tsx -- check enrichment_status before rendering score
if (score.enrichment_status === 'unavailable') {
  return (
    <button onClick={handleClick} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md bg-gray-100 border border-gray-300 opacity-70">
      <span className="inline-flex items-center justify-center rounded-full bg-gray-400 text-white text-xs font-bold" style={{ width: 40, height: 40 }}>
        --
      </span>
      <span className="text-xs font-semibold text-gray-500 pr-1">Beta</span>
    </button>
  );
}
```

### Anti-Patterns to Avoid
- **Mutating the ChecklistSection interface to accept fulfillment floats directly:** This breaks v1 rendering. Instead, derive ChecklistItem[] from criteria_results via a utility function.
- **Removing CategoryBreakdown component:** v1 cached analyses still reference it. Keep it for backward compatibility.
- **Adding required fields to the extension ScoreResponse interface:** v1 cached/in-flight responses lack these fields. All v2 fields must be optional.
- **Checking `schema_version === 2` exactly:** Use `>= 2` to be forward-compatible with future schema versions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fulfillment status icons | Custom SVG icons | lucide-react `Check`, `X`, `AlertTriangle`, `HelpCircle` | Already used in ChecklistSection |
| Importance badge colors | New color system | Existing Badge component with variant mapping | Consistent with CategoryBreakdown importance labels |
| Score color bars | New progress components | Existing CSS pattern from CategoryBreakdown (h-3 rounded-full) | Visual consistency |
| Card layout | Custom containers | shadcn Card/CardHeader/CardContent | Already used in CategoryBreakdown |

## Common Pitfalls

### Pitfall 1: CamelCase vs snake_case in CriterionResult
**What goes wrong:** The backend `CriterionResult` model uses `alias_generator=to_camel` with `populate_by_name=True`. When serialized to JSON via `model_dump()`, field names could be either camelCase or snake_case depending on how `model_dump()` is called.
**Why it happens:** Pydantic v2 alias generators can output either format. The `_save_analysis_fire_and_forget` function in the router calls `result.model_dump()` (without `by_alias=True`), so fields in the `breakdown` JSONB are stored as **snake_case** (`criterion_name`, not `criterionName`).
**How to avoid:** Use snake_case field names in the TypeScript interfaces: `criterion_name`, `fulfillment`, `importance`, `weight`, `reasoning`. Verify by checking a v2 analysis row in Supabase.
**Warning signs:** Component shows `undefined` for criterion names.

### Pitfall 2: Null fulfillment values
**What goes wrong:** Some criteria have `fulfillment: null` (data was missing, HA-02 excluded them from aggregation). If the frontend divides by zero or tries to render a null as a percentage, it crashes.
**Why it happens:** The deterministic scorer sets `fulfillment=None` when data is unavailable. `to_criterion_result()` preserves this as `null`.
**How to avoid:** Filter out null-fulfillment criteria in FulfillmentBreakdown, or render them in a separate "Data unavailable" section with HelpCircle icon.
**Warning signs:** NaN% displayed, broken progress bars.

### Pitfall 3: Empty categories/checklist arrays in v2 responses
**What goes wrong:** For v2 responses, `categories` and `checklist` are always empty arrays (`[]`). The existing CategoryBreakdown and ChecklistSection both return `null` when their arrays are empty (they have `if (!categories || categories.length === 0) return null` guards). But if the page unconditionally renders both old and new components, the page could appear to have missing sections.
**Why it happens:** v2 uses `criteria_results` instead of `categories`/`checklist`.
**How to avoid:** Branch on `schema_version` at the page level. Only render CategoryBreakdown/legacy-ChecklistSection for v1. Only render FulfillmentBreakdown/v2-ChecklistSection for v2.
**Warning signs:** Analysis page shows only ScoreHeader and BulletSummary with no breakdown.

### Pitfall 4: Extension badge rendering for enrichment_status="unavailable"
**What goes wrong:** The current ScoreBadge expects `score.overall_score` to be a meaningful number. For "unavailable", the backend returns `overall_score: 0`, `match_tier: "poor"`. Without special handling, the extension shows a red "0 poor" badge, which is misleading.
**Why it happens:** The backend must return a valid ScoreResponse shape even for unavailable listings.
**How to avoid:** Check `enrichment_status === "unavailable"` before rendering the normal badge. Render a distinct grey "Beta" badge instead.
**Warning signs:** Users see red "0 poor" badges for listings that simply lack enrichment data.

### Pitfall 5: Importance weight display mismatch
**What goes wrong:** v1 used weights 0-100 (displayed as "Weight: 80%"). v2 uses weights 1-5 (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1). Displaying "Weight: 5%" would be confusing.
**Why it happens:** Different weight scales between v1 and v2 schemas.
**How to avoid:** In FulfillmentBreakdown, display the `importance` label (Critical/High/Medium/Low) rather than the raw numeric weight. If showing weight, normalize or explain the scale.
**Warning signs:** "Weight: 5%" displayed for a CRITICAL criterion.

## Code Examples

### CriterionResult Shape (from backend model_dump)
```typescript
// This is what's stored in breakdown.criteria_results in the analyses table
// Source: backend/app/models/scoring.py CriterionResult + model_dump() without by_alias
interface CriterionResult {
  criterion_name: string;       // e.g., "Budget", "Near public transport"
  fulfillment: number | null;   // 0.0 - 1.0, or null if data unavailable
  importance: string;           // "critical" | "high" | "medium" | "low"
  weight: number;               // 5 | 3 | 2 | 1
  reasoning: string | null;     // Explanation text or null
}
```

### v2 ScoreResponse Shape (full breakdown JSONB)
```typescript
// Stored in analyses.breakdown column for v2 scores
interface V2Breakdown {
  overall_score: number;
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[];
  categories: [];               // Always empty for v2
  checklist: [];                // Always empty for v2
  language: string;
  schema_version: 2;
  criteria_results: CriterionResult[];
  enrichment_status: 'available' | 'unavailable' | 'fallback' | null;
  // Metadata from _save_analysis_fire_and_forget:
  listing_title: string | null;
  listing_address: string | null;
  listing_rooms: string | null;
  listing_object_type: string | null;
  fulfillment_data: CriterionResult[];  // Duplicate in breakdown for migration 007
}
```

### Fulfillment-to-Status Threshold Mapping
```typescript
// Source: REQUIREMENTS.md FE-02
type FulfillmentStatus = 'met' | 'partial' | 'not-met' | 'unknown';

function getFulfillmentStatus(fulfillment: number | null): FulfillmentStatus {
  if (fulfillment === null || fulfillment === undefined) return 'unknown';
  if (fulfillment >= 0.7) return 'met';
  if (fulfillment >= 0.3) return 'partial';
  return 'not-met';
}

// Color mapping (consistent with existing ChecklistSection)
const STATUS_CONFIG: Record<FulfillmentStatus, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  met:      { icon: Check,         color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Met' },
  partial:  { icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-500/10',   label: 'Partial' },
  'not-met': { icon: X,           color: 'text-red-500',     bg: 'bg-red-500/10',     label: 'Not met' },
  unknown:  { icon: HelpCircle,   color: 'text-gray-400',    bg: 'bg-gray-500/10',    label: 'Unknown' },
};
```

### Importance Badge Mapping (v2 scale)
```typescript
// Source: backend IMPORTANCE_WEIGHT_MAP: CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1
function getImportanceBadge(importance: string): { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' } {
  switch (importance.toLowerCase()) {
    case 'critical': return { label: 'Critical', variant: 'destructive' };
    case 'high':     return { label: 'High',     variant: 'default' };
    case 'medium':   return { label: 'Medium',   variant: 'secondary' };
    case 'low':      return { label: 'Low',      variant: 'outline' };
    default:         return { label: importance,  variant: 'outline' };
  }
}
```

## State of the Art

| Old Approach (v1) | Current Approach (v2) | When Changed | Impact |
|---|---|---|---|
| 5 fixed categories (location, price, size, features, condition) with 0-100 scores | Per-criterion fulfillment (0.0-1.0) with named criteria matching user preferences | Phase 31 (2026-03-30) | New FulfillmentBreakdown component needed |
| Boolean checklist (met/not-met/unknown) | Float fulfillment with threshold-based status | Phase 31 | ChecklistSection threshold logic |
| Weights 0-100 percentage scale | Weights 1-5 (CRITICAL=5, HIGH=3, MEDIUM=2, LOW=1) | Phase 27 (DM-03) | Display importance labels, not raw numbers |
| No enrichment status | `enrichment_status` field: available/unavailable/fallback | Phase 31 (INT-04) | Grey beta badge for unavailable |
| No schema versioning | `schema_version: 2` in breakdown JSONB | Phase 30 (DB-01) | Page-level conditional rendering |

**Deprecated/outdated:**
- `categories` array: Empty in v2, only present for v1 backward compat
- `checklist` array: Empty in v2, only present for v1 backward compat
- Weight scale 0-100: Replaced by 1-5 in v2

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (web) | vitest 4.0.18 + jsdom |
| Framework (ext) | vitest 4.0.18 + happy-dom + WxtVitest |
| Config file (web) | `web/vitest.config.mts` |
| Config file (ext) | `extension/vitest.config.ts` |
| Quick run (web) | `cd web && npx vitest run --reporter verbose` |
| Quick run (ext) | `cd extension && npx vitest run --reporter verbose` |
| Full suite | Both quick runs |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FE-01 | FulfillmentBreakdown renders per-criterion data | unit | `cd web && npx vitest run src/__tests__/fulfillment-breakdown.test.ts -x` | Wave 0 |
| FE-02 | Fulfillment float thresholds derive met/partial/not-met | unit | `cd web && npx vitest run src/__tests__/fulfillment-breakdown.test.ts -x` | Wave 0 |
| FE-03 | Extension ScoreResponse v2 types compile and v1 still valid | unit | `cd extension && npx vitest run src/__tests__/scoring-types.test.ts -x` | Exists (needs update) |
| FE-04 | Analysis page branches on schema_version | unit | `cd web && npx vitest run src/__tests__/analysis-page.test.ts -x` | Exists (needs update) |
| FE-05 | Grey beta badge for enrichment_status=unavailable | unit | `cd extension && npx vitest run src/__tests__/scoring-types.test.ts -x` | Exists (needs update) |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter verbose` and `cd extension && npx vitest run --reporter verbose`
- **Per wave merge:** Both commands
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/fulfillment-breakdown.test.ts` -- covers FE-01, FE-02 (fulfillment threshold logic, component data handling)
- [ ] Update `web/src/__tests__/analysis-page.test.ts` -- add v2 schema_version branching tests (FE-04)
- [ ] Update `extension/src/__tests__/scoring-types.test.ts` -- add v2 type shape and enrichment_status tests (FE-03, FE-05)

## Open Questions

1. **CriterionResult field serialization format**
   - What we know: Backend uses `model_dump()` without `by_alias=True` in `_save_analysis_fire_and_forget`, which should produce snake_case keys. The `CriterionResult` model has `alias_generator=to_camel`.
   - What's unclear: Need to confirm what the edge function returns to the extension (it proxies the backend response directly, which uses FastAPI's default JSON serialization -- likely camelCase via `response_model`).
   - Recommendation: The extension receives the FastAPI response directly (camelCase via alias), while the web app reads from the DB (snake_case via model_dump). Build the TypeScript types to handle both: use snake_case for the web app breakdown parsing, and camelCase for the extension API response. OR just test both and pick the correct one. This is LOW risk since the field names are deterministic -- just verify in a single test.

2. **SummaryPanel for unavailable listings**
   - What we know: When enrichment_status="unavailable", the backend returns 3 static summary bullets explaining the situation.
   - What's unclear: Should the extension's SummaryPanel display these bullets, or show a completely different UI for unavailable listings?
   - Recommendation: Show the summary bullets as-is (they already explain the situation). Add a small informational banner similar to the stale-state banners.

## Sources

### Primary (HIGH confidence)
- `backend/app/models/scoring.py` -- CriterionResult and ScoreResponse v2 models (read directly)
- `backend/app/routers/scoring.py` -- Hybrid scoring router, enrichment_status values (read directly)
- `backend/app/services/hybrid_scorer.py` -- Aggregation logic, to_criterion_result (read directly)
- `web/src/app/(dashboard)/analysis/[listingId]/page.tsx` -- Current analysis page structure (read directly)
- `web/src/components/analysis/CategoryBreakdown.tsx` -- Current v1 category rendering (read directly)
- `web/src/components/analysis/ChecklistSection.tsx` -- Current v1 checklist rendering (read directly)
- `extension/src/types/scoring.ts` -- Current extension ScoreResponse interface (read directly)
- `extension/src/entrypoints/content/components/ScoreBadge.tsx` -- Current badge rendering (read directly)
- `extension/src/entrypoints/content/App.tsx` -- Content script badge injection flow (read directly)
- `supabase/functions/score-proxy/index.ts` -- Edge function cache + proxy logic (read directly)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` -- FE-01 through FE-05 requirements (read directly)
- `.planning/STATE.md` -- Phase 31 architectural decisions (read directly)

### Tertiary (LOW confidence)
- CriterionResult serialization in FastAPI response vs DB storage (needs verification, see Open Question 1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- existing component patterns well-understood from reading all source files
- Pitfalls: HIGH -- identified from direct code analysis (CamelCase aliasing, null fulfillment, empty arrays, weight scale mismatch)
- Validation: HIGH -- existing test infrastructure with vitest in both projects

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- all dependencies are pinned)
