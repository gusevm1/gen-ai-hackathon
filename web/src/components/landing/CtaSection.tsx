import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/motion/FadeIn'
import { t, type Language } from '@/lib/translations'

interface CtaSectionProps {
  lang: Language
}

export function CtaSection({ lang }: CtaSectionProps) {
  return (
    <section className="bg-hero-bg text-hero-fg py-32 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <FadeIn>
          <p
            className="text-hero-teal uppercase mb-4"
            style={{
              fontSize: 'var(--text-overline-size)',
              fontWeight: 'var(--text-overline-weight)',
              letterSpacing: 'var(--text-overline-ls)',
            }}
          >
            {t(lang, 'landing_cta_overline')}
          </p>
          <h2
            className="text-hero-fg mb-6"
            style={{
              fontSize: 'var(--text-headline-size)',
              fontWeight: 'var(--text-headline-weight)',
              lineHeight: 'var(--text-headline-lh)',
              letterSpacing: 'var(--text-headline-ls)',
            }}
          >
            {t(lang, 'landing_cta_headline')}
          </h2>
          <p
            className="text-hero-fg/60 mb-10"
            style={{
              fontSize: 'var(--text-body-lg-size)',
              lineHeight: 'var(--text-body-lg-lh)',
            }}
          >
            {t(lang, 'landing_cta_subtext')}
          </p>
          <Button
            render={<Link href="/auth" />}
            size="lg"
            className="bg-hero-teal text-hero-bg hover:bg-hero-teal/90 font-semibold px-10 py-3 rounded-full text-base"
          >
            {t(lang, 'landing_cta_button')}
          </Button>
        </FadeIn>
      </div>
    </section>
  )
}
