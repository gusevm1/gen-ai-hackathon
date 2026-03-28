'use client'

import type { Variants } from 'motion/react'
import { FadeIn } from '@/components/motion/FadeIn'
import { StaggerGroup, StaggerItem } from '@/components/motion/StaggerGroup'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

const stepStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
}

const stepItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const STEPS = [
  { badge: '01', label: 'landing_howit_step1_label', body: 'landing_howit_step1_body' },
  { badge: '02', label: 'landing_howit_step2_label', body: 'landing_howit_step2_body' },
  { badge: '03', label: 'landing_howit_step3_label', body: 'landing_howit_step3_body' },
] as const

const FEATURES = [
  { title: 'landing_feat1_title', body: 'landing_feat1_body' },
  { title: 'landing_feat2_title', body: 'landing_feat2_body' },
  { title: 'landing_feat3_title', body: 'landing_feat3_body' },
] as const

export function SectionSolution({ lang }: { lang: Language }) {
  return (
    <section className="py-24 px-6 bg-hero-bg">
      <div className="max-w-5xl mx-auto">
        {/* How It Works */}
        <FadeIn>
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-4"
            style={{ color: 'var(--color-hero-teal)' }}
          >
            {t(lang, 'landing_howit_overline')}
          </p>
          <h2
            className="font-bold tracking-tight text-hero-fg mb-12"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.15 }}
          >
            {t(lang, 'landing_howit_headline')}
          </h2>
        </FadeIn>

        <StaggerGroup
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {STEPS.map(({ badge, label, body }) => (
            <StaggerItem key={badge}>
              <Card className="bg-card/60 border-hero-fg/10 h-full p-6">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge
                      className="font-mono text-sm px-2 py-1 h-auto"
                      style={{
                        backgroundColor: 'var(--color-hero-teal)',
                        color: 'var(--color-hero-bg)',
                        borderColor: 'transparent',
                      }}
                    >
                      {badge}
                    </Badge>
                    <h3 className="font-semibold text-hero-fg text-base">
                      {t(lang, label)}
                    </h3>
                  </div>
                  <p className="text-hero-fg/70 text-sm leading-relaxed">
                    {t(lang, body)}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>

        {/* Features */}
        <FadeIn className="mt-20 mb-12">
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-4"
            style={{ color: 'var(--color-hero-teal)' }}
          >
            {t(lang, 'landing_features_overline')}
          </p>
          <h2
            className="font-bold tracking-tight text-hero-fg"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', lineHeight: 1.2 }}
          >
            {t(lang, 'landing_features_headline')}
          </h2>
        </FadeIn>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ title, body }) => (
            <StaggerItem key={title}>
              <Card className="bg-card/60 border-hero-fg/10 h-full p-6">
                <CardContent className="p-0">
                  <h3 className="font-semibold text-hero-fg text-base mb-3">
                    {t(lang, title)}
                  </h3>
                  <p className="text-hero-fg/70 text-sm leading-relaxed">
                    {t(lang, body)}
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
