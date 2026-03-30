# Phase 34: Onboarding & Tutorial System - Research

**Researched:** 2026-03-30
**Domain:** Product tour / onboarding UX across Next.js web app + WXT Chrome extension
**Confidence:** MEDIUM-HIGH

## Summary

This phase requires a guided onboarding system spanning two runtime contexts: a Next.js 16 web app (Vercel) and a WXT-based Chrome extension injecting into Flatfox via Shadow DOM. The core challenge is cross-platform state coordination and the fact that tour/spotlight libraries designed for regular DOM do not work inside Shadow DOM content scripts.

The web app side can use a standard tour library for spotlight/tooltip overlays. The extension side must use a custom lightweight overlay approach because existing tour libraries (driver.js, react-joyride, shepherd.js) inject elements into the main document and cannot target elements inside Shadow DOM roots. State coordination should use Supabase `profiles.preferences` JSONB (already exists, RLS-enabled) as the shared source of truth, with the extension reading it via its existing Supabase client in the background script.

**Primary recommendation:** Use driver.js (1.4.0, MIT license, 5KB gzipped) for the web app tour steps. Build a minimal custom spotlight overlay component for the extension content script (CSS-only approach with box-shadow/outline, no external library). Coordinate state via a `onboarding` key in the existing `profiles.preferences` JSONB column.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Onboarding is NOT UI explanation -- it forces user to experience core value (first successful analysis)
- 8-step flow across 3 phases: Activation (Steps 1-3, web app), Extension-Based (Steps 4-7, Flatfox), Post-Analysis (Step 8, web app)
- Always allow "Skip tour" and "Exit" at any step
- Show progress indicator: "Step 2 of 5" (or similar)
- One action per step, no long explanations
- Replayable via "Take a quick tour" (profile dropdown primary, empty states secondary)
- Replay resets onboarding_step to 1, onboarding_active to true; onboarding_completed stays true after first run
- Persistent onboarding checklist during onboarding (Install extension, Create profile, Analyze first property)
- Spotlight effect: highlight relevant UI, dim background
- State fields: onboarding_completed (boolean), onboarding_active (boolean), onboarding_step (number 1-8)

### Claude's Discretion
- State storage mechanism (localStorage, Supabase user_preferences, or extension storage)
- Exact positioning/styling of spotlight overlay
- How extension polls/reads shared onboarding state (storage sync vs. messaging)
- Whether to split into multiple PLAN.md files (web vs. extension)
- Tooltip component library vs. custom implementation

### Deferred Ideas (OUT OF SCOPE)
- Adaptive onboarding (skip steps user already completed on replay)
- Personalization based on user type
- Analytics/funnel tracking for onboarding steps
- Onboarding A/B testing
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| driver.js | 1.4.0 | Web app spotlight tour (Steps 1-3, 8) | MIT license, 5KB gzipped, framework-agnostic, built-in spotlight/popover, TypeScript, no dependencies |
| Custom CSS overlay | N/A | Extension content script spotlight (Steps 4-7) | Shadow DOM incompatibility with all tour libraries; CSS box-shadow approach is simplest |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.99.x (already installed) | Read/write onboarding state | State coordination between web app and extension |
| lucide-react | ^0.577.0 (already installed) | Icons for checklist, progress, close buttons | Already used throughout both codebases |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| driver.js | react-joyride | react-joyride not compatible with React 19; not maintained recently |
| driver.js | shepherd.js | AGPL license (requires commercial license); heavier |
| Supabase state | localStorage + extension storage.sync | No cross-platform coordination; user loses state on new device |
| Supabase state | Extension chrome.storage.sync | Web app cannot read extension storage; requires messaging bridge |

**Installation:**
```bash
# Web app only -- extension uses custom overlay
cd web && npm install driver.js
```

## Architecture Patterns

### Recommended Project Structure
```
web/src/
  components/
    onboarding/
      OnboardingProvider.tsx    # Context provider: manages tour state, reads/writes Supabase
      OnboardingChecklist.tsx   # Persistent checklist UI (floating or sidebar)
      OnboardingSpotlight.tsx   # Wrapper around driver.js for web app steps
      TakeATourButton.tsx       # "Take a quick tour" trigger
  hooks/
    use-onboarding.ts          # Hook: returns { step, isActive, advance, skip, reset }
  lib/
    onboarding-state.ts        # Supabase read/write helpers for onboarding JSONB

extension/src/
  components/
    onboarding/
      OnboardingOverlay.tsx     # Custom spotlight overlay for extension
      OnboardingTooltip.tsx     # Positioned tooltip with step instructions
  lib/
    onboarding.ts              # Read/write onboarding state via background messaging
  storage/
    onboarding.ts              # WXT storage item for local onboarding cache
```

### Pattern 1: State Coordination via Supabase JSONB
**What:** Store onboarding state in the existing `profiles` table's `preferences` JSONB column under an `onboarding` key. Both web app and extension read/write via Supabase client.
**When to use:** All state reads/writes for onboarding.
**Why:** Both platforms already have authenticated Supabase clients. The `profiles.preferences` column exists with RLS. No new migration needed -- just a new JSONB key.

```typescript
// Shape of preferences.onboarding
interface OnboardingState {
  onboarding_completed: boolean;  // true after first full completion
  onboarding_active: boolean;     // true while tour is running
  onboarding_step: number;        // 1-8
}

// Web app: read
const { data } = await supabase
  .from('profiles')
  .select('preferences')
  .eq('is_default', true)
  .single();
const onboarding = data?.preferences?.onboarding;

// Web app: write (merge into existing JSONB)
await supabase.rpc('update_onboarding_state', {
  p_step: 2,
  p_active: true,
  p_completed: false,
});
```

**Important:** A small Supabase RPC function or direct JSONB merge update is needed to avoid overwriting other preferences keys. Use `jsonb_set` or `||` operator.

### Pattern 2: Extension Reads State via Background Script
**What:** Extension content script sends message to background script, which queries Supabase for onboarding state. Content script uses this to decide whether to show onboarding UI.
**When to use:** Every time extension content script loads on Flatfox.

```typescript
// Content script: request onboarding state
const response = await browser.runtime.sendMessage({ action: 'getOnboardingState' });
if (response.onboarding?.onboarding_active && response.onboarding?.onboarding_step >= 4) {
  // Show extension onboarding overlay for current step
}

// Background script: new message handler
case 'getOnboardingState': {
  const { data } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('is_default', true)
    .single();
  return { onboarding: data?.preferences?.onboarding ?? null };
}
```

### Pattern 3: Web App Spotlight with driver.js
**What:** Use driver.js imperative API to highlight DOM elements and show popovers.
**When to use:** Steps 1-3 (web app activation) and Step 8 (post-analysis).

```typescript
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const driverObj = driver({
  showProgress: true,
  steps: [
    {
      element: '#install-extension-cta',
      popover: {
        title: 'Install the Extension',
        description: 'Download and install the HomeMatch extension to get started.',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  onDestroyStarted: () => {
    // User clicked skip/exit
    saveOnboardingState({ onboarding_active: false });
    driverObj.destroy();
  },
});

driverObj.drive();
```

### Pattern 4: Extension Custom Spotlight Overlay
**What:** A React component rendered inside the extension's Shadow DOM that creates a spotlight effect using CSS.
**When to use:** Steps 4-7 on Flatfox.

```typescript
// OnboardingOverlay.tsx (extension)
function OnboardingOverlay({ targetSelector, step, totalSteps, instruction, onNext, onSkip }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Target is in the HOST page DOM, not shadow DOM
    const el = document.querySelector(targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetSelector]);

  if (!rect) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      {/* Semi-transparent overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - 4} y={rect.top - 4}
              width={rect.width + 8} height={rect.height + 8}
              rx="8" fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#spotlight-mask)" />
      </svg>
      {/* Tooltip positioned near target */}
      <OnboardingTooltip
        rect={rect} step={step} totalSteps={totalSteps}
        instruction={instruction} onNext={onNext} onSkip={onSkip}
      />
    </div>
  );
}
```

**Key insight:** The extension overlay component lives in the extension's Shadow DOM (via `createShadowRootUi`), but the TARGET elements it highlights are in the host page DOM. The overlay uses `document.querySelector()` to find host page elements and `getBoundingClientRect()` to position the spotlight. This works because `document.querySelector` from a content script accesses the host page DOM.

### Anti-Patterns to Avoid
- **Trying to use driver.js in the extension content script:** driver.js injects overlay elements into the main document, which conflicts with the extension's Shadow DOM isolation and WXT's content script model.
- **Storing onboarding state only in localStorage:** The extension cannot access the web app's localStorage (different origins). State would not sync.
- **Polling Supabase on a timer from the extension:** Wasteful. Instead, read once on page load and when transitioning between steps.
- **Making the onboarding blocking/modal without escape:** CONTEXT.md explicitly requires Skip/Exit at every step.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Web app spotlight/popover | Custom overlay + positioning | driver.js | Handles scroll, resize, repositioning, z-index stacking; edge cases around viewport boundaries |
| JSONB merge in Supabase | Manual SQL string building | Supabase RPC with `jsonb_set` or `\|\|` operator | Avoids race conditions; preserves other preferences keys |
| Step progress indicator | Custom progress dots | driver.js built-in `showProgress` (web) / simple "Step X of Y" text (extension) | driver.js has this built in for web; extension just needs text |

**Key insight:** The extension overlay is the one place where a custom solution is genuinely needed because no tour library supports Shadow DOM injection targeting host page elements. Keep it minimal -- CSS-based spotlight with an SVG mask and a simple positioned tooltip.

## Common Pitfalls

### Pitfall 1: Shadow DOM Isolation Breaks Tour Libraries
**What goes wrong:** Tour libraries inject elements into `document.body` and use `document.querySelector` for targeting. Inside a Shadow DOM content script, the library's overlay renders outside the shadow root or fails to find target elements.
**Why it happens:** WXT uses `createShadowRootUi` which encapsulates the extension UI in a shadow root. Tour libraries are not designed for this.
**How to avoid:** Use driver.js only in the web app (normal DOM). Build a minimal custom overlay for the extension that targets host page elements from within the shadow root overlay.
**Warning signs:** Tour overlay appears behind extension UI, or highlights the wrong element.

### Pitfall 2: Stale Onboarding State After Page Navigation
**What goes wrong:** User completes Step 3 ("Open in Flatfox"), navigates to Flatfox, but extension reads stale state showing step 2.
**Why it happens:** Extension queries Supabase on content script load, but the web app hasn't finished writing the updated step yet.
**How to avoid:** Web app must `await` the Supabase write before triggering navigation. Extension should read state fresh on Flatfox page load. Add a small delay or retry if step seems stale.
**Warning signs:** Extension shows wrong step after web-to-extension transition.

### Pitfall 3: JSONB Key Overwrite
**What goes wrong:** Writing onboarding state to `preferences` column overwrites the entire JSONB, losing other preferences data.
**Why it happens:** Using `.update({ preferences: { onboarding: {...} } })` replaces the whole column.
**How to avoid:** Use Supabase RPC with `jsonb_set(preferences, '{onboarding}', $1::jsonb)` or the `||` merge operator.
**Warning signs:** User preferences disappear after onboarding state change.

### Pitfall 4: Extension Overlay Z-Index Wars
**What goes wrong:** The onboarding overlay appears behind the FAB or badge Shadow DOM roots, or behind Flatfox's own modals.
**Why it happens:** Multiple Shadow DOM roots with overlapping z-index contexts.
**How to avoid:** Create the onboarding overlay as its own `createShadowRootUi` with `position: 'overlay'` and a very high z-index (99999+). Ensure it's mounted after the FAB.
**Warning signs:** Overlay visible but not clickable, or invisible behind other elements.

### Pitfall 5: driver.js CSS Not Loading in Next.js App Router
**What goes wrong:** driver.js popover appears unstyled or invisible.
**Why it happens:** CSS import `driver.js/dist/driver.css` needs to be in a client component; server components strip it.
**How to avoid:** Import driver.js CSS in the OnboardingProvider client component or in `globals.css` via `@import`.
**Warning signs:** Tour starts but no visible overlay/popover.

## Code Examples

### Supabase RPC for Onboarding State Update
```sql
-- Migration: add RPC for atomic onboarding state update
create or replace function update_onboarding_state(
  p_step integer,
  p_active boolean,
  p_completed boolean
) returns void
language plpgsql security definer
as $$
begin
  update profiles
  set preferences = jsonb_set(
    coalesce(preferences, '{}'::jsonb),
    '{onboarding}',
    jsonb_build_object(
      'onboarding_step', p_step,
      'onboarding_active', p_active,
      'onboarding_completed', p_completed
    )
  )
  where user_id = auth.uid()
    and is_default = true;
end;
$$;
```

### Extension Background Message Handler Addition
```typescript
// Add to background.ts handleMessage switch
case 'getOnboardingState': {
  const { data } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('is_default', true)
    .single();
  return { onboarding: data?.preferences?.onboarding ?? null };
}
case 'updateOnboardingState': {
  const { step, active, completed } = message as any;
  const { error } = await supabase.rpc('update_onboarding_state', {
    p_step: step,
    p_active: active,
    p_completed: completed,
  });
  return { error: error ? { message: error.message } : null };
}
```

### Web App Onboarding Hook
```typescript
// hooks/use-onboarding.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OnboardingState {
  onboarding_step: number;
  onboarding_active: boolean;
  onboarding_completed: boolean;
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('profiles')
      .select('preferences')
      .eq('is_default', true)
      .single()
      .then(({ data }) => {
        setState(data?.preferences?.onboarding ?? {
          onboarding_step: 1,
          onboarding_active: false,
          onboarding_completed: false,
        });
      });
  }, []);

  const advance = useCallback(async () => {
    if (!state) return;
    const nextStep = state.onboarding_step + 1;
    const completed = nextStep > 8;
    const newState = {
      onboarding_step: completed ? 8 : nextStep,
      onboarding_active: !completed,
      onboarding_completed: state.onboarding_completed || completed,
    };
    setState(newState);
    await supabase.rpc('update_onboarding_state', {
      p_step: newState.onboarding_step,
      p_active: newState.onboarding_active,
      p_completed: newState.onboarding_completed,
    });
  }, [state, supabase]);

  const skip = useCallback(async () => {
    const newState = {
      onboarding_step: state?.onboarding_step ?? 1,
      onboarding_active: false,
      onboarding_completed: state?.onboarding_completed ?? false,
    };
    setState(newState);
    await supabase.rpc('update_onboarding_state', {
      p_step: newState.onboarding_step,
      p_active: newState.onboarding_active,
      p_completed: newState.onboarding_completed,
    });
  }, [state, supabase]);

  const startTour = useCallback(async () => {
    const newState = { onboarding_step: 1, onboarding_active: true, onboarding_completed: state?.onboarding_completed ?? false };
    setState(newState);
    await supabase.rpc('update_onboarding_state', {
      p_step: 1,
      p_active: true,
      p_completed: newState.onboarding_completed,
    });
  }, [state, supabase]);

  return { state, advance, skip, startTour, isActive: state?.onboarding_active ?? false };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-joyride for React tours | driver.js (framework-agnostic) | 2024-2025 | react-joyride incompatible with React 19; driver.js works everywhere |
| localStorage for onboarding state | Server-side state (DB/API) | Ongoing trend | Cross-device sync, extension-web coordination |
| Intro.js (popular default) | driver.js or custom | 2023+ | Intro.js is AGPL; driver.js is MIT and lighter |

**Deprecated/outdated:**
- react-joyride: Not compatible with React 19 (which this project uses). Last meaningful update 9+ months ago.
- Intro.js: AGPL license makes it unsuitable for commercial use without paid license.

## Open Questions

1. **First-time user detection**
   - What we know: We can check if `preferences.onboarding` is null/missing to detect first-time users
   - What's unclear: Should onboarding auto-start on first login, or require user opt-in?
   - Recommendation: Auto-start on first login (no existing onboarding state = show onboarding). The "Take a quick tour" button handles re-entry.

2. **Extension detection from web app (Step 1)**
   - What we know: CONTEXT.md says "Optional: auto-detect extension installation and auto-complete step if detected"
   - What's unclear: Detection mechanism -- content script injection marker vs. custom event vs. chrome.runtime.sendMessage from web page
   - Recommendation: The simplest approach is to inject a small DOM marker (`<div id="homematch-installed">`) from the content script. The web app checks for it. If not detected, user manually clicks "I've installed the extension".

3. **"Open in Flatfox" button for Step 3**
   - What we know: Dashboard needs a button that navigates to Flatfox
   - What's unclear: Does this button already exist? Which Flatfox URL to use?
   - Recommendation: Add a prominent CTA on the dashboard that links to `https://flatfox.ch/en/search/` (Flatfox search page). Only visible during onboarding or as a permanent feature.

## Discretion Recommendations

Based on research, here are recommendations for areas marked as Claude's Discretion:

### State Storage: Supabase `profiles.preferences` JSONB
**Rationale:** Both web app and extension already have authenticated Supabase clients. No new table/migration needed (just an RPC function). State syncs across devices. Extension reads via background script message.

### Spotlight Styling: CSS SVG mask (extension), driver.js defaults (web)
**Rationale:** SVG mask with a cutout provides clean spotlight without z-index hacks. driver.js handles all the hard positioning logic for the web app.

### Extension State Reading: On-demand via background messaging
**Rationale:** Extension content script sends `getOnboardingState` message to background on Flatfox page load. No polling. Step advances trigger a write-then-read cycle.

### Plan Split: Two plans (web app + extension)
**Rationale:** The web app and extension are separate codebases with different build systems (Next.js vs WXT). A Supabase migration/RPC plan could be folded into the web app plan as the first task. Recommended split:
- **Plan 01:** Supabase RPC + Web app onboarding (Steps 1-3, 8, checklist, "Take a quick tour")
- **Plan 02:** Extension onboarding overlay (Steps 4-7, background message handlers, state sync)

### Tooltip Implementation: Custom (extension), driver.js built-in (web)
**Rationale:** No tour library supports Shadow DOM content scripts. The extension needs a lightweight custom tooltip (positioned div with arrow). The web app uses driver.js's built-in popover, which is well-styled and customizable.

## Sources

### Primary (HIGH confidence)
- Extension codebase: `extension/src/entrypoints/content/` -- WXT Shadow DOM architecture, `createShadowRootUi` usage
- Extension codebase: `extension/src/entrypoints/background.ts` -- message handling pattern, Supabase client
- Web app codebase: `web/src/app/(dashboard)/layout.tsx` -- dashboard layout, ProfileSwitcher, NavUser placement
- Web app codebase: `web/src/components/nav-user.tsx` -- dropdown menu pattern (where "Take a quick tour" would go)
- Supabase migrations: `002_profiles_schema.sql` -- profiles table with preferences JSONB
- driver.js npm registry: version 1.4.0 confirmed

### Secondary (MEDIUM confidence)
- [OnboardJS comparison](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared) -- library comparison, react-joyride React 19 incompatibility
- [Sandro Roth evaluation](https://sandroroth.com/blog/evaluating-tour-libraries/) -- detailed library comparison
- [driver.js official docs](https://driverjs.com/docs/installation) -- installation, API
- [Inline Manual comparison](https://inlinemanual.com/blog/driverjs-vs-introjs-vs-shepherdjs-vs-reactour/) -- licensing info

### Tertiary (LOW confidence)
- Shadow DOM + tour library compatibility -- no definitive source; inferred from driver.js architecture (injects into document.body) and WXT Shadow DOM model

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- driver.js is well-established, MIT license verified, version confirmed via npm
- Architecture: MEDIUM-HIGH -- state coordination pattern is sound but cross-platform timing edge cases need careful implementation
- Pitfalls: HIGH -- Shadow DOM incompatibility is a verified architectural constraint; JSONB overwrite is a known Supabase pattern

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain; driver.js unlikely to change significantly)
