# Phase 39: Critical Handoffs - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The profile edit page gives users a clear, always-visible path to Flatfox after saving and shows them where they are in a multi-step form; the analyses page guides users to take action when empty instead of showing a dead end. No new pages, no backend changes — only modifications to existing profile edit and analyses pages.

</domain>

<decisions>
## Implementation Decisions

### Post-save Flatfox CTA (HND-01)
- Save button transforms into "Save & Open in Flatfox →" after first successful save
- Button lives in a sticky bottom bar — always visible regardless of scroll position
- On click: saves current form state first, then opens Flatfox in a new tab (uses existing `OpenInFlatfoxButton` geocoding/URL-building logic)
- Remove the existing inline `OpenInFlatfoxButton` card variant below the accordion — sticky bar replaces it entirely
- Before first save, button shows standard "Save" text

### Form Progress Indicator (HND-02)
- Claude's Discretion — user did not discuss this area
- Requirements specify: section progress indicator (e.g. "Step 2 of 5 — Budget")
- The form has 6 accordion sections: LocationType, Budget, SizeRooms, Features, DynamicFields, Importance

### Analyses Empty State (HND-03)
- Claude's Discretion — user did not discuss this area
- Requirements specify: primary "Open Flatfox →" CTA and secondary "Download extension" link when 0 analyses
- Current empty state has icon + title + description text but no CTAs

### Analyses Filter Bar (HND-04)
- Claude's Discretion — user did not discuss this area
- Requirements specify: filter bar hidden when 0 analyses
- Current `AnalysesFilterBar` already returns `null` when no profiles exist, but does NOT check analysis count

### Claude's Discretion
- Form progress indicator design and placement (HND-02)
- Analyses empty state layout and copy (HND-03)
- Filter bar conditional logic (HND-04)
- Sticky bar styling (background, shadow, padding)
- Transition animation when save button transforms to CTA
- Loading state during save-then-open-Flatfox flow

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OpenInFlatfoxButton` (`web/src/components/profiles/open-in-flatfox-button.tsx`): Two variants (`card`/`link`), async `buildFlatfoxUrlWithGeocode()` with fallback, loading spinner, `onBeforeOpen` callback — reuse URL-building logic for the sticky bar CTA
- `PreferencesForm` (`web/src/components/preferences/preferences-form.tsx`): Accordion-based with 6 sections, has save button with loading state — modify to support sticky bar and button transformation
- `AnalysesFilterBar` (`web/src/components/analyses/analyses-filter-bar.tsx`): Already conditionally hides when no profiles — extend to also hide when 0 analyses
- Empty state pattern in analyses page: centered icon + heading + description — extend with CTA buttons

### Established Patterns
- Sticky bottom bar: not yet used in this app — new pattern for Phase 39
- Button variants: `<Button>` primary, `<Button variant="outline">` secondary (base-ui)
- `buttonVariants()` for anchor-as-button pattern (established in Phase 36)
- Translations: all UI text uses `t()` from translations context (EN/DE) — but Phase 38 established precedent of hardcoding English for test compatibility
- Onboarding step text format: "Step X of 9" (from OnboardingProvider)

### Integration Points
- Profile edit page (`web/src/app/(dashboard)/profiles/[profileId]/page.tsx`): Server component rendering `PreferencesForm`
- Analyses page (`web/src/app/(dashboard)/analyses/page.tsx`): Server component with inline empty state
- `AnalysesGrid` (`web/src/components/analyses/AnalysesGrid.tsx`): Client component with StaggerGroup animation
- Translations (`web/src/lib/translations.ts`): Add keys for new CTA text, progress indicator labels

</code_context>

<specifics>
## Specific Ideas

- The sticky bar should feel like a natural part of the form — not a disruptive overlay
- "Save & Open in Flatfox →" transformation should make it obvious the save succeeded and the next step is to go to Flatfox
- Analyses empty state should guide the user toward action, not feel like a dead end

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-critical-handoffs*
*Context gathered: 2026-04-01*
