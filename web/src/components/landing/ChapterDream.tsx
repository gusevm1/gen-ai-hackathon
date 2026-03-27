'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react"
import { IsometricHome } from "./IsometricHome"
import { t, type Language } from "@/lib/translations"

interface ChapterDreamProps {
  lang: Language
}

export function ChapterDream({ lang }: ChapterDreamProps) {
  const chapterRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  // Home global opacity: starts dimmed at 0.4, reaches 1.0
  const houseOpacity  = useTransform(scrollYProgress, [0.0, 0.4], [0.4, 1.0])
  // Window warm glow: 0 → 1 as scroll increases
  const windowGlow    = useTransform(scrollYProgress, [0.2, 0.5], [0, 1])

  // Copy lines
  const line1Opacity  = useTransform(scrollYProgress, [0.3, 0.5], [0, 1])
  const line1Y        = useTransform(scrollYProgress, [0.3, 0.5], [20, 0])
  const line2Opacity  = useTransform(scrollYProgress, [0.5, 0.7], [0, 1])
  const line2Y        = useTransform(scrollYProgress, [0.5, 0.7], [20, 0])
  const line3Opacity  = useTransform(scrollYProgress, [0.7, 0.9], [0, 1])
  const line3Y        = useTransform(scrollYProgress, [0.7, 0.9], [20, 0])

  const copyLines = [
    { key: 'landing_dream_line1' as const, opacity: line1Opacity, y: line1Y },
    { key: 'landing_dream_line2' as const, opacity: line2Opacity, y: line2Y },
    { key: 'landing_dream_line3' as const, opacity: line3Opacity, y: line3Y },
  ]

  return (
    <div ref={chapterRef} className="relative h-[150vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left: isometric home with warm glow */}
          <div className="flex items-center justify-center">
            <IsometricHome
              globalOpacity={prefersReduced ? undefined : houseOpacity}
              windowGlow={prefersReduced ? undefined : windowGlow}
              buildMode={false}
              className="w-64 h-64"
            />
          </div>

          {/* Right: copy lines */}
          <div className="flex flex-col gap-6">
            {copyLines.map(({ key, opacity, y }) => (
              <motion.p
                key={key}
                className="text-foreground font-semibold"
                style={prefersReduced
                  ? { fontSize: 'var(--text-subheading-size)', lineHeight: 'var(--text-subheading-lh)', opacity: 1, y: 0 }
                  : { fontSize: 'var(--text-subheading-size)', lineHeight: 'var(--text-subheading-lh)', opacity, y }
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
