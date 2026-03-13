# Phase 9: Web Profile Management - Research

**Researched:** 2026-03-13
**Domain:** Next.js multi-profile CRUD, preferences form UX, analysis page redesign
**Confidence:** HIGH

## Summary

Phase 9 transforms the web app from a single-profile preferences editor into a full multi-profile management experience. The work is entirely frontend -- the database schema (profiles table with RLS policies, `set_active_profile()` RPC) and the canonical preferences schema (Zod + Pydantic) are already complete from Phases 5 and 7. The existing UI shell (horizontal navbar, theme toggle, profile switcher placeholder) from Phase 8 provides the layout foundation.

The phase has three major deliverables: (1) A profile list page with card-based CRUD operations, (2) A restructured preferences form that adds dealbreaker toggles, floor preference, availability, and replaces the existing accordion sections with the 6-section layout from CONTEXT.md, and (3) A redesigned analysis page with professional visual hierarchy for demo presentations. All interactions use Supabase client queries with existing RLS policies -- no new backend endpoints are needed.

The existing codebase uses shadcn v4 (base-nova style) with Base UI 1.2.0, React Hook Form 7.71, Zod 4.3, and Next.js 16.1.6. The preferences Zod schema already includes all canonical fields (dealbreaker booleans, floorPreference, availability, importance levels). The main work is building new UI components and wiring them to Supabase CRUD operations via server actions and client-side queries.

**Primary recommendation:** Use shadcn card, alert-dialog, dialog, switch, and checkbox components (Base UI variants) for the profile list page. Restructure the preferences form with the 6-section accordion from CONTEXT.md. Use a pure client-side function (not AI) for the live profile summary preview. Redesign the analysis page with a 2-column grid layout for category breakdown and better visual hierarchy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Profile list page uses card layout with star badge on active profile, key criteria summary, and CRUD actions (Edit, Rename, Duplicate, Delete, Set Active)
- "Delete" is blocked if last remaining profile
- "Duplicate" creates a copy with "(Copy)" suffix
- "Edit" navigates to the preferences form for that profile
- Preferences form is a single scrollable page with collapsible accordion sections (6 sections per wireframe)
- Accordion sections: Location & Type, Budget, Size & Rooms, Features & Availability, Soft Criteria, What Matters Most
- Dealbreaker toggles on budget, rooms, living space -- checkbox with "Hard limit" label
- Importance chips (Critical/High/Medium/Low) replace sliders for non-numeric criteria
- Features are typed chips from a predefined list (balcony, elevator, parking, pets, etc.)
- Soft criteria are free text tags
- Floor preference and availability are new fields
- "Set Active" calls `set_active_profile()` RPC
- Active profile switching updates navbar display immediately
- No extension changes (Phase 10)
- No schema definition changes (Phase 7 -- already done)
- No layout shell changes (Phase 8 -- already done)
- No backend changes needed -- all APIs already exist

### Claude's Discretion
- Live profile summary preview implementation (PREF-15) -- pure client-side text generation vs. other approach
- Analysis page redesign specifics (UI-04) -- visual layout, component structure
- Profile card design details beyond the wireframe
- Rename UX (inline edit vs. dialog)
- How to handle optimistic updates for profile switching

### Deferred Ideas (OUT OF SCOPE)
- Extension popup profile switching (Phase 10)
- Session health check (Phase 10)
- Stale badge indicator (Phase 10)
- Backend schema changes
- Score caching
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROF-01 | User can create a new named search profile | Supabase `.insert()` on profiles table with RLS; new profile gets default preferences from schema defaults |
| PROF-02 | User can rename an existing profile | Supabase `.update({ name })` with inline edit or dialog UX; name column has CHECK constraint 1-100 chars |
| PROF-03 | User can delete a profile (with confirmation, cannot delete last) | AlertDialog for confirmation; count check before delete; Supabase `.delete()` with RLS |
| PROF-04 | User can duplicate an existing profile | Read source profile preferences, `.insert()` new row with `name + " (Copy)"` and cloned preferences JSONB |
| PROF-05 | User can set a profile as active (drives extension scoring) | Call `set_active_profile()` RPC via `supabase.rpc('set_active_profile', { target_profile_id })` |
| PROF-06 | User can see all profiles as cards with name, key criteria summary, and active badge | shadcn Card component; server-side fetch of all profiles; summary derived from preferences JSONB |
| PREF-11 | Preferences form distinguishes dealbreakers from weighted soft preferences | Checkbox/Switch toggle per numeric range (budget, rooms, living space) with "Hard limit" label |
| PREF-12 | Importance levels use chips instead of sliders | Already implemented in WeightSliders component; needs restructuring into new accordion section |
| PREF-15 | Live profile summary preview on the preferences form | Client-side function that reads form values and generates natural-language description |
| UI-04 | Analysis page redesigned with professional layout for demo presentations | Redesigned ScoreHeader, CategoryBreakdown, BulletSummary, ChecklistSection with improved visual hierarchy |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App framework | Already installed; App Router with route groups |
| React | 19.2.3 | UI library | Already installed |
| shadcn (base-nova) | 4.0.2 | Component library | Already installed; consistent design system |
| @base-ui/react | 1.2.0 | UI primitives | Already installed; underlying primitive library |
| react-hook-form | 7.71.2 | Form state management | Already installed; used by existing preferences form |
| @hookform/resolvers | 5.2.2 | Zod integration for RHF | Already installed |
| zod | 4.3.6 | Schema validation | Already installed; canonical preferences schema defined |
| @supabase/ssr | 0.9.0 | Server-side Supabase client | Already installed |
| @supabase/supabase-js | 2.99.0 | Supabase client | Already installed |
| lucide-react | 0.577.0 | Icons | Already installed |

### New shadcn Components to Add
| Component | Install Command | Purpose | When to Use |
|-----------|----------------|---------|-------------|
| card | `pnpm dlx shadcn@latest add card` | Profile cards on list page | PROF-06 profile display |
| alert-dialog | `pnpm dlx shadcn@latest add alert-dialog` | Delete confirmation dialog | PROF-03 delete protection |
| dialog | `pnpm dlx shadcn@latest add dialog` | Rename dialog, new profile dialog | PROF-01, PROF-02 |
| switch | `pnpm dlx shadcn@latest add switch` | Dealbreaker toggles | PREF-11 dealbreaker UI |
| checkbox | `pnpm dlx shadcn@latest add checkbox` | Alternative to switch for dealbreakers | PREF-11 if switch UX is too heavy |
| field | `pnpm dlx shadcn@latest add field` | Accessible form field wrappers for switch/checkbox | Required by switch and checkbox |
| tabs | `pnpm dlx shadcn@latest add tabs` | Analysis page section navigation (optional) | UI-04 if tab layout chosen |
| progress | `pnpm dlx shadcn@latest add progress` | Score progress bars on analysis page | UI-04 visual score display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AlertDialog for delete | window.confirm() | AlertDialog is accessible, themed, and professional for demo; window.confirm is ugly |
| Dialog for rename | Inline contentEditable | Dialog is safer, has cancel/save; inline edit is faster but harder to implement accessibility |
| Switch for dealbreakers | Checkbox | Both work; CONTEXT.md wireframe shows checkbox style ("Hard limit" checkbox); use Checkbox to match wireframe |
| Server actions for CRUD | Client-side Supabase queries | Server actions provide better security and revalidation; use server actions for mutations, client queries for real-time |

**Installation:**
```bash
cd web
pnpm dlx shadcn@latest add card alert-dialog dialog switch checkbox field
```

## Architecture Patterns

### Recommended Project Structure
```
web/src/
├── app/(dashboard)/
│   ├── profiles/
│   │   ├── page.tsx                  # Profile list page (PROF-06)
│   │   ├── actions.ts                # Server actions: create, rename, duplicate, delete, setActive
│   │   └── [profileId]/
│   │       └── page.tsx              # Edit profile (preferences form for specific profile)
│   ├── dashboard/
│   │   ├── page.tsx                  # Redirect to /profiles or show active profile form
│   │   └── actions.ts                # Existing (will be refactored)
│   ├── analyses/
│   │   └── page.tsx                  # Analyses list (all scored listings)
│   ├── analysis/
│   │   └── [listingId]/
│   │       ├── page.tsx              # Redesigned analysis detail (UI-04)
│   │       └── loading.tsx           # Existing skeleton
│   └── layout.tsx                    # Existing (wire real profile data to ProfileSwitcher)
├── components/
│   ├── profiles/
│   │   ├── profile-card.tsx          # Single profile card (PROF-06)
│   │   ├── profile-list.tsx          # Grid of profile cards
│   │   ├── create-profile-dialog.tsx # New profile dialog (PROF-01)
│   │   ├── rename-profile-dialog.tsx # Rename dialog (PROF-02)
│   │   └── delete-profile-dialog.tsx # Delete confirmation (PROF-03)
│   ├── preferences/
│   │   ├── preferences-form.tsx      # Restructured form (6 accordion sections)
│   │   ├── location-type-section.tsx # Section 1: Location & Type
│   │   ├── budget-section.tsx        # Section 2: Budget with dealbreaker
│   │   ├── size-rooms-section.tsx    # Section 3: Size & Rooms with dealbreaker
│   │   ├── features-section.tsx      # Section 4: Features & Availability
│   │   ├── soft-criteria-section.tsx # Section 5: Soft Criteria (existing, refined)
│   │   ├── importance-section.tsx    # Section 6: What Matters Most (existing WeightSliders, renamed)
│   │   └── profile-summary.tsx       # Live profile summary preview (PREF-15)
│   ├── analysis/
│   │   ├── ScoreHeader.tsx           # Redesigned (UI-04)
│   │   ├── CategoryBreakdown.tsx     # Redesigned (UI-04)
│   │   ├── BulletSummary.tsx         # Redesigned (UI-04)
│   │   └── ChecklistSection.tsx      # Redesigned (UI-04)
│   ├── profile-switcher.tsx          # Wire to real data (replace placeholder)
│   └── top-navbar.tsx                # No changes needed
├── lib/
│   ├── schemas/
│   │   └── preferences.ts            # Existing canonical Zod schema (no changes)
│   ├── constants/
│   │   └── features.ts               # Existing feature suggestions (no changes)
│   └── profile-summary.ts            # Pure function: preferences -> natural language summary
```

### Pattern 1: Server Actions for Profile CRUD
**What:** Use Next.js server actions for all profile mutations (create, rename, duplicate, delete, set active)
**When to use:** All write operations that modify profile data
**Why:** Server actions run server-side with full Supabase auth context, support `revalidatePath()` for automatic UI refresh, and keep Supabase admin logic out of client bundles.

```typescript
// app/(dashboard)/profiles/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { preferencesSchema } from '@/lib/schemas/preferences'

export async function createProfile(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const defaults = preferencesSchema.parse({})
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, name, preferences: defaults })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/profiles')
  return data.id
}

export async function deleteProfile(profileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check count first -- block deletion of last profile
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  if ((count ?? 0) <= 1) {
    throw new Error('Cannot delete your last profile')
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/profiles')
}

export async function setActiveProfile(profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_active_profile', {
    target_profile_id: profileId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/profiles')
  revalidatePath('/', 'layout') // Refresh navbar profile display
}

export async function duplicateProfile(sourceProfileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: source } = await supabase
    .from('profiles')
    .select('name, preferences')
    .eq('id', sourceProfileId)
    .single()

  if (!source) throw new Error('Source profile not found')

  const { error } = await supabase.from('profiles').insert({
    user_id: user.id,
    name: `${source.name} (Copy)`,
    preferences: source.preferences,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/profiles')
}

export async function renameProfile(profileId: string, newName: string) {
  const supabase = await createClient()
  const trimmed = newName.trim()
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new Error('Name must be 1-100 characters')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmed })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/profiles')
}
```

### Pattern 2: Profile-Scoped Preferences Form
**What:** The preferences form loads and saves to a specific profile by ID (not the default profile)
**When to use:** When user clicks "Edit" on a profile card, navigating to `/profiles/[profileId]`
**Why:** Multi-profile means the form must be profile-aware. The existing `dashboard/actions.ts` hardcodes `is_default: true` -- this must change.

```typescript
// app/(dashboard)/profiles/[profileId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PreferencesForm } from '@/components/preferences/preferences-form'
import { preferencesSchema } from '@/lib/schemas/preferences'

interface Props {
  params: Promise<{ profileId: string }>
}

export default async function EditProfilePage({ params }: Props) {
  const { profileId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, preferences')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/profiles')

  const defaults = preferencesSchema.parse(profile.preferences ?? {})

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">{profile.name}</h1>
      <PreferencesForm
        profileId={profile.id}
        profileName={profile.name}
        defaultValues={defaults}
      />
    </div>
  )
}
```

### Pattern 3: Live Profile Summary (PREF-15)
**What:** A pure client-side function that converts form values into a natural-language summary
**When to use:** Rendered below the form or in a sticky sidebar/panel
**Why:** No API call needed -- the summary is deterministic from form state. Use `form.watch()` to reactively update.

```typescript
// lib/profile-summary.ts
import type { Preferences } from '@/lib/schemas/preferences'

export function generateProfileSummary(prefs: Partial<Preferences>): string {
  const parts: string[] = []

  // Location & type
  if (prefs.location) {
    parts.push(`Looking ${prefs.offerType === 'SALE' ? 'to buy' : 'to rent'} in ${prefs.location}`)
  }
  if (prefs.objectCategory && prefs.objectCategory !== 'ANY') {
    parts.push(`a ${prefs.objectCategory.toLowerCase()}`)
  }

  // Budget
  if (prefs.budgetMin || prefs.budgetMax) {
    const range = [
      prefs.budgetMin ? `CHF ${prefs.budgetMin.toLocaleString()}` : null,
      prefs.budgetMax ? `CHF ${prefs.budgetMax.toLocaleString()}` : null,
    ].filter(Boolean)
    const budgetStr = range.length === 2 ? range.join(' - ') : range[0]
    parts.push(`Budget: ${budgetStr}${prefs.budgetDealbreaker ? ' (hard limit)' : ''}`)
  }

  // Rooms
  if (prefs.roomsMin || prefs.roomsMax) {
    const range = [prefs.roomsMin, prefs.roomsMax].filter(Boolean)
    parts.push(`${range.join('-')} rooms${prefs.roomsDealbreaker ? ' (hard limit)' : ''}`)
  }

  // Features
  if (prefs.features && prefs.features.length > 0) {
    parts.push(`Must have: ${prefs.features.slice(0, 3).join(', ')}${prefs.features.length > 3 ? ` +${prefs.features.length - 3} more` : ''}`)
  }

  // Importance highlights
  if (prefs.importance) {
    const critical = Object.entries(prefs.importance)
      .filter(([, level]) => level === 'critical')
      .map(([cat]) => cat)
    if (critical.length > 0) {
      parts.push(`Critical priorities: ${critical.join(', ')}`)
    }
  }

  return parts.join('. ') + (parts.length > 0 ? '.' : 'No preferences set yet.')
}
```

### Pattern 4: Wiring ProfileSwitcher to Real Data
**What:** Pass real profile data from the server layout to the ProfileSwitcher client component
**When to use:** In `(dashboard)/layout.tsx` -- fetch profiles server-side, pass to client component
**Why:** The navbar must always show the active profile name and allow switching

```typescript
// In (dashboard)/layout.tsx -- fetch profiles and pass to ProfileSwitcher
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name, is_default')
  .order('created_at', { ascending: true })

const activeProfile = profiles?.find(p => p.is_default) ?? profiles?.[0]
```

### Anti-Patterns to Avoid
- **Client-side profile count check for delete protection:** The count check MUST happen server-side in the server action. A client-side check is racy -- another tab could delete a profile between the check and the delete.
- **Storing active profile in React state:** The active profile is a server-side concern (DB column). Use `revalidatePath` after `set_active_profile()` RPC to refresh the layout.
- **Reading all profiles client-side with useEffect:** Use server components to fetch profiles. The profile list page should be a server component that queries Supabase directly.
- **Modifying the Zod schema:** The canonical schema is locked from Phase 7. All fields needed for the form already exist. Do NOT add new fields.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile card grid | Custom card CSS | shadcn Card + Tailwind grid | Card handles header/content/footer/action slots with consistent styling |
| Delete confirmation | Custom modal + backdrop | shadcn AlertDialog | Handles focus trapping, ESC key, click-outside prevention, ARIA, animation |
| Rename input dialog | Custom positioned input | shadcn Dialog | Handles modal overlay, focus management, keyboard shortcuts |
| Dealbreaker toggle | Custom checkbox + label | shadcn Checkbox + Field | Accessible labeling, consistent styling with design system |
| Form validation | Manual checks in onSubmit | react-hook-form + zodResolver | Already wired up; schema already defines all constraints |
| Profile summary text | AI API call | Pure deterministic function | No latency, no cost, no network dependency; form values are sufficient |
| Score progress bars | Custom div width animation | shadcn Progress or CSS custom bars | Accessible, animated, themed |

**Key insight:** The entire backend surface for this phase already exists. Every Supabase query pattern (insert, update, delete, select, rpc) has been used in the project before. The work is purely component composition and form restructuring.

## Common Pitfalls

### Pitfall 1: Accordion defaultValue Type Mismatch (Known Bug)
**What goes wrong:** Accordion sections don't open by default
**Why it happens:** Current code passes `defaultValue={[0, 1, 2]}` (numbers) but Base UI Accordion expects string values matching AccordionItem `value` props
**How to avoid:** Add explicit string `value` props to each AccordionItem and pass matching string array to `defaultValue`
**Warning signs:** All accordion sections collapsed on page load

### Pitfall 2: Deleting Active Profile Leaves No Active
**What goes wrong:** User deletes the active profile; no profile is active; navbar shows nothing; extension breaks
**Why it happens:** The delete action removes the row but doesn't auto-activate another profile
**How to avoid:** After deleting an active profile, automatically call `set_active_profile()` on the oldest remaining profile. Handle this in the server action.
**Warning signs:** Blank profile name in navbar after delete

### Pitfall 3: Race Condition on Profile Count Check
**What goes wrong:** Two concurrent delete requests both pass the "count > 1" check; both delete; user has 0 profiles
**Why it happens:** Client-side count check followed by server action; or two tabs deleting simultaneously
**How to avoid:** Do the count check and delete in a single server action. The DB partial unique index on `is_default` doesn't protect against 0 profiles. Consider a Postgres trigger if needed, but for MVP the server action check is sufficient (single user, low concurrency).
**Warning signs:** Error on next page load when no profiles exist

### Pitfall 4: `revalidatePath` Not Refreshing Layout
**What goes wrong:** After setting active profile, the navbar still shows the old profile name
**Why it happens:** `revalidatePath('/profiles')` only revalidates that page, not the layout which is at `/(dashboard)/layout.tsx`
**How to avoid:** Call `revalidatePath('/', 'layout')` to revalidate the root layout, which forces the dashboard layout to re-fetch profiles. Alternatively, pass `revalidatePath('/profiles', 'layout')`.
**Warning signs:** Profile list updates but navbar profile name is stale until full page refresh

### Pitfall 5: Base UI Switch/Checkbox Label Accessibility Bug
**What goes wrong:** Screen readers don't associate labels with switch/checkbox controls
**Why it happens:** Known shadcn-ui issue #9249 -- Base UI variants target invisible input instead of the control
**How to avoid:** Add `aria-labelledby` to Switch/Checkbox alongside the FieldLabel's `id`. Or use the Checkbox with explicit `id` and `htmlFor` on the label.
**Warning signs:** Testing Library `getByRole("checkbox", { name: "..." })` fails; screen reader doesn't read label on focus

### Pitfall 6: Form State Loss on Navigation
**What goes wrong:** User fills out preferences, clicks navbar link, loses all unsaved changes
**Why it happens:** No unsaved changes warning; form state lives in React, lost on unmount
**How to avoid:** Add `form.formState.isDirty` check with `beforeunload` event or a custom navigation guard. For MVP, show a "Save" button that's visually prominent when form is dirty.
**Warning signs:** Users losing work and complaining

### Pitfall 7: New Profile With No Active Profile Set
**What goes wrong:** Creating first profile doesn't set it as active
**Why it happens:** The insert query doesn't set `is_default: true` for the first profile
**How to avoid:** When creating a profile, check if user has 0 existing profiles. If so, set `is_default: true` on the new profile (or call `set_active_profile()` after insert).
**Warning signs:** New user creates first profile but navbar still shows nothing

## Code Examples

### Profile Card Component
```typescript
// components/profiles/profile-card.tsx
'use client'

import { Star, MoreHorizontal, Copy, Pencil, Trash2 } from 'lucide-react'
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter, CardAction,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Profile {
  id: string
  name: string
  is_default: boolean
  preferences: {
    offerType?: string
    location?: string
    budgetMin?: number | null
    budgetMax?: number | null
    roomsMin?: number | null
    roomsMax?: number | null
  }
}

interface ProfileCardProps {
  profile: Profile
  isOnly: boolean // true if this is the only profile
  onEdit: (id: string) => void
  onSetActive: (id: string) => void
  onRename: (id: string, currentName: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function ProfileCard({
  profile, isOnly, onEdit, onSetActive, onRename, onDuplicate, onDelete,
}: ProfileCardProps) {
  const prefs = profile.preferences
  const summary = [
    prefs.offerType === 'SALE' ? 'Buy' : 'Rent',
    prefs.location || null,
  ].filter(Boolean).join(' -- ')

  const budget = prefs.budgetMin || prefs.budgetMax
    ? `CHF ${prefs.budgetMin?.toLocaleString() ?? '?'}-${prefs.budgetMax?.toLocaleString() ?? '?'}`
    : null

  const rooms = prefs.roomsMin || prefs.roomsMax
    ? `${prefs.roomsMin ?? '?'}-${prefs.roomsMax ?? '?'} rooms`
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {profile.is_default && <Star className="size-4 text-amber-500 fill-amber-500" />}
          <CardTitle>{profile.name}</CardTitle>
        </div>
        {summary && <CardDescription>{summary}</CardDescription>}
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename(profile.id, profile.name)}>
                <Pencil className="mr-2 size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(profile.id)}>
                <Copy className="mr-2 size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isOnly}
                onClick={() => onDelete(profile.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        {budget && <p>{budget}</p>}
        {rooms && <p>{rooms}</p>}
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(profile.id)}>
          Edit
        </Button>
        {profile.is_default ? (
          <Badge variant="secondary">Active</Badge>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onSetActive(profile.id)}>
            Set Active
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
```

### Dealbreaker Checkbox in Budget Section
```typescript
// Inside budget-section.tsx
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'

// Within the form section:
<FormField
  control={form.control}
  name="budgetDealbreaker"
  render={({ field }) => (
    <FormItem className="flex items-center gap-2 mt-3">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
          aria-labelledby="budget-dealbreaker-label"
        />
      </FormControl>
      <label
        id="budget-dealbreaker-label"
        className="text-sm font-medium cursor-pointer"
        onClick={() => field.onChange(!field.value)}
      >
        Hard limit -- score 0 if over budget
      </label>
    </FormItem>
  )}
/>
```

### Delete Confirmation Dialog
```typescript
// components/profiles/delete-profile-dialog.tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileName: string
  onConfirm: () => void
}

export function DeleteProfileDialog({
  open, onOpenChange, profileName, onConfirm,
}: DeleteProfileDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{profileName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this profile and all its preferences.
            Analyses scored with this profile will remain but the profile reference will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Delete Profile
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Wiring Real Profile Data to Layout
```typescript
// app/(dashboard)/layout.tsx -- key change from Phase 8
// Fetch profiles server-side and pass to ProfileSwitcher
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name, is_default')
  .order('created_at', { ascending: true })

const activeProfile = profiles?.find(p => p.is_default)

// Pass to ProfileSwitcher:
<ProfileSwitcher
  profiles={profiles ?? []}
  activeProfileId={activeProfile?.id}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single default profile | Multi-profile with active switching | Phase 5 (DB), Phase 9 (UI) | Preferences form must be profile-aware |
| Numeric weight sliders (0-100) | Importance chips (Critical/High/Medium/Low) | Phase 7 | WeightSliders component already uses chips; file name is legacy |
| `selectedFeatures` key | `features` key in preferences | Phase 7 | Pydantic migration handles old format; Zod schema uses `features` |
| `is_default` queried as "default profile" | `is_default` means "active profile" | Phase 5 | RPC `set_active_profile` uses is_default column for active state |
| No dealbreaker concept | `budgetDealbreaker`, `roomsDealbreaker`, `livingSpaceDealbreaker` booleans | Phase 7 | Form must show toggle per numeric range section |

**Deprecated/outdated in this codebase:**
- `dashboard/actions.ts` `loadPreferences()` / `savePreferences()` -- queries by `is_default: true` without profile ID. Must be replaced or supplemented with profile-aware versions.
- `WeightSliders` component name -- file should be renamed to `importance-section.tsx` for clarity (already implements chips, not sliders)
- `standard-filters.tsx` -- will be split into Location, Budget, Size sections per CONTEXT.md wireframe

## Open Questions

1. **Should /dashboard redirect to /profiles or show active profile form?**
   - What we know: Currently /dashboard shows the preferences form for the default profile
   - What's unclear: In multi-profile world, should /dashboard become the active profile editor or redirect to /profiles list?
   - Recommendation: Redirect /dashboard to /profiles. The user picks which profile to edit from the list. This avoids confusion about "which profile am I editing?"

2. **Analyses list page -- what to show?**
   - What we know: There's a placeholder at /analyses. The existing analysis detail page at /analysis/[listingId] needs redesign (UI-04).
   - What's unclear: Should /analyses list all analyses across profiles or filter by active profile?
   - Recommendation: Show all analyses with profile name badge on each. Filter by active profile with option to show all. Not critical for this phase -- focus on the detail page redesign.

3. **How to handle the "Create Profile" flow for first-time users?**
   - What we know: Old code auto-creates a default profile on first preference save. New flow should create on /profiles page.
   - What's unclear: Should we auto-create a first profile on sign-up, or show an empty state?
   - Recommendation: Show empty state with prominent "Create your first profile" CTA. On create, auto-set as active. This is cleaner than silent auto-creation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 + jsdom |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd web && pnpm vitest run` |
| Full suite command | `cd web && pnpm vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | createProfile server action inserts row with defaults | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts -x` | No -- Wave 0 |
| PROF-02 | renameProfile validates length 1-100, updates name | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts -x` | No -- Wave 0 |
| PROF-03 | deleteProfile blocks deletion of last profile | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts -x` | No -- Wave 0 |
| PROF-04 | duplicateProfile copies preferences, appends "(Copy)" | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts -x` | No -- Wave 0 |
| PROF-05 | setActiveProfile calls RPC and revalidates | unit | `cd web && pnpm vitest run src/__tests__/profile-actions.test.ts -x` | No -- Wave 0 |
| PROF-06 | ProfileCard renders name, summary, active badge | unit | `cd web && pnpm vitest run src/__tests__/profile-card.test.tsx -x` | No -- Wave 0 |
| PREF-11 | Dealbreaker checkbox toggles budgetDealbreaker value | unit | `cd web && pnpm vitest run src/__tests__/preferences-form.test.tsx -x` | No -- Wave 0 |
| PREF-12 | Importance chips select correct level | unit | `cd web && pnpm vitest run src/__tests__/preferences-form.test.tsx -x` | Partial (existing preferences-schema.test.ts) |
| PREF-15 | generateProfileSummary produces correct text | unit | `cd web && pnpm vitest run src/__tests__/profile-summary.test.ts -x` | No -- Wave 0 |
| UI-04 | Redesigned analysis components render with sample data | smoke | `cd web && pnpm vitest run src/__tests__/analysis-page.test.ts -x` | Existing (needs update) |

### Sampling Rate
- **Per task commit:** `cd web && pnpm vitest run`
- **Per wave merge:** `cd web && pnpm vitest run && pnpm build`
- **Phase gate:** Full suite green + successful build before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/profile-actions.test.ts` -- covers PROF-01 through PROF-05: server action logic with mocked Supabase
- [ ] `web/src/__tests__/profile-card.test.tsx` -- covers PROF-06: card rendering, active badge, summary display
- [ ] `web/src/__tests__/preferences-form.test.tsx` -- covers PREF-11, PREF-12: dealbreaker toggle, importance chips
- [ ] `web/src/__tests__/profile-summary.test.ts` -- covers PREF-15: deterministic summary generation
- [ ] Update `web/src/__tests__/analysis-page.test.ts` -- covers UI-04: updated component structure
- [ ] No additional framework install needed (vitest + jsdom already configured)

## Sources

### Primary (HIGH confidence)
- Project codebase -- `web/src/lib/schemas/preferences.ts` (canonical Zod schema, all fields defined)
- Project codebase -- `supabase/migrations/002_profiles_schema.sql` (profiles table, RLS, `set_active_profile()` RPC)
- Project codebase -- `backend/app/models/preferences.py` (canonical Pydantic model, field definitions)
- [shadcn Card (Base UI)](https://ui.shadcn.com/docs/components/base/card) -- Card, CardHeader, CardTitle, CardContent, CardFooter, CardAction subcomponents
- [shadcn AlertDialog (Base UI)](https://ui.shadcn.com/docs/components/base/alert-dialog) -- Confirmation dialog with focus trapping
- [shadcn Dialog (Base UI)](https://ui.shadcn.com/docs/components/base/dialog) -- Modal dialog for rename/create
- [shadcn Switch (Base UI)](https://ui.shadcn.com/docs/components/base/switch) -- Toggle control with Field integration
- [shadcn Checkbox (Base UI)](https://ui.shadcn.com/docs/components/base/checkbox) -- Checkbox with Field integration
- [shadcn Field (Base UI)](https://ui.shadcn.com/docs/components/base/field) -- Accessible form field wrapper

### Secondary (MEDIUM confidence)
- [shadcn-ui/ui#9249](https://github.com/shadcn-ui/ui/issues/9249) -- Known accessibility bug with Base UI Switch/Checkbox label targeting; workaround: `aria-labelledby`
- Phase 8 research (`08-RESEARCH.md`) -- Architecture patterns, existing component inventory, pitfall documentation

### Tertiary (LOW confidence)
- Analysis page redesign specifics -- visual design choices are discretionary; no external source needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed; only adding shadcn components via CLI
- Architecture: HIGH -- patterns follow established project conventions (server actions, Supabase queries, route groups)
- Profile CRUD: HIGH -- DB schema, RLS policies, and RPC all verified in migration files
- Preferences form: HIGH -- Zod schema already has all fields; form restructuring is pure UI work
- Analysis redesign: MEDIUM -- discretionary design choices; no locked wireframe for this page
- Pitfalls: HIGH -- verified via codebase inspection (accordion bug, accessibility issue) and schema analysis

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack, all dependencies locked in package.json)
