import { StaggerGroup, StaggerItem } from '@/components/motion/StaggerGroup'
import { FadeIn } from '@/components/motion/FadeIn'
import { t, type Language } from '@/lib/translations'

interface HowItWorksSectionProps {
  lang: Language
}

export function HowItWorksSection({ lang }: HowItWorksSectionProps) {
  const steps = [
    { label: t(lang, 'landing_howit_step1_label'), body: t(lang, 'landing_howit_step1_body') },
    { label: t(lang, 'landing_howit_step2_label'), body: t(lang, 'landing_howit_step2_body') },
    { label: t(lang, 'landing_howit_step3_label'), body: t(lang, 'landing_howit_step3_body') },
  ]

  return (
    <section className="bg-muted/30 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <p
            className="text-teal uppercase mb-4 text-center"
            style={{
              fontSize: 'var(--text-overline-size)',
              fontWeight: 'var(--text-overline-weight)',
              letterSpacing: 'var(--text-overline-ls)',
            }}
          >
            {t(lang, 'landing_howit_overline')}
          </p>
          <h2
            className="text-foreground mb-16 text-center"
            style={{
              fontSize: 'var(--text-headline-size)',
              fontWeight: 'var(--text-headline-weight)',
              lineHeight: 'var(--text-headline-lh)',
              letterSpacing: 'var(--text-headline-ls)',
            }}
          >
            {t(lang, 'landing_howit_headline')}
          </h2>
        </FadeIn>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <StaggerItem key={i}>
              <div className="text-center md:text-left">
                <p
                  className="text-teal font-bold mb-3"
                  style={{ fontSize: 'var(--text-subheading-size)' }}
                >
                  {step.label.split('.')[0]}.
                </p>
                <p
                  className="text-foreground font-semibold mb-2"
                  style={{ fontSize: 'var(--text-body-lg-size)' }}
                >
                  {step.label.replace(/^\d+\.\s*/, '')}
                </p>
                <p
                  className="text-muted-foreground"
                  style={{
                    fontSize: 'var(--text-body-size)',
                    lineHeight: 'var(--text-body-lh)',
                  }}
                >
                  {step.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
