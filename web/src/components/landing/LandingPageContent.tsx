'use client'

import { useLanguage } from '@/lib/language-context'
import type { Language } from '@/lib/translations'
import { LandingNavbar } from './LandingNavbar'
import { LandingFooter } from './LandingFooter'
import { SectionHero } from './SectionHero'
import { SectionGlobe } from './SectionGlobe'

export function LandingPageContent() {
  const { language } = useLanguage()
  const lang = language as Language
  return (
    <div className="bg-hero-bg">
      <LandingNavbar lang={lang} />
      <SectionHero lang={lang} />
      <SectionGlobe lang={lang} />
      <LandingFooter lang={lang} />
    </div>
  )
}
