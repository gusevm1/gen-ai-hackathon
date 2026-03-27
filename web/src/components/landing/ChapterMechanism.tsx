'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react"
import { t, type Language } from "@/lib/translations"

interface ChapterMechanismProps {
  lang: Language
}

const LISTINGS = [
  { address: 'Forchstrasse 12', rooms: '3.5 Zimmer', price: 'CHF 2,400', score: 87, scoreColor: 'hsl(173 65% 52%)' },
  { address: 'Seestrasse 45',   rooms: '2.5 Zimmer', price: 'CHF 1,980', score: 62, scoreColor: 'hsl(38 90% 55%)' },
  { address: 'Langstrasse 78',  rooms: '2 Zimmer',   price: 'CHF 1,650', score: 41, scoreColor: 'hsl(0 72% 55%)' },
] as const

const ANALYSIS = [
  { category: 'Location', score: 92, width: '92%' },
  { category: 'Size',     score: 88, width: '88%' },
  { category: 'Price',    score: 75, width: '75%' },
] as const

export function ChapterMechanism({ lang }: ChapterMechanismProps) {
  const chapterRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  })

  // Overline + headline appear early
  const headerOpacity = useTransform(scrollYProgress, [0.0, 0.15], [0, 1])
  const headerY       = useTransform(scrollYProgress, [0.0, 0.15], [24, 0])

  // Score badge opacity for each card — sequential
  const score0Opacity = useTransform(scrollYProgress, [0.15, 0.25], [0, 1])
  const score0Scale   = useTransform(scrollYProgress, [0.15, 0.25], [0.6, 1])
  const score1Opacity = useTransform(scrollYProgress, [0.25, 0.35], [0, 1])
  const score1Scale   = useTransform(scrollYProgress, [0.25, 0.35], [0.6, 1])
  const score2Opacity = useTransform(scrollYProgress, [0.35, 0.45], [0, 1])
  const score2Scale   = useTransform(scrollYProgress, [0.35, 0.45], [0.6, 1])

  const scoreOpacities = [score0Opacity, score1Opacity, score2Opacity]
  const scoreScales    = [score0Scale,   score1Scale,   score2Scale]

  // Browser mockup zoom — scale the entire browser mockup wrapper
  const browserScale = useTransform(scrollYProgress, [0.5, 0.8], [1, 2.5])
  const browserY     = useTransform(scrollYProgress, [0.5, 0.8], [0, -80])

  // Other cards + browser chrome fade out during zoom
  const nonCard1Opacity = useTransform(scrollYProgress, [0.5, 0.65], [1, 0])

  // Analysis panel slides in from right
  const analysisOpacity = useTransform(scrollYProgress, [0.7, 0.9], [0, 1])
  const analysisX       = useTransform(scrollYProgress, [0.7, 0.9], [60, 0])

  return (
    <div ref={chapterRef} className="relative h-[400vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-hero-bg px-6">

        {/* Section header */}
        <motion.div
          className="absolute top-16 text-center px-6 max-w-2xl"
          style={prefersReduced
            ? { opacity: 1, y: 0 }
            : { opacity: headerOpacity, y: headerY }
          }
        >
          <p
            className="font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'hsl(173 65% 52%)', fontSize: 'var(--text-overline-size)' }}
          >
            {t(lang, 'landing_mech_overline')}
          </p>
          <p
            className="text-hero-fg font-semibold"
            style={{ fontSize: 'var(--text-headline-size)', lineHeight: 'var(--text-headline-lh)', letterSpacing: 'var(--text-headline-ls)' }}
          >
            {t(lang, 'landing_mech_headline')}
          </p>
        </motion.div>

        {/* Browser mockup + analysis panel wrapper */}
        <div className="relative flex items-center gap-6 mt-8">
          {/* Browser mockup — zooms in via scale */}
          <motion.div
            style={prefersReduced
              ? { scale: 2.5, y: -80 }
              : { scale: browserScale, y: browserY }
            }
            className="origin-center"
          >
            <div
              className="rounded-xl overflow-hidden shadow-2xl"
              style={{
                background: 'hsl(220 20% 10%)',
                border: '1px solid hsl(220 20% 20%)',
                width: '480px',
              }}
            >
              {/* Browser chrome */}
              <motion.div
                className="flex items-center gap-2 px-4 py-3 border-b"
                style={prefersReduced
                  ? { opacity: 0, borderColor: 'hsl(220 20% 20%)' }
                  : { opacity: nonCard1Opacity, borderColor: 'hsl(220 20% 20%)' }
                }
              >
                <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(0 72% 55%)' }}/>
                <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(38 90% 55%)' }}/>
                <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(120 60% 45%)' }}/>
                <div
                  className="ml-3 flex-1 rounded text-center py-0.5"
                  style={{ background: 'hsl(220 20% 15%)', color: 'hsl(220 10% 55%)', fontSize: '0.75rem' }}
                >
                  flatfox.ch/listings
                </div>
              </motion.div>

              {/* Listing cards */}
              <div className="flex flex-col">
                {LISTINGS.map((listing, i) => (
                  <motion.div
                    key={listing.address}
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{
                      borderColor: 'hsl(220 20% 18%)',
                      // Card 0 (the 87-score card) stays visible; cards 1+2 fade during zoom
                      ...(i > 0 ? (prefersReduced ? { opacity: 0 } : { opacity: nonCard1Opacity }) : {}),
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-hero-fg font-medium text-sm">{listing.address}</span>
                      <span className="text-xs" style={{ color: 'hsl(220 10% 55%)' }}>
                        {listing.rooms} · {listing.price}
                      </span>
                    </div>
                    {/* Score badge — pops on sequentially */}
                    <motion.div
                      className="flex items-center justify-center rounded-lg px-3 py-1 font-bold text-sm"
                      style={prefersReduced
                        ? { background: 'hsl(220 20% 15%)', color: listing.scoreColor, opacity: 1, scale: 1 }
                        : { background: 'hsl(220 20% 15%)', color: listing.scoreColor, opacity: scoreOpacities[i], scale: scoreScales[i] }
                      }
                    >
                      {listing.score}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Analysis panel — slides in from right after zoom */}
          <motion.div
            className="absolute left-full ml-4 w-56"
            style={prefersReduced
              ? { opacity: 1, x: 0 }
              : { opacity: analysisOpacity, x: analysisX }
            }
          >
            <div
              className="rounded-xl p-5 flex flex-col gap-4"
              style={{
                background: 'hsl(220 20% 10%)',
                border: '1px solid hsl(220 20% 20%)',
              }}
            >
              <p className="text-hero-fg font-semibold text-sm">Match Analysis</p>
              {ANALYSIS.map(({ category, score, width }) => (
                <div key={category} className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'hsl(220 10% 55%)' }}>
                      {category}
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'hsl(173 65% 52%)' }}>{score}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'hsl(220 20% 18%)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={prefersReduced
                        ? { width, background: 'hsl(173 65% 52%)' }
                        : { width, background: 'hsl(173 65% 52%)', opacity: analysisOpacity }
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
