# Phase 39: Critical Handoffs - Research

**Researched:** 2026-04-01
**Domain:** Next.js UI modifications (sticky bar, progress indicator, empty state CTAs, conditional rendering)
**Confidence:** HIGH

## Summary

Phase 39 modifies two existing pages -- the profile edit page and the analyses page -- to improve user handoff flows. All changes are frontend-only within the Next.js web app. The profile edit page needs a sticky bottom bar with a save button that transforms into "Save & Open in Flatfox" after first save, plus a section progress indicator. The analyses page needs an enhanced empty state with CTAs and conditional filter bar rendering.

The codebase already contains all the building blocks: `OpenInFlatfoxButton` with `buildFlatfoxUrlWithGeocode()` for Flatfox URL construction, `PreferencesForm` with accordion sections and save handling, `AnalysesFilterBar` with existing conditional rendering, and the `buttonVariants()` pattern for anchor-as-button styling. No new libraries are needed.

**Primary recommendation:** Modify existing components in-place. Extract a `StickyBottomBar` wrapper for the profile edit page. Reuse `buildFlatfoxUrlWithGeocode` directly rather than composing through `OpenInFlatfoxButton` since the sticky bar needs custom save-then-open behavior.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Save button transforms into "Save & Open in Flatfox" after first successful save
- Button lives in a sticky bottom bar -- always visible regardless of scroll position
- On click: saves current form state first, then opens Flatfox in a new tab (uses existing OpenInFlatfoxButton geocoding/URL-building logic)
- Remove the existing inline OpenInFlatfoxButton card variant below the accordion -- sticky bar replaces it entirely
- Before first save, button shows standard "Save" text

### Claude's Discretion
- Form progress indicator design and placement (HND-02)
- Analyses empty state layout and copy (HND-03)
- Filter bar conditional logic (HND-04)
- Sticky bar styling (background, shadow, padding)
- Transition animation when save button transforms to CTA
- Loading state during save-then-open-Flatfox flow

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HND-01 | After saving preferences on profile edit page, user sees full-width primary "Save & Open in Flatfox" button | Sticky bottom bar pattern, `buildFlatfoxUrlWithGeocode` reuse, save-then-open flow in PreferencesForm |
| HND-02 | Profile edit page shows section progress indicator (e.g. "Step 2 of 5 -- Budget") | 6 accordion sections identified, progress bar pattern, section name mapping |
| HND-03 | Analyses page empty state shows "Open Flatfox" primary CTA and "Download extension" secondary link | Existing empty state markup in analyses/page.tsx, buttonVariants pattern, extension download path |
| HND-04 | Analyses page filter bar hidden when 0 analyses | AnalysesFilterBar already has conditional return null pattern; extend with analysisCount prop |
</phase_requirements>

## Standard Stack

### Core (already installed, no additions needed)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Next.js (App Router) | Page routing, server components | Project foundation |
| react-hook-form | Form state in PreferencesForm | Already manages save/submit |
| @base-ui/react | Button primitive | Project's UI library |
| class-variance-authority | buttonVariants() | Established pattern for styled buttons |
| lucide-react | Icons (ExternalLink, Loader2, FileSearch, Download) | Already used throughout |
| Tailwind CSS | Styling incl. sticky positioning | Project standard |
| Framer Motion | Optional entrance animation for progress indicator | Already installed, used in Phase 37 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `sticky` | Framer Motion `AnimatePresence` for bar | Overkill -- CSS sticky is simpler and sufficient |
| Custom progress component | Third-party stepper lib | Unnecessary dependency for a simple text indicator |

## Architecture Patterns

### Files to Modify
```
web/src/
  components/preferences/
    preferences-form.tsx          # Major: sticky bar, save-then-open, progress indicator
  app/(dashboard)/
    analyses/page.tsx             # Moderate: empty state CTAs, conditional filter bar
  components/analyses/
    analyses-filter-bar.tsx       # Minor: add analysisCount prop, conditional render
  lib/translations.ts            # Minor: new translation keys
```

### Pattern 1: Sticky Bottom Bar
**What:** A `div` with `sticky bottom-0` positioning containing the save/CTA button
**When to use:** Profile edit page form footer
**Implementation:**
```typescript
// Sticky bar at the bottom of the form
<div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 -mx-4 mt-6">
  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
    {hasSaved ? (
      <>Save & Open in Flatfox <ExternalLink className="ml-2 size-4" /></>
    ) : (
      isSubmitting ? 'Saving...' : 'Save Preferences'
    )}
  </Button>
</div>
```
**Key detail:** The `sticky bottom-0` keeps it pinned to viewport bottom while still being within the form's DOM flow (needed for `type="submit"` to work). The `bg-background/95 backdrop-blur` gives it a frosted glass effect that doesn't feel like a disruptive overlay.

### Pattern 2: Save-Then-Open Flow
**What:** After first save, button click saves form THEN opens Flatfox in new tab
**Implementation approach:**
```typescript
const [hasSaved, setHasSaved] = useState(false)

async function handleSubmit(data: Preferences) {
  try {
    await onSave(dataWithLang)
    setHasSaved(true)
    setSaveMessage({ type: 'success', text: t(language, 'pref_saved') })
    // ... existing onboarding logic
  } catch (error) { /* ... */ }
}

// For the combined save+open action after first save:
async function handleSaveAndOpen(data: Preferences) {
  try {
    await onSave(dataWithLang)
    const url = await buildFlatfoxUrlWithGeocode(preferences, language)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    const url = buildFlatfoxUrl(preferences, language)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
```
**Key insight:** The `hasSaved` state determines button behavior. After first save, every subsequent submit both saves AND opens Flatfox. The fallback URL pattern from `OpenInFlatfoxButton` (geocode fails -> plain URL) must be preserved.

### Pattern 3: Section Progress Indicator
**What:** A text line above the accordion showing "Step X of 6 -- Section Name"
**Recommendation:** Track which accordion sections are open, show the first open section as current step. Since all sections default to open, a simpler approach is a static overview bar showing 6 dots/segments.

**Preferred approach:** A compact progress bar above the accordion:
```typescript
const SECTIONS = [
  { value: 'location', label: 'Location & Type' },
  { value: 'budget', label: 'Budget' },
  { value: 'size', label: 'Size & Rooms' },
  { value: 'features', label: 'Features' },
  { value: 'dynamic', label: 'Custom Criteria' },
  { value: 'importance', label: 'What Matters' },
]

// Render: "Step 2 of 6 -- Budget" with 6 segment progress bar
```
**Key decision:** Since accordion sections are all expanded by default and users can fill in any order, the progress indicator should track which sections have been touched/filled rather than which is currently "active." A simpler approach: show the accordion section number in each AccordionTrigger label.

### Pattern 4: Analyses Empty State with CTAs
**What:** Replace plain text empty state with actionable CTAs
**Implementation:**
```typescript
// In analyses/page.tsx empty state block
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
    <FileSearch className="h-7 w-7 text-muted-foreground" />
  </div>
  <h2 className="text-lg font-semibold mb-2">{t(lang, 'analyses_empty_title')}</h2>
  <p className="text-sm text-muted-foreground max-w-sm mb-6">
    {t(lang, 'analyses_empty_desc')}
  </p>
  <div className="flex flex-col sm:flex-row gap-3">
    <a href="https://flatfox.ch/en/search/"
       target="_blank" rel="noopener noreferrer"
       className={buttonVariants({ variant: 'default', size: 'lg' })}>
      Open Flatfox <ExternalLink className="ml-2 size-4" />
    </a>
    <a href="/download"
       className={buttonVariants({ variant: 'outline', size: 'lg' })}>
      <Download className="mr-2 size-4" /> Download Extension
    </a>
  </div>
</div>
```
**Key detail:** Use `buttonVariants()` for anchor-as-button (established in Phase 36). The Flatfox CTA is primary (`default`), download is secondary (`outline`). The analyses page is a server component so we use plain anchors, not client-side Button.

### Pattern 5: Conditional Filter Bar
**What:** Pass analysis count to AnalysesFilterBar, return null when 0
**Implementation:**
```typescript
// In analyses-filter-bar.tsx, add analysisCount prop
interface Props {
  profiles: { id: string; name: string }[]
  currentProfile: string
  currentSort: string
  lang: Language
  analysisCount: number  // NEW
}

export function AnalysesFilterBar({ profiles, currentProfile, currentSort, lang, analysisCount }: Props) {
  // ...
  if (profiles.length === 0 || analysisCount === 0) return null
  // ...
}
```

### Anti-Patterns to Avoid
- **Wrapping the entire page in a client component** for the sticky bar: Keep the profile edit page as server component, PreferencesForm is already client
- **Using position: fixed** for the sticky bar: Fixed removes from flow and needs manual width matching. Sticky stays in flow and is correct here
- **Creating a new OpenInFlatfox component** for the sticky bar: Reuse the URL-building functions directly instead of composing through the existing component

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flatfox URL construction | Custom URL builder | `buildFlatfoxUrlWithGeocode` from `@/lib/flatfox-url` | Already handles geocoding, fallback, locale, all params |
| Button styling for anchors | Custom anchor styles | `buttonVariants()` from `@/components/ui/button` | Established Phase 36 pattern, maintains design consistency |
| Sticky positioning | Custom scroll listener + fixed positioning | CSS `sticky bottom-0` | Native CSS, no JS overhead, stays in document flow |

## Common Pitfalls

### Pitfall 1: Form Submit vs Manual Click Confusion
**What goes wrong:** The sticky bar button must serve dual purpose -- form submit (save) before first save, and save+open after. If you use two separate buttons, you lose the form submit integration.
**How to avoid:** Keep single `type="submit"` button. In the `handleSubmit` function, check `hasSaved` state -- if true, also open Flatfox after successful save. This way the form validation always runs.

### Pitfall 2: Sticky Bar Overlapping Content
**What goes wrong:** `sticky bottom-0` can overlap the last form section if padding isn't accounted for.
**How to avoid:** Add `pb-20` (or similar) to the form container so there's scroll room below the last accordion section. The sticky bar should have its own background to visually separate from content.

### Pitfall 3: Stale Form Data for Flatfox URL
**What goes wrong:** The Flatfox URL is built from `form.watch()` values. If user changes form fields after save but before clicking save-and-open, the URL should reflect the NEW unsaved values (which will be saved first).
**How to avoid:** Build the Flatfox URL from `form.getValues()` at click time, not from a stale state snapshot.

### Pitfall 4: Server Component Anchor Links
**What goes wrong:** Using `<Button>` (client component) in the analyses page empty state requires wrapping in client boundary.
**How to avoid:** Use `<a>` tags with `buttonVariants()` className -- this works in server components and looks identical.

### Pitfall 5: Translation Key Hardcoding Pattern
**What goes wrong:** Previous phases (38-02, 38-03) established that hardcoded English strings work better for test compatibility since vitest mock returns key names.
**How to avoid:** Follow the Phase 38 precedent -- hardcode English strings in JSX for testability, still add translation keys to translations.ts for future i18n.

### Pitfall 6: Removing OpenInFlatfoxButton from Header
**What goes wrong:** The profile edit page has TWO OpenInFlatfoxButton instances -- one in the page header (variant="link") and one in PreferencesForm. CONTEXT.md says remove the inline one below the accordion. The header one should also be evaluated for removal since the sticky bar replaces it.
**How to avoid:** Remove both: the `<OpenInFlatfoxButton variant="link">` from the page header and the inline instance from PreferencesForm. The sticky bar is the single CTA.

## Code Examples

### Current PreferencesForm Button Area (to be replaced)
```typescript
// Source: web/src/components/preferences/preferences-form.tsx lines 136-178
// This entire block gets replaced by the sticky bottom bar
<div className="flex flex-wrap items-center gap-4">
  <Button id="save-preferences-btn" type="submit" disabled={form.formState.isSubmitting}>
    {form.formState.isSubmitting ? t(language, 'pref_saving') : t(language, 'pref_save')}
  </Button>
  <OpenInFlatfoxButton ... />
  {saveMessage && <p ...>{saveMessage.text}</p>}
</div>
```

### Current Analyses Empty State (to be enhanced)
```typescript
// Source: web/src/app/(dashboard)/analyses/page.tsx lines 65-75
// Add CTA buttons below the description paragraph
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
    <FileSearch className="h-7 w-7 text-muted-foreground" />
  </div>
  <h2 ...>{t(lang, 'analyses_empty_title')}</h2>
  <p ...>{t(lang, 'analyses_empty_desc')}</p>
  {/* ADD: CTA buttons here */}
</div>
```

### Accordion Section Names (for progress indicator)
```typescript
// Source: web/src/components/preferences/preferences-form.tsx
// 6 sections with these accordion values and translated trigger labels:
// 1. "location" -> t(language, 'pref_location_type')
// 2. "budget"   -> t(language, 'pref_budget')
// 3. "size"     -> t(language, 'pref_size_rooms')
// 4. "features" -> t(language, 'pref_features_availability')
// 5. "dynamic"  -> t(language, 'pref_custom_criteria')
// 6. "importance" -> t(language, 'pref_what_matters')
```

### Extension Download Path
```typescript
// Source: web/src/app/(dashboard)/download/page.tsx line 70
// Extension download: <a href="/homematch-extension.zip" download="homematch-extension.zip">
// For analyses empty state "Download extension" link, use href="/download" to go to download page
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline OpenInFlatfoxButton next to save | Sticky bottom bar with combined save+open | Phase 39 | Single clear CTA always visible |
| No progress indicator on form | Section progress indicator | Phase 39 | User knows where they are |
| Dead-end empty state on analyses | Actionable CTAs on empty state | Phase 39 | Users guided to next action |
| Filter bar always rendered | Filter bar hidden when 0 analyses | Phase 39 | Cleaner empty state |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react (jsdom) |
| Config file | `web/vitest.config.ts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HND-01 | Sticky bar shows "Save & Open in Flatfox" after save | unit (render + click) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | No - Wave 0 |
| HND-02 | Progress indicator shows "Step X of 6 -- Section" | unit (render) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | No - Wave 0 |
| HND-03 | Empty state shows Flatfox CTA + Download link | unit (render) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | No - Wave 0 |
| HND-04 | Filter bar hidden when 0 analyses | unit (render) | `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run src/__tests__/critical-handoffs.test.tsx -x`
- **Per wave merge:** `cd web && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/critical-handoffs.test.tsx` -- covers HND-01 through HND-04
- [ ] No new framework install needed -- vitest + testing-library already configured

## Open Questions

1. **Progress indicator: track user progress or show static overview?**
   - What we know: The accordion opens all 6 sections by default. Users can fill sections in any order.
   - What's unclear: Whether to track "completed" sections (complex -- needs field validation per section) or show a simpler static section counter.
   - Recommendation: Show numbered section labels in each AccordionTrigger (e.g. "1/6 -- Location & Type") plus a thin progress bar at the top. This avoids complex completion tracking while giving the user orientation. Alternatively, a simple "6 sections" indicator with visual segments.

2. **Should the header OpenInFlatfoxButton also be removed?**
   - What we know: CONTEXT.md says "Remove the existing inline OpenInFlatfoxButton card variant below the accordion." The profile edit page also has a link-variant in the header.
   - What's unclear: Whether the header link should stay as a quick-access or be removed since the sticky bar replaces it.
   - Recommendation: Remove it -- the sticky bar is always visible so the header link is redundant and could confuse users about which to click.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed in CONTEXT.md
- `web/src/components/preferences/preferences-form.tsx` -- current form structure, save handling, button placement
- `web/src/components/profiles/open-in-flatfox-button.tsx` -- URL building logic to reuse
- `web/src/app/(dashboard)/analyses/page.tsx` -- current empty state, filter bar rendering
- `web/src/components/analyses/analyses-filter-bar.tsx` -- current conditional logic
- `web/src/components/ui/button.tsx` -- buttonVariants() export for anchor styling
- `web/src/lib/flatfox-url.ts` -- buildFlatfoxUrl and buildFlatfoxUrlWithGeocode functions
- `web/src/lib/translations.ts` -- existing translation keys

### Secondary (MEDIUM confidence)
- CSS `sticky` positioning behavior -- well-established browser feature, widely supported

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing code inspected
- Architecture: HIGH -- modifications to existing components with clear patterns
- Pitfalls: HIGH -- identified from direct code analysis of current implementation

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no external dependencies changing)
