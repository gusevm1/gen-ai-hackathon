# Phase 40: Page Redesigns - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Targeted visual upgrades to four areas: profiles list cards, AI chat page, analyses list cards, and settings page. No new pages, no backend schema changes, no new features. This phase is entirely about making existing pages more scannable, context-clear, and journey-complete.

</domain>

<decisions>
## Implementation Decisions

### Profile Cards (PG-01, PG-02)
- Add a last-used date row below the existing summary line — e.g. "Last used Apr 1" in muted text
- **Skip analysis count** — just last-used date, keep cards lean
- Active profile gets `ring-2 ring-primary` highlighted border — no pin indicator, no background tint
- Remove the star icon approach (already exists) in favor of the ring border as the primary active signal
- Data source for last-used: `updated_at` on the profiles table (closest proxy), or query most recent analysis `created_at` per profile

### AI Chat Context Heading (PG-03)
- Show a context heading + subtitle **only on the empty state** (before first message) — disappears once conversation starts
- Heading: **"Create a Profile"**
- Subtitle: **"Answer a few questions and AI will build your search profile."**
- This is the splash/welcome state pattern (like ChatGPT) — not a persistent header

### Chat → Summary Card Transition (PG-04)
- Fade out chat messages, fade in PreferenceSummaryCard
- Use existing **FadeIn** component (~300ms) — consistent with DS-02 motion patterns
- No slide, no dramatic animation — clean crossfade

### Analysis Cards (PG-05, PG-06)
- Add a **`border-l-4`** left-edge accent bar in the tier color (teal/green/amber/red)
- Layout becomes **two-column**: left column = large score number + tier label; right column = listing title + address + date
- **Remove** the existing small colored pill badge (top-right) entirely — the new layout replaces it
- Tier colors follow Phase 37 standard: excellent=teal-500, good=green-500, fair=amber-500, poor=red-500

### Settings — Download Extension (PG-07)
- **Already complete** — Settings page has a "Download Extension" section with heading, subtitle, and button linking to `/download`
- No changes needed — PG-07 is satisfied

### Claude's Discretion
- Exact muted text styling for the last-used date on profile cards
- Whether `last_used` derives from `updated_at` (profiles) or most recent analysis `created_at` (more accurate but requires a JOIN)
- Score number size (e.g. `text-3xl font-bold`) and tier label size/weight in the two-column layout
- Exact fade timing values (~300ms is a guideline)
- Whether to use Framer Motion `AnimatePresence` for the chat→summary swap or a CSS opacity transition

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FadeIn` (`web/src/components/motion/FadeIn.tsx`): Supports `animate` prop (added Phase 37) — use for chat→summary fade transition
- `StaggerGroup`/`StaggerItem`: Already used on profiles list — stagger is already in place
- `TIER_COLORS` / `getTierColor()` (`web/src/components/analysis/ScoreHeader.tsx`): Single source of truth for tier colors (teal/green/amber/red) — use for the left-edge bar
- `profile-card.tsx` (`web/src/components/profiles/profile-card.tsx`): Target file for last-used date row and active ring border
- `AnalysesGrid.tsx` (`web/src/components/analyses/AnalysesGrid.tsx`): Target file for analysis card layout redesign
- `chat-page.tsx` (`web/src/components/chat/chat-page.tsx`): Target file for context heading + transition animation
- `ring-2 ring-primary/20` hover pattern: Already used on analysis cards — upgrade active profile to `ring-2 ring-primary` (no opacity)

### Established Patterns
- `hover:-translate-y-1 hover:shadow-lg transition-all` — card hover lift (Phase 37)
- `bg-primary` / `hover:bg-primary/90` — brand button token (Phase 37)
- `text-muted-foreground text-xs` — muted secondary text pattern
- `border-l-4` — standard Tailwind left border; no existing usage in card components yet (new pattern for this phase)
- Framer Motion: `FadeIn` with `animate` prop for mount-triggered transitions; `AnimatePresence` for conditional render swaps

### Integration Points
- Profiles page (`web/src/app/(dashboard)/profiles/page.tsx`): Fetches profiles server-side — may need to also fetch last-used date per profile (JOIN with analyses table or use `updated_at`)
- Analyses page (`web/src/app/(dashboard)/analyses/page.tsx`) → `AnalysesGrid.tsx`: Card layout change lives here
- Chat page (`web/src/components/chat/chat-page.tsx`): Phase state ('chatting' | 'summarizing') already exists — add empty-state heading before first message, add FadeIn on phase swap
- Settings page (`web/src/app/(dashboard)/settings/page.tsx`): No changes needed

</code_context>

<specifics>
## Specific Ideas

- Profile card last-used row should feel like metadata, not primary content — `text-xs text-muted-foreground` treatment
- Analysis card two-column: score left, info right — score should be immediately readable across a scanned list (the "glance test")
- Chat splash state: disappears naturally when the user types their first message — no explicit dismiss needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-page-redesigns*
*Context gathered: 2026-04-01*
