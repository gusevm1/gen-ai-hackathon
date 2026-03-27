---
focus: tech
generated: 2026-03-27
---

# Technology Stack

## Browser Extension (`extension/`)

| Layer | Technology | Version |
|---|---|---|
| Framework | WXT (Web Extension Toolkit) | ^0.20.18 |
| UI | React | ^19.2.4 |
| Language | TypeScript | ^5.9.3 |
| Styling | Tailwind CSS | ^3.4.19 |
| UI Components | Radix UI primitives + shadcn/ui pattern | various |
| Forms | React Hook Form + @hookform/resolvers | ^7.71.2 |
| Validation | Zod | ^4.3.6 |
| Auth/DB | @supabase/supabase-js | ^2.99.1 |
| Icons | lucide-react | ^0.577.0 |
| Build | WXT (Vite-based) | — |
| Test runner | Vitest | ^4.0.18 |
| Test DOM | happy-dom | ^20.8.3 |
| Test utils | @testing-library/react | ^16.3.2 |
| Package manager | npm | — |

**Target:** Chrome MV3 (also buildable for Firefox)

## Backend (`backend/`)

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Runtime | Python 3 (venv) |
| ASGI server | Uvicorn (with standard extras) |
| HTTP client | httpx (async) |
| AI | anthropic SDK (AsyncAnthropic) |
| DB client | supabase-py |
| Config | python-dotenv |
| Test runner | pytest + pytest-asyncio (auto mode) |

**Deployed on:** AWS EC2 (Ubuntu), running via nohup/uvicorn on port 8000

**Claude models used:**
- Scoring: `claude-haiku-4-5-20251001` (configurable via `CLAUDE_MODEL` env var)
- Chat: `claude-sonnet-4-6` (conversational profile builder)

## Web App (`web/`)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| UI Components | Radix UI + shadcn/ui | various |
| Auth/DB | @supabase/ssr + @supabase/supabase-js | ^0.9.0 / ^2.99.0 |
| Forms | React Hook Form + Zod | — |
| Markdown | react-markdown | ^10.1.0 |
| Theme | next-themes | ^0.4.6 |
| Linting | ESLint 9 + eslint-config-next | — |
| Testing | Vitest + @testing-library/react | ^4.0.18 |
| Package manager | pnpm (workspace) | — |

**Deployed on:** Vercel (auto-deploy on push to main)

## Supabase (`supabase/`)

| Layer | Technology |
|---|---|
| Platform | Supabase (hosted Postgres + Auth + Edge Functions) |
| Edge runtime | Deno (TypeScript) |
| DB extension | moddatetime (auto-update `updated_at`) |
| Migrations | 3 sequential SQL files |
| Project ref | `mlhtozdtiorkemamzjjc` |
