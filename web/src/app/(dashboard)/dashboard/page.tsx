'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { ProfileCreationChooser } from '@/components/profile-creation-chooser'
import { CreateProfileDialog } from '@/components/profiles/create-profile-dialog'
import { createProfile } from '@/app/(dashboard)/profiles/actions'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider'
import { Button } from '@/components/ui/button'
import { TakeATourButton } from '@/components/onboarding/TakeATourButton'

export default function DashboardPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)
  const { state, isActive } = useOnboardingContext()

  async function handleCreate(name: string) {
    const id = await createProfile(name)
    router.push('/profiles/' + id)
  }

  function openCreateDialog() {
    setCreateOpen(true)
  }

  function goToAiSearch() {
    router.push('/ai-search')
  }

  const step = state?.onboarding_step ?? 1

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

      {/* Step 3: Show "Open Flatfox" CTA when onboarding is active and on step 3 */}
      {isActive && step >= 3 && (
        <div className="mt-8">
          <a
            id="open-flatfox-cta"
            href="https://flatfox.ch/en/search/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="gap-2">
              <ExternalLink className="size-4" />
              Open Flatfox
            </Button>
          </a>
        </div>
      )}

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
