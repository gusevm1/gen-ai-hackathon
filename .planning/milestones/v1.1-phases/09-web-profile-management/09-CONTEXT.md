# Phase 9 Context: Web Profile Management

## Vision

Users can fully manage multiple search profiles from the web app. The preferences form uses the canonical schema from Phase 7, with the single-page accordion layout agreed upon. The form distinguishes dealbreakers from weighted preferences using importance chips. Profile CRUD (create, rename, duplicate, delete) with active profile switching.

## Preferences Form Layout (agreed with user)

Single scrollable page with collapsible accordion sections:

```
┌─────────────────────────────────────┐
│ Profile: "Zurich Family Apartment"  │  ← editable profile name
├─────────────────────────────────────┤
│ ▼ Location & Type                   │
│   Location: [Zurich        ]        │
│   Offer: (•) Rent  ( ) Buy         │
│   Property: [APARTMENT ▾]          │
│                                     │
│ ▼ Budget              [Dealbreaker ◻]│
│   Min CHF: [1500]  Max CHF: [2500] │
│   ◻ Hard limit — score 0 if over   │
│                                     │
│ ▼ Size & Rooms        [Dealbreaker ◻]│
│   Rooms: [2] - [4]                  │
│   Space: [50] - [100] sqm          │
│   ◻ Hard limit — score 0 if under  │
│   Floor: ( ) Any (•) Not ground    │
│                                     │
│ ▼ Features & Availability           │
│   [Balcony ✓] [Elevator] [Parking]  │
│   [Pets ✓] [New build] [Pool]      │
│   Available: [Any ▾]               │
│                                     │
│ ▼ Soft Criteria                     │
│   [near lake ✕] [quiet street ✕]   │
│   [Add criterion... ]              │
│                                     │
│ ▼ What Matters Most                 │
│   Location:  [Low] [Med] [HIGH] [Crit]│
│   Price:     [Low] [Med] [High] [CRIT]│
│   Size:      [Low] [MED] [High] [Crit]│
│   Features:  [LOW] [Med] [High] [Crit]│
│   Condition: [Low] [MED] [High] [Crit]│
│                                     │
│ [Save Profile]                      │
└─────────────────────────────────────┘
```

## Profile List Page

Cards showing all profiles for the user:

```
┌──────────────────────┐  ┌──────────────────────┐
│ ★ Zurich Family      │  │   Budget Studio      │
│                      │  │                      │
│ Rent · Zurich        │  │ Rent · Basel         │
│ CHF 1,500-2,500      │  │ CHF 800-1,200        │
│ 2-4 rooms            │  │ 1-2 rooms            │
│                      │  │                      │
│ [Edit] [Active ✓]    │  │ [Edit] [Set Active]  │
├──────────────────────┤  ├──────────────────────┤
│ ··· Rename|Dup|Delete│  │ ··· Rename|Dup|Delete│
└──────────────────────┘  └──────────────────────┘

                [+ New Profile]
```

- Star badge on active profile
- "Set Active" calls `set_active_profile()` RPC
- "Delete" blocked if last remaining profile
- "Duplicate" creates a copy with "(Copy)" suffix
- "Edit" navigates to the preferences form for that profile

## Canonical Schema Reference

See `07-CONTEXT.md` for the full canonical schema. Key points for the form:

- **Dealbreaker toggles** on budget, rooms, living space — boolean flags stored alongside the numeric ranges
- **Importance chips** (Critical/High/Medium/Low) replace 0-100 sliders — stored in `importance` object
- **Features** are typed chips from a predefined list (balcony, elevator, parking, pets, new build, etc.)
- **Soft criteria** are free text tags — user types and presses enter to add
- **Floor preference** and **availability** are new fields not in the current form

## What This Phase Builds

1. **Profile list page** — cards with summary, CRUD actions, active profile switching
2. **Preferences form** — single-page accordion layout using canonical schema
3. **Profile CRUD API calls** — create, rename, duplicate, delete via Supabase RLS
4. **Active profile switching** — calls `set_active_profile()` RPC, updates navbar display
5. **Analysis page redesign** — professional layout for demo presentations

## Backend Dependencies

Phase 7 must be complete — the canonical Pydantic model and Zod schema must exist before this phase builds the form. No additional backend changes should be needed in this phase since the schema contract is locked in Phase 7.

The `profiles` table already supports CRUD via RLS policies (Phase 5). The `set_active_profile()` RPC already exists (Phase 5). This phase only needs frontend work against existing APIs.

## What This Phase Does NOT Build

- No extension changes (Phase 10)
- No schema definition (Phase 7 — already done)
- No layout shell (Phase 8 — already done)
