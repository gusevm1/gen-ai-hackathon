'use client'

import { useEffect } from 'react'
import { useAnimate, useInView, useReducedMotion } from 'motion/react'
import { Sparkles, MapPin, Home } from 'lucide-react'
import { ease } from '@/lib/motion'

const LISTINGS = [
  {
    id: 'card-1',
    address: 'Forchstrasse 12',
    city: '8032 Zürich',
    price: 'CHF 2,400 / month',
    rooms: '3.5 Zi. · 78 m²',
    score: 87,
    scoreId: 'score-badge-1',
  },
  {
    id: 'card-2',
    address: 'Seestrasse 45',
    city: '8002 Zürich',
    price: 'CHF 3,100 / month',
    rooms: '4 Zi. · 95 m²',
    score: 62,
    scoreId: 'score-badge-2',
  },
]

export function HeroDemo() {
  const [scope, animate] = useAnimate()
  const isInView = useInView(scope, { once: true, amount: 0.3 })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isInView) return

    if (shouldReduceMotion) {
      animate([
        ['#card-1', { opacity: 1, y: 0 }, { duration: 0 }],
        ['#card-2', { opacity: 1, y: 0 }, { duration: 0 }],
        ['#fab', { scale: 1 }, { duration: 0 }],
        ['#score-badge-1', { opacity: 1, scale: 1 }, { duration: 0 }],
        ['#score-badge-2', { opacity: 1, scale: 1 }, { duration: 0 }],
        ['#analysis-panel', { opacity: 1, x: 0 }, { duration: 0 }],
      ])
      return
    }

    const sequence = async () => {
      await animate('#card-1', { opacity: [0, 1], y: [24, 0] }, { duration: 0.4, ease: ease.enter })
      await animate('#card-2', { opacity: [0, 1], y: [24, 0] }, { duration: 0.4, ease: ease.enter })
      await animate('#fab', { scale: [1, 1.18, 1] }, { duration: 0.5, ease: ease.expressive })
      await animate('#score-badge-1', { opacity: [0, 1], scale: [0.6, 1] }, { duration: 0.3, ease: ease.expressive })
      await animate('#score-badge-2', { opacity: [0, 1], scale: [0.6, 1] }, { duration: 0.3, ease: ease.expressive })
      await animate('#analysis-panel', { opacity: [0, 1], x: [40, 0] }, { duration: 0.5, ease: ease.enter })
    }

    sequence()
  }, [isInView, animate, shouldReduceMotion])

  return (
    <div ref={scope} className="relative max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
          </div>
          <div className="flex-1 mx-4 bg-white/10 rounded-md px-3 py-1 text-xs text-white/40 text-left">
            flatfox.ch/listings
          </div>
        </div>

        <div className="p-6 space-y-3 relative">
          {LISTINGS.map((listing) => (
            <div
              key={listing.id}
              id={listing.id}
              className="relative bg-white/8 border border-white/10 rounded-xl p-4 text-left opacity-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-white/50" />
                  </div>
                  <div>
                    <p className="text-hero-fg text-sm font-medium">{listing.address}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-white/40" />
                      <p className="text-white/50 text-xs">{listing.city}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-hero-fg text-sm font-semibold">{listing.price}</span>
                      <span className="text-white/40 text-xs">{listing.rooms}</span>
                    </div>
                  </div>
                </div>

                <div
                  id={listing.scoreId}
                  className="shrink-0 opacity-0"
                >
                  <div className="flex flex-col items-center bg-hero-teal/15 border border-hero-teal/30 rounded-xl px-3 py-2">
                    <span className="text-hero-teal text-xl font-bold leading-none">{listing.score}</span>
                    <span className="text-hero-teal/70 text-xs mt-0.5">match</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            id="fab"
            className="absolute bottom-6 right-6 w-12 h-12 bg-hero-teal rounded-full flex items-center justify-center shadow-lg shadow-hero-teal/25 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-hero-bg" />
          </div>
        </div>
      </div>

      <div
        id="analysis-panel"
        className="absolute -right-4 top-20 w-56 bg-white/8 border border-white/15 rounded-2xl p-4 shadow-2xl opacity-0 hidden lg:block"
      >
        <p className="text-hero-fg text-xs font-semibold mb-3">Score Breakdown</p>
        <div className="space-y-2.5">
          {[
            { label: 'Location', score: 92 },
            { label: 'Size', score: 88 },
            { label: 'Price', score: 75 },
          ].map(({ label, score }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">{label}</span>
                <span className="text-hero-teal font-medium">{score}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full">
                <div
                  className="h-full bg-hero-teal rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-hero-teal text-xs mt-3 leading-relaxed">
          Excellent match for your profile
        </p>
      </div>
    </div>
  )
}
