'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfileCreationChooser } from '@/components/profile-creation-chooser'
import { CreateProfileDialog } from '@/components/profiles/create-profile-dialog'
import { createProfile } from '@/app/(dashboard)/profiles/actions'
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

interface NewProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProfileModal({ open, onOpenChange }: NewProfileModalProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { state, isActive, advance } = useOnboardingContext()

  function handleAiClick() {
    if (isActive && state?.onboarding_step === 3) {
      advance()
    }
    onOpenChange(false)
    router.push('/ai-search')
  }

  function handleManualClick() {
    setCreateDialogOpen(true)
  }

  async function handleCreate(name: string) {
    const id = await createProfile(name)
    if (isActive && state?.onboarding_step === 3) {
      await advance()
    }
    setCreateDialogOpen(false)
    onOpenChange(false)
    router.push('/profiles/' + id)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t(language, 'dashboard_create_new_profile')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ProfileCreationChooser
              onManualClick={handleManualClick}
              onAiClick={handleAiClick}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CreateProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
      />
    </>
  )
}
