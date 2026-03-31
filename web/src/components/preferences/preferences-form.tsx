'use client'

import { useState } from 'react'
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ProfileSummary } from '@/components/preferences/profile-summary'
import { LocationTypeSection } from '@/components/preferences/location-type-section'
import { BudgetSection } from '@/components/preferences/budget-section'
import { SizeRoomsSection } from '@/components/preferences/size-rooms-section'
import { FeaturesSection } from '@/components/preferences/features-section'
import { DynamicFieldsSection } from '@/components/preferences/dynamic-fields-section'
import { ImportanceSection } from '@/components/preferences/importance-section'
import { OpenInFlatfoxButton } from '@/components/profiles/open-in-flatfox-button'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider'
import { updateOnboardingState } from '@/lib/onboarding-state'

interface PreferencesFormProps {
  defaultValues: Preferences
  onSave: (data: Preferences) => Promise<void>
  profileId?: string
  profileName?: string
  form?: UseFormReturn<Preferences>
}

export function PreferencesForm({ defaultValues, onSave, profileId, profileName, form: externalForm }: PreferencesFormProps) {
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const { language } = useLanguage()
  const { state: onboardingState, isActive: onboardingActive, advanceToOpenFlatfox } = useOnboardingContext()

  const internalForm = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema) as Resolver<Preferences>,
    defaultValues,
  })

  const form = externalForm ?? internalForm

  async function handleSubmit(data: Preferences) {
    try {
      setSaveMessage(null)
      // Always persist the current UI language so the AI scores in the correct language
      const dataWithLang = { ...data, language: language as 'en' | 'de' | 'fr' | 'it' }
      await onSave(dataWithLang)
      setSaveMessage({ type: 'success', text: t(language, 'pref_saved') })
      setTimeout(() => setSaveMessage(null), 3000)

      // Issue 6: Advance the onboarding tour from "Save Preferences" to "Open in Flatfox"
      // after a successful save when the user is on onboarding step 4.
      if (onboardingActive && onboardingState?.onboarding_step === 4) {
        advanceToOpenFlatfox()
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t(language, 'pref_save_error'),
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {profileId && <ProfileSummary form={form} />}
        <Accordion
          multiple
          defaultValue={["location", "budget", "size", "features", "dynamic", "importance"]}
          className="w-full"
        >
          <AccordionItem value="location">
            <AccordionTrigger>{t(language, 'pref_location_type')}</AccordionTrigger>
            <AccordionContent>
              <LocationTypeSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="budget">
            <AccordionTrigger>{t(language, 'pref_budget')}</AccordionTrigger>
            <AccordionContent>
              <BudgetSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="size">
            <AccordionTrigger>{t(language, 'pref_size_rooms')}</AccordionTrigger>
            <AccordionContent>
              <SizeRoomsSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="features">
            <AccordionTrigger>{t(language, 'pref_features_availability')}</AccordionTrigger>
            <AccordionContent>
              <FeaturesSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dynamic">
            <AccordionTrigger>{t(language, 'pref_custom_criteria')}</AccordionTrigger>
            <AccordionContent>
              <DynamicFieldsSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="importance">
            <AccordionTrigger>{t(language, 'pref_what_matters')}</AccordionTrigger>
            <AccordionContent>
              <ImportanceSection form={form} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-wrap items-center gap-4">
          <Button id="save-preferences-btn" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t(language, 'pref_saving') : t(language, 'pref_save')}
          </Button>
          <OpenInFlatfoxButton
            id="open-flatfox-profile-btn"
            preferences={{
              location: form.watch('location'),
              offerType: form.watch('offerType'),
              objectCategory: form.watch('objectCategory') === 'ANY' ? undefined : form.watch('objectCategory'),
              budgetMin: form.watch('budgetMin'),
              budgetMax: form.watch('budgetMax'),
              roomsMin: form.watch('roomsMin'),
              roomsMax: form.watch('roomsMax'),
            }}
            language={language}
            onBeforeOpen={
              onboardingActive && onboardingState?.onboarding_step === 4
                ? async () => {
                    // Issue 8: Write step=5, active=true to Supabase BEFORE opening Flatfox
                    // so the extension content script reads the correct step on load.
                    await updateOnboardingState(5, true, onboardingState.onboarding_completed)
                  }
                : undefined
            }
          />
          {saveMessage && (
            <p
              className={`text-sm ${
                saveMessage.type === 'success'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {saveMessage.text}
            </p>
          )}
        </div>
      </form>
    </Form>
  )
}
