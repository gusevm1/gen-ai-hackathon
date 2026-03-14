'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FEATURE_SUGGESTIONS } from '@/lib/constants/features'

interface FeaturesSectionProps {
  form: UseFormReturn<Preferences>
}

export function FeaturesSection({ form }: FeaturesSectionProps) {
  const selectedFeatures = form.watch('features')

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

  return (
    <div className="space-y-6">
      {/* Feature Chips */}
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

      {/* Availability */}
      <FormField
        control={form.control}
        name="availability"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Availability</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="immediately">Immediately</SelectItem>
                <SelectItem value="1month">Within 1 month</SelectItem>
                <SelectItem value="3months">Within 3 months</SelectItem>
                <SelectItem value="specific">Specific date</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
