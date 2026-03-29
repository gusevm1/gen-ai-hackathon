'use client'

import { useLanguage } from '@/lib/language-context'
import type { Language } from '@/lib/translations'
import { LandingNavbar } from './LandingNavbar'
import { LandingFooter } from './LandingFooter'
import { SectionHero } from './SectionHero'
import { SectionProblem } from './SectionProblem'
import { SectionSolution } from './SectionSolution'
import { SectionCTA } from './SectionCTA'
import { SectionCredits } from './SectionCredits'

export function LandingPageContent() {
  const { language } = useLanguage()
  const lang = language as Language
  return (
    <div className="bg-hero-bg">
      <LandingNavbar lang={lang} />
      <SectionHero lang={lang} />
      <SectionProblem lang={lang} />
      <SectionSolution lang={lang} />
      {/* Gradient bridge between Solution and CTA */}
      <div
        aria-hidden
        style={{
          height: 100,
          background: 'linear-gradient(to bottom, transparent 0%, hsl(342 89% 50% / 0.07) 50%, transparent 100%)',
        }}
      />
      <SectionCTA lang={lang} />
      <SectionCredits lang={lang} />
      <LandingFooter lang={lang} />
    </div>
  )
}
