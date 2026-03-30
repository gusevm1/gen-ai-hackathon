# Phase 33: Dashboard Home, Nav Polish, Profile Creation Flow, and Analyses Titles Fix - Research

**Researched:** 2026-03-30
**Domain:** Next.js App Router (dashboard UX), Flatfox API title fields
**Confidence:** HIGH

## Summary

This phase involves four frontend UX changes to the HomeMatch Next.js web app. All four are well-scoped, code-level changes requiring no new libraries or architectural decisions. The codebase uses Next.js 16 App Router with a `(dashboard)` route group layout, Tailwind CSS v4, shadcn/ui components, Framer Motion (`motion/react` v12), and Vitest for testing.

The four issues are: (1) the `/dashboard` page currently just redirects to `/profiles` -- it needs to become a real welcome page with two profile-creation cards; (2) the "+ New Profile" button currently opens a name-input dialog that creates an empty profile -- it needs to show the same two-card chooser instead; (3) the `/download` page renders outside the `(dashboard)` layout and has its own minimal header without `TopNavbar`, so all nav items vanish; (4) analysis card titles show German `description_title` from Flatfox because the backend field priority puts it first, while English titles exist in `short_title` and `pitch_title`.

**Primary recommendation:** All four fixes are isolated, low-risk changes to existing files. No new libraries needed. The download page fix requires moving it into the `(dashboard)` route group. The analyses title fix requires a backend change to the field priority in `scoring.py`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- After login, signup, or clicking "Go to Dashboard", user lands on a new dashboard home page (not profiles list)
- Display welcome header: "Welcome to HomeMatch"
- Subheader: "Let's create your profile"
- AI-guided description text: "Tell us exactly what you're looking for and let our AI build your profile automatically."
- Manual description text: "Prefer full control? Fill out a straightforward form and create your profile manually."
- Two large, visually appealing side-by-side cards/boxes: Manual profile creation -> manual form, AI-guided -> LLM chat console
- Home nav bar item must be present and accessible
- Logo continues to direct to landing page (unchanged)
- "+ New Profile" shows same two-card chooser (not direct to form)
- Download page: all nav items remain visible and clickable
- Analyses titles: use English listing title from Flatfox

### Claude's Discretion
- Visual design of the two profile-creation cards (follow existing design system / dark theme)
- Routing/URL structure for the new dashboard home page
- Whether to create a new route or repurpose an existing one
- Animation/transition details (follow existing Framer Motion patterns if present in dashboard)
- Exact field name for English title in Flatfox API response

### Deferred Ideas (OUT OF SCOPE)
- Mobile responsiveness tweaks beyond basic layout (covered in Phase 25)
- Onboarding flow or empty-state animations
- Profile creation wizard multi-step improvements
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.1.6 | App Router, SSR, routing | Route groups `(dashboard)` for auth layout |
| React | 19.2.3 | UI | Server + Client components |
| Tailwind CSS | v4 | Styling | `@tailwindcss/postcss` |
| shadcn/ui | v4 | Component library | Card, Button, Dialog components |
| motion/react | v12.38.0 | Animations | Framer Motion -- `useInView`, spring tokens |
| lucide-react | 0.577.0 | Icons | Home, User, Sparkles, etc. |
| Vitest | 4.x | Testing | jsdom environment, `@testing-library/react` |

### No new packages needed
This phase uses only existing dependencies.

## Architecture Patterns

### Current Route Structure
```
web/src/app/
  layout.tsx                          # Root: ThemeProvider + LanguageProvider
  page.tsx                            # Landing page (public)
  auth/page.tsx                       # Login/signup (pushes to /dashboard)
  download/page.tsx                   # OUTSIDE (dashboard) -- THIS IS THE BUG
  (dashboard)/
    layout.tsx                        # Auth guard + TopNavbar + ProfileSwitcher
    dashboard/page.tsx                # Currently: redirect('/profiles') -- REPLACE
    profiles/page.tsx                 # Profile list with "+ New Profile"
    profiles/[profileId]/page.tsx     # Edit single profile
    analyses/page.tsx                 # Analysis cards list
    analysis/[listingId]/page.tsx     # Single analysis detail
    ai-search/page.tsx                # AI chat console
    settings/page.tsx                 # Settings
```

### Pattern 1: Dashboard Layout (route group)
**What:** `(dashboard)/layout.tsx` wraps all authenticated pages with a shared header containing Logo, TopNavbar, ProfileSwitcher, ThemeToggle, and NavUser.
**Key detail:** The auth guard redirects to `/` if no user. All pages inside this group get the nav bar automatically.
**Why download page is broken:** `/download/page.tsx` is NOT inside `(dashboard)/`, so it renders its own header with only a logo and ThemeToggle -- no TopNavbar.

### Pattern 2: TopNavbar component
**What:** `top-navbar.tsx` renders a horizontal nav with 5 items: AI Search, Profiles, Analyses, Download, Settings. Uses `usePathname()` for active state highlighting.
**Key detail:** There is NO "Home" nav item currently. The nav links to `/ai-search`, `/profiles`, `/analyses`, `/download`, `/settings`.
**Issue:** `/download` is listed as a nav destination, but the download page itself is outside the layout that renders this nav.

### Pattern 3: Profile creation flow
**What:** The "+ New Profile" button in `profile-list.tsx` opens `CreateProfileDialog` which is a simple name-input modal. After entering a name, it calls `createProfile(name)` server action, then refreshes.
**Key detail:** This dialog does NOT offer a choice between manual and AI creation. It just creates a blank profile and refreshes the list. The user must separately navigate to `/ai-search` for AI-guided creation.

### Pattern 4: Analysis card title rendering
**What:** In `analyses/page.tsx`, the `breakdown` JSONB is cast and `listing_title` is used as `rawTitle`. If null, a constructed title from rooms/type/address is used.
**Backend source (scoring.py line 155-156):**
```python
score_data["listing_title"] = (
    listing.description_title or listing.public_title or listing.short_title or None
)
```
**Issue:** `description_title` is the GERMAN title from Flatfox (e.g., "Hier sind Sie auf der Sonnenseite des Lebens"). English titles exist in `short_title` (e.g., "4 rooms apartment") and `pitch_title` (e.g., "Rent a 4 rooms apartment in Roggwil BE").

### Anti-Patterns to Avoid
- **Duplicating the header in download/page.tsx:** Do not maintain a second header. Move the page into the `(dashboard)` route group so it gets the shared layout.
- **Creating a new component for the two-card chooser that is not reusable:** The same two-card UI is needed in both the dashboard home and the "+ New Profile" flow. Extract it as a shared component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card UI | Custom card div | `<Card>` from shadcn/ui | Already used everywhere, consistent styling |
| Active nav highlighting | Manual class logic | Existing `cn()` + `pathname.startsWith()` pattern in TopNavbar | Already proven pattern |
| Auth redirect | Custom middleware | Existing `(dashboard)/layout.tsx` auth guard | Already handles redirect to `/` |

## Common Pitfalls

### Pitfall 1: Download page losing auth context after move
**What goes wrong:** Moving `/download/page.tsx` into `(dashboard)/download/page.tsx` means it now needs auth (the layout does `supabase.auth.getUser()` and redirects unauthenticated users).
**Why it happens:** The download page was intentionally placed outside `(dashboard)` to be accessible without login.
**How to avoid:** Check if the download page should remain public. If it must require auth (which seems likely given it's a nav item in the authenticated area), moving it is correct. If it should also be public, keep both routes or handle it differently.
**Warning signs:** Users getting redirected to login when trying to download.

### Pitfall 2: Server vs Client component mismatch
**What goes wrong:** The new dashboard home page needs to be a server component (to check auth via layout) but the two-card chooser needs click handlers (client).
**Why it happens:** Next.js App Router separates server and client components.
**How to avoid:** Make the page a server component that renders a client `ProfileCreationChooser` component. Similar to how `profiles/page.tsx` is server-side but renders `<ProfileList>` (a client component).

### Pitfall 3: Stale analysis titles in existing data
**What goes wrong:** Changing the backend title field priority only affects NEW analyses. Existing analyses already have German titles stored in the `breakdown` JSONB.
**Why it happens:** The title is saved at scoring time, not looked up at display time.
**How to avoid:** This is acceptable -- only new scores will have English titles. Alternatively, a migration script could update existing records, but that is out of scope for this phase.

### Pitfall 4: CreateProfileDialog still needed
**What goes wrong:** Removing CreateProfileDialog entirely breaks the existing flow.
**Why it happens:** The dialog creates a named profile before redirecting to the edit form.
**How to avoid:** The new flow should: (a) for Manual -- navigate to a new profile creation page or keep the dialog for name then redirect to edit, (b) for AI -- navigate to `/ai-search`. The existing `createProfile` server action is still needed for the Manual path.

## Code Examples

### Current dashboard page (to be replaced)
```typescript
// web/src/app/(dashboard)/dashboard/page.tsx -- CURRENT (just a redirect)
import { redirect } from 'next/navigation'
export default function DashboardPage() {
  redirect('/profiles')
}
```

### TopNavbar nav items (needs Home added)
```typescript
// web/src/components/top-navbar.tsx -- CURRENT (no Home item)
const navItems = [
  { titleKey: "nav_ai_search" as const, url: "/ai-search", icon: Sparkles, accent: true },
  { titleKey: "nav_profiles" as const, url: "/profiles", icon: User },
  { titleKey: "nav_analyses" as const, url: "/analyses", icon: BarChart3 },
  { titleKey: "nav_download" as const, url: "/download", icon: Download },
  { titleKey: "nav_settings" as const, url: "/settings", icon: Settings },
]
```

### Backend title field priority (to be changed)
```python
# backend/app/routers/scoring.py line 155-156 -- CURRENT (German first)
score_data["listing_title"] = (
    listing.description_title or listing.public_title or listing.short_title or None
)
```

### Flatfox API verified title fields (pk=1788170)
```json
{
  "short_title": "4 rooms apartment",
  "public_title": "Platanenweg 7, 4914 Roggwil BE - CHF 1'890 incl. utilities per month",
  "pitch_title": "Rent a 4 rooms apartment in Roggwil BE",
  "description_title": "Hier sind Sie auf der Sonnenseite des Lebens - 4 Monate mietfrei!",
  "rent_title": "Rent a 4 rooms apartment in Roggwil BE"
}
```

### Recommended title field priority (English first)
```python
# Use short_title (clean English like "4 rooms apartment")
# Fallback to pitch_title (English like "Rent a 4 rooms apartment in Roggwil BE")
# Then public_title (address-based, always English)
# Last resort: description_title (may be German)
score_data["listing_title"] = (
    listing.short_title or listing.pitch_title or listing.public_title or listing.description_title or None
)
```

### Download page header (the bug -- has its own header, not using dashboard layout)
```typescript
// web/src/app/download/page.tsx lines 44-52 -- CURRENT (standalone header)
<header className="sticky top-0 z-50 ...">
  <Link href="/" className="flex items-center gap-2 hover:opacity-80">
    <Home className="size-5 text-primary" />
    <span className="text-lg font-semibold tracking-tight">HomeMatch</span>
  </Link>
  <div className="ml-auto">
    <ThemeToggle />
  </div>
</header>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/dashboard` redirects to `/profiles` | Dashboard home with welcome + cards | Phase 33 | Users see a dedicated home page |
| `CreateProfileDialog` name-only | Two-card chooser (Manual/AI) | Phase 33 | Users choose creation method upfront |
| Download page outside auth layout | Download page inside `(dashboard)` | Phase 33 | Nav bar visible on all pages |
| `description_title` priority (German) | `short_title` priority (English) | Phase 33 | Titles display in English |

## Open Questions

1. **Should the download page require authentication after being moved into (dashboard)?**
   - What we know: Currently it is public (no auth guard). Moving it into `(dashboard)/` will make it auth-gated.
   - What's unclear: Was it intentionally public? The landing page links to `/auth` for sign-in, and the download page seems designed for authenticated users given it's in the nav.
   - Recommendation: Move it into `(dashboard)/` -- it is a dashboard nav item and should be auth-gated. The extension zip download itself is a static file in `/public/` and remains accessible without auth.

2. **What happens to the "createProfile" flow for the Manual card?**
   - What we know: Currently `CreateProfileDialog` asks for a name, creates an empty profile, and the user edits it later.
   - What's unclear: Should clicking "Manual" on the chooser still prompt for a name first, then redirect to `/profiles/[id]`? Or should it navigate to a "new profile" page?
   - Recommendation: Keep the name dialog for Manual path (click Manual card -> name prompt -> create profile -> redirect to `/profiles/[newId]`). For AI path, navigate directly to `/ai-search`.

3. **Note: `pitch_title` and `rent_title` are not in the current Pydantic model**
   - What we know: The Flatfox API returns `pitch_title` and `rent_title` fields, but `FlatfoxListing` model only has `short_title`, `public_title`, `pitch_title`, and `description_title`. `rent_title` is not modeled.
   - Recommendation: `short_title` is sufficient as the primary English title. Add `pitch_title` usage if `short_title` is null. No need to add `rent_title` to the model.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | Dashboard home page renders welcome text and two cards | unit | `cd web && npx vitest run src/__tests__/dashboard-home.test.tsx -x` | No - Wave 0 |
| NAV-01 | TopNavbar includes Home nav item | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx -x` | Yes (existing, needs update) |
| NAV-02 | Download page renders within dashboard layout (has TopNavbar) | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | Yes (existing, needs update) |
| TITLE-01 | Backend uses English title field priority | unit | `cd backend && python -m pytest tests/ -x -k listing_title` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd web && npx vitest run && cd ../backend && python -m pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/dashboard-home.test.tsx` -- covers HOME-01 (new dashboard home page rendering)
- [ ] Backend test for title field priority -- covers TITLE-01

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- All findings verified by reading actual source files
- `web/src/app/(dashboard)/layout.tsx` -- Dashboard layout with auth guard and TopNavbar
- `web/src/app/(dashboard)/dashboard/page.tsx` -- Current redirect-only page
- `web/src/app/download/page.tsx` -- Download page with standalone header (the nav bug)
- `web/src/components/top-navbar.tsx` -- Nav items list (no Home item)
- `web/src/app/(dashboard)/analyses/page.tsx` -- Title rendering from breakdown JSONB
- `backend/app/routers/scoring.py` -- Title field priority (description_title first)
- **Live Flatfox API** -- Verified title fields via `curl https://flatfox.ch/api/v1/public-listing/1788170/`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- read actual package.json and source files
- Architecture: HIGH -- read all relevant route files, layouts, and components
- Pitfalls: HIGH -- identified from actual code structure and verified API response
- Title fix: HIGH -- verified live Flatfox API response shows English in short_title/pitch_title

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable codebase, no external dependency changes expected)
