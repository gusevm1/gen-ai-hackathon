/**
 * Motion design tokens — single source of truth for all animation constants.
 * Import from "@/lib/motion" everywhere. Never inline easing/spring configs.
 */

// ─── Duration tokens (seconds) ───────────────────────────────────────────────
export const duration = {
  instant:  0.08,
  fast:     0.15,
  base:     0.25,
  moderate: 0.40,
  slow:     0.60,
  crawl:    0.90,
} as const

// ─── Easing curves ────────────────────────────────────────────────────────────
// Apple-style: fast-out-slow-in for entrances
export const ease = {
  enter:      [0.22, 1, 0.36, 1]     as [number, number, number, number],
  exit:       [0.55, 0, 1, 0.45]     as [number, number, number, number],
  inOut:      [0.42, 0, 0.58, 1]     as [number, number, number, number],
  expressive: [0.34, 1.56, 0.64, 1]  as [number, number, number, number],
  linear:     "linear"               as const,
} as const

// ─── Spring configs ───────────────────────────────────────────────────────────
export const spring = {
  snappy: { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.8 },
  gentle: { type: "spring" as const, stiffness: 120, damping: 20, mass: 1 },
  bouncy: { type: "spring" as const, duration: 0.6, bounce: 0.3 },
  stiff:  { type: "spring" as const, stiffness: 400, damping: 50, mass: 0.5 },
} as const

// ─── Variant presets ──────────────────────────────────────────────────────────
export const fadeUpVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0,   transition: { duration: duration.moderate, ease: ease.enter } },
  exit:    { opacity: 0, y: -12, transition: { duration: duration.fast,     ease: ease.exit  } },
} as const

export const fadeInVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.moderate, ease: ease.enter } },
  exit:    { opacity: 0, transition: { duration: duration.fast,     ease: ease.exit  } },
} as const

export const slideInLeftVariants = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0,  transition: { duration: duration.slow, ease: ease.enter } },
} as const

export const slideInRightVariants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0,  transition: { duration: duration.slow, ease: ease.enter } },
} as const

// ─── Stagger orchestration ────────────────────────────────────────────────────
export const staggerContainerVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const

export const staggerItemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0,  transition: { duration: duration.moderate, ease: ease.enter } },
} as const
