# Phase 37: Design System Propagation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the codebase visually consistent across four specific axes: (1) no hardcoded brand colors — only CSS tokens, (2) unified tier colors everywhere, (3) Framer Motion entrance animations on dashboard pages, (4) standardized card hover lift effect. No new features or layout changes — this phase is entirely cosmetic/token propagation.

</domain>

<decisions>
## Implementation Decisions

### Tier Colors (DS-03)
- Full TIER_COLORS map in `ScoreHeader.tsx` (the single source of truth used by all card components):
  - **excellent**: `bg-teal-500` (Tailwind teal — actual blue-green, NOT brand primary which is rose/reddish)
  - **good**: `bg-green-500` (Tailwind green, replacing current `bg-blue-500`)
  - **fair**: `bg-amber-500` (unchanged)
  - **poor**: `bg-red-500` (replacing current `bg-gray-500`)
- Stay as Tailwind utility classes directly in the TIER_COLORS map — no new CSS tokens needed
- The `getTierColor()` function is the single source of truth; all consumers (`TopMatchCard`, `AnalysisSummaryCard`, `TopMatchSummaryCard`, analyses page) use it automatically

### rose → primary Token Cleanup (DS-01)
- **Token cleanup only — no visual change** for brand-colored elements
- `open-in-flatfox-button.tsx`: `bg-rose-600` → `bg-primary`, `hover:bg-rose-700` → `hover:bg-primary/90`
- `analysis/[listingId]/loading.tsx`: `bg-rose-500` → **`bg-green-500`** (exception: loading bar gets green like the extension, not the brand rose)
- After this change: zero hardcoded rose-* values remain in the codebase

### Card Hover Lift (DS-04)
- Effect: `hover:-translate-y-1 hover:shadow-lg transition-all` — CSS transitions only, no Framer Motion whileHover
- Cards that get the lift effect:
  - `TopMatchSummaryCard` (dashboard home)
  - `AnalysisSummaryCard` (dashboard home)
  - Profile cards on `/profiles` list
  - Analysis cards on `/analyses` list
  - `TopMatchCard` (full) on `/top-matches`
- Replace existing `hover:shadow-md` with `hover:-translate-y-1 hover:shadow-lg` + keep `transition-all duration-200`

### Animations (DS-02)
- **Trigger**: on-mount (`initial="hidden" animate="visible"`) — NOT `whileInView`. Dashboard pages are above-the-fold; whileInView fires immediately anyway but on-mount is semantically correct
- `FadeIn` component needs to support an `animate` prop (in addition to its current `whileInView` mode). Landing page continues using `whileInView`; dashboard pages use `animate="visible"`
- **Pages receiving animations**: dashboard home, profiles list, analyses list
- **Stagger on list items**:
  - Profiles list cards → `StaggerGroup` + `StaggerItem`
  - Analyses list cards → `StaggerGroup` + `StaggerItem`
- **Plain FadeIn with staggered delays** for dashboard home sections:
  - Active profile card, top matches row, recent analyses row → individual `FadeIn` with small delay increments

### Claude's Discretion
- Exact delay increments between dashboard home section FadeIns (0.05–0.15s range is appropriate)
- Whether to create a separate `FadeInMount` component or add an `animate` prop to existing `FadeIn`
- Border/ring adjustments on tier color chips (ring-* classes in TIER_COLORS may need updating alongside bg-*)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FadeIn` (`web/src/components/motion/FadeIn.tsx`): Currently whileInView — needs `animate` prop added for mount-triggered use on dashboard pages. `StaggerGroup`/`StaggerItem` are ready to use as-is.
- `@/lib/motion`: Full motion token library (`fadeUpVariants`, `staggerContainerVariants`, `staggerItemVariants`) — use these, don't inline easing/spring configs
- `getTierColor()` (`web/src/components/analysis/ScoreHeader.tsx:13`): Single source of truth — update the TIER_COLORS map here and all consumers update automatically

### Established Patterns
- Landing page uses `FadeIn` with `whileInView` and `StaggerGroup`/`StaggerItem` — dashboard pages adopt same components with mount trigger
- CSS transitions for hover states (`transition-all duration-200`) — established on current dashboard cards
- `bg-primary`/`hover:bg-primary/90` pattern used on CTA buttons — use same for rose → primary cleanup

### Integration Points
- `web/src/components/analysis/ScoreHeader.tsx`: TIER_COLORS map (lines 6-11) — update here
- `web/src/components/profiles/open-in-flatfox-button.tsx:78`: `bg-rose-600` hardcode
- `web/src/app/(dashboard)/analysis/[listingId]/loading.tsx:44`: `bg-rose-500` hardcode
- `web/src/components/dashboard/AnalysisSummaryCard.tsx:32`: current `hover:shadow-md` → add translate-y
- `web/src/components/dashboard/TopMatchSummaryCard.tsx:33`: same hover upgrade
- Dashboard pages to animate: `dashboard/page.tsx`, `profiles/page.tsx` (or its list component), `analyses/page.tsx`

</code_context>

<specifics>
## Specific Ideas

- Loading bar color: green (`bg-green-500`) to match the extension's visual language — NOT brand rose
- "excellent" tier: real Tailwind `teal-500` (blue-green), not the CSS `--color-teal` token (which confusingly resolves to the same rose/reddish as `--primary`)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-design-system-propagation*
*Context gathered: 2026-03-31*
