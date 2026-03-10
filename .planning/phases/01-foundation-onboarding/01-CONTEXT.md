# Phase 1: Infrastructure & Auth - Context

**Gathered:** 2026-03-10  
**Status:** Ready for planning

(make sure you git pull before starting the project to work of a clean slate and archive correctly)

## Phase Boundary

Scaffold all codebases (Next.js, FastAPI, WXT Chrome extension), deploy them (Vercel, EC2/Docker, Chrome), and wire Supabase auth (email/password) across website and extension. Create database tables for preferences and analyses. End state: user can sign up on website and log in with same credentials in extension, EC2 backend is reachable via Supabase edge function.



## Implementation Decisions

### Old extension code handling

- Archive existing `extension/` directory to `.planning/archive/extension-homegate/` for reference
- Scaffold a fresh WXT extension from scratch
- Reuse same stack: pnpm + shadcn/ui + Tailwind CSS
- All three entrypoints scaffolded: popup, background worker, content script
- Keep `extension/` at repo root (not monorepo `packages/` structure)

### Repository layout

- `extension/` — WXT Chrome extension (fresh scaffold)
- `web/` — Next.js app (App Router)
- `backend/` — FastAPI (Python)
- Top-level dirs at repo root, no monorepo tooling

### Next.js website (Phase 1 baseline)

- App Router (not Pages Router)
- Landing page: centered login/signup form only — no product pitch, no branding beyond minimal
- After login: empty dashboard shell showing user email, logout button, and placeholder for preferences (Phase 2 fills this in)
- Single profile per user (multi-profile deferred to future milestone)
- "Minimal UI, functionality first" — consistent with project principles

### Extension popup

- Logged out: inline email/password login form directly in popup (no redirect to website)
- Logged in: user email + logout button + "Open HomeMatch" link to Next.js site
- Content script activates on flatfox.ch only (not all sites)
- Content script is scaffold only in Phase 1 — no visible output, Phase 4 adds FAB and badges

### Supabase database schema

- Single JSONB column for user preferences (flexible, no migrations for schema changes, validated by Zod on frontend/backend)
- Separate analyses table for stored scores (user_id, listing_id, score, breakdown, created_at)
- All tables created in Phase 1 — Phase 2 and 3 can immediately use them
- Row-Level Security (RLS) enabled from day 1 — users can only read/write their own data

### Infrastructure setup notes

- Supabase: CLI + account need to be set up (no existing setup)
- AWS: CLI already configured
- Vercel: CLI already configured
- EC2 backend deployed via Docker

### Claude's Discretion

- Exact Supabase table column definitions and types
- Docker configuration for FastAPI deployment
- Supabase edge function implementation details
- Next.js project configuration (ESLint, TypeScript settings)
- Extension manifest permissions and icon assets
- Auth error handling and loading states



## Specific Ideas

- Dashboard should feel like a simple control panel — "here's your profile, here's where you edit it" — not a complex app
- Extension popup should be fast and lightweight — login form, nothing else until logged in
- Jobbmatch reference project can inform FastAPI + Supabase deployment patterns



## Existing Code Insights

### Reusable Assets

- Existing WXT config pattern (extension/wxt.config.ts) — can reference for new scaffold
- shadcn/ui component setup pattern (extension/components.json, tailwind.config.js) — reuse in new extension and potentially Next.js app
- Zod already used in project — continue using for preference schema validation

### Established Patterns

- TypeScript + ESM modules throughout
- pnpm as package manager
- Vitest for testing

### Integration Points

- This is mostly greenfield — Next.js, FastAPI, and fresh extension are new codebases
- Supabase is the central hub connecting all three: auth for website + extension, DB for preferences + analyses, edge functions for backend proxy
- Profile preferences schema (JSONB) created here will be consumed by Phase 2 (preferences form) and Phase 3 (scoring pipeline)
- Analyses table created here will be consumed by Phase 3 (score storage) and Phase 4 (full analysis page)



## Deferred Ideas

- Multi-profile support (user mentioned wanting profile selection) — future milestone per PROJECT.md
- Product pitch / branded landing page — can be added later, functionality first



---

*Phase: 01-foundation-onboarding*
*Context gathered: 2026-03-10*