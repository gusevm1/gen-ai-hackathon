---
focus: quality
generated: 2026-03-27
---

# Code Conventions

## TypeScript (Extension + Web)

- **Strict mode** via WXT/Next.js generated tsconfig
- Path alias `@/*` → `./src/*` in both extension and web
- `import type { ... }` for type-only imports
- Zod schemas are the source of truth for data shapes; TypeScript types inferred via `z.infer<>`
- `as const` for literal narrowing (e.g. `schemaVersion: 1 as const`)
- Interfaces for component props and hook return types; types for discriminated unions and schema-derived types

## Python (Backend)

- **Type hints** throughout (`from __future__ import annotations`)
- **Pydantic models** for all request/response shapes (`BaseModel`)
- **Singleton services** pattern: one module-level instance per service (e.g. `claude_scorer`, `flatfox_client`)
- **Async-first**: all I/O uses `async`/`await`; sync Supabase calls wrapped in `asyncio.to_thread()`
- **Logging**: `logging.getLogger(__name__)` per module, structured log messages
- **Docstrings**: module-level and class-level docstrings; inline comments for non-obvious logic
- Fire-and-forget Supabase writes: save failures logged but never bubble up to caller

## React Components (Extension + Web)

- **Functional components only** — no class components
- Named exports (not default) for all components
- Props interface defined above the component: `interface FooProps { ... }`
- Default prop values via destructuring: `{ isEditMode = false }: FooProps`
- Large components sectioned with `// -- Section name --` comments
- `useEffect` for side effects; `useCallback`/`useMemo` for stable references
- Async event handlers extracted as named arrow functions

## Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| React components | PascalCase | `ScoreBadge`, `WizardShell` |
| Component files | PascalCase `.tsx` | `ScoreBadge.tsx` |
| Hooks | `use` prefix + PascalCase | `useWeightSliders` |
| Hook files | camelCase `.ts` | `useWeightSliders.ts` |
| Utility functions | camelCase | `redistributeWeights` |
| Zod schemas | PascalCase + `Schema` | `PreferenceProfileSchema` |
| Inferred types | PascalCase | `PreferenceProfile`, `ScoreResponse` |
| Storage instances | camelCase + `Storage` | `profileStorage`, `themeStorage` |
| Constants | SCREAMING_SNAKE_CASE | `STEP_LABELS`, `MAX_LOOP_ITERATIONS` |
| Python classes | PascalCase | `ClaudeScorer`, `FlatfoxClient` |
| Python functions | snake_case | `score_listing`, `get_listing` |
| Python modules | snake_case | `claude.py`, `profile_storage.py` |
| Test files (TS) | `*.test.ts` | `weight-redistribution.test.ts` |
| Test files (Python) | `test_*.py` | `test_scoring.py` |

## Import / Export Patterns

**TypeScript:**
- Named exports throughout — no default exports for components or hooks
- `@/` alias for all cross-directory imports
- Relative imports only within the same directory

**Python:**
- Module-level singleton instances exported from service modules
- Routers registered centrally in `main.py` via `app.include_router()`
- Models imported from `app.models.*`, services from `app.services.*`

## CSS / Styling (Extension + Web)

- **Tailwind CSS** — extension uses v3, web uses v4
- **shadcn/ui** component pattern (Radix UI primitives + Tailwind variants)
- `cn()` (clsx + tailwind-merge) for conditional class merging
- CSS variables for design tokens (`bg-background`, `text-foreground`, `text-primary`, etc.)
- Dark mode: class-based strategy (extension toggles via `themeStorage`; web uses `next-themes`)
- No inline styles; no magic number pixel values
