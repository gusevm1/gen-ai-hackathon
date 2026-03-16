'use client'

import { useCallback } from 'react'
import { ChatPanel } from '@/components/chat/chat-panel'
import { PreferencesForm } from '@/components/preferences/preferences-form'
import type { Preferences, DynamicField } from '@/lib/schemas/preferences'

interface ProfileEditClientProps {
  profileId: string
  profileName: string
  defaultValues: Preferences
  onSave: (data: Preferences) => Promise<void>
}

export function ProfileEditClient({
  profileId,
  profileName,
  defaultValues,
  onSave,
}: ProfileEditClientProps) {
  // Placeholder -- wired to extraction + merge in Plan 03
  const handleFieldsExtracted = useCallback((_fields: DynamicField[]) => {
    /* Plan 03 will wire this to merge extracted fields into the form */
  }, [])

  return (
    <>
      <ChatPanel
        profileId={profileId}
        onFieldsExtracted={handleFieldsExtracted}
      />
      <PreferencesForm
        defaultValues={defaultValues}
        onSave={onSave}
        profileId={profileId}
        profileName={profileName}
      />
    </>
  )
}
