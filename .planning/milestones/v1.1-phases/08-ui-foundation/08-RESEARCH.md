# Phase 8: UI Foundation - Research

**Researched:** 2026-03-13
**Domain:** Next.js SaaS layout shell (sidebar, navbar, dark mode, component library)
**Confidence:** HIGH

## Summary

Phase 8 transforms the existing single-page web app into a professional SaaS layout with collapsible sidebar, navbar with user identity, and dark/light mode. The project already uses shadcn v4 (base-nova style) with Base UI React 1.2.0, Next.js 16.1.6, React 19.2.3, and Tailwind CSS v4. The CSS variables for both light and dark themes (including sidebar-specific variables) are already defined in `globals.css`.

The shadcn sidebar component is the standard choice -- it provides a composable, themeable sidebar with built-in mobile responsiveness, collapsible states (offcanvas/icon/none), and a `useSidebar` hook. Dark mode uses the `next-themes` library (not yet installed) which integrates directly with the existing `@custom-variant dark` CSS setup. The 21st.dev integration (UI-05) works via the shadcn CLI registry system -- components are installed with `npx shadcn@latest add "https://21st.dev/r/{author}/{component}"`.

**Primary recommendation:** Use the shadcn sidebar component (Base UI variant) + next-themes for dark mode. Install sidebar, dropdown-menu, avatar, and sheet components via `npx shadcn@latest add`. For the 21st.dev requirement (UI-05), research a specific component on the 21st.dev marketplace that adds value (e.g., a mode toggle or user menu) and install it via the registry URL pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Layout structure: sidebar (left) + navbar (top) + main content area (from ASCII diagram in CONTEXT.md)
- Sidebar nav items: Dashboard/Home, Profiles, Analyses, Settings
- Sidebar must be collapsible on mobile (hamburger)
- Navbar content: logo (left), active profile switcher (center/right as placeholder), dark/light toggle + user avatar with sign-out (right)
- Dark mode: toggle in navbar, system preference on first load, localStorage persistence
- No backend changes, no extension changes, no schema changes
- Active profile display is a placeholder until Phase 9 wires it

### Claude's Discretion
- Component library choice: CONTEXT.md says "Research first -- check GitHub quality/usage before installing. Alternatives: shadcn/ui (most popular for Next.js), Radix primitives, or keep current setup." -- the project already has shadcn v4 base-nova installed, so extending it is the natural choice
- Which 21st.dev component to integrate (must be research-first)
- Sidebar variant (offcanvas vs icon collapse vs floating)
- Mobile responsiveness approach (sheet/drawer vs offcanvas)

### Deferred Ideas (OUT OF SCOPE)
- Profile CRUD or preferences form (Phase 9)
- Analysis page redesign (Phase 9)
- Extension changes (Phase 10)
- Backend changes
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | App has a collapsible sidebar layout with navigation | shadcn sidebar component (Base UI variant) provides composable sidebar with collapsible modes (offcanvas/icon/none), SidebarProvider state management, mobile Sheet overlay, keyboard shortcut Cmd+B |
| UI-02 | Navbar shows user identity, active profile name, and profile switcher dropdown | shadcn dropdown-menu + avatar components for user menu; Select or DropdownMenu for profile switcher placeholder; Supabase auth getUser() already available on server side |
| UI-03 | Dark/light mode toggle with system preference detection | next-themes library with attribute="class", defaultTheme="system", enableSystem; existing globals.css already has @custom-variant dark and full dark theme CSS variables |
| UI-05 | 21st.dev components integrated via research-first workflow | 21st.dev uses shadcn registry protocol -- install via `npx shadcn@latest add "https://21st.dev/r/{author}/{component}"`; agent must check GitHub usage/quality before installing |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn (sidebar) | v4.0.2 (already installed) | Sidebar layout component | Official shadcn component, Base UI variant available, composable with DropdownMenu/Avatar |
| next-themes | latest (to install) | Dark/light mode management | De facto standard for Next.js theme switching, 2 lines of code, system preference + localStorage |
| @base-ui/react | 1.2.0 (already installed) | UI primitive library | Already the project's primitive layer via shadcn base-nova style |
| lucide-react | 0.577.0 (already installed) | Icon library | Already the project's icon library per components.json |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn dropdown-menu | (to add) | User menu, profile switcher | Navbar user avatar dropdown, profile switcher dropdown |
| shadcn avatar | (to add) | User avatar display | Navbar user identity display |
| shadcn sheet | (to add) | Mobile sidebar overlay | Mobile sidebar uses Sheet internally via shadcn sidebar component |
| shadcn separator | already installed | Visual dividers | Sidebar section separators |
| shadcn tooltip | (to add) | Collapsed sidebar icon labels | When sidebar is in "icon" collapsed mode |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn sidebar | Custom sidebar | shadcn gives mobile responsiveness, cookie persistence, keyboard shortcuts for free; custom = weeks of work |
| next-themes | Manual class toggle | next-themes handles system preference, hydration mismatch prevention, localStorage persistence; manual = all edge cases yourself |
| 21st.dev component | Pure shadcn | 21st.dev satisfies UI-05 requirement; it extends shadcn with community components |

**Installation:**
```bash
# In web/ directory
pnpm add next-themes
pnpm dlx shadcn@latest add sidebar dropdown-menu avatar sheet tooltip
```

## Architecture Patterns

### Recommended Project Structure
```
web/src/
├── app/
│   ├── (auth)/                  # Auth pages (login) -- no sidebar
│   │   └── page.tsx             # Move current page.tsx here
│   ├── (dashboard)/             # Dashboard layout group -- has sidebar
│   │   ├── layout.tsx           # SidebarProvider + AppSidebar + Navbar + main
│   │   ├── page.tsx             # Dashboard home (current dashboard/page.tsx)
│   │   ├── profiles/
│   │   │   └── page.tsx         # Placeholder profiles list (Phase 9)
│   │   ├── analyses/
│   │   │   └── page.tsx         # Placeholder analyses page
│   │   ├── analysis/
│   │   │   └── [listingId]/
│   │   │       └── page.tsx     # Existing analysis detail page
│   │   └── settings/
│   │       └── page.tsx         # Placeholder settings page
│   ├── layout.tsx               # Root layout with ThemeProvider
│   └── globals.css              # Existing (already has dark theme vars)
├── components/
│   ├── app-sidebar.tsx          # Main sidebar component
│   ├── nav-main.tsx             # Sidebar navigation items
│   ├── nav-user.tsx             # Sidebar footer user section
│   ├── theme-provider.tsx       # next-themes ThemeProvider wrapper
│   ├── theme-toggle.tsx         # Dark/light mode toggle button
│   └── ui/                      # shadcn components (existing)
│       ├── sidebar.tsx          # shadcn sidebar (to add)
│       ├── dropdown-menu.tsx    # (to add)
│       ├── avatar.tsx           # (to add)
│       ├── sheet.tsx            # (to add)
│       └── ...existing...
├── hooks/
│   └── use-mobile.ts            # Mobile detection hook (shadcn sidebar dep)
└── lib/
    └── ...existing...
```

### Pattern 1: Route Group Layout (Auth vs Dashboard)
**What:** Use Next.js route groups `(auth)` and `(dashboard)` to apply different layouts
**When to use:** When login page should NOT have sidebar but all dashboard pages should
**Example:**
```typescript
// app/(dashboard)/layout.tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {/* Navbar content: profile switcher, theme toggle, user menu */}
        </header>
        <main className="flex-1 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

### Pattern 2: ThemeProvider in Root Layout
**What:** Wrap entire app with next-themes ThemeProvider at root level
**When to use:** Always -- theme must apply to all pages including login
**Example:**
```typescript
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Pattern 3: Theme Toggle Component
**What:** A button that cycles through system/light/dark themes
**When to use:** In the navbar
**Example:**
```typescript
// components/theme-toggle.tsx
"use client"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### Pattern 4: Profile Switcher Placeholder
**What:** A dropdown showing the active profile name with placeholder data
**When to use:** In the navbar, wired to real data in Phase 9
**Example:**
```typescript
// Placeholder in navbar
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="gap-2">
      <span className="text-sm">Meine Suche</span>
      <ChevronDown className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Meine Suche (active)</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem disabled>Manage profiles...</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Anti-Patterns to Avoid
- **Server-side cookie reading for sidebar state in Next.js 16:** There is a known bug (shadcn-ui/ui#9189) where reading cookies in a server component for sidebar state blocks route rendering in Next.js 16. Use `defaultOpen={true}` as a static default instead of reading cookies. Sidebar state persists via the component's internal client-side logic.
- **Wrapping html/body with Client Components:** ThemeProvider must be a separate client component imported into the server layout. The html and body tags stay in the server component.
- **Using `&:is(.dark *)` for dark mode variant:** The current globals.css uses `(&:is(.dark *))` which only matches descendants of `.dark`, not the `.dark` element itself. Should be updated to `(&:where(.dark, .dark *))` or `(&:is(.dark, .dark *))` for complete coverage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar with mobile drawer | Custom sidebar + custom Sheet | shadcn sidebar component | Handles mobile detection, Sheet overlay, keyboard shortcuts, collapsible states, ARIA attributes |
| Dark mode toggle with system preference | Manual matchMedia listener + localStorage + class toggle | next-themes | Handles hydration mismatch, system preference detection, SSR flash prevention, localStorage persistence |
| Dropdown menus | Custom popover + click-outside detection | shadcn dropdown-menu (Base UI) | Handles focus management, keyboard navigation, ARIA, positioning, animation |
| User avatar with fallback | Custom img + error handling | shadcn avatar | Handles image loading, fallback initials, accessible alt text |
| Mobile detection | Custom window.innerWidth listener | shadcn's useMobile hook (comes with sidebar) | Handles SSR, resize events, debouncing |

**Key insight:** The shadcn sidebar component alone replaces ~500 lines of custom layout code. It includes mobile Sheet, keyboard shortcuts, collapsible state management, cookie persistence, and CSS variable-driven sizing. Building this from scratch would take a full sprint.

## Common Pitfalls

### Pitfall 1: Dark Mode Hydration Flash (FOUC)
**What goes wrong:** On first load, page renders in light mode then flashes to dark mode
**Why it happens:** Server renders without theme class; client applies it after hydration
**How to avoid:** Use `suppressHydrationWarning` on `<html>`, set `disableTransitionOnChange` on ThemeProvider, and ensure `defaultTheme="system"` so next-themes injects a script to set the class before React hydrates
**Warning signs:** Brief white flash on dark-mode-preferring browsers

### Pitfall 2: Tailwind v4 Dark Variant Selector Mismatch
**What goes wrong:** `dark:` Tailwind classes don't apply in dark mode
**Why it happens:** The `@custom-variant dark` selector doesn't match how next-themes applies the class
**How to avoid:** Ensure globals.css has `@custom-variant dark (&:where(.dark, .dark *));` (not just `(&:is(.dark *))`) and next-themes uses `attribute="class"`
**Warning signs:** Dark theme toggles in DevTools but Tailwind dark: classes don't apply. The current globals.css uses `(&:is(.dark *))` which may need updating.

### Pitfall 3: Base UI Accordion defaultValue Type Mismatch
**What goes wrong:** Accordion sections don't open by default
**Why it happens:** Base UI Accordion expects `defaultValue` as an array of string values matching Item `value` props. Current code passes `defaultValue={[0, 1, 2]}` (numbers) to AccordionItems that have no explicit `value` prop.
**How to avoid:** Add explicit string `value` props to AccordionItem components and pass matching strings in `defaultValue`: `defaultValue={["filters", "criteria", "weights"]}`
**Warning signs:** Accordion renders but all sections are collapsed on mount

### Pitfall 4: Next.js 16 Cookie Blocking with SidebarProvider
**What goes wrong:** Page rendering blocks because sidebar tries to read cookie on server
**Why it happens:** shadcn sidebar persistence reads `sidebar_state` cookie in server component, which in Next.js 16 triggers a "blocking route" error
**How to avoid:** Do NOT read cookies for sidebar state. Use `<SidebarProvider defaultOpen={true}>` with a static default. The sidebar component handles client-side state persistence internally.
**Warning signs:** "Data that blocks navigation was accessed" console error

### Pitfall 5: Route Group Layout Migration Breaks Existing Pages
**What goes wrong:** Moving pages into `(dashboard)/` route group breaks existing URLs or causes 404s
**Why it happens:** Route groups `()` don't affect URL structure but file moves can break imports or middleware patterns
**How to avoid:** Route groups are purely organizational -- `app/(dashboard)/page.tsx` serves `/` not `/(dashboard)/`. Move files carefully and verify all internal links. The login page at `/` should become `app/(auth)/page.tsx` or stay at root.
**Warning signs:** 404 errors after restructuring, broken `redirect('/')` calls

### Pitfall 6: CSS Variable Conflicts Between Theme Systems
**What goes wrong:** Sidebar or UI components look wrong in dark mode
**Why it happens:** globals.css already defines dark theme CSS variables (--sidebar-*, --background, etc.) via `.dark` class. If next-themes or the sidebar component introduces conflicting variable definitions, visual bugs appear.
**How to avoid:** next-themes with `attribute="class"` adds `.dark` class to `<html>`, which is exactly what the existing CSS variables target. Do NOT create a separate theme system. Use the existing CSS variables.
**Warning signs:** Colors that don't switch, or sidebar looking different from main content in dark mode

## Code Examples

### Installing shadcn Components (Base UI variant)
```bash
# Source: shadcn docs (components are auto-detected as base-nova from components.json)
cd web
pnpm dlx shadcn@latest add sidebar dropdown-menu avatar sheet tooltip
```

### ThemeProvider Setup
```typescript
// Source: shadcn dark mode docs (https://ui.shadcn.com/docs/dark-mode/next)
// components/theme-provider.tsx
"use client"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### Sidebar with Navigation Items
```typescript
// Source: shadcn sidebar docs (https://ui.shadcn.com/docs/components/base/sidebar)
// components/app-sidebar.tsx
"use client"
import { Home, User, BarChart3, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Profiles", url: "/profiles", icon: User },
  { title: "Analyses", url: "/analyses", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Logo / App name */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* User menu */}
      </SidebarFooter>
    </Sidebar>
  )
}
```

### Fixing Accordion defaultValue
```typescript
// BEFORE (current code - type mismatch):
<Accordion multiple defaultValue={[0, 1, 2]}>
  <AccordionItem>...</AccordionItem>  {/* no value prop */}

// AFTER (correct):
<Accordion multiple defaultValue={["filters", "criteria", "weights"]}>
  <AccordionItem value="filters">...</AccordionItem>
  <AccordionItem value="criteria">...</AccordionItem>
  <AccordionItem value="weights">...</AccordionItem>
```

### Fixing Dark Mode Variant Selector
```css
/* BEFORE (current - may miss direct .dark element styles): */
@custom-variant dark (&:is(.dark *));

/* AFTER (correct - matches both .dark and descendants): */
@custom-variant dark (&:where(.dark, .dark *));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix-only shadcn | Base UI + Radix dual support in shadcn v4 | Jan 2026 | Project already uses base-nova; install components with same CLI |
| asChild prop (Radix pattern) | render prop (Base UI pattern) | shadcn v4 base-nova | Base UI components use `render` prop not `asChild`; but shadcn wrapper components like SidebarMenuButton may still expose `asChild` for Next.js Link integration |
| tailwind.config.js darkMode | @custom-variant dark in CSS | Tailwind v4 | No config file needed; dark mode configured in globals.css |
| Manual theme toggle | next-themes with system detection | Stable since 2023 | Industry standard; handles all edge cases |
| Number-based accordion defaultValue | String-based value identifiers | Base UI 1.x | Must use string values matching Item value props |

**Deprecated/outdated:**
- `darkMode: 'class'` in tailwind.config.js -- replaced by `@custom-variant dark` in Tailwind v4
- `asChild` prop on Base UI components -- Base UI uses `render` prop instead (but shadcn wrappers may still expose `asChild` for composability with Next.js Link)
- Cookie-based sidebar persistence in Next.js 16 -- causes blocking route errors; use static defaultOpen instead

## Open Questions

1. **Which 21st.dev component to integrate (UI-05)?**
   - What we know: 21st.dev is a community registry of shadcn-compatible components; installed via `npx shadcn@latest add "https://21st.dev/r/{author}/{component}"`
   - What's unclear: Which specific component adds value to this SaaS layout. A mode-toggle, animated sidebar trigger, or user-menu component would fit.
   - Recommendation: During implementation, browse 21st.dev for a mode-toggle or sidebar component, check its GitHub repo for stars/quality/recent maintenance, then install. This is the "research-first workflow" the requirement describes -- the agent evaluates before installing.

2. **SidebarMenuButton asChild vs render for Next.js Link**
   - What we know: Base UI uses `render` prop, but shadcn's wrapper components sometimes expose `asChild` for compatibility
   - What's unclear: Whether the Base UI sidebar variant's SidebarMenuButton uses `asChild` or `render` for Link integration
   - Recommendation: After installing the sidebar component, inspect the generated `sidebar.tsx` to determine the correct pattern. If `asChild` isn't available, use `render={<Link href={url} />}` pattern.

3. **Should login page move to (auth) route group or stay at root?**
   - What we know: Login page is currently at `app/page.tsx` (root `/`). Dashboard is at `app/dashboard/page.tsx`.
   - What's unclear: Whether to use route groups or keep login at root and wrap dashboard in a layout
   - Recommendation: Keep login at `app/page.tsx` (root) and create `app/(dashboard)/layout.tsx` for the sidebar layout. Move `app/dashboard/page.tsx` content to `app/(dashboard)/page.tsx` which also serves `/dashboard`. This minimizes URL changes.

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
| UI-01 | Sidebar renders with 4 nav items, collapses on mobile | unit | `cd web && pnpm vitest run src/__tests__/sidebar.test.tsx -x` | No -- Wave 0 |
| UI-02 | Navbar renders user identity, profile name placeholder, profile switcher | unit | `cd web && pnpm vitest run src/__tests__/navbar.test.tsx -x` | No -- Wave 0 |
| UI-03 | Theme toggle switches between light/dark/system, persists choice | unit | `cd web && pnpm vitest run src/__tests__/theme-toggle.test.tsx -x` | No -- Wave 0 |
| UI-05 | 21st.dev component renders without errors | smoke | `cd web && pnpm vitest run src/__tests__/twenty-first-component.test.tsx -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && pnpm vitest run`
- **Per wave merge:** `cd web && pnpm vitest run && pnpm build`
- **Phase gate:** Full suite green + successful build before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/sidebar.test.tsx` -- covers UI-01: sidebar navigation items, active state, collapse behavior
- [ ] `web/src/__tests__/navbar.test.tsx` -- covers UI-02: user identity display, profile switcher placeholder
- [ ] `web/src/__tests__/theme-toggle.test.tsx` -- covers UI-03: theme switching logic
- [ ] `web/src/__tests__/twenty-first-component.test.tsx` -- covers UI-05: 21st.dev component smoke test
- [ ] No additional framework install needed (vitest + jsdom already configured)

## Sources

### Primary (HIGH confidence)
- shadcn sidebar docs -- https://ui.shadcn.com/docs/components/base/sidebar -- component structure, props, installation
- shadcn dark mode docs -- https://ui.shadcn.com/docs/dark-mode/next -- ThemeProvider setup, next-themes integration
- shadcn sidebar blocks -- https://ui.shadcn.com/blocks/sidebar -- 16 pre-built sidebar templates
- Base UI accordion docs -- https://base-ui.com/react/components/accordion -- defaultValue type, value prop, render prop (no asChild)
- shadcn changelog Jan 2026 -- https://ui.shadcn.com/docs/changelog/2026-01-base-ui -- Base UI support for all components
- shadcn CLI v4 changelog -- https://ui.shadcn.com/docs/changelog/2026-03-cli-v4 -- latest CLI capabilities, presets

### Secondary (MEDIUM confidence)
- next-themes GitHub -- https://github.com/pacocoursey/next-themes -- SSR integration, attribute configuration
- 21st.dev GitHub -- https://github.com/serafimcloud/21st -- registry protocol, installation command pattern
- Tailwind v4 dark mode with next-themes tutorial -- https://www.sujalvanjare.com/blog/dark-mode-nextjs15-tailwind-v4 -- @custom-variant dark selector pattern
- shadcn-ui/ui#9189 -- https://github.com/shadcn-ui/ui/issues/9189 -- Next.js 16 cookie blocking bug with SidebarProvider

### Tertiary (LOW confidence)
- 21st.dev component quality/availability -- browsing required at implementation time; exact component for UI-05 TBD

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- project already uses shadcn v4 base-nova + Base UI; extending with sidebar/dropdown-menu/avatar is the natural path
- Architecture: HIGH -- route group layout pattern is well-documented Next.js pattern; shadcn sidebar API is stable
- Pitfalls: HIGH -- verified via official docs (Base UI accordion types), GitHub issues (Next.js 16 cookie blocking), and cross-reference (Tailwind v4 dark variant selector)
- 21st.dev integration: MEDIUM -- registry protocol is documented and verified, but specific component selection requires runtime research

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack, well-documented components)
