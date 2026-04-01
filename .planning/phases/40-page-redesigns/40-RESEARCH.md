# Phase 40: Page Redesigns - Research

**Researched:** 2026-04-01
**Domain:** Next.js / React component UI — Tailwind CSS, Framer Motion, Supabase data
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Profile Cards (PG-01, PG-02)**
- Add a last-used date row below the existing summary line — e.g. "Last used Apr 1" in muted text
- Skip analysis count — just last-used date, keep cards lean
- Active profile gets `ring-2 ring-primary` highlighted border — no pin indicator, no background tint
- Remove the star icon approach (already exists) in favor of the ring border as the primary active signal
- Data source for last-used: `updated_at` on the profiles table (closest proxy), or query most recent analysis `created_at` per profile

**AI Chat Context Heading (PG-03)**
- Show a context heading + subtitle only on the empty state (before first message) — disappears once conversation starts
- Heading: "Create a Profile"
- Subtitle: "Answer a few questions and AI will build your search profile."
- Splash/welcome state pattern (like ChatGPT) — not a persistent header

**Chat to Summary Card Transition (PG-04)**
- Fade out chat messages, fade in PreferenceSummaryCard
- Use existing FadeIn component (~300ms) — consistent with DS-02 motion patterns
- No slide, no dramatic animation — clean crossfade

**Analysis Cards (PG-05, PG-06)**
- Add `border-l-4` left-edge accent bar in the tier color (teal/green/amber/red)
- Layout becomes two-column: left column = large score number + tier label; right column = listing title + address + date
- Remove the existing small colored pill badge (top-right) entirely — the new layout replaces it
- Tier colors follow Phase 37 standard: excellent=teal-500, good=green-500, fair=amber-500, poor=red-500

**Settings — Download Extension (PG-07)**
- Already complete — Settings page has a "Download Extension" section with heading, subtitle, and button linking to `/download`
- No changes needed — PG-07 is satisfied

### Claude's Discretion
- Exact muted text styling for the last-used date on profile cards
- Whether `last_used` derives from `updated_at` (profiles) or most recent analysis `created_at` (more accurate but requires a JOIN)
- Score number size (e.g. `text-3xl font-bold`) and tier label size/weight in the two-column layout
- Exact fade timing values (~300ms is a guideline)
- Whether to use Framer Motion `AnimatePresence` for the chat→summary swap or a CSS opacity transition

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PG-01 | Profile cards in the profiles list show the active profile badge, total analysis count, and last-used date | `updated_at` exists on the profiles table (schema verified). Last-used date can be read directly from `updated_at`; note that the locked decision skips analysis count — last-used only. `profiles/page.tsx` must add `updated_at` to its select; `ProfileData` interface and `ProfileCard` props must be extended. |
| PG-02 | Active profile is visually prominent in the profiles list (highlighted border or pin indicator) | Card currently uses `hover:ring-2 hover:ring-primary/10`. Active state needs `ring-2 ring-primary` (no hover, no opacity) applied when `profile.is_default === true`. Star icon removal is also part of this change. |
| PG-03 | AI chat page shows a context heading explaining what the conversation does | `chat-page.tsx` has a `messages` state that starts as `[]`. The splash state is `messages.length === 0 && !isTyping` — render heading + subtitle then. The greeting fetch triggers `isTyping=true` on mount, so the splash can appear briefly; use `messages.length === 0 && !greetingFetched.current` or conditionally render based on `messages.length === 0` after the greeting arrives. |
| PG-04 | Transition from chat to summary card is animated — not an abrupt swap | `FadeIn` component supports `animate` prop (mount-triggered mode). `phase` state transitions from `'chatting'` to `'summarizing'`. Wrap `PreferenceSummaryCard` in `<FadeIn animate="visible">`. For the outgoing chat to also fade, wrap the messages list in a conditional FadeIn or use `AnimatePresence`. `fadeInVariants` already defined in `lib/motion.ts` (pure opacity, no y translation). |
| PG-05 | Analysis cards show a left-edge colored tier bar (teal/green/amber/red) for instant scanability | `AnalysesGrid.tsx` already has `TIER_STYLES` with the correct `bg-*` values. Apply `border-l-4 border-[color]` to the `<Card>`. The `bg-*` from `TIER_STYLES` is for the old pill badge — for the border bar, extract just the color token (e.g. `border-teal-500`). A separate `border` property in `TIER_STYLES` is the cleanest approach. |
| PG-06 | Analysis card score number is larger and left-aligned (not a small pill top-right) | Current layout: `flex items-start justify-between` with score as a top-right pill `<span>`. New layout: two-column `flex gap-4` where left column is `text-3xl font-bold` score + tier label; right column is title/address/date stack. Remove the pill entirely. |
| PG-07 | Settings page has a "Download Extension" section with the download button and install link | Already satisfied. `settings/page.tsx` (line 49–59) has the "Download Extension" `<h2>`, subtitle `<p>`, and `<Link href="/download">` with Download icon. No work needed. |
</phase_requirements>

---

## Summary

Phase 40 is a targeted visual polish pass over four areas of the web app: profile cards, AI chat page, analyses cards, and settings. All changes are purely front-end — no backend schema migrations, no new API routes, no new pages. The stack (Next.js, Tailwind CSS, Framer Motion, Supabase JS) is already in place and stable from Phases 35–39.

The profile card changes (PG-01, PG-02) require plumbing `updated_at` through the data path (server query → `ProfileData` interface → `ProfileCard` props) and replacing the star icon active signal with a CSS ring. The analyses card redesign (PG-05, PG-06) is a layout transformation inside `AnalysesGrid.tsx` — the TIER_STYLES map needs a `border` property added and the card interior restructured to a two-column flex layout. The chat page work (PG-03, PG-04) adds a splash state heading to an empty messages array and wraps the summary card in `FadeIn`. PG-07 is already complete — settings page has the Download Extension section.

The primary risk is the chat-page test suite: existing tests in `chat-page.test.tsx` look for specific text strings and interaction patterns. The context heading "Create a Profile" will render before the first message, which may interfere with tests that check the idle state. Test updates must accompany PG-03 changes.

**Primary recommendation:** Implement in three plans — (1) profile card data + visual changes, (2) analyses card layout redesign, (3) chat splash state + FadeIn transition. PG-07 requires no plan.

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v3 (project standard) | Utility classes for ring, border-l-4, text sizing | Already used throughout; all target changes are Tailwind utilities |
| Framer Motion (motion/react) | v11+ (installed) | FadeIn/AnimatePresence for chat transition | FadeIn component already uses it; `animate` prop already extended in Phase 37 |
| Supabase JS | v2 (installed) | Fetching `updated_at` for last-used date | Already used in profiles/page.tsx server query |
| React (Next.js 14 App Router) | Current (installed) | Component rendering | All target files are existing React components |

**No new installations required.**

---

## Architecture Patterns

### Data Flow for Last-Used Date (PG-01)

The profiles page is a **Next.js server component** (`web/src/app/(dashboard)/profiles/page.tsx`). It fetches profiles from Supabase and passes them as a prop to `ProfileList`, which passes individual profiles to `ProfileCard`.

Current query selects: `id, name, is_default, preferences`
Required change: Add `updated_at` to the select.

```
profiles/page.tsx (server)
  → ProfileList (client, manages actions)
    → ProfileCard (client, renders)
```

`ProfileData` interface (in `profile-card.tsx`) needs `updated_at: string` added. `ProfileList` is a pass-through — its `ProfileData[]` type picks this up automatically.

**Recommended approach:** Use `updated_at` directly (zero query complexity). The schema confirms `updated_at` has a `moddatetime` trigger so it auto-updates on any profile row change. For the "last used" semantic, `updated_at` is a close-enough proxy; the CONTEXT.md decision accepts this.

### Last-Used Date Formatting

Format the `updated_at` ISO string to "Last used Apr 1" style. Match the existing `formatDate` helper pattern from `AnalysesGrid.tsx` but shorter:

```typescript
// In profile-card.tsx
function formatLastUsed(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
// Usage: `Last used ${formatLastUsed(profile.updated_at)}`
```

Style with `text-xs text-muted-foreground` — matches the established secondary metadata pattern.

### Active Ring Pattern (PG-02)

Current hover pattern on profile cards:
```
hover:ring-2 hover:ring-primary/10
```

Active (is_default) state to add:
```
ring-2 ring-primary
```

Apply conditionally in the `<Card>` className. Remove the `<Star>` icon from `CardTitle`. The existing `Badge` with "Active" text in `CardFooter` can remain — it complements the ring visually (text label + border signal).

```typescript
<Card className={cn(
  "hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-primary/10 transition-all",
  profile.is_default && "ring-2 ring-primary"
)}>
```

Note: When `is_default` is true, both the static `ring-2 ring-primary` and the hover `ring-2 ring-primary/10` will apply on hover. The static ring wins (higher specificity from non-hover class). Use Tailwind's `cn` utility (already imported) for conditional class merging.

### Analysis Card Two-Column Layout (PG-05, PG-06)

Current card interior structure:
```
CardContent
  div.flex.items-start.justify-between
    div (title + address)
    span (score pill)     ← REMOVE
  span (tier label)
  div (profile + date footer)
```

New structure:
```
Card (border-l-4 in tier border color)
  CardContent
    div.flex.gap-4
      div.shrink-0.flex.flex-col.items-center (LEFT: score + tier label)
        span.text-3xl.font-bold   (score number)
        span.text-xs.capitalize    (tier label)
      div.flex-1.min-w-0 (RIGHT: title + address)
        span.text-sm.font-medium   (title)
        span.text-xs.muted         (address if different)
    div (profile + date footer — unchanged)
```

The left-edge bar uses a Tailwind `border-l-4` class with the tier color. `TIER_STYLES` in `AnalysesGrid.tsx` currently maps to `bg-*` classes. Add a `border` property:

```typescript
const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  excellent: { bg: 'bg-teal-500', text: 'text-white',      border: 'border-teal-500' },
  good:      { bg: 'bg-green-500', text: 'text-white',     border: 'border-green-500' },
  fair:      { bg: 'bg-amber-500', text: 'text-gray-900',  border: 'border-amber-500' },
  poor:      { bg: 'bg-red-500',   text: 'text-white',     border: 'border-red-500' },
}
```

Apply to `<Card className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:-translate-y-1 hover:shadow-lg h-full border-l-4 ${tierStyle.border}`}>`.

The score in the left column uses `text-3xl font-bold` with the tier text color: `<span className={`text-3xl font-bold leading-none ${tierStyle.text} ... `}>` — but `tierStyle.text` is `text-white` or `text-gray-900`, which is fine for readability against the card's white/dark background. Reconsider: the score is on the card background (not on a colored badge), so use `text-foreground` for the score number and `text-xs text-muted-foreground` for the tier label, letting the left bar carry the color.

### Chat Splash State Pattern (PG-03)

The splash heading renders when `messages.length === 0`. The greeting API fetch sets `isTyping = true` on mount but `messages` stays empty until the greeting arrives. The heading will be visible for the ~500ms greeting fetch duration. This is acceptable — it matches the ChatGPT pattern where the splash is visible before the AI responds.

Condition: `messages.length === 0` (regardless of `isTyping` state). The heading disappears naturally when `setMessages([greetingMessage])` fires.

```typescript
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4">
    <h2 className="text-2xl font-bold">Create a Profile</h2>
    <p className="text-muted-foreground max-w-sm text-sm">
      Answer a few questions and AI will build your search profile.
    </p>
  </div>
)}
```

No animation needed for the disappear — the heading is simply unmounted when the first message arrives (it unmounts instantly), which is clean.

### Chat to Summary Transition (PG-04)

Current code in `chat-page.tsx`: when `phase === 'summarizing'`, `PreferenceSummaryCard` is rendered unconditionally inside the messages scroll container (line 191–197). It appears abruptly — no animation.

Two options:

**Option A: FadeIn with animate prop (recommended)**
Wrap `PreferenceSummaryCard` in `<FadeIn animate="visible" variants={fadeInVariants}>`. When `phase` flips to `'summarizing'`, the component mounts and FadeIn animates it in with `fadeInVariants` (pure opacity, ~400ms per `duration.moderate`). This matches the DS-02 pattern.

```typescript
import { fadeInVariants } from '@/lib/motion'

{phase === 'summarizing' && extractedPreferences && (
  <FadeIn animate="visible" variants={fadeInVariants}>
    <PreferenceSummaryCard ... />
  </FadeIn>
)}
```

**Option B: AnimatePresence for exit animation on messages list**
Would require wrapping messages list in `AnimatePresence` and adding exit variants. More complex, not necessary given the locked decision for "clean crossfade."

Use Option A. The chat messages don't need an explicit fade-out — they scroll out of view as the summary card mounts at the bottom.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conditional CSS class merging | Manual string concatenation with ternaries | `cn()` from `@/lib/utils` | Already used throughout; handles Tailwind class conflicts cleanly |
| Tier color lookup | Inline color switch/if chains | `TIER_STYLES` map in `AnalysesGrid.tsx` / `getTierColor()` in `ScoreHeader.tsx` | Single source of truth for tier colors already established in Phase 37 |
| Date formatting | Custom date formatting functions | `toLocaleDateString()` with locale options | Already used in `AnalysesGrid.tsx` (formatDate); consistent pattern |
| Mount animation | CSS keyframe animation | `FadeIn` component with `animate` prop | Already extended for this use case in Phase 37; respects `useReducedMotion` |

---

## Common Pitfalls

### Pitfall 1: Tailwind ring class conflict (active + hover)
**What goes wrong:** When `ring-2 ring-primary` (active) and `hover:ring-2 hover:ring-primary/10` (hover) both apply, the hover state may visually "fight" the active ring on mouse-over.
**Why it happens:** CSS specificity — both classes have the same property. The last declared class wins, which is non-deterministic with Tailwind purging.
**How to avoid:** When `is_default` is true, omit the hover ring class entirely, or use `hover:ring-primary` (same color) so there's no visible change on hover for active cards.
**Warning signs:** Active card ring disappears or changes color on hover.

### Pitfall 2: ProfileData interface out of sync
**What goes wrong:** `profiles/page.tsx` adds `updated_at` to the Supabase select but `ProfileData` interface in `profile-card.tsx` doesn't include it — TypeScript errors or runtime `undefined`.
**Why it happens:** The interface is defined separately from the query; easy to miss.
**How to avoid:** Update `ProfileData` interface first, then the query and component together.

### Pitfall 3: Chat-page tests break on splash heading
**What goes wrong:** `chat-page.test.tsx` renders `ChatPage` and looks for specific elements. Adding "Create a Profile" heading to the empty state may trigger false positives or interfere with tests expecting a specific idle state.
**Why it happens:** The test currently checks for `screen.getByText("Start Creating Profile")` — a button. This is distinct from the heading, so the heading itself won't break existing tests. However, if tests assert on the total number of rendered headings or elements, it may fail.
**How to avoid:** Check test file assertions after adding the splash heading. The existing tests look for button text, placeholder text, and conversation content — they should be unaffected. Add a new test asserting the splash heading is present when `messages.length === 0`.

### Pitfall 4: border-l-4 and Card component border clash
**What goes wrong:** Shadcn `<Card>` already has a `border` class (1px all-around). Adding `border-l-4` may visually stack with the existing border on the left side, creating a thick left edge that looks doubled.
**Why it happens:** `border` applies to all 4 sides; `border-l-4` overrides just the left.
**How to avoid:** In Tailwind, `border-l-4` overrides `border-left` with `border-left-width: 4px`. The Card's `border` sets `border-width: 1px` globally; `border-l-4` overrides the left to 4px. The result is correct: 1px on right/top/bottom, 4px on left. Verify visually — no double border.

### Pitfall 5: FadeIn `variants` prop TypeScript type
**What goes wrong:** `FadeIn` has `variants?: typeof fadeUpVariants`. `fadeInVariants` does not have a `y` property, so passing it as `variants` may cause a TypeScript type mismatch.
**Why it happens:** The prop type is `typeof fadeUpVariants` which includes `y` offset properties.
**How to avoid:** The Phase 38 decision notes this exact issue: "TypeScript conflict with `typeof fadeUpVariants` (no `y` property in fadeInVariants)". The established solution is to use `FadeIn animate="visible"` without passing `variants` — the default `fadeUpVariants` still produce a clean fade-in (the y offset is subtle at 24px). Alternatively, cast with `variants={fadeInVariants as typeof fadeUpVariants}`.

---

## Code Examples

### Profile Card with Active Ring and Last-Used Date
```typescript
// profile-card.tsx — targeted changes only
// 1. Add updated_at to ProfileData interface
export interface ProfileData {
  id: string
  name: string
  is_default: boolean
  preferences: Record<string, unknown>
  updated_at: string  // ADD THIS
}

// 2. Active ring on Card
<Card className={cn(
  "hover:-translate-y-1 hover:shadow-lg transition-all",
  profile.is_default
    ? "ring-2 ring-primary"
    : "hover:ring-2 hover:ring-primary/10"
)}>

// 3. Remove Star from CardTitle, add last-used below CardDescription
<CardDescription>{summary}</CardDescription>
<p className="text-xs text-muted-foreground">
  Last used {formatLastUsed(profile.updated_at)}
</p>
```

### Analysis Card Two-Column Layout
```typescript
// AnalysesGrid.tsx — card interior restructure
// Border bar via border-l-4 + tier border color
<Card className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:-translate-y-1 hover:shadow-lg h-full border-l-4 ${tierStyle.border}`}>
  <CardContent className="flex flex-col gap-3">
    <div className="flex gap-4">
      {/* LEFT: Score + tier */}
      <div className="shrink-0 flex flex-col items-center justify-center min-w-[3rem]">
        <span className="text-3xl font-bold leading-none text-foreground">
          {analysis.score}
        </span>
        <span className="text-xs text-muted-foreground capitalize mt-0.5">
          {t(lang, tierKey)}
        </span>
      </div>
      {/* RIGHT: Title + address */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block truncate">
          {primaryTitle}
        </span>
        {secondaryAddress && (
          <span className="text-xs text-muted-foreground block truncate">
            {secondaryAddress}
          </span>
        )}
      </div>
    </div>
    {/* Footer: profile + date */}
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1 border-t border-border">
      ...
    </div>
  </CardContent>
</Card>
```

### Chat Splash Heading
```typescript
// chat-page.tsx — add above the messages map
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4 pb-8">
    <h2 className="text-2xl font-bold">Create a Profile</h2>
    <p className="text-muted-foreground max-w-sm text-sm">
      Answer a few questions and AI will build your search profile.
    </p>
  </div>
)}
```

### Chat to Summary Card FadeIn
```typescript
// chat-page.tsx — wrap PreferenceSummaryCard
import { FadeIn } from '@/components/motion/FadeIn'

{phase === 'summarizing' && extractedPreferences && (
  <FadeIn animate="visible">
    <PreferenceSummaryCard
      extractedPreferences={extractedPreferences}
      onProfileCreated={handleProfileCreated}
      onContinueChatting={handleContinueChatting}
    />
  </FadeIn>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Star icon as active profile signal | `ring-2 ring-primary` border ring | Phase 40 | Cleaner visual hierarchy; star icon removed |
| Small score pill (top-right) | Large left-aligned score in two-column layout | Phase 40 | Scan-first reading order; score is primary data |
| Abrupt chat→summary swap | FadeIn crossfade (~400ms) | Phase 40 | Transition feels intentional, not a flash |
| No context on chat page | Splash heading "Create a Profile" | Phase 40 | Removes blank/empty-feeling initial state |

---

## Open Questions

1. **Last-used date: `updated_at` vs. most recent analysis `created_at`**
   - What we know: `updated_at` is auto-maintained by trigger; most recent analysis `created_at` requires a JOIN or subquery on the analyses table.
   - What's unclear: Which is "more accurate" for user intent — profile edit time vs. last time they scored a listing.
   - Recommendation: Use `updated_at` (locked as acceptable in CONTEXT.md). A JOIN approach can be a future enhancement if users find the dates confusing.

2. **Score number color in two-column layout**
   - What we know: The tier `text-*` values (`text-white`, `text-gray-900`) are designed for colored backgrounds. On a card background, `text-white` would be invisible.
   - What's unclear: Whether to use the tier text color or `text-foreground` for the score number.
   - Recommendation: Use `text-foreground` for the score number — it reads on any card background. The left bar carries the tier color signal. The tier label below can use `text-muted-foreground` in a smaller size.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose src/__tests__/chat-page.test.tsx` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PG-01 | Profile card shows last-used date text | unit | `cd web && npx vitest run src/__tests__/profile-card.test.tsx` | Wave 0 — create |
| PG-02 | Active profile card has ring-2 ring-primary class | unit | `cd web && npx vitest run src/__tests__/profile-card.test.tsx` | Wave 0 — create |
| PG-03 | Chat page shows "Create a Profile" heading when messages empty | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx` | Partial (file exists, test needs adding) |
| PG-04 | PreferenceSummaryCard rendered inside FadeIn when phase=summarizing | unit | `cd web && npx vitest run src/__tests__/chat-page.test.tsx` | Partial (file exists, test needs adding) |
| PG-05 | Analysis card has border-l-4 and tier border color class | unit | `cd web && npx vitest run src/__tests__/analyses-grid.test.tsx` | Wave 0 — create |
| PG-06 | Analysis card score is text-3xl and pill badge is absent | unit | `cd web && npx vitest run src/__tests__/analyses-grid.test.tsx` | Wave 0 — create |
| PG-07 | Settings page has Download Extension heading and link | unit | Already passes (phase already complete) | Covered implicitly |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run src/__tests__/chat-page.test.tsx`
- **Per wave merge:** `cd web && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/profile-card.test.tsx` — covers PG-01, PG-02 (last-used date rendering, active ring class)
- [ ] `web/src/__tests__/analyses-grid.test.tsx` — covers PG-05, PG-06 (border-l-4 class, large score, no pill)
- [ ] Add new tests to existing `chat-page.test.tsx` — covers PG-03, PG-04 (splash heading, FadeIn wrapper)

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection of `web/src/components/profiles/profile-card.tsx` — current component structure, ProfileData interface, Star icon usage
- Direct file inspection of `web/src/components/analyses/AnalysesGrid.tsx` — current layout, TIER_STYLES map, pill badge implementation
- Direct file inspection of `web/src/components/chat/chat-page.tsx` — phase state machine, messages state, PreferenceSummaryCard render point
- Direct file inspection of `web/src/components/motion/FadeIn.tsx` — animate prop mode confirmed, variants TypeScript type
- Direct file inspection of `web/src/lib/motion.ts` — fadeInVariants confirmed (pure opacity, no y)
- Direct file inspection of `web/src/app/(dashboard)/profiles/page.tsx` — server component query, select fields (updated_at not yet selected)
- Direct file inspection of `web/src/app/(dashboard)/settings/page.tsx` — PG-07 already complete confirmed (lines 49–59)
- Direct file inspection of `supabase/migrations/002_profiles_schema.sql` — confirmed `updated_at timestamptz` column with moddatetime trigger on profiles table
- Direct file inspection of `web/src/__tests__/chat-page.test.tsx` — existing test assertions confirmed safe (no conflicts with splash heading text)
- Direct file inspection of `web/vitest.config.mts` — test framework and run commands

### Secondary (MEDIUM confidence)
- Tailwind CSS docs behavior for `border-l-4` overriding `border` base class — standard CSS specificity, well-documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, verified in package files
- Architecture: HIGH — all target files read directly; data flow verified against actual source
- Pitfalls: HIGH — TypeScript issue with FadeIn variants documented from Phase 38 STATE.md decision; ring conflict is Tailwind behavior; test impact assessed against actual test file

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack; Tailwind/Framer Motion APIs are not changing rapidly)
