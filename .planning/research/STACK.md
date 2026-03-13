# Stack Research

**Domain:** UI Overhaul + Multi-Profile Support (v1.1 milestone additions)
**Researched:** 2026-03-13
**Confidence:** HIGH (shadcn/ui v4 verified via official changelog; Base UI confirmed; schema patterns verified via Supabase docs)

---

## Scope

This document covers **only new additions** for the v1.1 milestone. The following are already in place and not re-researched:

- Next.js 16.1.6 + React 19 + TypeScript 5 on Vercel
- shadcn v4 (`base-nova` style — Base UI primitives, not Radix) with TailwindCSS v4
- `@base-ui/react` as the primitive library
- `lucide-react` for icons
- Supabase auth + PostgreSQL + edge functions
- React Hook Form + Zod v4, `class-variance-authority`, `tailwind-merge`
- WXT Chrome extension (MV3, Shadow DOM)
- Python FastAPI backend on EC2 + Claude API

---

## New Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn Sidebar component | CLI latest | Collapsible app layout sidebar | Already scaffolded — `globals.css` has all sidebar CSS variables (`--sidebar`, `--sidebar-primary`, etc.) pre-defined. Install via `npx shadcn@latest add sidebar`. Composable `SidebarProvider`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarTrigger`. The `SidebarFooter` + `DropdownMenu` pattern provides the user profile menu slot for free. |
| next-themes | 0.4.6 | Dark/light mode toggle in navbar | The canonical theme-switching library for Next.js. 2-line integration: wrap root layout in `ThemeProvider`, add a toggle button. Works with Tailwind v4 via `@custom-variant dark (&:is(.dark *))` already in `globals.css`. No other library is needed — `next-themes` is the de-facto standard. |
| Supabase migration 002 | — | `search_profiles` table for multi-profile support | Current schema has one `user_preferences` row per user. Multi-profile requires a new `search_profiles` table (many-per-user) with `id`, `user_id`, `name`, `is_active`, `preferences` JSONB, `created_at`. RLS follows the same `auth.uid() = user_id` pattern already established. No new packages — pure SQL migration. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| 21st.dev components | CLI (copy-paste) | Enhanced navbar, animated hero, polished UI blocks | Install individual components via `npx shadcn@latest add "https://21st.dev/r/[author]/[component]"`. They install into your project as editable files, same as shadcn. Use for: navbar with logo + nav links + user dropdown, any landing page polish. Do NOT use for core app chrome — build that with official shadcn sidebar. |
| shadcn DropdownMenu | CLI latest | Profile switcher menu, user avatar dropdown | Already have `@base-ui/react` but DropdownMenu is needed for the profile switcher UI in the sidebar footer and potentially in a navbar. Add via `npx shadcn@latest add dropdown-menu`. |
| shadcn Avatar | CLI latest | User avatar in navbar/sidebar footer | Shows user initials when no photo. Part of the standard profile menu pattern. Add via `npx shadcn@latest add avatar`. |
| shadcn Tooltip | CLI latest | Icon button tooltips in collapsed sidebar | When sidebar collapses to icon-only mode, tooltips show labels. Already present in extension package; add to web via `npx shadcn@latest add tooltip`. |
| shadcn Dialog | CLI latest | "Create profile" / "Delete profile" confirmation modals | Standard modal pattern for profile CRUD operations. Add via `npx shadcn@latest add dialog`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `npx shadcn@latest add` | Install shadcn components and 21st.dev components | v4 CLI — use for both official shadcn and 21st.dev registry URLs. Run from the `web/` directory. |
| `supabase migration new` | Create numbered SQL migration files | Keep schema changes in `supabase/migrations/` as `002_multi_profile.sql`. |

---

## Installation

```bash
# From web/ directory

# Layout components
npx shadcn@latest add sidebar
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
npx shadcn@latest add dialog

# Dark mode
npm install next-themes

# 21st.dev — example navbar (pick the specific one from 21st.dev/s/navbar)
# npx shadcn@latest add "https://21st.dev/r/[chosen-navbar-component]"
# Do not blindly add — browse 21st.dev first, pick one navbar variant
```

```sql
-- supabase/migrations/002_multi_profile.sql
create table if not exists search_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'My Profile',
  is_active boolean not null default false,
  preferences jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Only one active profile per user
create unique index search_profiles_active_idx
  on search_profiles (user_id)
  where (is_active = true);

alter table search_profiles enable row level security;

create policy "Users can manage own profiles"
  on search_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| shadcn Sidebar component | Custom navbar (top) | If the app had many top-level routes and minimal nesting. For HomeMatch with Preferences + Analysis + Profile management, a sidebar layout is more scalable than a navbar-only layout. |
| shadcn Sidebar for profile switcher slot | Dedicated `<ProfileSwitcher>` floating UI | A sidebar with a `SidebarFooter` DropdownMenu is the standard shadcn pattern (matches `team-switcher.tsx` and `nav-user.tsx` patterns from shadcn blocks). No custom floating component needed. |
| next-themes | Manual CSS class toggling | Manual toggling avoids a dependency but requires re-implementing SSR flash prevention, system preference detection, and localStorage persistence. next-themes handles all this in 2 lines. |
| Supabase migration (SQL) | Supabase Studio GUI | Migrations in files are reproducible and reviewable. GUI changes are untracked. Always prefer migration files. |
| React Context for active profile | Zustand | Zustand adds a dependency for a single piece of shared state (current profile ID). React Context is sufficient when the tree is shallow and profile changes are infrequent (user-initiated, not high-frequency). If the app grows and profile state is needed in 10+ disconnected components, revisit Zustand. |
| 21st.dev copy-paste | npm package installs | 21st.dev intentionally uses the shadcn copy-paste model — components land in your codebase as editable files, not opaque node_modules. This is correct for customization. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Radix UI primitives for new components | Project is on `base-nova` style (Base UI primitives). Mixing Radix and Base UI in the same app creates two different accessibility/focus implementations and inconsistent behavior. | Base UI via `@base-ui/react` (already installed). All new shadcn components added via CLI will use Base UI because `components.json` has `"style": "base-nova"`. |
| `@radix-ui/*` new installs | As above — web already depends on a few Radix packages from v1 but new additions should be Base UI. | Stick to shadcn CLI which reads `components.json` and installs the Base UI variant automatically. |
| Multiple `react-query` / `swr` for profile fetching | Overkill for a small app with infrequent profile CRUD. Adds bundle weight. | Fetch profiles directly with `@supabase/ssr` `createClient()` in server components / server actions. No client-side fetching cache needed for profile management. |
| `framer-motion` for page transitions | Heavy (adds ~50 KB). HomeMatch is a utility app for demo contexts — micro-animations are sufficient via `tw-animate-css` already installed. | `tw-animate-css` for component animations. Framer Motion only if 21st.dev component you choose explicitly requires it. |
| CSS-in-JS (styled-components, emotion) | Incompatible with TailwindCSS v4 architecture and shadow DOM injection patterns already in use. | TailwindCSS v4 utility classes as established. |
| Storing active profile ID in Supabase on every switch | A profile switch triggers a write. Since `is_active` is already a DB column, writes on switch are fine — but do NOT use a separate `active_profile_id` column on `auth.users` (which is in the locked `auth` schema). | `is_active` boolean on the `search_profiles` table, managed via a transaction that sets all `is_active = false` then sets target `is_active = true`. |

---

## Stack Patterns for New Features

**Navbar (web app top bar):**
- One 21st.dev navbar component installed via shadcn CLI into `components/layout/navbar.tsx`
- `usePathname()` from `next/navigation` for active link highlighting (requires `"use client"`)
- User avatar + DropdownMenu for sign out, with active profile name displayed
- ThemeProvider from next-themes wraps root layout; ModeToggle button in navbar

**App Layout with Sidebar:**
- Root `layout.tsx` wraps in `ThemeProvider` and `SidebarProvider`
- `(app)/layout.tsx` route group renders `<AppSidebar>` + `<main>` with `SidebarTrigger`
- Sidebar nav: Preferences, Analysis History, (later: Settings)
- Sidebar footer: User avatar, name, active profile name, profile switcher DropdownMenu, sign out

**Profile Switcher (sidebar footer):**
```tsx
// Pattern: SidebarFooter with DropdownMenu
<SidebarFooter>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton>
        <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
        <div><span>{user.email}</span><span>{activeProfile.name}</span></div>
        <ChevronsUpDown />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {/* Profile list with switch action */}
      {/* New profile button */}
      {/* Sign out */}
    </DropdownMenuContent>
  </DropdownMenu>
</SidebarFooter>
```

**Multi-Profile DB operations (Supabase server actions):**
```typescript
// Switch active profile — two-step atomic via RPC or sequential updates
// Step 1: set all user profiles is_active = false
// Step 2: set target profile is_active = true
// Because unique index enforces one active profile, these must be sequential.
// Use a Supabase RPC function (plpgsql) to do this atomically.
```

**Dark mode:**
```tsx
// root layout.tsx
import { ThemeProvider } from 'next-themes'
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
// globals.css already has .dark { ... } block — works out of the box
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next-themes@0.4.6 | Next.js 16, React 19, Tailwind v4 | Works with Tailwind v4 dark mode via CSS class. `suppressHydrationWarning` on `<html>` prevents SSR mismatch. Confirmed latest version (March 2026). |
| shadcn sidebar CLI | `@base-ui/react` (base-nova style) | CLI reads `components.json` style `base-nova` and installs Base UI variants automatically. No Radix conflict. |
| shadcn dropdown-menu CLI | `@base-ui/react` | Same as above — Base UI variant installed. |
| `search_profiles` table | Supabase RLS + `auth.users` | Standard FK pattern; `unique index where is_active = true` enforces business rule at DB level without application-layer checks. |
| 21st.dev components | shadcn CLI v4, Base UI | 21st.dev components are copy-pasted; some may internally use Radix. Inspect installed files and replace any Radix primitives with Base UI equivalents if conflicts arise (LOW risk for navbar components, which are typically HTML-primitive-based). |

---

## Sources

- [shadcn/ui Changelog — January 2026 Base UI](https://ui.shadcn.com/docs/changelog/2026-01-base-ui) — confirmed Base UI component availability including Sidebar, DropdownMenu, Avatar, Dialog
- [shadcn/ui Changelog — March 2026 CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) — CLI v4 features, `--base` flag, preset system
- [shadcn/ui Sidebar Docs](https://ui.shadcn.com/docs/components/radix/sidebar) — `SidebarProvider`, `SidebarFooter`, `DropdownMenu` pattern, `useSidebar` hook, variants
- [shadcn/ui Sidebar Blocks](https://ui.shadcn.com/blocks/sidebar) — 16 sidebar block variants including user footer pattern (`nav-user.tsx` pattern)
- [21st.dev GitHub (serafimcloud/21st)](https://github.com/serafimcloud/21st) — install pattern: `npx shadcn@latest add "https://21st.dev/r/[author]/[component]"`; copy-paste model confirmed
- [21st.dev Navbar Components](https://21st.dev/s/navbar) — 43 navbar components confirmed available
- [next-themes GitHub](https://github.com/pacocoursey/next-themes) — v0.4.6 latest (March 2026), Next.js 16 + Tailwind v4 compatible
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — `auth.uid()` policy pattern confirmed
- [Tailwind CSS Dark Mode Docs](https://tailwindcss.com/docs/dark-mode) — class-based dark mode with next-themes
- [web/components.json](../../../web/components.json) — confirms `base-nova` style, Base UI primitives, Tailwind v4 CSS path
- [web/src/app/globals.css](../../../web/src/app/globals.css) — confirms sidebar CSS variables already defined, dark mode `.dark` block in place

---

*Stack research for: HomeMatch v1.1 — UI Overhaul + Multi-Profile Support*
*Researched: 2026-03-13*
