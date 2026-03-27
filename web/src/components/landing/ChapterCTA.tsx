'use client'

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { t, type Language } from "@/lib/translations"

interface ChapterCTAProps {
  lang: Language
}

export function ChapterCTA({ lang }: ChapterCTAProps) {
  const prefersReduced = useReducedMotion()

  return (
    <section className="relative h-screen flex flex-col items-center justify-center bg-hero-bg px-6">
      <motion.div
        className="text-center max-w-lg flex flex-col items-center gap-8"
        initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* HomeMatch logo */}
        <div className="flex items-center gap-2">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="16" fill="hsl(173 65% 52%)"/>
            <path d="M10 20V14l6-4 6 4v6h-4v-3h-4v3z" fill="hsl(0 0% 4%)" />
          </svg>
          <span
            className="text-hero-fg font-semibold tracking-tight"
            style={{ fontSize: 'var(--text-subheading-size)' }}
          >
            HomeMatch
          </span>
        </div>

        {/* Headline */}
        <p
          className="text-hero-fg font-medium"
          style={{
            fontSize: 'var(--text-body-lg-size)',
            lineHeight: 'var(--text-body-lg-lh)',
          }}
        >
          {t(lang, 'landing_cta_headline')}
        </p>

        {/* Primary CTA — render={<Link />} pattern, NO asChild */}
        <Button
          render={<Link href="/auth" />}
          size="lg"
          className="bg-hero-teal text-hero-bg hover:opacity-90 px-8 py-3 text-base font-semibold rounded-xl h-auto"
        >
          {t(lang, 'landing_cta_button')}
        </Button>

        {/* Sign in link */}
        <p
          className="text-sm"
          style={{ color: 'hsl(0 0% 60%)' }}
        >
          {t(lang, 'landing_cta_signin')}{' '}
          <Link
            href="/auth"
            className="text-hero-teal hover:underline"
          >
            {t(lang, 'landing_cta_signin_link')} →
          </Link>
        </p>
      </motion.div>
    </section>
  )
}
