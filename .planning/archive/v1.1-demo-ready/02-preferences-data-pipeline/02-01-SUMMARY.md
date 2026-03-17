---
phase: 02-preferences-data-pipeline
plan: 01
subsystem: ui, database
tags: [next.js, react-hook-form, zod, shadcn-ui, base-ui, supabase, preferences, accordion, slider]

# Dependency graph
requires:
  - phase: 01-foundation-onboarding
    provides: Supabase auth + user_preferences table with JSONB column and RLS
provides:
  - Zod preferences schema with defaults for all PREF fields
  - FEATURE_SUGGESTIONS constant mapping 12 Flatfox attribute names to labels
  - Server actions for save (upsert) and load preferences via Supabase
  - PreferencesForm with Accordion sections for standard filters, soft criteria, weights
  - Dashboard page with auth guard and server-side preference loading
  - 8 passing schema validation tests
affects: [03-scoring-pipeline, 04-extension-ui]

# Tech tracking
tech-stack:
  added: [next@16.1.6, react@19.2.3, tailwindcss@4.2.1, zod@4.3.6, react-hook-form@7.71.2, @hookform/resolvers@5.2.2, @supabase/ssr@0.9.0, @supabase/supabase-js@2.99.0, @base-ui/react, shadcn-ui, lucide-react@0.577.0, vitest@4.0.18]
  patterns: [Server actions for Supabase persistence, zodResolver cast for Zod v4 compatibility, Base UI Accordion with multiple prop, watch/setValue pattern for string array form fields]

key-files:
  created:
    - web/src/lib/schemas/preferences.ts
    - web/src/lib/constants/features.ts
    - web/src/app/dashboard/actions.ts
    - web/src/app/dashboard/page.tsx
    - web/src/components/preferences/preferences-form.tsx
    - web/src/components/preferences/standard-filters.tsx
    - web/src/components/preferences/soft-criteria.tsx
    - web/src/components/preferences/weight-sliders.tsx
    - web/src/__tests__/preferences-schema.test.ts
    - web/src/lib/supabase/server.ts
    - web/src/lib/supabase/client.ts
    - web/vitest.config.mts
  modified: []

key-decisions:
  - "Scaffolded Next.js app from scratch (Phase 1 was not executed after Flatfox pivot)"
  - "Used zodResolver cast for Zod v4 + React Hook Form v7 type compatibility"
  - "Used watch/setValue pattern for softCriteria string array (not useFieldArray, which expects objects)"
  - "Used Base UI Accordion 'multiple' boolean prop instead of Radix 'type=multiple' (shadcn v4 uses Base UI)"
  - "Provided explicit default object for weights in Zod schema (Zod v4 nested defaults not auto-applied)"

patterns-established:
  - "Pattern: Server actions with 'use server' for Supabase data operations"
  - "Pattern: zodResolver cast as Resolver<T> for Zod v4 schemas"
  - "Pattern: Base UI Accordion with index-based defaultValue array"
  - "Pattern: Nullable number fields with null-on-empty-string in onChange handlers"
  - "Pattern: Form sections as separate components receiving UseFormReturn<T> as prop"

requirements-completed: [PREF-01, PREF-02, PREF-03, PREF-04, PREF-05, PREF-06, PREF-07, PREF-08, PREF-09, PREF-10]

# Metrics
duration: 10min
completed: 2026-03-10
---

# Phase 02 Plan 01: Preferences Form Summary

**Next.js preferences form with Zod v4 schema, React Hook Form v7, shadcn/ui Base UI Accordion, 6 standard filter fields, toggleable feature suggestion badges, 5 category weight sliders, and Supabase JSONB upsert persistence**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-10T14:09:31Z
- **Completed:** 2026-03-10T14:19:55Z
- **Tasks:** 3
- **Files modified:** 42

## Accomplishments
- Full preferences form with 3 collapsible Accordion sections covering all 10 PREF requirements
- Zod v4 schema with proper defaults (RENT, ANY, all weights 50, nullable number fields)
- 12 Flatfox feature suggestion badges that toggle on/off as soft criteria
- Dynamic free-text criterion fields with add/remove capability
- Server actions for Supabase JSONB upsert with onConflict and getUser auth validation
- 8 passing schema validation tests covering defaults, round-trip, and rejection cases
- Build, type-check, and all tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod preferences schema, feature constants, server actions, and install dependencies** - `991704c` (feat)
2. **Task 2: Build preferences form components (standard filters, soft criteria, weight sliders)** - `cd5ba2a` (feat)
3. **Task 3: Wire preferences form into dashboard page with load/save persistence** - `c4ebcb4` (feat)

## Files Created/Modified
- `web/src/lib/schemas/preferences.ts` - Zod v4 preferences schema with defaults for all fields
- `web/src/lib/constants/features.ts` - 12 Flatfox attribute feature suggestions with labels
- `web/src/app/dashboard/actions.ts` - Server actions: savePreferences (upsert), loadPreferences
- `web/src/app/dashboard/page.tsx` - Dashboard page with auth guard and server-side preference loading
- `web/src/components/preferences/preferences-form.tsx` - Main form with Base UI Accordion, zodResolver, save button
- `web/src/components/preferences/standard-filters.tsx` - Location, offer type, property type, budget, rooms, living space
- `web/src/components/preferences/soft-criteria.tsx` - Feature suggestion badges + dynamic free-text criteria
- `web/src/components/preferences/weight-sliders.tsx` - 5 category weight sliders with Base UI Slider
- `web/src/__tests__/preferences-schema.test.ts` - 8 schema validation tests
- `web/src/lib/supabase/server.ts` - Server-side Supabase client with cookie handling
- `web/src/lib/supabase/client.ts` - Browser-side Supabase client
- `web/vitest.config.mts` - Vitest config with React plugin and @ alias
- `web/src/components/ui/form.tsx` - React Hook Form + Radix Label form components (manual creation)

## Decisions Made
- **Scaffolded Next.js from scratch**: Phase 1 was re-planned after Flatfox pivot but never re-executed. The web/ directory did not exist. Created full Next.js 16 scaffold with Tailwind v4 as a prerequisite (deviation Rule 3).
- **zodResolver cast**: Zod v4's `.default()` makes fields optional at the input level, causing type mismatch with React Hook Form. Fixed with `as Resolver<Preferences>` cast.
- **watch/setValue for string arrays**: Plan recommended option (a) over useFieldArray for softCriteria since React Hook Form useFieldArray expects objects, not primitive strings.
- **Explicit weights default**: Zod v4 does not auto-apply inner field defaults when outer `.default({})` kicks in. Provided full `{ location: 50, price: 50, ... }` default object.
- **Base UI (not Radix)**: shadcn/ui v4 with Tailwind v4 uses Base UI primitives instead of Radix. Accordion uses `multiple` boolean prop and index-based `defaultValue`, not `type="multiple"` with string values.
- **Manual form.tsx**: shadcn v4 `add form` command did not create the Form component. Created manually with React Hook Form + Radix Label integration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scaffolded Next.js app (Phase 1 prerequisite missing)**
- **Found during:** Task 1 (before creating any files)
- **Issue:** The `web/` directory did not exist. Phase 1 was re-planned after the Flatfox pivot but never re-executed, so no Next.js app, no Supabase client, no shadcn/ui existed.
- **Fix:** Ran `create-next-app` with TypeScript, Tailwind, App Router. Installed all dependencies. Created Supabase SSR client files. Initialized shadcn/ui and added all needed components.
- **Files modified:** Entire web/ directory (37 files)
- **Verification:** Build succeeds, imports resolve
- **Committed in:** 991704c (Task 1 commit)

**2. [Rule 3 - Blocking] Removed nested .git directory from create-next-app**
- **Found during:** Task 1 (git commit)
- **Issue:** `create-next-app` initialized a separate git repo inside `web/`, causing git to treat it as a submodule and refuse to add files
- **Fix:** Removed `web/.git` directory, re-added files to parent repo
- **Files modified:** web/.git (deleted)
- **Verification:** All files staged and committed normally
- **Committed in:** 991704c (Task 1 commit)

**3. [Rule 1 - Bug] Fixed Zod v4 nested defaults not auto-applying**
- **Found during:** Task 1 (schema test failure)
- **Issue:** `weights: z.object({...}).default({})` in Zod v4 creates empty object, not applying inner field defaults. Schema test for `weights.location === 50` failed.
- **Fix:** Changed to explicit default: `.default({ location: 50, price: 50, size: 50, features: 50, condition: 50 })`
- **Files modified:** web/src/lib/schemas/preferences.ts
- **Verification:** All 8 schema tests pass
- **Committed in:** 991704c (Task 1 commit)

**4. [Rule 3 - Blocking] Used .mts extension for vitest config (ESM compatibility)**
- **Found during:** Task 1 (test execution)
- **Issue:** vitest.config.ts failed with ERR_REQUIRE_ESM because Vite 7 is ESM-only and the project doesn't have `"type": "module"` in package.json
- **Fix:** Renamed to vitest.config.mts for explicit ESM module resolution
- **Files modified:** web/vitest.config.mts
- **Verification:** All tests execute successfully
- **Committed in:** 991704c (Task 1 commit)

**5. [Rule 3 - Blocking] Created manual Form component (shadcn v4 missing form command)**
- **Found during:** Task 1 (shadcn form installation)
- **Issue:** `pnpm dlx shadcn@latest add form` silently did nothing - the form component does not exist in shadcn v4's registry
- **Fix:** Created web/src/components/ui/form.tsx manually with FormField, FormItem, FormLabel, FormControl, FormMessage components wrapping React Hook Form's Controller and Radix Label
- **Files modified:** web/src/components/ui/form.tsx
- **Verification:** Type check passes, components import and render correctly
- **Committed in:** 991704c (Task 1 commit)

**6. [Rule 1 - Bug] Fixed Base UI Accordion API (not Radix)**
- **Found during:** Task 2 (type check)
- **Issue:** Plan specified `type="multiple"` and `defaultValue={['filters', 'criteria', 'weights']}` but shadcn v4 uses Base UI Accordion which has `multiple` (boolean) prop and index-based defaultValue
- **Fix:** Changed to `multiple defaultValue={[0, 1, 2]}` and removed `value` props from AccordionItems
- **Files modified:** web/src/components/preferences/preferences-form.tsx
- **Verification:** Type check passes
- **Committed in:** cd5ba2a (Task 2 commit)

**7. [Rule 1 - Bug] Fixed zodResolver type mismatch with Zod v4**
- **Found during:** Task 2 (type check)
- **Issue:** zodResolver(preferencesSchema) returns input types where all fields with `.default()` are optional, but `useForm<Preferences>` expects the output type (non-optional after defaults)
- **Fix:** Cast resolver with `as Resolver<Preferences>` to match expected form type
- **Files modified:** web/src/components/preferences/preferences-form.tsx
- **Verification:** Type check passes
- **Committed in:** cd5ba2a (Task 2 commit)

**8. [Rule 1 - Bug] Fixed Base UI Slider onValueChange type handling**
- **Found during:** Task 2 (type check)
- **Issue:** Base UI Slider onValueChange passes `number | readonly number[]` but code used `vals[0]` which doesn't work on a plain number
- **Fix:** Added conditional handling: `const numVal = Array.isArray(val) ? val[0] : val`
- **Files modified:** web/src/components/preferences/weight-sliders.tsx
- **Verification:** Type check passes
- **Committed in:** cd5ba2a (Task 2 commit)

---

**Total deviations:** 8 auto-fixed (3 bugs, 5 blocking issues)
**Impact on plan:** All fixes were necessary for correctness and to unblock execution. The largest deviation was scaffolding the entire Next.js app because Phase 1 had not been re-executed after the Flatfox pivot. No scope creep.

## Issues Encountered
- Phase 1 infrastructure was missing (web/ directory did not exist) requiring full Next.js scaffold as prerequisite
- shadcn/ui v4 with Tailwind v4 uses Base UI primitives instead of Radix, requiring different prop API patterns
- Zod v4 has breaking changes from v3 for nested defaults and type inference with React Hook Form

## User Setup Required
None - no external service configuration required. Supabase environment variables (.env.local) have placeholder values that need to be set when Phase 1 auth is configured.

## Next Phase Readiness
- Preferences form complete, ready for Phase 3 scoring pipeline to read preferences from Supabase
- Zod schema establishes the contract for what the backend will receive
- Feature suggestion values map directly to Flatfox attribute names (ready for scoring comparison)
- Dashboard page pattern established for future pages (auth guard, server-side data loading)

---
*Phase: 02-preferences-data-pipeline*
*Completed: 2026-03-10*
