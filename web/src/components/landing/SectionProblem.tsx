'use client'

import { FadeIn } from '@/components/motion/FadeIn'
import { StaggerGroup, StaggerItem } from '@/components/motion/StaggerGroup'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

export function SectionProblem({ lang }: { lang: Language }) {
  return (
    <section className="py-24 px-6 bg-hero-bg">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-4"
            style={{ color: 'var(--color-hero-teal)' }}
          >
            {t(lang, 'landing_problem_overline')}
          </p>
          <h2
            className="font-bold tracking-tight text-hero-fg mb-10"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.15 }}
          >
            {t(lang, 'landing_problem_headline')}
          </h2>
        </FadeIn>
        <StaggerGroup className="mt-10 space-y-6">
          {(
            [
              'landing_problem_bullet1',
              'landing_problem_bullet2',
              'landing_problem_bullet3',
            ] as const
          ).map((key) => (
            <StaggerItem key={key}>
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 flex-shrink-0 font-bold"
                  style={{ color: 'var(--color-hero-teal)' }}
                >
                  —
                </span>
                <p className="text-hero-fg text-lg leading-relaxed opacity-80">
                  {t(lang, key)}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
