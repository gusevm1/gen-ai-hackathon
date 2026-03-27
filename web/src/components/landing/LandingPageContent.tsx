'use client'

import { useLanguage } from '@/lib/language-context'
import type { Language } from '@/lib/translations'
import { LandingNavbar } from './LandingNavbar'
import { HeroSection } from './HeroSection'
import { ProblemSection } from './ProblemSection'
import { HowItWorksSection } from './HowItWorksSection'
import { FeaturesSection } from './FeaturesSection'
import { CtaSection } from './CtaSection'
import { LandingFooter } from './LandingFooter'

export function LandingPageContent() {
  const { language } = useLanguage()
  const lang = language as Language

  return (
    <div className="min-h-screen">
      <LandingNavbar lang={lang} />
      <HeroSection lang={lang} />
      <ProblemSection lang={lang} />
      <HowItWorksSection lang={lang} />
      <FeaturesSection lang={lang} />
      <CtaSection lang={lang} />
      <LandingFooter lang={lang} />
    </div>
  )
}
