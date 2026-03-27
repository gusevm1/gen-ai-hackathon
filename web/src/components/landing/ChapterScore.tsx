'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react"
import { t, type Language } from "@/lib/translations"

interface ChapterScoreProps {
  lang: Language
}

const CATEGORIES = [
  { label: 'Location', score: 92 },
  { label: 'Size',     score: 88 },
  { label: 'Price',    score: 75 },
] as const

export function ChapterScore({ lang }: ChapterScoreProps) {
  const chapterRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  // "87." — display number
  const scoreOpacity = useTransform(scrollYProgress, [0.0, 0.2], [0, 1])
  const scoreY       = useTransform(scrollYProgress, [0.0, 0.2], [32, 0])

  // "Excellent match."
  const labelOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1])
  const labelY       = useTransform(scrollYProgress, [0.2, 0.4], [24, 0])

  // Category rows — staggered 0.4→0.8
  const cat0Opacity = useTransform(scrollYProgress, [0.4, 0.55], [0, 1])
  const cat1Opacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1])
  const cat2Opacity = useTransform(scrollYProgress, [0.6, 0.75], [0, 1])
  // Bar widths — animate to percentage using motion value on style.width
  const cat0Width = useTransform(scrollYProgress, [0.4, 0.7], ['0%', '92%'])
  const cat1Width = useTransform(scrollYProgress, [0.5, 0.75], ['0%', '88%'])
  const cat2Width = useTransform(scrollYProgress, [0.6, 0.8], ['0%', '75%'])

  const catOpacities = [cat0Opacity, cat1Opacity, cat2Opacity]
  const catWidths    = [cat0Width,   cat1Width,   cat2Width]

  return (
    <div ref={chapterRef} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-hero-bg px-6">
        {/* Score number */}
        <motion.p
          className="font-bold"
          style={prefersReduced
            ? { color: 'hsl(173 65% 52%)', fontSize: 'clamp(5rem, 15vw, 9rem)', lineHeight: 1, letterSpacing: '-0.04em', opacity: 1, y: 0 }
            : { color: 'hsl(173 65% 52%)', fontSize: 'clamp(5rem, 15vw, 9rem)', lineHeight: 1, letterSpacing: '-0.04em', opacity: scoreOpacity, y: scoreY }
          }
          aria-label="87 — excellent match score"
        >
          87.
        </motion.p>

        {/* Score label */}
        <motion.p
          className="text-hero-fg font-semibold mt-3"
          style={prefersReduced
            ? { fontSize: 'var(--text-headline-size)', opacity: 1, y: 0 }
            : { fontSize: 'var(--text-headline-size)', opacity: labelOpacity, y: labelY }
          }
        >
          {t(lang, 'landing_score_label')}
        </motion.p>

        {/* Category breakdown bars */}
        <div className="mt-12 w-full max-w-sm flex flex-col gap-5">
          {CATEGORIES.map(({ label, score }, i) => (
            <motion.div
              key={label}
              style={prefersReduced ? { opacity: 1 } : { opacity: catOpacities[i] }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex justify-between items-baseline">
                <span
                  className="text-hero-fg font-medium"
                  style={{ fontSize: 'var(--text-caption-size)', letterSpacing: 'var(--text-overline-ls)', textTransform: 'uppercase' }}
                >
                  {label}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: 'hsl(173 65% 52%)', fontSize: 'var(--text-body-lg-size)' }}
                >
                  {score}
                </span>
              </div>
              {/* Bar track */}
              <div className="h-1.5 rounded-full" style={{ background: 'hsl(220 20% 18%)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={prefersReduced
                    ? { width: `${score}%`, background: 'hsl(173 65% 52%)' }
                    : { width: catWidths[i], background: 'hsl(173 65% 52%)' }
                  }
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
