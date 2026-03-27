'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react"
import { t, type Language } from "@/lib/translations"

interface ChapterSwitzerlandProps {
  lang: Language
}

export function ChapterSwitzerland({ lang }: ChapterSwitzerlandProps) {
  const chapterRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  // Globe scale: 1 at start, grows to 5 to zoom into Switzerland
  const globeScale = useTransform(scrollYProgress, [0.3, 0.65], [1, 5])
  // Pan globe so Switzerland stays centered during zoom
  const globeX = useTransform(scrollYProgress, [0.3, 0.65], [0, -75])
  const globeY = useTransform(scrollYProgress, [0.3, 0.65], [0, 75])
  // Switzerland teal glow appears at 0.6→0.75
  const swissGlow = useTransform(scrollYProgress, [0.6, 0.75], [0, 1])
  // Copy lines appear at 0.75→0.88
  const copyOpacity = useTransform(scrollYProgress, [0.75, 0.88], [0, 1])
  const copyY = useTransform(scrollYProgress, [0.75, 0.88], [24, 0])

  // Reduced motion: show final state
  const finalGlobeScale = prefersReduced ? 5 : undefined
  const finalSwissGlow = prefersReduced ? 1 : undefined
  const finalCopyOpacity = prefersReduced ? 1 : undefined

  return (
    <div ref={chapterRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-hero-bg">
        {/* Globe wrapper — scale + pan driven by scroll */}
        <motion.div
          style={prefersReduced
            ? { scale: finalGlobeScale, x: -75, y: 75 }
            : { scale: globeScale, x: globeX, y: globeY }
          }
          className="relative"
        >
          {/* SVG Globe */}
          <svg viewBox="0 0 200 200" width="300" height="300" aria-label="Globe zooming into Switzerland" role="img">
            {/* Ocean */}
            <circle cx="100" cy="100" r="90" fill="hsl(220 30% 8%)" stroke="hsl(220 20% 20%)" strokeWidth="1"/>

            {/* Latitude lines — 5 horizontal ellipses */}
            <ellipse cx="100" cy="30"  rx="50"  ry="8"  fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
            <ellipse cx="100" cy="55"  rx="78"  ry="10" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
            <ellipse cx="100" cy="100" rx="90"  ry="12" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
            <ellipse cx="100" cy="145" rx="78"  ry="10" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
            <ellipse cx="100" cy="170" rx="50"  ry="8"  fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>

            {/* Longitude lines — 6 vertical ellipses, CSS spin animation */}
            <g style={{ transformOrigin: "100px 100px", animation: "spin 25s linear infinite" }}>
              <ellipse cx="100" cy="100" rx="15"  ry="90" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
              <ellipse cx="100" cy="100" rx="40"  ry="90" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
              <ellipse cx="100" cy="100" rx="65"  ry="90" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
              <ellipse cx="100" cy="100" rx="85"  ry="90" fill="none" stroke="hsl(220 20% 18%)" strokeWidth="0.5"/>
            </g>

            {/* Simplified Western Europe silhouette */}
            <path
              d="M 80 40 L 95 38 L 108 42 L 115 50 L 120 60 L 122 70 L 118 75 L 125 80 L 128 88 L 122 95 L 118 100 L 115 108 L 108 112 L 100 118 L 90 115 L 82 110 L 75 102 L 70 95 L 68 88 L 72 80 L 68 72 L 65 65 L 70 55 L 75 48 Z"
              fill="hsl(220 15% 25%)"
              stroke="hsl(220 15% 35%)"
              strokeWidth="0.5"
            />

            {/* Switzerland highlight — small polygon, turns teal on scroll */}
            <motion.polygon
              points="112,82 118,80 121,83 120,88 115,90 110,88 109,84"
              fill="hsl(220 15% 25%)"
              style={prefersReduced ? { opacity: 1 } : undefined}
            />
            {/* Teal overlay for Switzerland */}
            <motion.polygon
              points="112,82 118,80 121,83 120,88 115,90 110,88 109,84"
              fill="hsl(173 65% 52%)"
              style={prefersReduced
                ? { opacity: finalSwissGlow }
                : { opacity: swissGlow }
              }
            />
            {/* Teal glow ring around Switzerland */}
            <motion.circle
              cx="115" cy="85" r="10"
              fill="none"
              stroke="hsl(173 65% 52%)"
              strokeWidth="1.5"
              style={prefersReduced
                ? { opacity: finalSwissGlow }
                : { opacity: swissGlow }
              }
            />

            {/* Outer glow ring */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(173 65% 52% / 0.15)" strokeWidth="8"/>
          </svg>
        </motion.div>

        {/* Copy overlay — appears after zoom */}
        <motion.div
          className="absolute bottom-1/4 text-center px-6 flex flex-col gap-3"
          style={prefersReduced
            ? { opacity: finalCopyOpacity, y: 0 }
            : { opacity: copyOpacity, y: copyY }
          }
        >
          <p
            className="text-hero-fg font-semibold"
            style={{
              fontSize: 'var(--text-subheading-size)',
              letterSpacing: 'var(--text-subheading-ls)',
            }}
          >
            {t(lang, 'landing_ch_line1')}
          </p>
          <p
            style={{
              color: 'hsl(0 0% 65%)',
              fontSize: 'var(--text-body-lg-size)',
            }}
          >
            {t(lang, 'landing_ch_line2')}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
