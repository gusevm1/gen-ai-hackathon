'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface SoftCriteriaSectionProps {
  form: UseFormReturn<Preferences>
}

export function SoftCriteriaSection({ form }: SoftCriteriaSectionProps) {
  const softCriteria = form.watch('softCriteria')

  function addCriterion() {
    const current = form.getValues('softCriteria')
    form.setValue('softCriteria', [...current, ''], { shouldDirty: true })
  }

  function removeCriterion(index: number) {
    const current = form.getValues('softCriteria')
    form.setValue(
      'softCriteria',
      current.filter((_, i) => i !== index),
      { shouldDirty: true }
    )
  }

  function updateCriterion(index: number, value: string) {
    const current = form.getValues('softCriteria')
    const updated = [...current]
    updated[index] = value
    form.setValue('softCriteria', updated, { shouldDirty: true })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Custom Criteria</label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Add any additional preferences in your own words
        </p>
        <div className="space-y-2">
          {softCriteria.map((criterion, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={criterion}
                onChange={(e) => updateCriterion(index, e.target.value)}
                placeholder="e.g., near Bahnhof, quiet neighborhood, good school district"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCriterion(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCriterion}
          className="mt-3"
        >
          + Add Criterion
        </Button>
      </div>
    </div>
  )
}
