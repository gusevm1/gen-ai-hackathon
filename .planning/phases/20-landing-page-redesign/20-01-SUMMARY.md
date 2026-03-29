---
phase: 20-landing-page-redesign
plan: "01"
subsystem: landing-page
tags: [landing, animation, scroll-driven, framer-motion, isometric-svg, chapters]
dependency_graph:
  requires: [phase-18-design-system, phase-19-landing-page]
  provides: [scroll-driven-landing-page, chapter-components, isometric-svg]
  affects: [web/src/app/page.tsx]
tech_stack:
  added: []
  patterns: [sticky-scroll-chapter, useScroll-useTransform, useReducedMotion-fallback, Button-render-prop]
key_files:
  created:
    - web/src/components/landing/ChapterHook.tsx
    - web/src/components/landing/ChapterSwitzerland.tsx
    - web/src/components/landing/ChapterProblem.tsx
    - web/src/components/landing/ChapterMechanism.tsx
    - web/src/components/landing/ChapterScore.tsx
    - web/src/components/landing/ChapterDream.tsx
    - web/src/components/landing/ChapterCTA.tsx
    - web/src/components/landing/IsometricHome.tsx
  modified:
    - web/src/components/landing/LandingPageContent.tsx
    - web/src/lib/translations.ts
    - web/src/app/globals.css
    - web/src/__tests__/landing-page.test.tsx
  deleted:
    - web/src/components/landing/HeroSection.tsx
    - web/src/components/landing/HeroDemo.tsx
    - web/src/components/landing/ProblemSection.tsx
    - web/src/components/landing/HowItWorksSection.tsx
    - web/src/components/landing/FeaturesSection.tsx
    - web/src/components/landing/CtaSection.tsx
decisions:
  - "IsometricHome uses useMotionValue(1) as fallback when scrollProgress is undefined — all parts visible in static mode"
  - "useMotionValue calls for non-buildMode opacity placed inline to avoid conditional hooks pattern"
  - "Build failure on /auth pre-rendering (Supabase env vars missing at build time) is pre-existing, out of scope"
  - "Test file updated to remove HeroDemo import after component deletion"
metrics:
  duration_seconds: 438
  completed_date: "2026-03-27"
  tasks_completed: 7
  files_changed: 14
---

# Phase 20 Plan 01: Scroll-Driven Landing Page Redesign Summary

**One-liner:** 7-chapter Apple-style scroll cinematic landing page using sticky sections + Framer Motion useScroll/useTransform, replacing Phase 19 flat layout with isometric SVG builds and globe zoom animations.

## What Was Built

### Chapter 1 — Hook (`ChapterHook.tsx`)
Load-triggered word stagger animation (no scroll dependency). Each word in "Your next home. Already found." fades up with 0.12s per-word delay using `motion.span` + mount animation. HomeMatch logo fades in after 1.2s. Scroll indicator appears at 2.0s. Full `useReducedMotion()` fallback shows final state immediately with zero delays.

### Chapter 2 — Switzerland (`ChapterSwitzerland.tsx`)
300vh sticky chapter. SVG globe (200×200 viewBox, 300px rendered) zooms from scale 1 to 5 via `useTransform` on scrollYProgress [0.3, 0.65], panning -75px X and +75px Y to keep Switzerland centered. Switzerland polygon turns teal at [0.6, 0.75]. Copy lines fade up at [0.75, 0.88]. Longitude lines spin via CSS `spin` keyframe (25s linear infinite).

### Chapter 3 — Problem (`ChapterProblem.tsx`)
350vh sticky chapter on light background. Passes `scrollYProgress` to `IsometricHome` in `buildMode=true`. House builds piece by piece (foundation → front wall → side wall → roof → windows → door → chimney) at 0.0→0.65 thresholds, then dims to 0.3 opacity at 0.65→0.75. Three pain lines appear sequentially in right column at [0.65, 1.0].

### Chapter 4 — Mechanism (`ChapterMechanism.tsx`)
400vh sticky chapter on dark background. Browser mockup (480px wide) with traffic-light chrome and 3 listing cards. Score badges pop in sequentially (scale 0.6→1) per card at [0.15, 0.45]. Browser zooms 1→2.5x at [0.5, 0.8] — cards 2+3 and chrome fade out, only the 87-score card remains. Analysis breakdown panel slides in from right (+60px→0) at [0.7, 0.9].

### Chapter 5 — Score (`ChapterScore.tsx`)
200vh sticky chapter on dark background. "87." in large teal type fades up at [0.0, 0.2]. "Excellent match." follows at [0.2, 0.4]. Three category bars (Location 92%, Size 88%, Price 75%) animate width from 0% to target percentage — staggered across [0.4, 0.8].

### Chapter 6 — Dream (`ChapterDream.tsx`)
150vh sticky chapter on light background. `IsometricHome` starts at 0.4 global opacity, reaches 1.0. Warm window glow (amber overlay polygons) fades in at [0.2, 0.5]. Three dream copy lines stagger up from below at [0.3, 0.9].

### Chapter 7 — CTA (`ChapterCTA.tsx`)
Full-height dark section. Single `whileInView` fade-in (no scroll tracking). HomeMatch logo, headline from translations, `Button render={<Link href="/auth" />}` (correct pattern — no asChild), sign-in link below.

### Shared Component — `IsometricHome.tsx`
Pre-computed isometric house SVG in 300×280 viewBox. All polygons exactly as specified in plan coordinates. Two usage modes:
- **buildMode=true** (ChapterProblem): each house part fades in at sequential `scrollYProgress` thresholds via `useTransform`. Uses `useMotionValue(1)` as static fallback when scrollProgress is undefined.
- **globalOpacity + windowGlow** (ChapterDream): whole house opacity and warm amber window overlay driven by parent's scroll values.

### `LandingPageContent.tsx` (rewritten)
Orchestrator assembling all 7 chapters + LandingNavbar + LandingFooter in order with `lang` prop passed to each.

### `translations.ts` (updated)
All Phase 19 `landing_*` keys removed. New keys added for all 7 chapters in both `en` and `de`. TypeScript `_DeHasAllEnKeys` guard enforces symmetry at compile time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated landing-page.test.tsx to remove deleted HeroDemo import**
- **Found during:** Task 7 (TypeScript check)
- **Issue:** `src/__tests__/landing-page.test.tsx` imported `HeroDemo` from the deleted Phase 19 component, causing TS2307 error
- **Fix:** Removed `HeroDemo` import and its `describe` block; kept `LandingPageContent` and `LandingNavbar` tests
- **Files modified:** `web/src/__tests__/landing-page.test.tsx`
- **Commit:** a0bdca3

### Out-of-Scope Items (deferred)

**Pre-existing build failure on `/auth` page:** The `npm run build` fails during static page generation for `/auth` due to missing Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the build environment. This pre-dates our changes — TypeScript compilation succeeds ("Compiled successfully in 6.2s") and `npx tsc --noEmit` exits clean. Not caused by landing page work.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| page.tsx has no `'use client'` | Confirmed |
| All 7 chapter files exist | Confirmed |
| Phase 19 files deleted | Confirmed (6 files) |
| Both en/de translation keys symmetric | Confirmed (TypeScript guard passes) |
| Button render prop pattern used | Confirmed in ChapterCTA |
| All imports from `motion/react` | Confirmed |
| `useReducedMotion()` in all chapters | Confirmed |

## Self-Check: PASSED

All 10 key files confirmed present on disk. All 7 task commits confirmed in git log.
