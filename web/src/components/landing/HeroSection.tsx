import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { t, type Language } from '@/lib/translations'
import { HeroDemo } from './HeroDemo'

interface HeroSectionProps {
  lang: Language
}

export function HeroSection({ lang }: HeroSectionProps) {
  return (
    <section className="bg-hero-bg text-hero-fg min-h-screen flex flex-col items-center justify-center pt-16">
      <div className="max-w-4xl mx-auto px-6 text-center py-24">
        <p
          className="text-hero-teal mb-6 uppercase"
          style={{
            fontSize: 'var(--text-overline-size)',
            fontWeight: 'var(--text-overline-weight)',
            letterSpacing: 'var(--text-overline-ls)',
          }}
        >
          {t(lang, 'landing_hero_overline')}
        </p>

        <h1
          className="text-hero-fg mb-6"
          style={{
            fontSize: 'var(--text-display-size)',
            fontWeight: 'var(--text-display-weight)',
            lineHeight: 'var(--text-display-lh)',
            letterSpacing: 'var(--text-display-ls)',
          }}
        >
          {t(lang, 'landing_hero_headline')}
        </h1>

        <p
          className="text-hero-fg/70 mb-10 max-w-xl mx-auto"
          style={{
            fontSize: 'var(--text-body-lg-size)',
            lineHeight: 'var(--text-body-lg-lh)',
          }}
        >
          {t(lang, 'landing_hero_subtitle')}
        </p>

        <Button
          render={<Link href="/auth" />}
          size="lg"
          className="bg-hero-teal text-hero-bg hover:bg-hero-teal/90 font-semibold px-8 py-3 rounded-full text-base"
        >
          {t(lang, 'landing_hero_cta')}
        </Button>

        <div className="mt-20">
          <HeroDemo />
        </div>
      </div>
    </section>
  )
}
