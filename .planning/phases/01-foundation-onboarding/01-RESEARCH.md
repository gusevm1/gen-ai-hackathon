# Phase 1: Foundation & Onboarding - Research

**Researched:** 2026-03-07
**Domain:** Chrome Extension (MV3) with WXT framework, React onboarding wizard, chrome.storage.local persistence
**Confidence:** HIGH

## Summary

Phase 1 builds a Chrome extension from scratch using WXT (the leading MV3 extension framework) with React, shadcn/ui, and Tailwind CSS. The extension must scaffold four entrypoints (background service worker, content script for Homegate.ch, popup dashboard, and a full-page onboarding wizard), implement a 3-step wizard that mirrors Homegate's filter panel plus soft-criteria capture and weight allocation, and persist the complete user profile in `chrome.storage.local` with Zod v4 validation.

The WXT framework provides file-based entrypoints, auto-generated manifest, Vite-powered HMR, and a built-in typed storage layer (`wxt/storage`) with versioning and migrations -- eliminating the need for hand-rolled storage wrappers. shadcn/ui provides accessible, customizable React components (Slider, Select, Checkbox, Form, Card, Tabs, Button) that align with the warm/friendly design aesthetic. The project already uses Zod v4 (`^4.3.6`) and TypeScript, so schema validation for the preference profile can leverage existing patterns from `src/schema/listing.ts`.

**Primary recommendation:** Use WXT 0.20.x with `@wxt-dev/module-react`, shadcn/ui with Tailwind CSS v3 (not v4 -- v3 is battle-tested in WXT context), React Hook Form with `@hookform/resolvers` for form management, and WXT's built-in `storage.defineItem` for typed profile persistence with versioning.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Wizard flow**: 3-step wizard -- (1) Standard filters, (2) Soft criteria with LLM-assisted chat, (3) Weight allocation
- **Step 1 mirrors Homegate's filter panel**: Location+radius, buy/rent, category, price range, rooms, living space, year built, type, floor, availability, features/furnishings
- **Step 2 hybrid approach**: Category prompts with curated suggestions PLUS LLM-assisted chat for free-form criteria refinement
- **Step 3 weight allocation**: Sliders summing to 100%, proportional redistribution, dynamic categories from Steps 1+2 only
- **Linear navigation**: Back/next buttons, no step jumping
- **Per-step auto-save**: Resume where user left off if browser closed mid-wizard
- **Visual stack**: React + shadcn/ui + Tailwind CSS
- **Visual tone**: Warm & friendly, soft colors, rounded elements (Airbnb/Zillow warmth)
- **Accent color**: Homegate #E4006E pink/magenta
- **Light + dark mode**: Manual toggle
- **Full-page layout**: For onboarding (not popup)
- **Storage**: chrome.storage.local with Zod validation on save/load
- **Schema versioning**: `schemaVersion: 1` from day 1
- **Profile editing**: Popup has "Edit preferences" link reopening wizard in edit mode
- **Profile schema informs scoring pipeline**: Created here, consumed by Phases 2-4

### Claude's Discretion
- Exact LLM prompt design for the soft criteria chat assistant
- Suggested category prompts and their curated suggestion lists
- Proportional redistribution algorithm for weight sliders
- Loading states and transitions between wizard steps
- Dark mode color palette specifics (warm & friendly tone maintained)
- Popup dashboard layout and content (profile summary, on/off toggle, edit link)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ONBD-01 | Full-page onboarding wizard on first install | WXT unlisted page entrypoint + `chrome.runtime.onInstalled` in background.ts |
| ONBD-02 | Location + radius preference | shadcn/ui Input + Slider components; location autocomplete deferred to simple text input |
| ONBD-03 | Buy or rent selection | shadcn/ui RadioGroup or ToggleGroup component |
| ONBD-04 | Property type selection | shadcn/ui Select or multi-select pattern |
| ONBD-05 | Budget range (min/max CHF) | shadcn/ui dual Input fields with number formatting |
| ONBD-06 | Rooms range (min/max) | shadcn/ui dual Input or Slider with range |
| ONBD-07 | Living area range (min/max sqm) | shadcn/ui dual Input fields |
| ONBD-08 | Year built range (Baujahr) | shadcn/ui dual Input fields |
| ONBD-09 | Floor preference | shadcn/ui Select or RadioGroup |
| ONBD-10 | Availability preference | shadcn/ui Select or date-related input |
| ONBD-11 | Features/furnishings toggles | shadcn/ui Checkbox group (balcony, elevator, parking, Minergie, etc.) |
| ONBD-12 | Custom soft-criteria text fields | shadcn/ui Input with dynamic add/remove; LLM chat component for refinement |
| ONBD-13 | Importance weights per category via sliders | shadcn/ui Slider components with proportional redistribution algorithm |
| ONBD-14 | Profile persistence in chrome.storage.local | WXT `storage.defineItem` with Zod v4 validation and schema versioning |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wxt | ^0.20.17 | Extension framework (MV3) | Leading MV3 framework, file-based entrypoints, Vite-powered, auto-manifest generation |
| @wxt-dev/module-react | ^1.1.5 | React integration for WXT | Official WXT React module, adds @vitejs/plugin-react and React auto-imports |
| react | ^19.0.0 | UI framework | Locked decision from CONTEXT.md |
| react-dom | ^19.0.0 | React DOM renderer | Required by React |
| tailwindcss | ^3.4.x | Utility-first CSS | Locked decision; v3 recommended for WXT compatibility (v4 not battle-tested in extension context) |
| zod | ^4.3.6 | Schema validation | Already in project, use for profile schema validation on save/load |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | ^5.x | React Hook Form + Zod v4 bridge | Form validation in wizard steps |
| react-hook-form | ^7.x | Form state management | All wizard form steps |
| class-variance-authority | ^0.7.x | Component variants | Required by shadcn/ui |
| clsx | ^2.x | Conditional class names | Required by shadcn/ui |
| tailwind-merge | ^2.x | Tailwind class merging | Required by shadcn/ui `cn()` utility |
| lucide-react | ^0.x | Icons | Required by shadcn/ui components |
| autoprefixer | ^10.x | PostCSS plugin | Required by Tailwind CSS v3 |
| postcss | ^8.x | CSS processing | Required by Tailwind CSS v3 |

### shadcn/ui Components Needed
| Component | Purpose |
|-----------|---------|
| Button | Navigation (Back/Next/Save), actions |
| Input | Text fields (location, price, rooms, area, year) |
| Label | Form field labels |
| Select | Property type, floor, availability |
| Checkbox | Features/furnishings toggles |
| RadioGroup | Buy/rent selection |
| Slider | Weight allocation sliders, radius |
| Card | Step containers, summary cards |
| Form | React Hook Form integration |
| Separator | Visual dividers between sections |
| Switch | Dark mode toggle, extension on/off |
| Badge | Category labels, status indicators |
| Progress | Wizard step progress indicator |
| Textarea | Soft-criteria free text |
| ScrollArea | Long feature lists |
| Tooltip | Help text for weight sliders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind v3 | Tailwind v4 | v4 has CSS-first config (no tailwind.config.js) but unproven in WXT/extension context; v3 has established WXT templates |
| React Hook Form | Formik | RHF has better shadcn/ui integration, smaller bundle, native Zod v4 resolver |
| WXT storage.defineItem | Raw chrome.storage.local | WXT storage provides type safety, versioning, migrations, watchers -- no reason to go raw |
| Zustand | React Context | Zustand adds per-step persistence middleware; but WXT storage + React Hook Form may suffice without extra state lib |

**Installation:**
```bash
# Initialize WXT project
pnpm dlx wxt@latest init extension --template react --pm pnpm

# Core dependencies
pnpm add react-hook-form @hookform/resolvers zod

# Tailwind CSS v3 + PostCSS
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p

# shadcn/ui dependencies
pnpm add tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react

# Initialize shadcn/ui (manual steps required for WXT)
pnpm dlx shadcn@latest init
```

## Architecture Patterns

### Recommended Project Structure
```
extension/                    # WXT extension root (separate from legacy src/)
├── src/
│   ├── entrypoints/
│   │   ├── background.ts           # Service worker: onInstalled handler
│   │   ├── content.ts              # Content script for homegate.ch (placeholder)
│   │   ├── popup/                   # Popup dashboard
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── App.tsx
│   │   └── onboarding/             # Full-page onboarding wizard
│   │       ├── index.html
│   │       ├── main.tsx
│   │       └── App.tsx
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (auto-generated)
│   │   ├── wizard/
│   │   │   ├── WizardShell.tsx      # Step container, nav, progress
│   │   │   ├── StepFilters.tsx      # Step 1: Standard filters
│   │   │   ├── StepSoftCriteria.tsx # Step 2: Soft criteria + LLM chat
│   │   │   └── StepWeights.tsx      # Step 3: Weight allocation
│   │   └── popup/
│   │       └── Dashboard.tsx        # Profile summary, toggle, edit link
│   ├── hooks/
│   │   ├── useProfile.ts           # Profile read/write hook
│   │   ├── useWizardState.ts       # Wizard step navigation + auto-save
│   │   └── useWeightSliders.ts     # Proportional redistribution logic
│   ├── lib/
│   │   ├── utils.ts                # shadcn cn() utility
│   │   └── theme.ts                # Dark/light mode management
│   ├── schema/
│   │   ├── profile.ts              # Zod v4 preference profile schema
│   │   └── weights.ts              # Weight allocation schema
│   ├── storage/
│   │   └── profile-storage.ts      # WXT storage.defineItem for profile
│   ├── utils/
│   │   └── weight-redistribution.ts # Proportional slider algorithm
│   ├── assets/
│   │   └── styles/
│   │       └── globals.css          # Tailwind directives + shadcn theme
│   └── public/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── components.json                   # shadcn/ui config
├── tailwind.config.js                # Tailwind v3 config
├── postcss.config.js                 # PostCSS config
├── tsconfig.json                     # TypeScript config (extends .wxt/)
└── wxt.config.ts                     # WXT configuration
```

### Pattern 1: WXT File-Based Entrypoints
**What:** Each file/directory in `entrypoints/` automatically becomes an extension entrypoint. WXT generates the manifest from these files.
**When to use:** Always -- this is how WXT works.
**Example:**
```typescript
// entrypoints/background.ts
// Source: https://wxt.dev/guide/essentials/entrypoints.html
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      browser.tabs.create({
        url: browser.runtime.getURL('/onboarding.html'),
      });
    }
  });
});
```

### Pattern 2: WXT Typed Storage with Versioning
**What:** Use `storage.defineItem` for type-safe, versioned profile storage with automatic migration support.
**When to use:** For all persistent data (profile, wizard state, settings).
**Example:**
```typescript
// storage/profile-storage.ts
// Source: https://wxt.dev/guide/essentials/storage.html
import { storage } from 'wxt/storage';
import type { UserProfile } from '../schema/profile';

export const profileStorage = storage.defineItem<UserProfile>(
  'local:userProfile',
  {
    fallback: null,
    version: 1,
    // Future: add migrations when schema changes
    // migrations: {
    //   2: (oldProfile) => migrateV1toV2(oldProfile),
    // },
  },
);

export const wizardStateStorage = storage.defineItem<WizardState>(
  'local:wizardState',
  {
    fallback: { currentStep: 0, completedSteps: [], partialData: {} },
    version: 1,
  },
);
```

### Pattern 3: React Hook Form per Wizard Step
**What:** Each wizard step is its own form with independent validation via React Hook Form + Zod resolver. On step completion, data is saved to WXT storage.
**When to use:** For the 3-step wizard flow.
**Example:**
```typescript
// components/wizard/StepFilters.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepFiltersSchema, type StepFiltersData } from '../../schema/profile';

export function StepFilters({ defaultValues, onComplete }: StepFiltersProps) {
  const form = useForm<StepFiltersData>({
    resolver: zodResolver(stepFiltersSchema),
    defaultValues,
  });

  const onSubmit = async (data: StepFiltersData) => {
    // Save partial profile to storage (auto-save on step complete)
    await wizardStateStorage.setValue({
      currentStep: 1,
      partialData: { ...existingData, filters: data },
    });
    onComplete(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields using shadcn/ui components */}
      </form>
    </Form>
  );
}
```

### Pattern 4: Proportional Weight Redistribution
**What:** When a weight slider moves, all other sliders adjust proportionally so the total always equals 100%.
**When to use:** Step 3 weight allocation.
**Example:**
```typescript
// utils/weight-redistribution.ts
export function redistributeWeights(
  weights: Record<string, number>,
  changedKey: string,
  newValue: number,
): Record<string, number> {
  const clampedValue = Math.max(0, Math.min(100, newValue));
  const otherKeys = Object.keys(weights).filter((k) => k !== changedKey);
  const otherSum = otherKeys.reduce((sum, k) => sum + weights[k], 0);
  const remaining = 100 - clampedValue;

  const result: Record<string, number> = { [changedKey]: clampedValue };

  if (otherSum === 0) {
    // Edge case: all others are 0, distribute equally
    const equalShare = remaining / otherKeys.length;
    otherKeys.forEach((k) => {
      result[k] = Math.round(equalShare * 10) / 10;
    });
  } else {
    // Proportional redistribution
    otherKeys.forEach((k) => {
      result[k] = Math.round(((weights[k] / otherSum) * remaining) * 10) / 10;
    });
  }

  // Fix rounding to ensure exact 100%
  const total = Object.values(result).reduce((s, v) => s + v, 0);
  if (total !== 100 && otherKeys.length > 0) {
    result[otherKeys[0]] += Math.round((100 - total) * 10) / 10;
  }

  return result;
}
```

### Pattern 5: Onboarding Page as Unlisted WXT Entrypoint
**What:** The onboarding wizard is an "unlisted page" -- a full HTML page accessible via `browser.runtime.getURL('/onboarding.html')` but not declared in the manifest's `chrome_url_overrides`.
**When to use:** For the full-page onboarding experience.
**Example:**
```html
<!-- entrypoints/onboarding/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HomeMatch - Setup</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```
```typescript
// entrypoints/onboarding/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/styles/globals.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Pattern 6: Dark Mode via CSS Class Toggle
**What:** Since `next-themes` assumes Next.js, use a simple class-based dark mode toggle stored in WXT storage. Toggle `.dark` class on `<html>` element and persist preference.
**When to use:** Light/dark mode toggle in onboarding and popup.
**Example:**
```typescript
// lib/theme.ts
import { storage } from 'wxt/storage';

export const themeStorage = storage.defineItem<'light' | 'dark'>(
  'local:theme',
  { fallback: 'light' },
);

export async function initTheme() {
  const theme = await themeStorage.getValue();
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export async function toggleTheme() {
  const current = await themeStorage.getValue();
  const next = current === 'light' ? 'dark' : 'light';
  await themeStorage.setValue(next);
  document.documentElement.classList.toggle('dark', next === 'dark');
}
```

### Anti-Patterns to Avoid
- **Storing state in background service worker variables:** MV3 service workers terminate when idle. All state MUST go to `chrome.storage.local` via WXT storage utilities.
- **Using `localStorage` or `sessionStorage` in extension pages:** These are per-origin and don't share across popup/onboarding/background. Use `chrome.storage.local` (via WXT `storage.defineItem`).
- **Single monolithic form for all wizard steps:** Each step should be its own form with independent validation. This keeps forms lightweight and enables per-step auto-save.
- **Manually editing manifest.json:** WXT generates the manifest. Configure via `wxt.config.ts` and entrypoint file exports.
- **Using Tailwind CSS rem units in content scripts:** Content scripts inject into host pages where the root `font-size` varies. Convert to px for content script UI. (Not critical for Phase 1's full-page onboarding, but important for Phase 4 badges.)
- **Putting component files inside `entrypoints/`:** WXT expects entrypoints directory to be flat. Shared components go in `components/`, hooks in `hooks/`, utils in `utils/`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extension manifest generation | Manual manifest.json | WXT auto-generation from `wxt.config.ts` + entrypoint files | WXT handles MV2/MV3 differences, permissions, CSP automatically |
| Typed storage with migrations | Custom chrome.storage wrapper | WXT `storage.defineItem` with version + migrations | Built-in type safety, versioning, watchers, cross-context sync |
| Form validation | Custom validation logic | React Hook Form + Zod resolver (`@hookform/resolvers`) | RHF handles dirty tracking, touched state, error display; Zod handles schema |
| Accessible UI components | Custom slider/select/checkbox | shadcn/ui components (built on Radix UI) | ARIA attributes, keyboard navigation, focus management all handled |
| Hot module reloading for extension | Manual reload scripts | WXT built-in HMR | WXT handles HMR for content scripts, popup, and background |
| Browser API polyfills | Manual `chrome.*` / `browser.*` wrapping | WXT's `browser` global (from `webextension-polyfill`) | Cross-browser compatibility handled automatically |
| CSS class utilities | Manual conditional class joining | `cn()` from shadcn/ui (`clsx` + `tailwind-merge`) | Handles Tailwind class conflicts and conditional composition |

**Key insight:** WXT + shadcn/ui + React Hook Form cover 90% of the infrastructure needed. The only custom logic is the wizard flow orchestration, profile schema definition, and weight redistribution algorithm.

## Common Pitfalls

### Pitfall 1: WXT tsconfig.json Path Conflicts with shadcn/ui
**What goes wrong:** shadcn/ui CLI requires `baseUrl` and `paths` in `tsconfig.json`, but WXT generates its own tsconfig in `.wxt/` and advises against manual path additions.
**Why it happens:** WXT uses its own alias system; shadcn expects standard TS paths.
**How to avoid:** Add `baseUrl: "."` and `paths: { "@/*": ["./src/*"] }` to `tsconfig.json` despite WXT's advice -- shadcn CLI won't resolve paths correctly otherwise. WXT's own aliases still work fine alongside these.
**Warning signs:** shadcn component install fails with "could not resolve path" errors.

### Pitfall 2: MV3 Service Worker State Loss
**What goes wrong:** Background service worker stores state in variables that disappear when Chrome terminates the worker (after ~30 seconds of inactivity).
**Why it happens:** MV3 replaced persistent background pages with ephemeral service workers.
**How to avoid:** Never store state in JS variables in background.ts. Always use `chrome.storage.local` (via WXT `storage.defineItem`). Register all event listeners synchronously at the top level of the background script.
**Warning signs:** State mysteriously resets; `onInstalled` listener not firing.

### Pitfall 3: Auto-Save Timing with React Hook Form
**What goes wrong:** Auto-save fires on every keystroke, flooding storage writes and causing lag.
**Why it happens:** Naive `onChange` handler without debouncing.
**How to avoid:** Debounce auto-save (300-500ms). Better yet: save on step navigation (Next/Back) rather than continuous auto-save. Use `form.watch()` with debounce for partial saves, and `handleSubmit` for step completion saves.
**Warning signs:** Extension feels sluggish; chrome.storage write errors.

### Pitfall 4: Zod v4 Import Path Confusion
**What goes wrong:** Mixing `import { z } from 'zod'` (v4 default) with v3 patterns like `z.string().email()`.
**Why it happens:** Project already has `zod@^4.3.6`. Zod v4 changed string validators to top-level functions and `z.record()` now requires two arguments.
**How to avoid:** Use v4 patterns: `z.email()` instead of `z.string().email()`. Use `z.record(z.string(), z.number())` instead of `z.record(z.number())`. Use `error` instead of `message` in validation configs.
**Warning signs:** Runtime validation errors; TypeScript errors about missing methods.

### Pitfall 5: shadcn/ui CSS Not Loading in Extension Pages
**What goes wrong:** Components render unstyled in popup or onboarding page.
**Why it happens:** CSS file not imported in the entrypoint's `main.tsx`, or Tailwind `content` paths don't cover the right directories.
**How to avoid:** Import `globals.css` in every entrypoint's `main.tsx`. Ensure `tailwind.config.js` content includes `"./src/**/*.{html,js,ts,jsx,tsx}"`.
**Warning signs:** Components render with wrong styles or no styles; shadcn components look like plain HTML.

### Pitfall 6: Weight Sliders Rounding Errors
**What goes wrong:** Sliders don't sum to exactly 100% due to floating-point arithmetic, or UI shows values like 33.333333%.
**Why it happens:** Dividing 100 by 3 (or other non-clean divisions) produces repeating decimals.
**How to avoid:** Round to 1 decimal place. After proportional redistribution, compute the difference from 100 and add it to the first "other" slider. Display with `.toFixed(1)`. Validate the sum in the Zod schema with a tolerance check.
**Warning signs:** Total shows 99.9% or 100.1%; Zod validation rejects profile.

### Pitfall 7: chrome.storage.local 10MB Limit
**What goes wrong:** Storage quota exceeded errors.
**Why it happens:** Unlike `chrome.storage.sync` (100KB limit), `local` has a generous ~10MB limit, but storing huge objects or binary data can hit it.
**How to avoid:** A preference profile is small (< 5KB). This is not a real risk for Phase 1, but avoid storing images or large blobs.
**Warning signs:** `QUOTA_BYTES_PER_ITEM` error.

## Code Examples

### Preference Profile Schema (Zod v4)
```typescript
// schema/profile.ts
import { z } from 'zod';

export const SoftCriterionSchema = z.object({
  id: z.string(),
  category: z.string(),
  text: z.string(),
  isCustom: z.boolean().default(false),
});

export const WeightsSchema = z.record(z.string(), z.number().min(0).max(100));

export const PreferenceProfileSchema = z.object({
  schemaVersion: z.literal(1),

  // Step 1: Standard filters (all optional -- user fills what they care about)
  listingType: z.enum(['rent', 'buy']).optional(),
  location: z.string().optional(),
  radiusKm: z.number().min(0).max(100).optional(),
  propertyTypes: z.array(z.string()).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  roomsMin: z.number().min(0).optional(),
  roomsMax: z.number().min(0).optional(),
  livingSpaceMin: z.number().min(0).optional(),
  livingSpaceMax: z.number().min(0).optional(),
  yearBuiltMin: z.number().optional(),
  yearBuiltMax: z.number().optional(),
  floorPreference: z.string().optional(),
  availability: z.string().optional(),
  features: z.array(z.string()).optional(),

  // Step 2: Soft criteria
  softCriteria: z.array(SoftCriterionSchema).default([]),

  // Step 3: Weights
  weights: WeightsSchema.default({}),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PreferenceProfile = z.infer<typeof PreferenceProfileSchema>;
export type SoftCriterion = z.infer<typeof SoftCriterionSchema>;
```

### WXT Config
```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'HomeMatch',
    description: 'AI-powered property match scoring for Homegate.ch',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: ['*://*.homegate.ch/*'],
  },
});
```

### Background Script with onInstalled
```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      // Open onboarding wizard on first install
      await browser.tabs.create({
        url: browser.runtime.getURL('/onboarding.html'),
      });
    }
  });
});
```

### Content Script Placeholder
```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['*://*.homegate.ch/*'],
  main() {
    console.log('[HomeMatch] Content script loaded on Homegate.ch');
    // Phase 1: placeholder only -- scoring UI added in Phase 4
  },
});
```

### Wizard Step Navigation Hook
```typescript
// hooks/useWizardState.ts
import { useState, useEffect, useCallback } from 'react';
import { wizardStateStorage } from '../storage/profile-storage';

const TOTAL_STEPS = 3;

export function useWizardState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore wizard state on mount
    wizardStateStorage.getValue().then((state) => {
      if (state) {
        setCurrentStep(state.currentStep);
      }
      setIsLoading(false);
    });
  }, []);

  const goNext = useCallback(async () => {
    const next = Math.min(currentStep + 1, TOTAL_STEPS - 1);
    setCurrentStep(next);
    const state = await wizardStateStorage.getValue();
    await wizardStateStorage.setValue({ ...state, currentStep: next });
  }, [currentStep]);

  const goBack = useCallback(async () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    const state = await wizardStateStorage.getValue();
    await wizardStateStorage.setValue({ ...state, currentStep: prev });
  }, [currentStep]);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    isFirst: currentStep === 0,
    isLast: currentStep === TOTAL_STEPS - 1,
    isLoading,
    goNext,
    goBack,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manifest V2 background pages | MV3 service workers | Chrome 88 (Jan 2021), enforced 2024 | No persistent state in background; must use storage API |
| Plasmo framework | WXT framework | WXT became dominant 2024-2025 | WXT has superior DX, Vite integration, and community adoption |
| `z.string().email()` (Zod v3) | `z.email()` (Zod v4) | Zod 4.0.0 (2025) | String validators moved to top-level functions |
| `tailwind.config.js` (Tailwind v3) | CSS-first config (Tailwind v4) | Tailwind 4.0 (Jan 2025) | Recommend staying on v3 for WXT extension compatibility |
| `chrome.storage.local` raw | WXT `storage.defineItem` | WXT 0.18+ | Type-safe, versioned, migratable, cross-context storage |

**Deprecated/outdated:**
- Manifest V2: Chrome Web Store no longer accepts new MV2 extensions
- `webextension-polyfill` standalone: WXT bundles this internally as `browser` global
- Custom webpack extension configs: WXT/Vite replaces the need for webpack

## Open Questions

1. **Homegate filter field exact values**
   - What we know: Filter categories are documented (location, rooms, price, etc.)
   - What's unclear: Exact dropdown values for property types, floor options, feature names in German/French/Italian
   - Recommendation: Use reasonable defaults now; can be refined in Phase 4 when content script reads actual Homegate page data. Property types: Wohnung, Haus, Zimmer, etc.

2. **LLM chat integration in Step 2**
   - What we know: User decision calls for Claude-assisted soft criteria refinement
   - What's unclear: Whether to call Claude API directly from extension (API key exposure risk) or defer LLM calls to Phase 2's backend
   - Recommendation: In Phase 1, implement the chat UI as a local-only experience (category prompts + free text input). The actual LLM refinement can be wired up once the backend exists in Phase 2. This keeps Phase 1 self-contained with no backend dependency.

3. **React 18 vs React 19 with WXT**
   - What we know: React 19 is stable; WXT module-react works with React 18+
   - What's unclear: Whether all shadcn/ui components are React 19 compatible
   - Recommendation: Use React 18 for maximum compatibility. Can upgrade to 19 later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via WXT `WxtVitest` plugin) |
| Config file | `vitest.config.ts` (Wave 0 creation) |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONBD-01 | Onboarding page opens on first install | unit | `pnpm vitest run src/__tests__/background.test.ts -t "onInstalled"` | Wave 0 |
| ONBD-02 | Location + radius saved to profile | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "location"` | Wave 0 |
| ONBD-03 | Buy/rent selection persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "listingType"` | Wave 0 |
| ONBD-04 | Property type selection persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "propertyType"` | Wave 0 |
| ONBD-05 | Budget range validates and persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "price"` | Wave 0 |
| ONBD-06 | Rooms range validates and persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "rooms"` | Wave 0 |
| ONBD-07 | Living area range validates and persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "livingSpace"` | Wave 0 |
| ONBD-08 | Year built range validates and persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "yearBuilt"` | Wave 0 |
| ONBD-09 | Floor preference persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "floor"` | Wave 0 |
| ONBD-10 | Availability preference persists | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "availability"` | Wave 0 |
| ONBD-11 | Features toggles persist | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "features"` | Wave 0 |
| ONBD-12 | Soft criteria text fields persist | unit | `pnpm vitest run src/__tests__/profile-schema.test.ts -t "softCriteria"` | Wave 0 |
| ONBD-13 | Weight sliders sum to 100% | unit | `pnpm vitest run src/__tests__/weight-redistribution.test.ts` | Wave 0 |
| ONBD-14 | Profile persists across sessions | unit | `pnpm vitest run src/__tests__/profile-storage.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- WXT Vitest plugin configuration
- [ ] `src/__tests__/profile-schema.test.ts` -- Zod schema validation for all ONBD-02 through ONBD-12
- [ ] `src/__tests__/weight-redistribution.test.ts` -- Proportional redistribution algorithm (ONBD-13)
- [ ] `src/__tests__/profile-storage.test.ts` -- WXT storage read/write/persist (ONBD-14)
- [ ] `src/__tests__/background.test.ts` -- onInstalled handler fires correctly (ONBD-01)
- [ ] Vitest + `@testing-library/react` install: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom`

## Sources

### Primary (HIGH confidence)
- [WXT Entrypoints](https://wxt.dev/guide/essentials/entrypoints.html) -- Entrypoint types, file naming, popup/background/content/unlisted pages
- [WXT Project Structure](https://wxt.dev/guide/essentials/project-structure) -- Directory layout, srcDir, auto-imports
- [WXT Storage](https://wxt.dev/guide/essentials/storage.html) -- `storage.defineItem`, versioning, migrations, watchers
- [WXT Unit Testing](https://wxt.dev/guide/essentials/unit-testing) -- Vitest plugin, fakeBrowser, test configuration
- [shadcn/ui Installation (Vite)](https://ui.shadcn.com/docs/installation/vite) -- Setup steps, components.json, path aliases
- [shadcn/ui Components](https://ui.shadcn.com/docs/components) -- Full component catalog
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog) -- Breaking changes, new APIs, import paths
- [@hookform/resolvers npm](https://www.npmjs.com/package/@hookform/resolvers) -- Zod v4 support in v5.x

### Secondary (MEDIUM confidence)
- [WXT + React + shadcn + Tailwind Setup Guide](https://aabidk.dev/blog/building-modern-cross-web-extensions-project-setup/) -- Verified project structure and tsconfig workaround for shadcn paths
- [WXT + React Extension Dev Guide](https://dev.to/seryllns_/build-modern-browser-extensions-with-wxt-react-and-typescript-h3h) -- React entrypoint patterns, popup setup
- [WXT React shadcn Template](https://github.com/imtiger/wxt-react-shadcn-tailwindcss-chrome-extension) -- Reference implementation for WXT + React + shadcn + Tailwind
- [shadcn Chrome Extension Template](https://github.com/phantridungdz/shadcn-chrome-extension) -- WXT + shadcn with theme provider and i18n
- [React Hook Form Multi-Step Patterns](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps) -- Zustand + Zod + shadcn wizard pattern

### Tertiary (LOW confidence)
- [Proportional slider algorithm](https://saturncloud.io/blog/algorithm-to-always-sum-sliders-to-100-failing-due-to-zeroes/) -- Algorithm guidance for zero-handling edge case (needs validation in implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- WXT, React, shadcn/ui, Tailwind, Zod are all verified with current docs and established templates
- Architecture: HIGH -- WXT's file-based entrypoints, storage API, and project structure are well-documented
- Pitfalls: HIGH -- MV3 service worker limitations, tsconfig conflicts, and Zod v4 changes are documented across multiple sources
- Weight redistribution algorithm: MEDIUM -- Algorithm is straightforward math but edge cases (zeros, rounding) need implementation testing
- LLM chat integration: MEDIUM -- UI can be built but actual Claude API integration deferred to Phase 2 backend

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- stable technology stack, WXT under active development)
