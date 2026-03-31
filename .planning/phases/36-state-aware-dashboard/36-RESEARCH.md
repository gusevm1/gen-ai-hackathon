# Phase 36: State-Aware Dashboard - Research

**Researched:** 2026-03-31
**Domain:** Next.js dashboard UI with conditional rendering based on user state (profiles, analyses, top matches)
**Confidence:** HIGH

## Summary

This phase transforms the dashboard home page from a static new-user view into a state-aware hub that branches between two modes: (1) a new-user onboarding explainer with profile creation paths, and (2) a returning-user home base showing active profile, top matches, and recent analyses.

The existing codebase provides all necessary data fetching patterns, server actions, and reusable components. The dashboard page (`page.tsx`) is currently a client component; it needs to become a **server component** that fetches profiles and analyses data, then delegates to client sub-components for interactive elements (profile switching, modals). This matches the established pattern used by the dashboard layout, analyses page, and profiles page.

The key architectural decision is the server/client split: the page itself fetches data server-side (profiles count, active profile details, recent analyses, top matches cache), then renders either `NewUserDashboard` or `ReturningUserDashboard` client components with that data as props.

**Primary recommendation:** Convert `dashboard/page.tsx` to a server component that branches on profile count, fetching all required data server-side and passing it to focused client sub-components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep Phase 33 heading: "Welcome to HomeMatch" with subheading "Here's how it works"
- 3-step numbered list (vertical, not cards) explaining product value journey above ProfileCreationChooser
- ExtensionInstallBanner renders above the explainer, at the very top
- Returning user layout: vertical stack -- Active profile card, Top Matches (3 cards horizontal), Recent Analyses (3 cards horizontal)
- Active profile card shows: profile name, key criteria summary, last-used date, 3 action buttons (Switch dropdown, + New, Open Flatfox primary CTA)
- Switch dropdown with checkmark on active -- uses existing `setActiveProfile` server action pattern
- Profile switching triggers full page reload via `revalidatePath('/dashboard')`
- Top matches: 3 compact summary cards (rank badge, score circle, tier label, address/title), click navigates to /top-matches
- Top matches empty state: muted card with "Open Flatfox" CTA
- Recent analyses: 3 most recent for active profile, compact cards (score circle, tier, address)
- Recent analyses empty state: hide section if 0 analyses (Phase 39 handles HND-03)
- Profile switching via dropdown inside active profile card, not tabs
- "+ New" button opens modal/dialog with ProfileCreationChooser, does NOT navigate away
- AI card in modal goes to /ai-search, Manual card opens existing CreateProfileDialog

### Claude's Discretion
- Exact criteria summary format in the profile card (which fields to show, truncation)
- Loading/skeleton states for top matches and analyses sections
- Responsive behavior on smaller screens (stack cards vertically if needed)
- Animation/transition details

### Deferred Ideas (OUT OF SCOPE)
- Analyses empty state with actionable CTAs -- Phase 39 (HND-03)
- Framer Motion entrance animations for dashboard sections -- Phase 37 (DS-02)
- Tier color unification on top match cards -- Phase 37 (DS-03)
- Card hover lift effects -- Phase 37 (DS-04)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | New user (0 profiles) sees onboarding-oriented home: 3-step explainer + two profile creation paths | Server component branches on `profiles.length === 0`; reuse `ProfileCreationChooser`; add vertical numbered step list above it |
| DASH-02 | New user sees AI profile creation as visually recommended primary path (badge + primary styling) | Modify `ProfileCreationChooser` to accept a `variant` prop or update styling: AI card gets primary border + "Recommended" badge, manual card gets outline |
| DASH-03 | New user sees manual profile creation as secondary option (outline style, lower visual weight) | Same component modification as DASH-02 -- differentiate AI (primary) vs manual (outline) |
| DASH-04 | Returning user sees active profile name, last-used date, "Open Flatfox" CTA | Fetch `profiles` with `preferences`, `updated_at`, `is_default`; build `ActiveProfileCard` server-rendered with client interactivity for switch dropdown |
| DASH-05 | Returning user sees 3 most recent analyses (score + tier + address) | Server-side query: `supabase.from('analyses').select(...).eq('profile_id', activeProfile.id).order('created_at', {ascending: false}).limit(3)` |
| DASH-06 | Returning user can switch active profile or create new from home page | Reuse `setActiveProfile` server action in dropdown; Dialog with `ProfileCreationChooser` for new profile |
| DASH-07 | Returning user sees top matches summary cards linking to /top-matches | Fetch from `top_matches_cache` table or call `/api/top-matches` client-side; display 3 compact cards |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 (App Router) | Server/client components, server actions | Project framework |
| Supabase JS | @supabase/ssr | Server-side data fetching with `createClient()` | Established pattern in all dashboard pages |
| Shadcn UI (base-ui) | Latest | Card, Dialog, DropdownMenu, Badge, Button, Skeleton | Already installed and used throughout |
| Lucide React | Latest | Icons (Trophy, ExternalLink, ChevronDown, Plus, etc.) | Project standard icon library |
| Tailwind CSS | v4 | Styling | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Latest | Preferences schema parsing for criteria summary | Already used for profile preferences |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side top matches fetch | Client-side fetch via `/api/top-matches` | Server-side is simpler but the existing top-matches API route calls the backend which may be slow; client-side with skeleton is better UX for this section |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
web/src/
├── app/(dashboard)/dashboard/
│   └── page.tsx                    # Server component: fetch data, branch on profile count
├── components/dashboard/
│   ├── NewUserDashboard.tsx        # Client: explainer steps + ProfileCreationChooser
│   ├── ReturningUserDashboard.tsx  # Client: orchestrates returning user sections
│   ├── ActiveProfileCard.tsx       # Client: profile info + switch dropdown + new modal
│   ├── TopMatchesSummary.tsx       # Client: fetches + displays 3 compact match cards
│   ├── TopMatchSummaryCard.tsx     # Presentational: single compact match card
│   ├── RecentAnalysesSummary.tsx   # Server or Client: 3 compact analysis cards
│   ├── AnalysisSummaryCard.tsx     # Presentational: single compact analysis card
│   └── NewProfileModal.tsx         # Client: Dialog wrapping ProfileCreationChooser
```

### Pattern 1: Server Component Data Fetching + Client Branching

**What:** The dashboard page.tsx becomes a server component that fetches profiles, active profile, and recent analyses, then conditionally renders sub-components.

**When to use:** When data determines layout/structure and the page needs SEO/SSR.

**Example:**
```typescript
// web/src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { NewUserDashboard } from '@/components/dashboard/NewUserDashboard'
import { ReturningUserDashboard } from '@/components/dashboard/ReturningUserDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, is_default, preferences, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const allProfiles = profiles ?? []
  const activeProfile = allProfiles.find(p => p.is_default) ?? allProfiles[0]

  if (allProfiles.length === 0) {
    return <NewUserDashboard />
  }

  // Fetch recent analyses for active profile
  const { data: recentAnalyses } = await supabase
    .from('analyses')
    .select('id, listing_id, score, breakdown, created_at')
    .eq('profile_id', activeProfile.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <ReturningUserDashboard
      profiles={allProfiles}
      activeProfile={activeProfile}
      recentAnalyses={recentAnalyses ?? []}
    />
  )
}
```

### Pattern 2: Client-Side Top Matches Fetch with Skeleton

**What:** Top matches are fetched client-side via `/api/top-matches` (same pattern as the existing top-matches page) because the backend call can be slow (up to 30s). Show skeleton while loading.

**When to use:** When the data source is a slow backend API and showing stale UI is acceptable.

**Example:**
```typescript
// TopMatchesSummary.tsx -- client component
'use client'
import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function TopMatchesSummary() {
  const [matches, setMatches] = useState<TopMatch[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/top-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_refresh: false }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setMatches(data?.matches?.slice(0, 3) ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <TopMatchesSkeleton />
  if (!matches || matches.length === 0) return <TopMatchesEmptyState />
  // render 3 compact cards...
}
```

### Pattern 3: ProfileCreationChooser Visual Differentiation (DASH-02/03)

**What:** The existing `ProfileCreationChooser` currently renders both cards identically with `border-[6px] border-rose-500`. For DASH-02/03, the AI card needs primary styling (badge + filled border) and the manual card needs secondary styling (outline, lower weight).

**When to use:** This is a one-time modification to the existing component.

**Approach:** Update `ProfileCreationChooser` to visually distinguish the two cards:
- AI card: `border-primary` (thick), add a `<Badge>Recommended</Badge>` above the title, use `Button` with default variant styling cues
- Manual card: `border-border` (thin/outline), muted icon, lighter visual weight

### Pattern 4: Active Profile Criteria Summary

**What:** The active profile card shows a one-line criteria summary derived from the `preferences` JSON.

**Approach:** Extract key fields from the preferences object:
```typescript
function buildCriteriaSummary(prefs: Preferences): string {
  const parts: string[] = []
  if (prefs.location) parts.push(prefs.location)
  if (prefs.roomsMin) parts.push(`${prefs.roomsMin}+ rooms`)
  if (prefs.budgetMax) parts.push(`<${prefs.budgetMax.toLocaleString()} CHF`)
  if (prefs.objectCategory !== 'ANY') parts.push(prefs.objectCategory.toLowerCase())
  return parts.join(', ') || 'No criteria set'
}
```

### Anti-Patterns to Avoid
- **Client-side profile count check:** Do NOT fetch profiles client-side to decide new vs returning user. This causes layout shift. The server component should decide.
- **Fetching top matches server-side in page.tsx:** The backend call can take 30s. This would block the entire page render. Fetch client-side with skeleton.
- **Duplicating ProfileSwitcher logic:** Reuse the existing `setActiveProfile` server action and `useTransition` pattern. Do not build a separate switching mechanism.
- **Hardcoding rose-500:** The existing `ProfileCreationChooser` uses hardcoded `border-rose-500`. Replace with `border-primary` to align with design token migration (DS-01 is Phase 37, but we should not add NEW hardcoded rose references).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile switching | Custom state management for active profile | `setActiveProfile` server action + `revalidatePath` | Atomic RPC, handles race conditions |
| Modal/Dialog | Custom overlay component | Shadcn `Dialog` (already in project) | Accessibility, focus trap, escape handling |
| Dropdown menu | Custom dropdown | Shadcn `DropdownMenu` (already in project) | Keyboard navigation, positioning, accessibility |
| Score tier colors | New color mapping | Reuse `TIER_COLORS` from `TopMatchCard.tsx` or `ScoreHeader.tsx` | Consistency across the app |
| Loading states | Custom shimmer | Shadcn `Skeleton` component (already in project) | Consistent animation, simple API |
| Profile creation flow | New creation UI | Existing `ProfileCreationChooser` + `CreateProfileDialog` | Already built and tested |

**Key insight:** Nearly every interactive pattern needed for this phase already exists in the codebase. The work is primarily composition and layout, not new functionality.

## Common Pitfalls

### Pitfall 1: Layout Shift on State Transition
**What goes wrong:** User creates their first profile, returns to dashboard, sees flash of new-user state before server re-renders.
**Why it happens:** Client components caching stale data; Next.js server component not revalidated.
**How to avoid:** The `createProfile` server action already calls `revalidatePath('/', 'layout')`. Ensure the dashboard page.tsx is a server component so it re-fetches on every navigation.
**Warning signs:** Seeing the explainer flash after profile creation.

### Pitfall 2: Top Matches Fetch Blocking Page
**What goes wrong:** If top matches are fetched server-side, the entire dashboard page blocks for up to 30 seconds.
**Why it happens:** The `/score/top-matches` backend endpoint is compute-heavy.
**How to avoid:** Fetch top matches CLIENT-SIDE with a skeleton loader. The existing top-matches page does exactly this.
**Warning signs:** Dashboard page taking more than 1-2 seconds to render.

### Pitfall 3: OnboardingContext Lost During Refactor
**What goes wrong:** Converting page.tsx from client to server component breaks `useOnboardingContext()`.
**Why it happens:** Server components cannot use React hooks.
**How to avoid:** `NewUserDashboard` must be a client component that uses `useOnboardingContext`. The `ExtensionInstallBanner` is already a client component that reads onboarding state -- it will work fine as a child of a server component since `OnboardingProvider` wraps at the layout level.
**Warning signs:** `useOnboardingContext is not a function` error.

### Pitfall 4: Stale Profile Data After Switch
**What goes wrong:** After switching active profile, top matches and analyses still show old profile's data.
**Why it happens:** Client-side state not refreshed after `revalidatePath`.
**How to avoid:** Profile switch triggers `revalidatePath('/dashboard')` which causes full server re-render. Top matches component should re-fetch when it mounts (use profile ID as a key or dependency). Recent analyses are passed as server props so they auto-update.
**Warning signs:** Seeing previous profile's analyses after switching.

### Pitfall 5: Translation Key Parity
**What goes wrong:** Adding English translation keys without corresponding German keys breaks TypeScript check.
**Why it happens:** The translation system enforces EN/DE key parity.
**How to avoid:** Always add both EN and DE keys simultaneously for every new translation string.
**Warning signs:** TypeScript errors in translations.ts.

## Code Examples

### Compact Score Circle (reusable across top matches and analyses summary cards)
```typescript
// Reusable pattern from TopMatchCard and ScoreHeader
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-emerald-500', text: 'text-white' },
  good: { bg: 'bg-blue-500', text: 'text-white' },
  fair: { bg: 'bg-amber-500', text: 'text-gray-900' },
  poor: { bg: 'bg-gray-500', text: 'text-white' },
}

function CompactScoreCircle({ score, tier }: { score: number; tier: string }) {
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.poor
  return (
    <div className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
      {score}
    </div>
  )
}
```

### Analysis Data Shape (from existing analyses page)
```typescript
// What you get from supabase analyses query:
interface AnalysisSummary {
  id: string
  listing_id: string
  score: number
  breakdown: {
    match_tier?: string
    listing_title?: string
    listing_address?: string
    listing_rooms?: string
    listing_object_type?: string
  } | null
  created_at: string
}

// Tier derivation (same as analyses page):
function getTierFromScore(score: number): string {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}
```

### Top Match Data Shape (from existing top-matches page)
```typescript
interface TopMatch {
  listing_id: number
  slug: string
  title: string | null
  address: string | null
  city: string | null
  rooms: number | null
  sqm: number | null
  price: number | null
  score_response: {
    overall_score: number
    match_tier: string
    summary_bullets: string[]
    criteria_results: Array<{ /* ... */ }>
  }
}
```

### Profile "Last Used" Date
```typescript
// profiles.updated_at is auto-updated by moddatetime trigger on every update
// This serves as the "last used" date since profile switches and preference saves both trigger updates
// Format it relative or absolute:
function formatLastUsed(updatedAt: string): string {
  const date = new Date(updatedAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dashboard is always new-user view | Dashboard branches on profile count | This phase | Two distinct UX paths |
| ProfileCreationChooser: both cards identical styling | AI card primary, manual card secondary | This phase | Clearer recommended path |
| Top matches only on /top-matches page | Summary on dashboard + full view on /top-matches | This phase | Faster access to key data |
| No profile context on dashboard | Active profile card with criteria + actions | This phase | Dashboard as "home base" |

## Open Questions

1. **Top matches cache freshness**
   - What we know: `/api/top-matches` calls backend which uses `top_matches_cache` table. The `force_refresh` param can bypass cache.
   - What's unclear: How stale can the cache be before it's misleading on the dashboard? Should we show `computed_at` timestamp?
   - Recommendation: Show cached data without auto-refresh. Include a subtle "Last updated: {time}" line. The full /top-matches page already has a refresh button.

2. **"Last used" semantics**
   - What we know: `profiles.updated_at` updates on any profile modification (name, preferences, active status).
   - What's unclear: Whether "last used" should mean "last scored against" (i.e., last analysis created_at) vs "last modified".
   - Recommendation: Use `updated_at` -- it's already available without extra queries and covers the most common meaning. The CONTEXT.md says "last-used date" which `updated_at` satisfies.

## Sources

### Primary (HIGH confidence)
- Project codebase -- all components, server actions, and data patterns verified by reading source files
- `supabase/migrations/002_profiles_schema.sql` -- profiles table schema with `updated_at` trigger
- `web/src/app/(dashboard)/dashboard/page.tsx` -- current dashboard implementation
- `web/src/app/(dashboard)/layout.tsx` -- server component data fetching pattern
- `web/src/components/profile-switcher.tsx` -- dropdown switch pattern with `setActiveProfile`
- `web/src/app/(dashboard)/analyses/page.tsx` -- analyses data shape and tier derivation
- `web/src/app/(dashboard)/top-matches/page.tsx` -- client-side top matches fetch pattern
- `web/src/components/top-matches/TopMatchCard.tsx` -- top match data shape and tier colors
- `web/src/lib/schemas/preferences.ts` -- Preferences type for criteria summary

### Secondary (MEDIUM confidence)
- None needed -- all patterns are internal to the project

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used in the project
- Architecture: HIGH - patterns directly derived from existing codebase (analyses page, top-matches page, layout.tsx)
- Pitfalls: HIGH - identified from actual code patterns and known Next.js server/client component behaviors

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- internal project patterns unlikely to change)
