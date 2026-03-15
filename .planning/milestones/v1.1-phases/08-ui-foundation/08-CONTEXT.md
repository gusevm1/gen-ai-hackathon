# Phase 8 Context: UI Foundation

## Vision

Transform the web app from a single-page dashboard into a professional SaaS layout with sidebar navigation, navbar with user identity, and dark/light mode. This is the shell that Phase 9's profile management pages live inside.

## Layout Structure

```
┌──────────────────────────────────────────────────┐
│  Navbar: Logo | Active Profile ▾ | Dark/Light | Avatar ▾  │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│  Side  │                                         │
│  bar   │          Main Content Area              │
│        │                                         │
│  Home  │          (Phase 9+ pages render here)   │
│  Prof  │                                         │
│  Anal  │                                         │
│  Sett  │                                         │
│        │                                         │
├────────┴─────────────────────────────────────────┤
│  (collapsible sidebar on mobile)                 │
└──────────────────────────────────────────────────┘
```

### Sidebar Navigation
- **Dashboard / Home** — overview page
- **Profiles** — list + manage profiles (Phase 9)
- **Analyses** — scored listings history (future)
- **Settings** — account, language (future)
- Collapsible on mobile (hamburger menu)

### Navbar
- Left: App logo/name
- Center/Right: Active profile name with dropdown switcher (wired in Phase 9, placeholder here)
- Right: Dark/light toggle, user avatar with sign-out

### Dark/Light Mode
- Toggle in navbar
- Respects system preference on first load
- Persists choice in localStorage

## Component Library

The roadmap mentions 21st.dev components. Research first — check GitHub quality/usage before installing. Alternatives: shadcn/ui (most popular for Next.js), Radix primitives, or keep current setup.

Current stack: Next.js + Tailwind. No component library installed yet.

## What This Phase Builds

1. **Layout shell** — sidebar + navbar + main content area as a shared layout component
2. **Navigation** — sidebar links with active state, mobile responsiveness
3. **Dark/light mode** — toggle, system preference detection, persistence
4. **Component library integration** — research and install one library for consistent UI primitives
5. **Placeholder pages** — empty profile list page, empty analyses page (content filled in Phase 9)

## What This Phase Does NOT Build

- No profile CRUD or preferences form (Phase 9)
- No schema changes (Phase 7)
- No backend changes
- No extension changes

## Design Considerations

- The preferences form (Phase 9) will use accordion sections on a single scrollable page — the layout must support full-width content areas
- Dark mode must not break the preferences form styling built in Phase 9
- Active profile display in navbar is a placeholder until Phase 9 wires it to real data
