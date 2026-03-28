'use client'

import { motion, useReducedMotion, type Variants } from 'motion/react'
import { FadeIn } from '@/components/motion/FadeIn'
import { ease } from '@/lib/motion'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

interface SectionGlobeProps {
  lang: Language
}

const EMPTY_VARIANTS: Variants = {}

export function SectionGlobe({ lang }: SectionGlobeProps) {
  const prefersReduced = useReducedMotion()

  // Draw-in variant for stroked elements (circle, ellipse)
  const drawVariant: Variants = prefersReduced
    ? EMPTY_VARIANTS
    : {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
          pathLength: 1,
          opacity: 1,
          transition: { duration: 1.4, ease: ease.enter },
        },
      }

  // Latitude line variant with custom delay
  const latVariant = (delay: number): Variants =>
    prefersReduced
      ? EMPTY_VARIANTS
      : {
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { delay, duration: 1.0, ease: ease.enter },
          },
        }

  // Ocean fill fade variant
  const oceanVariant: Variants = prefersReduced
    ? EMPTY_VARIANTS
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.4 } },
      }

  // Europe silhouette fade variant
  const europeVariant: Variants = prefersReduced
    ? EMPTY_VARIANTS
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { delay: 0.8, duration: 0.6 } },
      }

  // Switzerland polygon — fill color transition (NOT pathLength — polygon is filled, not stroked)
  const switzerlandVariant: Variants = prefersReduced
    ? EMPTY_VARIANTS
    : {
        hidden: { fill: 'hsl(220 15% 25%)', opacity: 0.5 },
        visible: {
          fill: 'hsl(173 65% 52%)',
          opacity: 1,
          transition: { delay: 1.6, duration: 0.6 },
        },
      }

  // Glow ring — pathLength draw-in (stroke element)
  const glowRingVariant: Variants = prefersReduced
    ? EMPTY_VARIANTS
    : {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
          pathLength: 1,
          opacity: 1,
          transition: { delay: 1.6, duration: 0.6, ease: ease.enter },
        },
      }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-hero-bg py-24 px-6 text-center">
      <motion.svg
        viewBox="0 0 200 200"
        width="320"
        height="320"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        aria-label="Globe showing Switzerland"
        role="img"
      >
        {/* Ocean fill — fade in */}
        <motion.circle
          cx="100"
          cy="100"
          r="90"
          fill="hsl(220 30% 8%)"
          variants={oceanVariant}
        />

        {/* Outer globe circle — draws in via pathLength */}
        <motion.circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="hsl(220 20% 22%)"
          strokeWidth="1"
          variants={drawVariant}
        />

        {/* Latitude line 1 — delay 0.3s */}
        <motion.ellipse
          cx="100"
          cy="55"
          rx="78"
          ry="10"
          fill="none"
          stroke="hsl(220 20% 18%)"
          strokeWidth="0.5"
          variants={latVariant(0.3)}
        />

        {/* Latitude line 2 (equator-ish) — delay 0.6s */}
        <motion.ellipse
          cx="100"
          cy="100"
          rx="90"
          ry="15"
          fill="none"
          stroke="hsl(220 20% 18%)"
          strokeWidth="0.5"
          variants={latVariant(0.6)}
        />

        {/* Europe silhouette — fade in, no pathLength (fill element) */}
        <motion.path
          d="M 80 40 L 95 38 L 108 42 L 115 50 L 120 60 L 122 70 L 118 75 L 125 80 L 128 88 L 122 95 L 118 100 L 115 108 L 108 112 L 100 118 L 90 115 L 82 110 L 75 102 L 70 95 L 68 88 L 72 80 L 68 72 L 65 65 L 70 55 L 75 48 Z"
          fill="hsl(220 15% 22%)"
          stroke="hsl(220 15% 30%)"
          strokeWidth="0.5"
          variants={europeVariant}
        />

        {/* Switzerland polygon — fill color transition to teal (NOT pathLength) */}
        <motion.polygon
          points="112,82 118,80 121,83 120,88 115,90 110,88 109,84"
          variants={switzerlandVariant}
        />

        {/* Teal glow ring around Switzerland — draws in via pathLength (stroke element) */}
        <motion.circle
          cx="115"
          cy="85"
          r="10"
          fill="none"
          stroke="hsl(173 65% 52%)"
          strokeWidth="1.5"
          variants={glowRingVariant}
        />
      </motion.svg>

      {/* Text fades in after globe animation completes */}
      <FadeIn delay={2.0} className="text-center mt-10 max-w-md">
        <p
          className="text-hero-fg font-semibold mb-3"
          style={{ fontSize: '1.25rem' }}
        >
          {t(lang, 'landing_globe_headline')}
        </p>
        <p
          className="text-hero-fg/60"
          style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}
        >
          {t(lang, 'landing_globe_body')}
        </p>
      </FadeIn>
    </section>
  )
}
