'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

export function SectionCTA({ lang }: { lang: Language }) {
  return (
    <section
      className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
      style={{ backgroundColor: 'var(--color-hero-bg)' }}
    >
      {/* Radial teal glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, hsl(173 65% 52% / 0.09) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative z-10 max-w-xl w-full"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-xs uppercase tracking-widest font-semibold mb-4"
          style={{ color: 'var(--color-hero-teal)' }}
        >
          {t(lang, 'landing_cta_overline')}
        </p>
        <h2
          className="font-bold tracking-tight mb-4"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            lineHeight: 1.15,
            color: 'var(--color-hero-fg)',
          }}
        >
          {t(lang, 'landing_cta_headline')}
        </h2>
        <p
          className="text-lg leading-relaxed mb-8"
          style={{ color: 'hsl(0 0% 70%)' }}
        >
          {t(lang, 'landing_cta_subtext')}
        </p>
        <Button
          render={<Link href="/auth" />}
          size="lg"
          className="px-10 py-4 text-base font-semibold rounded-xl h-auto"
          style={{
            backgroundColor: 'var(--color-hero-teal)',
            color: 'var(--color-hero-bg)',
          }}
        >
          {t(lang, 'landing_cta_button')}
        </Button>
      </motion.div>
    </section>
  )
}
