'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileCreationChooser } from '@/components/profile-creation-chooser'
import { CreateProfileDialog } from '@/components/profiles/create-profile-dialog'
import { createProfile } from '@/app/(dashboard)/profiles/actions'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider'
import { TakeATourButton } from '@/components/onboarding/TakeATourButton'
import { ExtensionInstallBanner } from '@/components/ExtensionInstallBanner'

export function NewUserDashboard() {
  const router = useRouter()
  const { language } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)
  const { state, isActive, advance } = useOnboardingContext()

  async function handleCreate(name: string) {
    const id = await createProfile(name)
    // If onboarding is active and we're on the "create profile" step (3), advance to
    // step 4 (Open Flatfox) so the CTA appears when the user returns to the dashboard.
    if (isActive && state?.onboarding_step === 3) {
      await advance()
    }
    router.push('/profiles/' + id)
  }

  function openCreateDialog() {
    setCreateOpen(true)
  }

  function goToAiSearch() {
    // If onboarding is active on step 3, advance before going to AI search
    if (isActive && state?.onboarding_step === 3) {
      advance()
    }
    router.push('/ai-search')
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <ExtensionInstallBanner />

      <h1 className="text-3xl font-bold mb-2">
        {t(language, 'dashboard_welcome')}
      </h1>
      <p className="text-lg text-muted-foreground mb-2">
        {t(language, 'dashboard_how_it_works')}
      </p>

      {/* 3-step numbered list (vertical, not cards) */}
      <ol className="text-left max-w-lg w-full mb-10 space-y-3">
        <li className="flex items-start gap-3">
          <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            1
          </span>
          <div>
            <span className="font-medium">{t(language, 'dashboard_step1_title')}</span>
            <span className="text-muted-foreground"> — {t(language, 'dashboard_step1_desc')}</span>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            2
          </span>
          <div>
            <span className="font-medium">{t(language, 'dashboard_step2_title')}</span>
            <span className="text-muted-foreground"> — {t(language, 'dashboard_step2_desc')}</span>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            3
          </span>
          <div>
            <span className="font-medium">{t(language, 'dashboard_step3_title')}</span>
            <span className="text-muted-foreground"> — {t(language, 'dashboard_step3_desc')}</span>
          </div>
        </li>
      </ol>

      <div id="create-profile-section" className="w-full max-w-2xl">
        <ProfileCreationChooser onManualClick={openCreateDialog} onAiClick={goToAiSearch} />
      </div>

      {/* "Take a quick tour" link when onboarding is not active */}
      {!isActive && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Not sure where to start? <TakeATourButton variant="inline" />
        </div>
      )}

      <CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />
    </div>
  )
}
