'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/motion/FadeIn'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

export function SectionCTA({ lang }: { lang: Language }) {
  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center bg-hero-bg text-center px-6 py-24">
      <FadeIn className="max-w-xl w-full">
        <p
          className="text-xs uppercase tracking-widest font-semibold mb-4"
          style={{ color: 'var(--color-hero-teal)' }}
        >
          {t(lang, 'landing_cta_overline')}
        </p>
        <h2
          className="font-bold tracking-tight text-hero-fg mb-4"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.15 }}
        >
          {t(lang, 'landing_cta_headline')}
        </h2>
        <p className="text-hero-fg/70 text-lg leading-relaxed mb-8">
          {t(lang, 'landing_cta_subtext')}
        </p>
        <Button
          render={<Link href="/auth" />}
          size="lg"
          className="bg-hero-teal text-hero-bg hover:opacity-90 px-10 py-4 text-base font-semibold rounded-xl h-auto"
        >
          {t(lang, 'landing_cta_button')}
        </Button>
      </FadeIn>
    </section>
  )
}
