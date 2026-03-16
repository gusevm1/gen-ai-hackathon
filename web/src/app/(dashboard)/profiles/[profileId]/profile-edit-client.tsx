'use client'

import { useCallback } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChatPanel } from '@/components/chat/chat-panel'
import { PreferencesForm } from '@/components/preferences/preferences-form'
import { mergeExtractedFields } from '@/lib/chat/merge-fields'
import { preferencesSchema, type Preferences, type DynamicField } from '@/lib/schemas/preferences'

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
  const form = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema) as Resolver<Preferences>,
    defaultValues,
  })

  const handleFieldsExtracted = useCallback(
    (fields: DynamicField[]) => {
      const current = form.getValues('dynamicFields') || []
      const merged = mergeExtractedFields(current, fields)
      form.setValue('dynamicFields', merged, { shouldDirty: true })
    },
    [form]
  )

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
        form={form}
      />
    </>
  )
}
