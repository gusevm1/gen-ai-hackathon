# Phase 19: Landing Page — Research

**Researched:** 2026-03-27
**Domain:** Next.js App Router landing page, auth routing, motion/react orchestration, bilingual copy
**Confidence:** HIGH

---

## Summary

Phase 19 replaces the current `page.tsx` (auth form only) with a full marketing landing page and moves
the auth form to `/auth`. The project already has the complete motion foundation from Phase 18:
`motion` package (v12.38), `@/lib/motion` tokens, `FadeIn`, `StaggerGroup/Item`, and `CountUp` components.
The teal color tokens (`bg-hero-bg`, `bg-teal`, `text-hero-teal`) are already wired into globals.css.
Nothing needs to be installed or added to the design system — Phase 19 is pure composition.

The routing architecture is straightforward: the `(dashboard)` route group already guards itself
via `redirect("/")` in its layout. After this phase, unauthenticated visitors hit `/` (landing),
click "Sign In" → go to `/auth`, authenticate → redirect to `/dashboard`. Logged-in users who
visit `/` should be bounced to `/dashboard` via a server-side auth check at the top of the
landing page component (a simple `createClient` + `getUser` + `redirect`).

The hero product demo animation uses a **sequential `useAnimate` timeline** — not variants/orchestration —
because the sequence is cinematic (card 1 appears → card 2 appears → FAB pulses → scores count up →
panel slides in). Each step depends on the previous, making a linear timeline the correct model.
The existing `FadeIn` and `StaggerGroup` components are used for all scroll-triggered sections below the hero.

**Primary recommendation:** Build the hero demo as one `'use client'` `HeroDemo` component using `useAnimate`
from `motion/react`. Use `FadeIn` + `StaggerGroup` wrappers for all below-fold content. Auth form
extracted verbatim to `/auth/page.tsx` with no logic changes.

---

## Auth Routing Architecture

### Current State (Problem)

```
/            → page.tsx  (auth form — 'use client', Supabase signIn/signUp)
/(dashboard) → guarded by layout.tsx (redirect("/") if !user)
```

Auth redirect in dashboard layout currently points to `"/"` — this stays correct after the change
because `/` will be the landing page and `/auth` will have the sign-in form.

### Target State

```
/            → page.tsx  (landing page — async Server Component, checks auth, redirects /dashboard if logged in)
/auth        → app/auth/page.tsx  (auth form — 'use client', identical logic to current page.tsx)
/(dashboard) → layout.tsx  (unchanged — redirect("/auth") after this phase, or keep "/" which lands on landing)
```

**DECISION on dashboard redirect target:** The dashboard layout currently does `redirect("/")`. After
this phase `/` is the landing page (not auth). Two valid choices:

- Option A (minimal change): Keep `redirect("/")` — unauthenticated users see the landing page and
  must click "Sign In" to reach `/auth`. This is correct UX for a public product.
- Option B: Change dashboard redirect to `redirect("/auth")` — goes directly to auth form.

**Recommendation: Option A.** Sending unauthenticated users to the landing page is correct — they
may not have an account yet. The landing page CTA buttons point to `/auth`. No changes needed to
the dashboard layout's redirect target.

### Landing Page Auth Check (Server Component)

The new `page.tsx` must be an async Server Component that redirects logged-in users:

```typescript
// app/page.tsx — Server Component
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return <LandingPageContent />
}
```

`LandingPageContent` is a Client Component boundary that renders all the animated sections.
This pattern works because `page.tsx` itself is a Server Component — only the interactive/animated
children need `'use client'`.

### /auth Route

Create `app/auth/page.tsx` — extract the existing `page.tsx` form code exactly as-is. No logic
changes. The only change: after successful auth, the router still pushes to `/dashboard`.

```
web/src/app/
├── page.tsx              ← REPLACED: async Server Component (auth check + LandingPageContent)
├── auth/
│   └── page.tsx          ← NEW: exact copy of current page.tsx auth form
└── (dashboard)/
    └── layout.tsx         ← UNCHANGED (redirect("/") remains valid)
```

**No middleware needed.** The dashboard layout's server-side auth guard is sufficient. Middleware
would only be needed for performance-critical redirects — unnecessary here.

---

## Hero Animation Orchestration

### Correct Tool: `useAnimate` Timeline

The Phase 18 `FadeIn` and `StaggerGroup` components use `whileInView` variants — they are triggered
by scroll entry and play independently. The hero demo is different: it is a **choreographed sequence**
where each element appears in a deliberate order, like an explainer video.

Use `useAnimate` from `motion/react` (confirmed available — same package as `motion/react` used in
Phase 18 components). `useAnimate` returns a `[scope, animate]` tuple. Attach `scope` to the demo
container. Call `animate()` with a **sequence array** — each entry plays after the previous.

```typescript
// Source: motion/react useAnimate API (motion package v12)
'use client'

import { useEffect } from 'react'
import { useAnimate, useInView } from 'motion/react'

export function HeroDemo() {
  const [scope, animate] = useAnimate()
  const isInView = useInView(scope, { once: true, amount: 0.3 })

  useEffect(() => {
    if (!isInView) return

    const sequence = async () => {
      // Step 1: First listing card fades + slides up (0 → 0.4s)
      await animate('#card-1', { opacity: [0, 1], y: [20, 0] }, { duration: 0.4, ease: [0.22, 1, 0.36, 1] })

      // Step 2: Second listing card staggers in (0.08s after first)
      await animate('#card-2', { opacity: [0, 1], y: [20, 0] }, { duration: 0.4, ease: [0.22, 1, 0.36, 1] })

      // Step 3: FAB pulses (scale bounce)
      await animate('#fab', { scale: [1, 1.15, 1] }, { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] })

      // Step 4: Score badges count up — trigger CountUp visibility
      await animate('#score-badge-1', { opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.3, ease: [0.22, 1, 0.36, 1] })
      await animate('#score-badge-2', { opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.08 })

      // Step 5: Analysis panel slides in from right
      await animate('#analysis-panel', { opacity: [0, 1], x: [40, 0] }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] })
    }

    sequence()
  }, [isInView, animate])

  return (
    <div ref={scope} className="relative w-full">
      {/* demo elements with matching IDs */}
    </div>
  )
}
```

**Why not variants orchestration?** Variant `staggerChildren` works for parallel/staggered reveals
but cannot encode "play A, then B, then C" logic. `useAnimate` is the correct abstraction.

**Why not `AnimatePresence`?** `AnimatePresence` handles mount/unmount transitions. The demo elements
are all mounted simultaneously — only their visibility is animated. Not the right tool.

**Reduced motion:** Wrap the `useEffect` with `useReducedMotion()`. If true, skip to final visible
state immediately (set all elements to `opacity: 1` with `duration: 0`).

### Demo Visual Design (Mock UI)

The demo shows a simplified mock of Flatfox listing cards + the HomeMatch overlay. Key constraint:
it must be recognisable as "property search" but does NOT need to be a real screenshot. Use hardcoded
mock data in TypeScript — no runtime data fetching.

Mock listing card structure:
- Address: "Forchstrasse 12, 8032 Zürich" / "Seestrasse 45, 8002 Zürich"
- Price: "CHF 2,400 / month" / "CHF 3,100 / month"
- Rooms/size: "3.5 Zi. — 78 m²" / "4 Zi. — 95 m²"
- Score badge (teal pill): "87" / "62"
- FAB button (teal circle with sparkle icon)

Analysis panel:
- Score breakdown: Location 92, Size 88, Price 75
- Brief summary line in teal text

All text in the demo should be EN only (no bilingual needed in an animated demo UI).

---

## Landing Page Section Structure

### Conversion-Optimised Order (Hormozi Framework Applied)

The Hormozi "value equation" framework: Dream Outcome × Perceived Likelihood × Time to Value ÷ Effort.
For a B2C SaaS targeting Swiss apartment seekers, the structure maps as:

```
1. NAVBAR           — trust signal, minimal friction
2. HERO             — Dream Outcome + visual proof (the demo)
3. PROBLEM          — Agitate pain before offering solution
4. HOW IT WORKS     — Mechanism (perceived likelihood ↑, effort ↓)
5. FEATURES         — Depth for the already-convinced
6. FINAL CTA        — Remove last hesitation, action
7. FOOTER           — legal, secondary links
```

**Why problem before solution?** Users must recognise the pain before a solution resonates. "AI scores
properties" is noise until the reader has felt the problem. Agitate → Solve is the Hormozi sequence.

### Section 1: Navbar

Minimal. Logo left, "Sign In" button right. No nav links — this is a pre-auth landing page.
Language toggle (EN/DE) optional — can be in footer if navbar feels cluttered. Transparent on dark
hero, becomes `bg-background/95 backdrop-blur` on scroll (sticky).

### Section 2: Hero

**Structure:**
- Overline tag: `AI-Powered Property Scoring` / `KI-gestützte Immobilienbewertung`
- Display headline (the hook)
- Subtitle (one sentence, dream outcome)
- CTA button → `/auth`
- Animated product demo below

**EN/DE Copy:**

| Element | English | German |
|---------|---------|--------|
| Overline | `AI-Powered Property Scoring` | `KI-gestützte Immobilienbewertung` |
| Headline | `Know instantly if a flat is worth your time.` | `Sofort wissen, ob eine Wohnung Ihre Zeit wert ist.` |
| Subtitle | `HomeMatch scores every Flatfox listing against your preferences — in seconds.` | `HomeMatch bewertet jedes Flatfox-Inserat anhand Ihrer Anforderungen — in Sekunden.` |
| CTA | `Get started free` | `Kostenlos starten` |

Headline is under 10 words. Active. Clear benefit. No jargon.

### Section 3: Problem

**Frame:** Property search in Switzerland is exhausting, not broken in a technical sense — so use
empathetic copy, not angry copy. The pain is **time waste and uncertainty**.

**Structure:** Overline → headline → 3 problem bullets

| Element | English | German |
|---------|---------|--------|
| Overline | `The problem` | `Das Problem` |
| Headline | `Finding a flat in Zurich takes weeks.` | `Eine Wohnung in Zürich zu finden dauert Wochen.` |
| Bullet 1 | `You scroll through dozens of listings, most of which don't match your needs.` | `Dutzende von Inseraten — die meisten passen nicht zu Ihnen.` |
| Bullet 2 | `You waste evenings on viewings for places you knew weren't right.` | `Abende verschwendet für Besichtigungen, die nie infrage kamen.` |
| Bullet 3 | `By the time you decide, the good ones are already gone.` | `Wenn Sie sich entschieden haben, sind die guten längst vergeben.` |

### Section 4: How It Works

**Frame:** Three steps. Apple-simple. Eliminates perceived effort. Fast time to value.

**Structure:** Overline → headline → 3 numbered steps

| Element | English | German |
|---------|---------|--------|
| Overline | `How it works` | `So funktioniert es` |
| Headline | `From install to first score in under 5 minutes.` | `Von der Installation zum ersten Score in unter 5 Minuten.` |
| Step 1 label | `1. Set your preferences` | `1. Anforderungen festlegen` |
| Step 1 body | `Tell HomeMatch what matters to you — location, size, budget, dealbreakers.` | `Sagen Sie HomeMatch, worauf es Ihnen ankommt — Lage, Grösse, Budget, Ausschlusskriterien.` |
| Step 2 label | `2. Install the extension` | `2. Erweiterung installieren` |
| Step 2 body | `Add HomeMatch to Chrome. It takes 30 seconds.` | `HomeMatch zu Chrome hinzufügen. Dauert 30 Sekunden.` |
| Step 3 label | `3. Score any listing` | `3. Inserate bewerten` |
| Step 3 body | `Browse Flatfox as usual. Tap the HomeMatch button to score any listing instantly.` | `Flatfox wie gewohnt durchsuchen. HomeMatch-Button drücken — sofort bewertet.` |

### Section 5: Features

**Frame:** Depth for the already-convinced. Three tightly-framed capabilities with icons.

| Element | English | German |
|---------|---------|--------|
| Overline | `What you get` | `Was Sie bekommen` |
| Headline | `Built for the Swiss rental market.` | `Entwickelt für den Schweizer Mietmarkt.` |
| Feature 1 title | `Instant AI scores` | `Sofortige KI-Bewertung` |
| Feature 1 body | `Every listing gets a 0–100 match score based on your exact preferences, with full reasoning.` | `Jedes Inserat erhält einen Übereinstimmungsscore von 0–100 — mit vollständiger Begründung.` |
| Feature 2 title | `Multiple profiles` | `Mehrere Profile` |
| Feature 2 body | `Searching for yourself and a partner? Create separate profiles. Scores update automatically.` | `Suchen Sie für sich und eine weitere Person? Eigene Profile erstellen. Scores passen sich automatisch an.` |
| Feature 3 title | `Full analysis breakdown` | `Detaillierte Analyse` |
| Feature 3 body | `See exactly why a listing scored well or poorly — category by category, in plain language.` | `Sehen Sie genau, warum ein Inserat gut oder schlecht abschneidet — Kategorie für Kategorie, in einfacher Sprache.` |

Icons (from lucide-react): `Zap` (instant scores), `Users` (multiple profiles), `BarChart3` (analysis).

### Section 6: Final CTA

**Frame:** Reduce final hesitation. Free, fast, no credit card.

| Element | English | German |
|---------|---------|--------|
| Overline | `Ready to find your flat?` | `Bereit, Ihre Wohnung zu finden?` |
| Headline | `Stop guessing. Start matching.` | `Aufgehört zu raten. Angefangen zu treffen.` |
| Subtext | `Free to use. No credit card. Works on Flatfox.ch.` | `Kostenlos. Keine Kreditkarte. Funktioniert auf Flatfox.ch.` |
| CTA | `Create free account` | `Kostenloses Konto erstellen` |

### Section 7: Footer

Minimal. Logo + copyright + privacy policy link (page already exists at `/privacy-policy`).
Language toggle can live here if not in navbar.

---

## Bilingual Implementation Pattern

### Current Pattern (Dashboard)

Server pages read the language cookie directly:
```typescript
const lang = (cookieStore.get(LANG_COOKIE)?.value ?? 'en') as Language
t(lang, 'key')
```

Client components use `useLanguage()` hook from `LanguageContext`.

### Landing Page Pattern

The landing page mixes a Server Component wrapper (for auth check) with Client Component sections
(for animation). The translation system must work client-side.

**Recommended approach:** Create a single `'use client'` `LandingPageContent` component that calls
`useLanguage()` once and passes `lang` down as a prop to each section. This avoids calling the hook
in every nested component and keeps the pattern consistent with existing dashboard usage.

```typescript
// app/page.tsx — Server Component shell
export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  return <LandingPageContent />
}

// components/landing/LandingPageContent.tsx — Client Component
'use client'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

export function LandingPageContent() {
  const { language } = useLanguage()

  return (
    <>
      <LandingNavbar lang={language} />
      <HeroSection lang={language} />
      <ProblemSection lang={language} />
      <HowItWorksSection lang={language} />
      <FeaturesSection lang={language} />
      <CtaSection lang={language} />
      <LandingFooter lang={language} />
    </>
  )
}
```

Each section receives `lang: Language` and calls `t(lang, 'key')` directly — same pattern as server pages.

### New Translation Keys Needed

Extend `translations.ts` with a `landing_*` namespace prefix:

```typescript
// Keys to add to both 'en' and 'de' objects in translations.ts
landing_hero_overline
landing_hero_headline
landing_hero_subtitle
landing_hero_cta
landing_problem_overline
landing_problem_headline
landing_problem_bullet1
landing_problem_bullet2
landing_problem_bullet3
landing_howit_overline
landing_howit_headline
landing_howit_step1_label
landing_howit_step1_body
landing_howit_step2_label
landing_howit_step2_body
landing_howit_step3_label
landing_howit_step3_body
landing_features_overline
landing_features_headline
landing_feat1_title
landing_feat1_body
landing_feat2_title
landing_feat2_body
landing_feat3_title
landing_feat3_body
landing_cta_overline
landing_cta_headline
landing_cta_subtext
landing_cta_button
landing_footer_copyright
landing_nav_signin
```

**Total: 30 keys × 2 languages = 60 translation strings.** All copy is specified in the section
structure above.

---

## Component Breakdown

### New Files to Create

```
web/src/app/
├── page.tsx                           ← REPLACED (Server Component shell)
├── auth/
│   └── page.tsx                       ← NEW (extracted from current page.tsx)
└── (dashboard)/
    └── layout.tsx                     ← UNCHANGED

web/src/components/landing/
├── LandingPageContent.tsx             ← Client boundary + section orchestrator
├── LandingNavbar.tsx                  ← Logo + Sign In CTA, scroll-aware sticky
├── HeroSection.tsx                    ← Headline + subtitle + CTA + <HeroDemo>
├── HeroDemo.tsx                       ← useAnimate cinematic sequence (mock UI)
├── ProblemSection.tsx                 ← FadeIn + 3 problem points
├── HowItWorksSection.tsx              ← StaggerGroup + 3 numbered steps
├── FeaturesSection.tsx                ← StaggerGroup + 3 feature cards
├── CtaSection.tsx                     ← FadeIn + CTA button
└── LandingFooter.tsx                  ← Logo + copyright + privacy link
```

### Component Responsibilities

**`LandingNavbar.tsx`**
- `'use client'` for scroll detection
- `useScrollY` pattern: `motionValue` from `motion/react`, `useScroll`, background transitions on scroll
- Logo (existing `<Logo>`) left, "Sign In" `<Button asChild>` + `<Link href="/auth">` right
- Language toggle using `useLanguage()` setter — a simple `<button>` cycling EN/DE

**`HeroSection.tsx`**
- Static layout: overline, headline (`h1`), subtitle, CTA `<Button asChild><Link href="/auth">`
- Renders `<HeroDemo>` below the text content
- Background: `bg-hero-bg text-hero-fg` — the hardcoded dark section

**`HeroDemo.tsx`**
- `'use client'` + `useAnimate` + `useInView` + `useReducedMotion`
- Mock listing cards, FAB, score badges, analysis panel — all static JSX with IDs for targeting
- Animation sequence in `useEffect` guarded by `isInView`
- Uses teal tokens: `bg-hero-teal`, `text-hero-teal`, `border-hero-teal/30`

**`ProblemSection.tsx`**
- Light background section (`bg-background`)
- `<FadeIn>` wraps the entire section content (scroll-triggered)
- 3 problem statements — could use icons or simply large text with subtle left-border teal accent

**`HowItWorksSection.tsx`**
- Light background
- 3 steps in a responsive grid (1 col mobile, 3 col desktop)
- `<StaggerGroup>` with `<StaggerItem>` for each step
- Step number in teal, label bold, body text muted

**`FeaturesSection.tsx`**
- Slightly off-white/muted background for visual separation (`bg-muted/30` or similar)
- 3 feature cards using shadcn `<Card>` + lucide icon
- `<StaggerGroup>` for the 3 cards

**`CtaSection.tsx`**
- Dark background (`bg-hero-bg`) mirroring the hero — bookend visual pattern
- `<FadeIn>` wrapper
- Large headline + subtext + CTA button in teal

**`LandingFooter.tsx`**
- `<Logo>` + copyright year + `<Link href="/privacy-policy">Privacy Policy</Link>`
- Language toggle here if not in navbar

### Modified Files

| File | Change |
|------|--------|
| `web/src/lib/translations.ts` | Add 30 `landing_*` keys to both `en` and `de` |
| `web/src/app/page.tsx` | Complete replacement — Server Component with auth check |

---

## Architecture Patterns

### Server Component Shell + Client Component Content

This is the canonical Next.js App Router pattern for pages that need both server-side auth and
client-side interactivity. The split is:

```
page.tsx (Server)
└── LandingPageContent.tsx (Client boundary — 'use client')
    ├── LandingNavbar.tsx (Client — scroll detection)
    ├── HeroSection.tsx (can be Server, but wrapped in Client boundary already)
    ├── HeroDemo.tsx (Client — useAnimate)
    ├── ProblemSection.tsx (uses FadeIn — must be Client)
    ├── HowItWorksSection.tsx (uses StaggerGroup — must be Client)
    ├── FeaturesSection.tsx (uses StaggerGroup — must be Client)
    ├── CtaSection.tsx (uses FadeIn — must be Client)
    └── LandingFooter.tsx (Server-compatible, but inside Client boundary)
```

Since `LandingPageContent` has `'use client'`, all descendants are automatically client components.
No need to mark each child with `'use client'` unless they are in a separate file imported directly
from a Server Component (they are not — all go through `LandingPageContent`).

**CRITICAL:** `page.tsx` must NOT have `'use client'` — it is the Server Component auth gate.
If the auth check + content lived in the same file with `'use client'`, the auth check would run
client-side (insecure and broken). The shell/content split is mandatory.

### Scroll-Aware Navbar Pattern

```typescript
'use client'
import { useMotionValue, useScroll, useTransform } from 'motion/react'
import { motion } from 'motion/react'

export function LandingNavbar() {
  const { scrollY } = useScroll()
  // Opacity: 0 at top of page, 1 after scrolling 100px
  const bgOpacity = useTransform(scrollY, [0, 100], [0, 0.95])

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 border-b border-transparent"
      style={{ backgroundColor: `hsl(0 0% 4% / ${bgOpacity})` }}
    >
      {/* ...nav content */}
    </motion.header>
  )
}
```

Alternative simpler pattern: CSS `backdrop-blur` class toggled by a scroll event listener.
The motion-based approach is smoother and consistent with the existing motion library usage.

---

## Common Pitfalls

### Pitfall 1: `'use client'` on page.tsx breaks auth check

**What goes wrong:** If `page.tsx` is a Client Component, `createClient()` from
`@/lib/supabase/server` cannot be called (it uses `next/headers` which is server-only). The
import will throw at build time.
**How to avoid:** `page.tsx` must be a Server Component (no `'use client'` directive). The
client boundary is `LandingPageContent.tsx`.
**Warning signs:** Build error mentioning `next/headers` in a client component.

### Pitfall 2: `useAnimate` scope ref not attached

**What goes wrong:** `useAnimate` returns `[scope, animate]`. The `scope` ref must be attached
to a DOM element with `ref={scope}`. If it's not attached, `animate('#id', ...)` silently targets
nothing — animation plays but nothing moves.
**How to avoid:** Always `<div ref={scope}>` at the top of `HeroDemo`. IDs inside this container
are scoped automatically.
**Warning signs:** No visible animation, no errors in console.

### Pitfall 3: `useAnimate` sequence not cleaned up

**What goes wrong:** The `useEffect` calling `sequence()` runs once on mount (when `isInView`
becomes true). If the component unmounts and remounts (e.g., React strict mode double-invoke in
development), the animation may run twice, leaving elements in an inconsistent state.
**How to avoid:** Return a cleanup function from `useEffect` that calls `animate.stop()` if needed,
or use `useInView({ once: true })` to ensure the trigger fires only once.

### Pitfall 4: Tailwind v4 inline styles for dynamic values

**What goes wrong:** Tailwind v4 is CSS-first — utility classes are static at build time. Dynamic
values like `opacity-[${value}]` with a JavaScript variable do NOT work in Tailwind v4.
**How to avoid:** For dynamic animated values (scroll-linked opacity, etc.), use `style` prop with
CSS variables or motion values, not dynamic Tailwind class strings.
**Warning signs:** Class like `opacity-[var(--some-val)]` renders but value never updates.

### Pitfall 5: Translation keys missing in `de` object

**What goes wrong:** TypeScript enforces `TranslationKey` as `keyof typeof translations.en`, but
does not enforce that `de` has all the same keys (the `de` object is declared separately). If a key
exists in `en` but not `de`, calling `t('de', key)` returns `undefined` and TypeScript won't catch
it because the `as const` type widening.
**How to avoid:** Add all new keys to both `en` and `de` simultaneously. Add a type assertion after
the object: `const _check: typeof translations.en = translations.de` to get a TS error if they diverge.
**Warning signs:** Empty text in German mode for specific strings.

### Pitfall 6: Hero section theme interference

**What goes wrong:** The hero uses `bg-hero-bg` (hardcoded `hsl(0 0% 4%)`). If the root `body`
applies `bg-background` (which changes in dark mode), and the hero section is a child, the background
inheritance is fine — `bg-hero-bg` overrides. However, text inside the hero must explicitly use
`text-hero-fg` — if it inherits from body, it may pick up the wrong colour in light mode.
**How to avoid:** Always apply `text-hero-fg` on the hero section wrapper, not just on individual
text elements.

### Pitfall 7: Motion `CountUp` reuse — already viewport-triggered

**What goes wrong:** The existing `CountUp` component uses `useInView` internally — it starts
counting when the `<span>` enters the viewport. In the hero demo, the demo itself may not be in
the viewport when the animation sequence reaches the "count up" step. The `CountUp` will only
count if it is visible on screen, regardless of the `useAnimate` timeline.
**How to avoid:** For hero demo score badges, do NOT use `CountUp` — use a simple static number
revealed by `useAnimate` opacity/scale. Reserve `CountUp` for scroll-triggered stats sections
(if added later). Or control the countdown manually via `useAnimate` on a `motion.span`.

### Pitfall 8: Dashboard layout redirect still points to "/"

**What goes wrong:** After this phase, unauthenticated users hit `/` (landing page). The dashboard
layout does `redirect("/")` when no user is found — this is correct, they land on the landing page.
No change needed. BUT if someone naively changes it to `redirect("/auth")`, the path `/auth` must
exist before that change is deployed — otherwise a 404.
**How to avoid:** Keep `redirect("/")` in the dashboard layout. Only change if explicitly desired.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `framer-motion` package | `motion` package (import `motion/react`) | React 19 compatible, same API |
| `tailwind.config.js` for tokens | `globals.css` `@theme inline {}` block | Already set up in Phase 18 |
| Custom `useScrollPosition` hook | `useScroll` from `motion/react` | Motion value, no re-renders |
| `next-i18next` for bilingual | `translations.ts` + `LanguageContext` | Simpler, already in place |

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 |
| Config file | `web/vitest.config.ts` (inferred from package.json `test: vitest`) |
| Quick run command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |
| Full suite command | `cd /Users/singhs/gen-ai-hackathon/web && npm test -- --run` |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| LP-01 | Landing page renders without crash | smoke | `npm test -- --run --reporter=verbose 2>&1 \| grep landing` | ❌ Wave 0 |
| LP-02 | Auth form renders at `/auth` route | smoke | render test for AuthPage component | ❌ Wave 0 |
| LP-03 | Translation keys exist in both EN and DE | unit | test all `landing_*` keys via `t()` | ❌ Wave 0 |
| LP-04 | HeroDemo renders without crash | smoke | render test for HeroDemo | ❌ Wave 0 |
| LP-05 | LandingNavbar renders without crash | smoke | render test for LandingNavbar | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `web/src/__tests__/landing-page.test.tsx` — covers LP-01, LP-04, LP-05 (render tests)
- [ ] `web/src/__tests__/auth-page.test.tsx` — covers LP-02
- [ ] `web/src/__tests__/landing-translations.test.ts` — covers LP-03 (assert all `landing_*` keys exist in both languages)

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `web/src/app/page.tsx`, `web/src/app/(dashboard)/layout.tsx`,
  `web/src/lib/supabase/server.ts`, `web/src/lib/language-context.tsx`, `web/src/lib/translations.ts`,
  `web/src/lib/motion.ts`, `web/src/components/motion/*.tsx`
- Phase 18 PLAN (`18-01-PLAN.md`) — confirmed motion package v12, `useAnimate` available in `motion/react`,
  all token names and CSS variable names
- `globals.css` direct read — confirmed `--color-hero-bg`, `--color-hero-fg`, `--color-hero-teal`,
  `--color-teal` are already registered as Tailwind utilities
- `package.json` — confirmed `motion@^12.38.0`, `next@16.1.6`, `react@19.2.3`

### Secondary (MEDIUM confidence)

- Next.js App Router documentation pattern: Server Component shell + Client Component content for
  pages needing both auth and interactivity — established pattern from Next.js official docs

### Tertiary (LOW confidence)

- Hormozi copy framework applied to Swiss B2C property SaaS — synthesis from general conversion
  copywriting principles, not verified against a specific Swiss market study

---

## Metadata

**Confidence breakdown:**
- Auth routing architecture: HIGH — derived directly from existing codebase
- Animation orchestration: HIGH — `useAnimate` API confirmed in Phase 18 plan, motion v12 installed
- Copy / Hormozi sections: MEDIUM — copywriting framework is well-established; specific Swiss resonance is LOW
- Bilingual pattern: HIGH — existing `LanguageContext` + `translations.ts` pattern is documented in codebase
- Component structure: HIGH — follows established Next.js App Router conventions

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable — no fast-moving dependencies)
