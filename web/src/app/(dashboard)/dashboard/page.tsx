'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileCreationChooser } from '@/components/profile-creation-chooser'
import { CreateProfileDialog } from '@/components/profiles/create-profile-dialog'
import { createProfile } from '@/app/(dashboard)/profiles/actions'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

export default function DashboardPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)

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

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">
        {t(language, 'dashboard_welcome')}
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t(language, 'dashboard_subtitle')}
      </p>
      <ProfileCreationChooser
        onManualClick={openCreateDialog}
        onAiClick={goToAiSearch}
      />
      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </div>
  )
}
