'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import { FEATURE_SUGGESTIONS } from '@/lib/constants/features'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface SoftCriteriaProps {
  form: UseFormReturn<Preferences>
}

export function SoftCriteria({ form }: SoftCriteriaProps) {
  const selectedFeatures = form.watch('features')
  const softCriteria = form.watch('softCriteria')

  function toggleFeature(featureValue: string) {
    const current = form.getValues('features')
    if (current.includes(featureValue)) {
      form.setValue(
        'features',
        current.filter((f) => f !== featureValue),
        { shouldDirty: true }
      )
    } else {
      form.setValue('features', [...current, featureValue], {
        shouldDirty: true,
      })
    }
  }

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
    <div className="space-y-6">
      {/* PREF-08: Feature Suggestions */}
      <div>
        <label className="text-sm font-medium">Feature Preferences</label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Click to toggle features you care about
        </p>
        <div className="flex flex-wrap gap-2">
          {FEATURE_SUGGESTIONS.map((feature) => (
            <Badge
              key={feature.value}
              variant={
                selectedFeatures.includes(feature.value)
                  ? 'default'
                  : 'outline'
              }
              className="cursor-pointer select-none"
              onClick={() => toggleFeature(feature.value)}
            >
              {feature.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* PREF-07: Free-text Soft Criteria */}
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
