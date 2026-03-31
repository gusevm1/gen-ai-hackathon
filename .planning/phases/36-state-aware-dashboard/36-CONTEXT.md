# Phase 36: State-Aware Dashboard - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

The dashboard home page responds to user state. First-time users (0 profiles) see a 3-step product explainer with two profile creation paths. Returning users (1+ profiles) see their active profile, top matches, recent analyses, and a direct path to Flatfox. Profile creation, scoring, and the /top-matches detail page are out of scope — this phase only surfaces existing data on the dashboard.

</domain>

<decisions>
## Implementation Decisions

### New User Explainer
- Keep Phase 33 heading: "Welcome to HomeMatch"
- Subheading changes to: "Here's how it works"
- 3-step numbered list (vertical, not cards) explaining the product value journey:
  1. Create your profile — Tell us what you're looking for
  2. Browse on Flatfox — Visit listings like normal
  3. Get instant match scores — See how each listing fits you
- Steps appear above the existing ProfileCreationChooser (AI recommended + Manual secondary)
- ExtensionInstallBanner (Phase 35) renders above the explainer, at the very top

### Returning User Layout — Section Order
- Vertical stack, top to bottom:
  1. **Active profile card** — full-width, always above the fold
  2. **Top Matches section** — 3 compact summary cards in a horizontal row + "View all" link
  3. **Recent Analyses section** — 3 compact cards in a horizontal row + "View all" link

### Active Profile Card
- Shows: profile name, key criteria summary (e.g. "Zurich, 3+ rooms, <2500 CHF"), last-used date
- 3 action buttons: Switch (dropdown), + New (opens modal), Open Flatfox (primary CTA)
- Switch dropdown lists all profiles with checkmark on active — uses existing `setActiveProfile` server action pattern
- Switching profiles triggers full page reload via `revalidatePath('/dashboard')` — not client-side update

### Top Matches on Dashboard
- 3 compact summary cards in a horizontal row (not full TopMatchCards)
- Each card shows: rank badge, score circle, tier label, address/title
- No expandable details on dashboard — click navigates to /top-matches for full detail
- Empty state: muted card "No top matches yet — Score properties on Flatfox to see your best matches here" with Open Flatfox CTA
- "View all" link below the row navigates to /top-matches

### Recent Analyses
- 3 most recent analyses for the active profile
- Horizontal row of compact cards: score circle, tier, address
- "View all" link navigates to /analyses
- Empty state: handled by Phase 39 (HND-03) — for now, hide section if 0 analyses

### Profile Switching
- Dropdown inside the active profile card (not tabs, not separate section)
- Full page reload on switch — consistent with existing ProfileSwitcher pattern
- Top matches and analyses refresh automatically with new profile data

### New Profile from Dashboard
- "+ New" button opens a modal/dialog with the ProfileCreationChooser (AI vs Manual cards)
- Does NOT navigate away from dashboard — dismiss modal to cancel
- AI card → /ai-search, Manual card → CreateProfileDialog (existing)

### Claude's Discretion
- Exact criteria summary format in the profile card (which fields to show, truncation)
- Loading/skeleton states for top matches and analyses sections
- Responsive behavior on smaller screens (stack cards vertically if needed)
- Animation/transition details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProfileCreationChooser` (`web/src/components/profile-creation-chooser.tsx`): Two-card AI vs Manual chooser — reuse for both new user state and returning user "+ New" modal
- `ProfileSwitcher` (`web/src/components/profile-switcher.tsx`): Dropdown with `setActiveProfile()` server action + `useTransition` — adapt pattern for dashboard profile card
- `TopMatchCard` (`web/src/components/top-matches/TopMatchCard.tsx`): Full card with expand — NOT used on dashboard, but its data shape informs the compact summary card
- `BulletSummary` / `FulfillmentBreakdown` / `ScoreHeader` (`web/src/components/analysis/`): Analysis display components — ScoreHeader's score circle pattern reusable for compact cards
- `ExtensionInstallBanner` (`web/src/components/ExtensionInstallBanner.tsx`): Already rendered on dashboard — keep at top
- `CreateProfileDialog` (`web/src/components/profiles/create-profile-dialog.tsx`): Profile name input dialog — reuse inside the "+ New" modal flow

### Established Patterns
- Dashboard layout (`web/src/app/(dashboard)/layout.tsx`): Server component that fetches profiles + active profile, passes to client components
- Server actions for profile ops (`web/src/app/(dashboard)/profiles/actions.ts`): `setActiveProfile()`, `createProfile()` with `revalidatePath`
- Top matches API route (`web/src/app/api/top-matches/route.ts`): POST with auth → backend `/score/top-matches` — fetches active profile via `.eq("is_default", true)`
- Analyses fetching: `supabase.from('analyses').select(...)` with profile filter, ordered by `created_at desc`
- All dashboard pages use Server Components with `createClient()` from `@/lib/supabase/server`

### Integration Points
- Dashboard page (`web/src/app/(dashboard)/dashboard/page.tsx`): Current entry point — needs state branching (new vs returning user)
- Onboarding context (`useOnboardingContext`): Already integrated in dashboard — preserve during redesign
- Translations (`web/src/lib/translations.ts`): Add new keys for section headings, empty states, step descriptions (EN/DE)
- Nav already has Top Matches link with Trophy icon accent — dashboard top matches section complements this

</code_context>

<specifics>
## Specific Ideas

- The returning user dashboard should feel like a "home base" — active profile context + best matches + recent activity at a glance
- Top matches and recent analyses sections should have the same visual rhythm: horizontal row of 3 compact cards with "View all" link
- The new user explainer steps should be concise — one line per step, not paragraphs
- Profile card criteria summary should show the same kind of info visible on /profiles list (budget, rooms, location)

</specifics>

<deferred>
## Deferred Ideas

- Analyses empty state with actionable CTAs — Phase 39 (HND-03)
- Framer Motion entrance animations for dashboard sections — Phase 37 (DS-02)
- Tier color unification on top match cards — Phase 37 (DS-03)
- Card hover lift effects — Phase 37 (DS-04)

</deferred>

---

*Phase: 36-state-aware-dashboard*
*Context gathered: 2026-03-31*
