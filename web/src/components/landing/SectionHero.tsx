'use client'

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { duration, ease } from '@/lib/motion'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

const TIER_COLORS = {
  excellent: { bg: '#10b981', text: '#ffffff' },
  good:      { bg: '#3b82f6', text: '#ffffff' },
  fair:      { bg: '#f59e0b', text: '#1a1a1a' },
  poor:      { bg: '#ef4444', text: '#ffffff' },
} as const
type Tier = keyof typeof TIER_COLORS

const CHIPS: {
  addr: string
  price: string
  score: number
  delay: number
  pos: React.CSSProperties
  tier: Tier
  floatY: [number, number, number]
  floatDuration: number
}[] = [
  { pos: { top: '16%', left: '2%' },  addr: 'Seefeld, 3.5 Zi',   price: '2,450 CHF', score: 92, tier: 'excellent', delay: 0,   floatY: [0, -10, 0], floatDuration: 5.5 },
  { pos: { top: '14%', right: '2%' }, addr: 'Wipkingen, 4 Zi',   price: '2,800 CHF', score: 88, tier: 'excellent', delay: 1.4, floatY: [0, -8, 0],  floatDuration: 6.2 },
  { pos: { top: '44%', left: '2%' },  addr: 'Kreis 4, 2 Zi',     price: '1,690 CHF', score: 95, tier: 'excellent', delay: 0.6, floatY: [0, -13, 0], floatDuration: 4.8 },
  { pos: { top: '40%', right: '2%' }, addr: 'Enge, 3 Zi',        price: '2,100 CHF', score: 83, tier: 'good',      delay: 2.0, floatY: [0, 10, 0],  floatDuration: 5.0 },
  { pos: { top: '70%', right: '2%' }, addr: 'Höngg, 3.5 Zi',    price: '2,350 CHF', score: 79, tier: 'good',      delay: 0.9, floatY: [0, -9, 0],  floatDuration: 6.8 },
  { pos: { top: '68%', left: '2%' },  addr: 'Wiedikon, 2.5 Zi', price: '1,850 CHF', score: 64, tier: 'fair',      delay: 0.3, floatY: [0, 11, 0],  floatDuration: 5.3 },
  { pos: { top: '84%', right: '5%' }, addr: 'Altstetten, 2 Zi', price: '1,490 CHF', score: 41, tier: 'poor',      delay: 1.7, floatY: [0, -7, 0],  floatDuration: 7.0 },
]

interface SectionHeroProps {
  lang: Language
}

export function SectionHero({ lang }: SectionHeroProps) {
  const prefersReduced = useReducedMotion()

  const headline = t(lang, 'landing_hero_headline')
  const dotIndex = headline.indexOf('.')
  const line1 = dotIndex >= 0 ? headline.slice(0, dotIndex + 1) : headline
  const line2 = dotIndex >= 0 ? headline.slice(dotIndex + 1).trim() : ''

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
      style={{ backgroundColor: 'var(--color-hero-bg)' }}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(0 0% 100% / 0.07) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Center teal radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, hsl(342 89% 50% / 0.11) 0%, transparent 70%)',
        }}
      />

      {/* Floating orbs */}
      {!prefersReduced && (
        <>
          <motion.div
            aria-hidden
            className="absolute z-0 pointer-events-none rounded-full"
            style={{
              width: 480, height: 480,
              top: '5%', left: '-15%',
              background: 'hsl(342 89% 50% / 0.07)',
              filter: 'blur(80px)',
            }}
            animate={{ y: [0, -35, 0], x: [0, 18, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute z-0 pointer-events-none rounded-full"
            style={{
              width: 380, height: 380,
              bottom: '0%', right: '-12%',
              background: 'hsl(342 89% 50% / 0.05)',
              filter: 'blur(70px)',
            }}
            animate={{ y: [0, 28, 0], x: [0, -22, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />
        </>
      )}

      {/* Floating property chips */}
      {!prefersReduced && CHIPS.map((chip, i) => (
        <motion.div
          key={i}
          aria-hidden
          data-testid="hero-chip"
          className="absolute z-10 hidden xl:flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md backdrop-blur-sm border"
          style={{
            ...chip.pos,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#f3f4f6',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: chip.floatY }}
          transition={{
            opacity: { delay: 1.0 + chip.delay, duration: 0.5 },
            y: { delay: chip.delay, duration: chip.floatDuration, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {/* Address + price */}
          <div className="text-left pl-1">
            <p className="text-xs font-medium leading-tight text-gray-700">{chip.addr}</p>
            <p className="text-[11px] mt-0.5 leading-tight text-gray-400">{chip.price} / mo</p>
          </div>
          {/* ScoreBadge-style circle + tier label */}
          <div className="inline-flex items-center gap-1.5">
            <span
              className="inline-flex items-center justify-center rounded-full text-base font-extrabold flex-shrink-0"
              style={{
                width: 40, height: 40,
                backgroundColor: TIER_COLORS[chip.tier].bg,
                color: TIER_COLORS[chip.tier].text,
              }}
            >
              {chip.score}
            </span>
            <span
              className="text-xs font-semibold capitalize pr-1"
              style={{ color: TIER_COLORS[chip.tier].bg }}
            >
              {chip.tier}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center max-w-4xl w-full">
        {/* Overline badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: duration.moderate, ease: ease.enter }}
          className="mb-7 flex items-center gap-2.5 rounded-full border px-4 py-1.5"
          style={{
            borderColor: 'hsl(342 89% 50% / 0.28)',
            backgroundColor: 'hsl(342 89% 50% / 0.07)',
          }}
        >
          {!prefersReduced && (
            <motion.span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--color-hero-teal)' }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-hero-teal)' }}
          >
            {t(lang, 'landing_hero_overline')}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="font-bold tracking-tight mb-6"
          style={{ fontSize: 'clamp(2.75rem, 6.5vw, 5rem)', lineHeight: 1.04 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: duration.slow, ease: ease.enter }}
        >
          <span style={{ color: 'var(--color-hero-fg)' }}>{line1}</span>
          {line2 && (
            <>
              <br />
              <span
                style={{
                  background: 'linear-gradient(95deg, var(--primary) 0%, hsl(342 70% 65%) 45%, hsl(342 60% 72%) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {line2}
              </span>
            </>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="max-w-xl mb-10 leading-relaxed"
          style={{ fontSize: '1.125rem', color: 'hsl(0 0% 62%)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: duration.slow, ease: ease.enter }}
        >
          {t(lang, 'landing_hero_subtitle')}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: duration.slow, ease: ease.enter }}
          className="flex flex-col items-center gap-3"
        >
          <Button
            render={<Link href="/auth" />}
            size="lg"
            className="px-9 py-3 text-base font-semibold rounded-xl h-auto"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 0 32px hsl(342 89% 50% / 0.28)',
            }}
          >
            {t(lang, 'landing_hero_cta')}
          </Button>
          <span className="text-sm text-center" style={{ color: 'hsl(0 0% 42%)' }}>
            Free · No credit card · Works on Flatfox today
          </span>
        </motion.div>

      </div>
    </section>
  )
}
