---
phase: 18-design-system-motion
plan: 01
subsystem: design-system
tags: [motion, animation, css-variables, tailwind-v4, design-tokens]
dependency_graph:
  requires: []
  provides: [motion-tokens, motion-components, teal-color-tokens, typography-scale]
  affects: [landing-page, dashboard]
tech_stack:
  added: [motion@^12.38.0, @rolldown/binding-darwin-arm64 (devDep)]
  patterns: [animation-tokens, variant-presets, scroll-triggered-animation, spring-physics]
key_files:
  created:
    - web/src/lib/motion.ts
    - web/src/components/motion/FadeIn.tsx
    - web/src/components/motion/StaggerGroup.tsx
    - web/src/components/motion/CountUp.tsx
    - web/src/__tests__/motion-tokens.test.ts
    - web/src/__tests__/fade-in.test.tsx
    - web/src/__tests__/count-up.test.tsx
  modified:
    - web/src/app/globals.css
    - web/package.json
decisions:
  - "Added `test` script to package.json (was missing — vitest was installed but not wired)"
  - "Added @rolldown/binding-darwin-arm64 as devDependency to fix missing native binding on darwin-arm64 (known npm optional deps bug)"
  - "Added IntersectionObserver mock in fade-in and count-up tests — jsdom does not implement it, motion/react requires it for useInView/viewport features"
  - "Pre-existing chat-page.test.tsx failures (6 tests) confirmed as pre-existing; not introduced by this plan"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-27"
  tasks_completed: 9
  files_changed: 9
---

# Phase 18 Plan 01: Design System Motion — Summary

**One-liner:** Motion design tokens (duration/ease/spring/variants) + FadeIn/StaggerGroup/CountUp components + teal color + typography CSS variables for the v4.0 landing redesign foundation.

## What Was Built

### motion package installed
- `motion@^12.38.0` added to `web/package.json` dependencies
- React 19 compatible; imports from `"motion/react"`

### `web/src/lib/motion.ts` — animation token source of truth
- `duration`: instant/fast/base/moderate/slow/crawl (seconds)
- `ease`: enter/exit/inOut/expressive/linear cubic-bezier curves
- `spring`: snappy/gentle/bouncy/stiff spring physics configs
- Variant presets: `fadeUpVariants`, `fadeInVariants`, `slideInLeftVariants`, `slideInRightVariants`, `staggerContainerVariants`, `staggerItemVariants`

### `web/src/components/motion/FadeIn.tsx`
- Scroll-triggered fade-up wrapper using `whileInView`
- Respects `useReducedMotion` — passes empty variants when reduced motion preferred
- Props: `children`, `className`, `delay`, `variants`

### `web/src/components/motion/StaggerGroup.tsx`
- `StaggerGroup`: scroll-triggered container with stagger orchestration
- `StaggerItem`: child wrapper that inherits stagger animation from parent

### `web/src/components/motion/CountUp.tsx`
- Animated numeric counter using `useMotionValue` + `useSpring` + `useTransform`
- Triggers on scroll into view via `useInView`
- Props: `target`, `duration`, `className`

### `web/src/app/globals.css` extended
- Inside `@theme inline {}`: added `--color-teal`, `--color-teal-foreground`, `--color-hero-bg`, `--color-hero-fg`, `--color-hero-teal`, `--color-hero-teal-muted` Tailwind utility bridges
- New `:root` block with teal + hero section raw HSL values
- New `.dark` block with dark-mode teal overrides (matches hero teal)
- Typography scale CSS variables: `--text-display-*` through `--text-overline-*` using `clamp()` for fluid sizing
- Existing `--primary` (rose `hsl(342 89% 40%)`) is untouched

## Files Created / Modified

| File | Action |
|------|--------|
| `web/src/lib/motion.ts` | Created (83 lines) |
| `web/src/components/motion/FadeIn.tsx` | Created |
| `web/src/components/motion/StaggerGroup.tsx` | Created |
| `web/src/components/motion/CountUp.tsx` | Created |
| `web/src/__tests__/motion-tokens.test.ts` | Created |
| `web/src/__tests__/fade-in.test.tsx` | Created |
| `web/src/__tests__/count-up.test.tsx` | Created |
| `web/src/app/globals.css` | Modified — teal tokens + typography scale |
| `web/package.json` | Modified — added `motion` dep + `test` script |

## Test Results

```
Test Files  1 failed (pre-existing) | 14 passed (15)
      Tests  6 failed (pre-existing) | 90 passed (96)
```

- `motion-tokens.test.ts`: 5/5 PASS
- `fade-in.test.tsx`: 2/2 PASS
- `count-up.test.tsx`: 2/2 PASS
- All 11 pre-existing passing test files still pass
- `chat-page.test.tsx`: 6 failures — **pre-existing**, confirmed present before this plan's changes (the `test` script didn't even exist before this plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Missing `test` script in package.json**
- **Found during:** Task 8
- **Issue:** `package.json` had no `test` script despite vitest being installed as devDependency
- **Fix:** Added `"test": "vitest"` to scripts
- **Files modified:** `web/package.json`
- **Commit:** 5b4dabe

**2. [Rule 3 - Blocker] Missing rolldown darwin-arm64 native binding**
- **Found during:** Task 8
- **Issue:** `@rolldown/binding-darwin-arm64` optional dependency not installed due to known npm bug with optional dependencies
- **Fix:** Installed and added to devDependencies
- **Files modified:** `web/package.json`
- **Commit:** 5b4dabe

**3. [Rule 2 - Missing Critical Functionality] IntersectionObserver mock needed for jsdom**
- **Found during:** Task 8
- **Issue:** `motion/react` uses `IntersectionObserver` for `useInView`/viewport features; jsdom does not implement it, causing test failures
- **Fix:** Added `beforeAll()` mock in both `fade-in.test.tsx` and `count-up.test.tsx`
- **Files modified:** `web/src/__tests__/fade-in.test.tsx`, `web/src/__tests__/count-up.test.tsx`
- **Commit:** 5b4dabe

## Commit

`5b4dabe` — `feat(design-system): add motion tokens, animation primitives, and design tokens`
