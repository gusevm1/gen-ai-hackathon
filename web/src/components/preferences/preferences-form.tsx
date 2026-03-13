'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
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
import { StandardFilters } from '@/components/preferences/standard-filters'
import { SoftCriteria } from '@/components/preferences/soft-criteria'
import { WeightSliders } from '@/components/preferences/weight-sliders'

interface PreferencesFormProps {
  defaultValues: Preferences
  onSave: (data: Preferences) => Promise<void>
}

export function PreferencesForm({ defaultValues, onSave }: PreferencesFormProps) {
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const form = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema) as Resolver<Preferences>,
    defaultValues,
  })

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
        <Accordion
          multiple
          defaultValue={[0, 1, 2]}
          className="w-full"
        >
          <AccordionItem>
            <AccordionTrigger>Standard Filters</AccordionTrigger>
            <AccordionContent>
              <StandardFilters form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem>
            <AccordionTrigger>Soft Criteria</AccordionTrigger>
            <AccordionContent>
              <SoftCriteria form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem>
            <AccordionTrigger>Category Importance</AccordionTrigger>
            <AccordionContent>
              <WeightSliders form={form} />
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
