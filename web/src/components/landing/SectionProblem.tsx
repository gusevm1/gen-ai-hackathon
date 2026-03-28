'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ease } from '@/lib/motion'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

const PROBLEM_KEYS = [
  { num: '01', key: 'landing_problem_bullet1' as const },
  { num: '02', key: 'landing_problem_bullet2' as const },
  { num: '03', key: 'landing_problem_bullet3' as const },
]

function ProblemItem({
  num,
  statement,
}: {
  num: string
  statement: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const isInView = useInView(ref, { once: false, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      data-testid="problem-item"
      animate={prefersReduced ? {} : {
        opacity: isInView ? 1 : 0.25,
        x: isInView ? 0 : -60,
        scale: isInView ? 1 : 0.99,
        boxShadow: isInView
          ? 'inset 0 0 0 1px hsl(342 89% 50% / 0.3), 0 0 28px hsl(342 89% 50% / 0.10)'
          : 'none',
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-start gap-6 py-8 px-8 rounded-2xl"
      style={{ backgroundColor: 'hsl(0 0% 100% / 0.03)', border: '1px solid hsl(0 0% 100% / 0.07)' }}
    >
      {/* Number badge */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold tabular-nums mt-1"
        style={{
          width: 44, height: 44,
          border: '1px solid hsl(342 89% 50% / 0.3)',
          color: 'var(--color-hero-teal)',
          backgroundColor: 'hsl(342 89% 50% / 0.07)',
        }}
      >
        {num}
      </div>

      {/* Statement */}
      <p
        className="font-semibold leading-snug relative z-10"
        style={{
          fontSize: 'clamp(1.4rem, 3.2vw, 2.25rem)',
          color: 'var(--color-hero-fg)',
          maxWidth: '75%',
        }}
      >
        {statement}
      </p>
    </motion.div>
  )
}

export function SectionProblem({ lang }: { lang: Language }) {
  return (
    <section className="py-32 px-6" style={{ backgroundColor: 'var(--color-hero-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.6, ease: ease.enter }}
          className="mb-24 text-center"
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-4"
            style={{ color: 'var(--color-hero-teal)' }}
          >
            {t(lang, 'landing_problem_overline')}
          </p>
          <h2
            className="font-bold tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: 1.1,
              color: 'var(--color-hero-fg)',
            }}
          >
            {t(lang, 'landing_problem_headline')}
          </h2>
        </motion.div>

        {/* Problem statements */}
        <div className="space-y-4">
          {PROBLEM_KEYS.map(({ num, key }) => (
            <ProblemItem key={num} num={num} statement={t(lang, key)} />
          ))}
        </div>
      </div>
    </section>
  )
}
