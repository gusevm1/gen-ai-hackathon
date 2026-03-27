import { FadeIn } from '@/components/motion/FadeIn'
import { t, type Language } from '@/lib/translations'

interface ProblemSectionProps {
  lang: Language
}

export function ProblemSection({ lang }: ProblemSectionProps) {
  const bullets = [
    t(lang, 'landing_problem_bullet1'),
    t(lang, 'landing_problem_bullet2'),
    t(lang, 'landing_problem_bullet3'),
  ] as const

  return (
    <section className="bg-background py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <p
            className="text-teal uppercase mb-4"
            style={{
              fontSize: 'var(--text-overline-size)',
              fontWeight: 'var(--text-overline-weight)',
              letterSpacing: 'var(--text-overline-ls)',
            }}
          >
            {t(lang, 'landing_problem_overline')}
          </p>
          <h2
            className="text-foreground mb-12"
            style={{
              fontSize: 'var(--text-headline-size)',
              fontWeight: 'var(--text-headline-weight)',
              lineHeight: 'var(--text-headline-lh)',
              letterSpacing: 'var(--text-headline-ls)',
            }}
          >
            {t(lang, 'landing_problem_headline')}
          </h2>
          <div className="space-y-6">
            {bullets.map((bullet, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-1 h-full min-h-6 bg-teal/30 rounded-full shrink-0 mt-1.5" />
                <p
                  className="text-muted-foreground"
                  style={{
                    fontSize: 'var(--text-body-lg-size)',
                    lineHeight: 'var(--text-body-lg-lh)',
                  }}
                >
                  {bullet}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
