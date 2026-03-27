'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react"
import { IsometricHome } from "./IsometricHome"
import { t, type Language } from "@/lib/translations"

interface ChapterProblemProps {
  lang: Language
}

export function ChapterProblem({ lang }: ChapterProblemProps) {
  const chapterRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  // Section overline "The problem" fades in early
  const overlineOpacity = useTransform(scrollYProgress, [0.0, 0.15], [0, 1])
  const overlineY       = useTransform(scrollYProgress, [0.0, 0.15], [16, 0])

  // Pain lines — appear sequentially in the right column
  const pain1Opacity = useTransform(scrollYProgress, [0.65, 0.75], [0, 1])
  const pain1Y       = useTransform(scrollYProgress, [0.65, 0.75], [20, 0])
  const pain2Opacity = useTransform(scrollYProgress, [0.75, 0.85], [0, 1])
  const pain2Y       = useTransform(scrollYProgress, [0.75, 0.85], [20, 0])
  const pain3Opacity = useTransform(scrollYProgress, [0.85, 1.0],  [0, 1])
  const pain3Y       = useTransform(scrollYProgress, [0.85, 1.0],  [20, 0])

  const painOpacities = [pain1Opacity, pain2Opacity, pain3Opacity]
  const painYs        = [pain1Y,       pain2Y,       pain3Y]
  const painKeys = ['landing_problem_pain1', 'landing_problem_pain2', 'landing_problem_pain3'] as const

  return (
    <div ref={chapterRef} className="relative h-[350vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6">

        {/* Section overline */}
        <motion.p
          className="absolute top-16 text-center font-semibold uppercase tracking-widest"
          style={prefersReduced
            ? { color: 'hsl(173 80% 32%)', fontSize: 'var(--text-overline-size)', opacity: 1, y: 0 }
            : { color: 'hsl(173 80% 32%)', fontSize: 'var(--text-overline-size)', opacity: overlineOpacity, y: overlineY }
          }
        >
          {t(lang, 'landing_problem_overline')}
        </motion.p>

        {/* Two-column layout */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: isometric home — passes scrollProgress to drive build sequence */}
          <div className="flex items-center justify-center">
            <IsometricHome
              scrollProgress={prefersReduced ? undefined : scrollYProgress}
              buildMode={!prefersReduced}
              className="w-64 h-64"
            />
          </div>

          {/* Right: pain lines */}
          <div className="flex flex-col gap-6">
            {painKeys.map((key, i) => (
              <motion.p
                key={key}
                className="text-foreground font-medium"
                style={prefersReduced
                  ? { fontSize: 'var(--text-body-lg-size)', lineHeight: 'var(--text-body-lg-lh)', opacity: 1, y: 0 }
                  : { fontSize: 'var(--text-body-lg-size)', lineHeight: 'var(--text-body-lg-lh)', opacity: painOpacities[i], y: painYs[i] }
                }
              >
                {t(lang, key)}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
