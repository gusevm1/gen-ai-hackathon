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
import { buildFlatfoxUrl, buildFlatfoxUrlWithGeocode } from '@/lib/flatfox-url'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider'
import { updateOnboardingState } from '@/lib/onboarding-state'
import { Info, ExternalLink, Loader2 } from 'lucide-react'

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
  const [hasSaved, setHasSaved] = useState(false)
  const { language } = useLanguage()
  const { state: onboardingState, isActive: onboardingActive, showOpenFlatfoxStep } = useOnboardingContext()

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

      // Advance the onboarding tour from "Save Preferences" to "Open in Flatfox"
      // after a successful save when the user is on onboarding step 4.
      // showOpenFlatfoxStep() creates a fresh driver instance — avoids the stale
      // destroyed-driver bug that prevented the Open Flatfox popover from showing.
      if (onboardingActive && onboardingState?.onboarding_step === 4) {
        showOpenFlatfoxStep()
      } else if (hasSaved) {
        // After first save, subsequent saves also open Flatfox in a new tab
        const prefs = {
          location: form.getValues('location'),
          offerType: form.getValues('offerType'),
          objectCategory: form.getValues('objectCategory') === 'ANY' ? undefined : form.getValues('objectCategory'),
          budgetMin: form.getValues('budgetMin'),
          budgetMax: form.getValues('budgetMax'),
          roomsMin: form.getValues('roomsMin'),
          roomsMax: form.getValues('roomsMax'),
        }
        try {
          const url = await buildFlatfoxUrlWithGeocode(prefs, language)
          window.open(url, '_blank', 'noopener,noreferrer')
        } catch {
          const url = buildFlatfoxUrl(prefs, language)
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      }

      setHasSaved(true)
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t(language, 'pref_save_error'),
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-20">
        {profileId && <ProfileSummary form={form} />}
        {onboardingActive && onboardingState?.onboarding_step === 4 && (
          <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Fill in your search criteria, then click <strong>Save Preferences</strong> to continue the tour.
            </span>
          </div>
        )}
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

        <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 -mx-4 mt-6">
          <Button id="save-preferences-btn" type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
            ) : hasSaved ? (
              <>Save &amp; Open in Flatfox <ExternalLink className="ml-2 size-4" /></>
            ) : (
              'Save Preferences'
            )}
          </Button>
          {saveMessage && (
            <p className={`text-sm text-center mt-2 ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage.text}
            </p>
          )}
        </div>
      </form>
    </Form>
  )
}
