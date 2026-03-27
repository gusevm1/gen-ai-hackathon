'use client'

import { useLanguage } from '@/lib/language-context'
import type { Language } from '@/lib/translations'
import { LandingNavbar } from './LandingNavbar'
import { LandingFooter } from './LandingFooter'
import { ChapterHook } from './ChapterHook'
import { ChapterSwitzerland } from './ChapterSwitzerland'
import { ChapterProblem } from './ChapterProblem'
import { ChapterMechanism } from './ChapterMechanism'
import { ChapterScore } from './ChapterScore'
import { ChapterDream } from './ChapterDream'
import { ChapterCTA } from './ChapterCTA'

export function LandingPageContent() {
  const { language } = useLanguage()
  const lang = language as Language
  return (
    <div className="bg-hero-bg">
      <LandingNavbar lang={lang} />
      <ChapterHook lang={lang} />
      <ChapterSwitzerland lang={lang} />
      <ChapterProblem lang={lang} />
      <ChapterMechanism lang={lang} />
      <ChapterScore lang={lang} />
      <ChapterDream lang={lang} />
      <ChapterCTA lang={lang} />
      <LandingFooter lang={lang} />
    </div>
  )
}
