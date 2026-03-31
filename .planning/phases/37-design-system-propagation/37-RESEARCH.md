# Phase 37: Design System Propagation - Research

**Researched:** 2026-03-31
**Domain:** Tailwind CSS token propagation, Framer Motion on-mount animations, design system consistency
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tier Colors (DS-03)**
- Full TIER_COLORS map in `ScoreHeader.tsx` is the single source of truth used by all card components:
  - **excellent**: `bg-teal-500` (Tailwind teal — actual blue-green, NOT brand primary which is rose/reddish)
  - **good**: `bg-green-500` (Tailwind green, replacing current `bg-blue-500`)
  - **fair**: `bg-amber-500` (unchanged)
  - **poor**: `bg-red-500` (replacing current `bg-gray-500`)
- Stay as Tailwind utility classes directly in the TIER_COLORS map — no new CSS tokens needed
- The `getTierColor()` function is the single source of truth; all consumers (`TopMatchCard`, `AnalysisSummaryCard`, `TopMatchSummaryCard`, analyses page) use it automatically

**rose → primary Token Cleanup (DS-01)**
- Token cleanup only — no visual change for brand-colored elements
- `open-in-flatfox-button.tsx`: `bg-rose-600` → `bg-primary`, `hover:bg-rose-700` → `hover:bg-primary/90`
- `analysis/[listingId]/loading.tsx`: `bg-rose-500` → `bg-green-500` (exception: loading bar gets green like the extension, not the brand rose)
- After this change: zero hardcoded rose-* values remain in the codebase

**Card Hover Lift (DS-04)**
- Effect: `hover:-translate-y-1 hover:shadow-lg transition-all` — CSS transitions only, no Framer Motion whileHover
- Cards that get the lift effect:
  - `TopMatchSummaryCard` (dashboard home)
  - `AnalysisSummaryCard` (dashboard home)
  - Profile cards on `/profiles` list
  - Analysis cards on `/analyses` list
  - `TopMatchCard` (full) on `/top-matches`
- Replace existing `hover:shadow-md` with `hover:-translate-y-1 hover:shadow-lg` + keep `transition-all duration-200`

**Animations (DS-02)**
- **Trigger**: on-mount (`initial="hidden" animate="visible"`) — NOT `whileInView`
- `FadeIn` component needs to support an `animate` prop (in addition to its current `whileInView` mode). Landing page continues using `whileInView`; dashboard pages use `animate="visible"`
- **Pages receiving animations**: dashboard home, profiles list, analyses list
- **Stagger on list items**:
  - Profiles list cards → `StaggerGroup` + `StaggerItem`
  - Analyses list cards → `StaggerGroup` + `StaggerItem`
- **Plain FadeIn with staggered delays** for dashboard home sections:
  - Active profile card, top matches row, recent analyses row → individual `FadeIn` with small delay increments

### Claude's Discretion
- Exact delay increments between dashboard home section FadeIns (0.05–0.15s range is appropriate)
- Whether to create a separate `FadeInMount` component or add an `animate` prop to existing `FadeIn`
- Border/ring adjustments on tier color chips (ring-* classes in TIER_COLORS may need updating alongside bg-*)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DS-01 | No hardcoded `rose-500` color remains in the codebase — all replaced with `primary` CSS token | Exactly 2 hardcoded rose locations identified in codebase. Specific token replacements documented. |
| DS-02 | Dashboard home, profiles list, and analyses list pages have Framer Motion entrance animations (FadeIn on mount, stagger on list items) | FadeIn component structure understood; `animate` prop extension pattern identified. StaggerGroup currently uses `whileInView` — needs parallel `animate="visible"` variant for list pages. |
| DS-03 | Tier colors are unified across web: excellent=teal, good=green, fair=amber, poor=red | All 4 locations with local TIER_COLORS maps identified. Only ScoreHeader.tsx `getTierColor()` needs updating; consumers call it automatically. TopMatchCard and analyses page have their own local maps that also need updating. |
| DS-04 | All card hover states use a consistent lift effect matching the landing page style | 5 card targets identified with their exact current hover classes. Replacement pattern documented. |
</phase_requirements>

---

## Summary

Phase 37 is a pure cosmetic/token propagation pass with zero new features or layout changes. All four requirements (DS-01 through DS-04) have been fully mapped to specific file locations. The codebase is small and well-structured, making this phase highly mechanical.

The primary technical challenge is DS-02 (animations): the existing `FadeIn` component hardcodes `whileInView` behavior. Dashboard pages need `animate="visible"` (on-mount) instead. The cleanest solution is adding a conditional `animate` prop to `FadeIn` that switches between the two trigger modes — backward-compatible, zero breaking changes to landing page. `StaggerGroup` has the same issue — it needs a parallel on-mount variant for the profiles and analyses list grids.

DS-03 (tier colors) appears to be handled by a single `getTierColor()` function in `ScoreHeader.tsx`, but inspection reveals three additional local `TIER_COLORS` maps that also need updating: `TopMatchCard.tsx` (uses `scoreBg` key), `AnalysisSummaryCard.tsx` (simple bg-only map), and `TopMatchSummaryCard.tsx` (simple bg-only map). The analyses page (`analyses/page.tsx`) also has its own `TIER_STYLES` inline map. These must all be updated; they do NOT automatically inherit from `ScoreHeader.tsx`.

**Primary recommendation:** Execute as four discrete, independently testable tasks (one per DS requirement) in the order DS-01, DS-03, DS-04, DS-02 — simpler changes first, motion last.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react (Framer Motion) | Already installed (v4.0+) | Component animation | Already used on landing page; `fadeUpVariants`, `staggerContainerVariants` already in `@/lib/motion` |
| Tailwind CSS | Already installed | Utility classes for tier colors, hover effects | All existing hover/transition patterns use Tailwind |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/motion` | project-local | Motion token library | Always import from here — never inline easing/spring configs |

**Installation:** None — all dependencies already installed.

---

## Architecture Patterns

### Recommended Component Edit Approach

```
web/src/
├── components/motion/
│   ├── FadeIn.tsx          # Add `animate` prop + conditional trigger
│   └── StaggerGroup.tsx    # Add `animate` prop + conditional trigger
├── components/analysis/
│   └── ScoreHeader.tsx     # Update TIER_COLORS (teal/green/amber/red + ring updates)
├── components/top-matches/
│   └── TopMatchCard.tsx    # Update local TIER_COLORS + add hover lift to Card
├── components/dashboard/
│   ├── AnalysisSummaryCard.tsx   # Update local TIER_COLORS + add hover lift
│   ├── TopMatchSummaryCard.tsx   # Update local TIER_COLORS + add hover lift
│   └── ReturningUserDashboard.tsx # Wrap sections with FadeIn (animate mode)
├── components/profiles/
│   ├── open-in-flatfox-button.tsx  # rose-600/rose-700 → primary/primary/90
│   └── profile-list.tsx    # Wrap ProfileCard grid with StaggerGroup (animate mode)
└── app/(dashboard)/
    ├── analysis/[listingId]/loading.tsx  # rose-500 → green-500
    └── analyses/page.tsx   # Update TIER_STYLES + wrap card grid with StaggerGroup
```

### Pattern 1: FadeIn Dual-Mode (on-mount vs whileInView)

**What:** Add an optional `animate` prop to `FadeIn`. When `animate="visible"` is passed, use `initial="hidden" animate="visible"` (mount-triggered). When absent (default), keep existing `whileInView` behavior.

**When to use:** Dashboard pages use `animate="visible"`. Landing page continues using the default (no prop = whileInView).

```typescript
// Source: web/src/components/motion/FadeIn.tsx — current structure
interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  variants?: typeof fadeUpVariants
  animate?: string  // NEW: when provided, uses animate prop instead of whileInView
}

export function FadeIn({ children, className, delay = 0, variants = fadeUpVariants, animate }: FadeInProps) {
  const shouldReduceMotion = useReducedMotion()
  const mountMode = animate !== undefined

  // Mount-triggered (dashboard pages)
  if (mountMode) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        animate={animate}
        variants={shouldReduceMotion ? {} : variants}
        transition={delay ? { delay } : undefined}
      >
        {children}
      </motion.div>
    )
  }

  // Scroll-triggered (landing page — unchanged)
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      exit="exit"
      viewport={{ once: true, amount: 0.2 }}
      variants={shouldReduceMotion ? {} : variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  )
}
```

### Pattern 2: StaggerGroup Dual-Mode

**What:** Same pattern applied to `StaggerGroup`. Dashboard list pages need `animate="visible"` on-mount stagger instead of `whileInView`.

```typescript
// Source: web/src/components/motion/StaggerGroup.tsx — current structure
export function StaggerGroup({ children, className, animate }: {
  children: React.ReactNode
  className?: string
  animate?: string  // NEW
}) {
  const mountMode = animate !== undefined
  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(mountMode ? { animate } : { whileInView: "visible", viewport: { once: true, amount: 0.15 } })}
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  )
}
```

### Pattern 3: Tier Color Map Update

**What:** Update all local TIER_COLORS maps to use the unified palette. The `ScoreHeader.tsx` map is the canonical reference — its `getTierColor()` is exposed, but other components maintain local copies.

**Current state** (wrong — must change):
```
excellent: bg-emerald-500   →   should be: bg-teal-500
good:      bg-blue-500      →   should be: bg-green-500
fair:      bg-amber-500     →   unchanged
poor:      bg-gray-500      →   should be: bg-red-500
```

**All files with local TIER_COLORS maps that must be updated:**
1. `web/src/components/analysis/ScoreHeader.tsx` lines 6-11 (canonical; also has ring/scoreBg)
2. `web/src/components/top-matches/TopMatchCard.tsx` lines 13-18 (has scoreBg + bg + text + ring)
3. `web/src/components/dashboard/AnalysisSummaryCard.tsx` lines 4-9 (bg only)
4. `web/src/components/dashboard/TopMatchSummaryCard.tsx` lines 3-8 (bg only)
5. `web/src/app/(dashboard)/analyses/page.tsx` lines 17-22 (TIER_STYLES with bg + text)

### Pattern 4: Card Hover Lift

**What:** Replace `hover:shadow-md` with `hover:-translate-y-1 hover:shadow-lg` while keeping `transition-all duration-200`.

**Current patterns to replace per file:**
- `AnalysisSummaryCard.tsx` line 32: `hover:border-muted-foreground/40 hover:shadow-md transition-all duration-200` → `hover:border-muted-foreground/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200`
- `TopMatchSummaryCard.tsx` line 31: same replacement
- `profile-card.tsx` line 104: `hover:shadow-md hover:ring-2 hover:ring-primary/10 transition-all` → `hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-primary/10 transition-all`
- `analyses/page.tsx` line 126 Card: `transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md` → `transition-all hover:ring-2 hover:ring-primary/20 hover:-translate-y-1 hover:shadow-lg`
- `TopMatchCard.tsx` line 61 Card: `ring-1 ${colors.ring} transition-all` → `ring-1 ${colors.ring} transition-all hover:-translate-y-1 hover:shadow-lg`

### Pattern 5: rose → primary Token Replacement

**What:** Two hardcoded rose-* locations remain in the codebase.

**File 1:** `web/src/components/profiles/open-in-flatfox-button.tsx` line 78
- `bg-rose-600` → `bg-primary`
- `hover:bg-rose-700` → `hover:bg-primary/90`
- `text-white` → `text-primary-foreground` (ensure contrast with CSS variable)

**File 2:** `web/src/app/(dashboard)/analysis/[listingId]/loading.tsx` line 44
- `bg-rose-500` → `bg-green-500` (exception per CONTEXT.md: matches extension's visual language)

### Dashboard Animation: ReturningUserDashboard Sections

The `ReturningUserDashboard` renders three sections in sequence: `ActiveProfileCard`, `TopMatchesSummary`, `RecentAnalysesSummary`. Each section wraps in a `FadeIn animate="visible"` with staggered delays:

```typescript
// ReturningUserDashboard.tsx sections pattern
<FadeIn animate="visible" delay={0}>
  <ActiveProfileCard ... />
</FadeIn>
<FadeIn animate="visible" delay={0.1}>
  <TopMatchesSummary ... />
</FadeIn>
<FadeIn animate="visible" delay={0.2}>
  <RecentAnalysesSummary ... />
</FadeIn>
```

Exact delays (0.05–0.15s range) are Claude's discretion per CONTEXT.md.

### Anti-Patterns to Avoid

- **Do NOT create a separate FadeInMount component.** The `animate` prop extension on existing `FadeIn` is cleaner and backward-compatible. A new component would create two diverging codepaths for the same animation.
- **Do NOT use Framer Motion `whileHover` for card lift.** Decision locked to CSS transitions (`hover:-translate-y-1`) per CONTEXT.md.
- **Do NOT create new CSS tokens for tier colors.** The decision is Tailwind utility classes directly in the map.
- **Do NOT assume `getTierColor()` consumers inherit automatically.** `TopMatchCard`, `AnalysisSummaryCard`, `TopMatchSummaryCard`, and the analyses page all have local copies — each must be updated independently.
- **Do NOT change text-white to text-primary-foreground on tier badges** unless the new Tailwind color (teal-500, green-500, red-500) has insufficient contrast with white. Standard Tailwind colored backgrounds are dark enough for white text.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| On-mount animation | Custom useState/useEffect visibility toggle | `motion.div` with `animate="visible"` | Framer Motion handles RAF scheduling, layout animation, reduced motion |
| Stagger orchestration | Manual delay calculation per child | `staggerContainerVariants` from `@/lib/motion` | Already established; consistent easing/timing |
| Reduced motion | Manual `prefers-reduced-motion` media query | `useReducedMotion()` from `motion/react` | Already wired in `FadeIn`; just preserve the pattern |

---

## Common Pitfalls

### Pitfall 1: Thinking getTierColor() is the Only Source of Truth
**What goes wrong:** Developer updates `ScoreHeader.tsx` TIER_COLORS and assumes all cards update automatically. But `TopMatchCard`, `AnalysisSummaryCard`, `TopMatchSummaryCard`, and the analyses page each have their own local copy.
**Why it happens:** The CONTEXT.md says "getTierColor() is the single source of truth; all consumers update automatically" — but this is only true for components that actually import and call `getTierColor()`. Inspection shows none of the dashboard cards or analyses page call it; they maintain local maps.
**How to avoid:** Update all 5 files with TIER_COLORS/TIER_STYLES maps explicitly.
**Warning signs:** After DS-03, grep for `bg-emerald`, `bg-blue-500`, `bg-gray-500` in the context of tier assignments — any remaining hits mean a local map was missed.

### Pitfall 2: Breaking Landing Page Animations With FadeIn Changes
**What goes wrong:** Adding `animate` prop to `FadeIn` in a way that changes the default behavior, breaking the landing page's whileInView animations.
**Why it happens:** Changing the component without preserving the no-prop default path.
**How to avoid:** Gate the mount-trigger path strictly on `animate !== undefined`. The default (no prop) must remain identical to current behavior.
**Warning signs:** Landing page sections flash in immediately on load instead of animating on scroll.

### Pitfall 3: FadeIn Stagger on Dashboard Home — Motion Not Firing
**What goes wrong:** FadeIn sections animate but feel simultaneous (no stagger effect) because the `transition` prop on `motion.div` overrides the `delay` prop implementation.
**Why it happens:** Current `FadeIn` passes `transition={delay ? { delay } : undefined}` — this is an override on the element transition, which works fine for single elements. For stagger on list items, the correct approach is using `StaggerGroup`/`StaggerItem` (not individual delay props).
**How to avoid:** For list grids (profiles, analyses), use `StaggerGroup animate="visible"` wrapping `StaggerItem` children. For the dashboard home sections (3 sequential blocks), individual `FadeIn` with explicit `delay` increments is correct.

### Pitfall 4: `text-primary-foreground` vs `text-white` on Primary Button
**What goes wrong:** Using `text-white` after changing `bg-rose-600` to `bg-primary`. The CSS `--primary` color is rose; the correct contrast text is `text-primary-foreground` (a CSS variable that resolves correctly in both light/dark mode).
**Why it happens:** Hardcoded `text-white` works coincidentally with rose, but the token-aware pattern uses `text-primary-foreground`.
**How to avoid:** In `open-in-flatfox-button.tsx`, replace the entire className to use `bg-primary text-primary-foreground hover:bg-primary/90`.

### Pitfall 5: `analyses/page.tsx` Is a Server Component — Cannot Directly Use motion.div
**What goes wrong:** Adding `StaggerGroup`/`FadeIn` (both "use client" components) directly to the server component `analyses/page.tsx` in a way that requires client-side rendering of the full page.
**Why it happens:** `motion.div` requires the client runtime.
**How to avoid:** The analyses grid is currently rendered inline in the server component. Extract the card grid into a client component (e.g., `AnalysesGrid.tsx`) that accepts the data as props and renders `StaggerGroup`/`StaggerItem` around the cards. The server component fetches data and passes it as props.

---

## Code Examples

### Current FadeIn (lines 1-34 of FadeIn.tsx)
```typescript
// Source: web/src/components/motion/FadeIn.tsx
"use client"

import { motion, useReducedMotion } from "motion/react"
import { fadeUpVariants } from "@/lib/motion"

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  variants?: typeof fadeUpVariants
}

export function FadeIn({ children, className, delay = 0, variants = fadeUpVariants }: FadeInProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"    // ← this needs to become conditional
      exit="exit"
      viewport={{ once: true, amount: 0.2 }}
      variants={shouldReduceMotion ? {} : variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  )
}
```

### Current TIER_COLORS in ScoreHeader.tsx (wrong colors — what will be replaced)
```typescript
// Source: web/src/components/analysis/ScoreHeader.tsx lines 6-11
const TIER_COLORS = {
  excellent: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-500/40', scoreBg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  good:      { bg: 'bg-blue-500',    text: 'text-white', ring: 'ring-blue-500/40',    scoreBg: 'bg-blue-50 dark:bg-blue-950/30'    },
  fair:      { bg: 'bg-amber-500',   text: 'text-gray-900', ring: 'ring-amber-500/40', scoreBg: 'bg-amber-50 dark:bg-amber-950/30' },
  poor:      { bg: 'bg-gray-500',    text: 'text-white', ring: 'ring-gray-500/40',    scoreBg: 'bg-gray-50 dark:bg-gray-950/30'    },
}
// Target: excellent→teal-500, good→green-500, fair→amber-500(unchanged), poor→red-500
// ring classes also need updating to match: ring-teal-500/40, ring-green-500/40, ring-red-500/40
// scoreBg also needs updating: bg-teal-50/dark:bg-teal-950/30, etc.
```

### TopMatchCard TIER_COLORS structure (local copy, also needs updating)
```typescript
// Source: web/src/components/top-matches/TopMatchCard.tsx lines 13-18
// This component has the same shape as ScoreHeader but uses scoreBg for the score circle background
const TIER_COLORS = {
  excellent: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800', scoreBg: 'bg-emerald-500' },
  good:      { bg: 'bg-blue-50 dark:bg-blue-950/30',       text: 'text-blue-700 dark:text-blue-400',       ring: 'ring-blue-200 dark:ring-blue-800',       scoreBg: 'bg-blue-500'    },
  // ...
}
// Note: bg here is used for card background tint (NOT score circle); scoreBg is the circle
// bg tints should also update to match teal/green/red
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `rose-500` hardcoded brand color | `primary` CSS token | This phase (DS-01) | One source of truth; dark mode safe |
| `emerald-500` for excellent tier | `teal-500` | This phase (DS-03) | Visually distinct from green; matches spec |
| `bg-gray-500` for poor tier | `bg-red-500` | This phase (DS-03) | Communicates danger/failure more clearly |
| `whileInView` only in FadeIn | Dual-mode with `animate` prop | This phase (DS-02) | Enables dashboard mount-triggered animations |
| `hover:shadow-md` | `hover:-translate-y-1 hover:shadow-lg` | This phase (DS-04) | Lift effect matches landing page quality |

---

## Open Questions

1. **ring-* and scoreBg updates in TopMatchCard**
   - What we know: TopMatchCard has a rich TIER_COLORS map with bg (card tint), text, ring, scoreBg (score circle). The card tint (`bg-emerald-50`) and matching `text-emerald-700` pattern needs to all shift from emerald→teal, blue→green, gray→red.
   - What's unclear: The exact dark mode variants for `bg-teal-50 dark:bg-teal-950/30` and `text-teal-700 dark:text-teal-400` are standard Tailwind — should work without custom config.
   - Recommendation: Apply mechanically. Tailwind teal-50/teal-950/teal-700/teal-400 all exist as standard tokens.

2. **Analyses page server component split**
   - What we know: `analyses/page.tsx` is a Next.js server component (async function, no "use client"). It renders the card grid inline. StaggerGroup requires "use client".
   - What's unclear: Whether to extract only the grid or the entire content area.
   - Recommendation: Extract just the card grid into `AnalysesGrid.tsx` ("use client"), receiving `analyses` array and `profileMap` as props. Keep the filter bar and empty state in the server component.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Testing Library (React) |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DS-01 | No `rose-` class in compiled web source | grep/smoke | `grep -r "rose-" web/src --include="*.tsx" --include="*.ts" \| grep -v "node_modules" \| grep -v "RESEARCH" \| wc -l` should return 0 | Manual verify |
| DS-02 | FadeIn renders children in both modes | unit | `cd web && npm test -- --run src/__tests__/fade-in.test.tsx` | ✅ (existing, extends for animate prop) |
| DS-03 | Tier color maps return expected teal/green/amber/red | unit | New test file needed | ❌ Wave 0 |
| DS-04 | Card hover classes present in rendered output | unit | New test file needed or visual review | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **Per wave merge:** `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/src/__tests__/tier-colors.test.tsx` — unit test for `getTierColor()` returning correct teal/green/amber/red classes (covers DS-03)
- [ ] Extend `web/src/__tests__/fade-in.test.tsx` — add test case for `animate` prop mode (covers DS-02)

*(Existing test infrastructure covers the run harness — only new test files needed for new behaviors.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all affected files — line numbers, class names, component APIs verified
- `web/src/components/motion/FadeIn.tsx` — current whileInView-only implementation
- `web/src/components/motion/StaggerGroup.tsx` — current whileInView-only implementation
- `web/src/lib/motion.ts` — complete motion token library
- `web/src/components/analysis/ScoreHeader.tsx` — TIER_COLORS map and getTierColor() export
- `web/src/components/top-matches/TopMatchCard.tsx` — local TIER_COLORS (independent copy)
- `web/src/components/dashboard/AnalysisSummaryCard.tsx` — local TIER_COLORS (independent copy)
- `web/src/components/dashboard/TopMatchSummaryCard.tsx` — local TIER_COLORS (independent copy)
- `web/src/app/(dashboard)/analyses/page.tsx` — TIER_STYLES inline map, server component structure
- `web/src/components/profiles/open-in-flatfox-button.tsx` — rose-600 hardcode at line 78
- `web/src/app/(dashboard)/analysis/[listingId]/loading.tsx` — rose-500 hardcode at line 44
- `web/src/components/dashboard/ReturningUserDashboard.tsx` — dashboard sections structure
- `web/src/components/profiles/profile-list.tsx` — ProfileCard grid structure
- `web/vitest.config.mts` — test infrastructure config

### Secondary (MEDIUM confidence)
- Framer Motion docs pattern: conditional `animate` vs `whileInView` is standard API usage — both are valid `motion.div` props, not hacks

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, APIs inspected directly in source
- Architecture: HIGH — all specific file locations, line numbers, and current class values verified from source
- Pitfalls: HIGH — derived from direct code inspection (e.g., local TIER_COLORS copies vs assumed single source, server component constraint on analyses page)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable codebase; only invalidated by concurrent phase changes to motion components or tier color system)
