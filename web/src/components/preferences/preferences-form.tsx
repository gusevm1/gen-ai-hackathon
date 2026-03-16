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

  const internalForm = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema) as Resolver<Preferences>,
    defaultValues,
  })

  const form = externalForm ?? internalForm

  async function handleSubmit(data: Preferences) {
    try {
      setSaveMessage(null)
      await onSave(data)
      setSaveMessage({ type: 'success', text: 'Preferences saved successfully!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save preferences',
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
            <AccordionTrigger>Location & Type</AccordionTrigger>
            <AccordionContent>
              <LocationTypeSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="budget">
            <AccordionTrigger>Budget</AccordionTrigger>
            <AccordionContent>
              <BudgetSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="size">
            <AccordionTrigger>Size & Rooms</AccordionTrigger>
            <AccordionContent>
              <SizeRoomsSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="features">
            <AccordionTrigger>Features & Availability</AccordionTrigger>
            <AccordionContent>
              <FeaturesSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dynamic">
            <AccordionTrigger>Custom Criteria</AccordionTrigger>
            <AccordionContent>
              <DynamicFieldsSection form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="importance">
            <AccordionTrigger>What Matters Most</AccordionTrigger>
            <AccordionContent>
              <ImportanceSection form={form} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Preferences'}
          </Button>
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
