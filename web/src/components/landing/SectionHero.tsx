'use client'

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { duration, ease } from '@/lib/motion'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

interface SectionHeroProps {
  lang: Language
}

export function SectionHero({ lang }: SectionHeroProps) {
  const prefersReduced = useReducedMotion()

  const motionProps = (delaySeconds: number) => ({
    initial: prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: prefersReduced
      ? { duration: 0 }
      : { delay: delaySeconds, duration: duration.slow, ease: ease.enter },
  })

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-hero-bg text-hero-fg text-center px-6 py-24">
      <motion.p
        className="text-sm font-semibold uppercase tracking-widest mb-4"
        style={{ color: 'var(--color-hero-teal)' }}
        {...motionProps(0.1)}
      >
        {t(lang, 'landing_hero_overline')}
      </motion.p>

      <motion.h1
        className="font-bold tracking-tight text-hero-fg max-w-2xl mb-6"
        style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', lineHeight: 1.1 }}
        {...motionProps(0.3)}
      >
        {t(lang, 'landing_hero_headline')}
      </motion.h1>

      <motion.p
        className="text-hero-fg/70 max-w-xl mb-8"
        style={{ fontSize: '1.125rem', lineHeight: 1.7 }}
        {...motionProps(0.5)}
      >
        {t(lang, 'landing_hero_subtitle')}
      </motion.p>

      <motion.div {...motionProps(0.7)}>
        <Button
          render={<Link href="/auth" />}
          size="lg"
          className="bg-hero-teal text-hero-bg hover:opacity-90 px-8 py-3 text-base font-semibold rounded-xl h-auto mt-2"
        >
          {t(lang, 'landing_hero_cta')}
        </Button>
      </motion.div>
    </section>
  )
}
