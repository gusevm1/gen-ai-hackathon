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

export default function DashboardPage() {
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
      <h1 className="text-3xl font-bold mb-2">
        {t(language, 'dashboard_welcome')}
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t(language, 'dashboard_subtitle')}
      </p>

      <div id="create-profile-section" className="w-full max-w-2xl">
        <ProfileCreationChooser
          onManualClick={openCreateDialog}
          onAiClick={goToAiSearch}
        />
      </div>

      {/* Empty state "Take a quick tour" link when onboarding is not active */}
      {!isActive && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Not sure where to start?{' '}
          <TakeATourButton variant="inline" />
        </div>
      )}

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </div>
  )
}
