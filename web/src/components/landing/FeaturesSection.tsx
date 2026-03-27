import { Zap, Users, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StaggerGroup, StaggerItem } from '@/components/motion/StaggerGroup'
import { FadeIn } from '@/components/motion/FadeIn'
import { t, type Language } from '@/lib/translations'

interface FeaturesSectionProps {
  lang: Language
}

export function FeaturesSection({ lang }: FeaturesSectionProps) {
  const features = [
    { icon: Zap, title: t(lang, 'landing_feat1_title'), body: t(lang, 'landing_feat1_body') },
    { icon: Users, title: t(lang, 'landing_feat2_title'), body: t(lang, 'landing_feat2_body') },
    { icon: BarChart3, title: t(lang, 'landing_feat3_title'), body: t(lang, 'landing_feat3_body') },
  ]

  return (
    <section className="bg-background py-24 px-6">
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
            {t(lang, 'landing_features_overline')}
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
            {t(lang, 'landing_features_headline')}
          </h2>
        </FadeIn>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, body }, i) => (
            <StaggerItem key={i}>
              <Card className="h-full border-border/60 hover:border-teal/40 transition-colors duration-300">
                <CardContent className="pt-6 pb-6">
                  <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-teal" />
                  </div>
                  <h3
                    className="text-foreground font-semibold mb-2"
                    style={{ fontSize: 'var(--text-subheading-size)' }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-body-size)',
                      lineHeight: 'var(--text-body-lh)',
                    }}
                  >
                    {body}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
