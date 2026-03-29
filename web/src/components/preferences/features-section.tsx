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
import { useLanguage } from '@/lib/language-context'
import { t, type TranslationKey } from '@/lib/translations'

interface FeaturesSectionProps {
  form: UseFormReturn<Preferences>
}

const FEATURE_KEY_MAP: Record<string, TranslationKey> = {
  balconygarden: 'feature_balconygarden',
  parkingspace: 'feature_parkingspace',
  garage: 'feature_garage',
  lift: 'feature_lift',
  dishwasher: 'feature_dishwasher',
  washingmachine: 'feature_washingmachine',
  petsallowed: 'feature_petsallowed',
  minergie: 'feature_minergie',
  parquetflooring: 'feature_parquetflooring',
  view: 'feature_view',
  cable: 'feature_cable',
  accessiblewithwheelchair: 'feature_accessiblewithwheelchair',
}

export function FeaturesSection({ form }: FeaturesSectionProps) {
  const selectedFeatures = form.watch('features')
  const { language } = useLanguage()

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
        <label className="text-sm font-medium">{t(language, 'features_label')}</label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          {t(language, 'features_hint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {FEATURE_SUGGESTIONS.map((feature) => {
            const labelKey = FEATURE_KEY_MAP[feature.value]
            const label = labelKey ? t(language, labelKey) : feature.label
            return (
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
                {label}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Availability */}
      <FormField
        control={form.control}
        name="availability"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(language, 'availability_label')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t(language, 'availability_placeholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="any">{t(language, 'availability_any')}</SelectItem>
                <SelectItem value="immediately">{t(language, 'availability_immediately')}</SelectItem>
                <SelectItem value="1month">{t(language, 'availability_1month')}</SelectItem>
                <SelectItem value="3months">{t(language, 'availability_3months')}</SelectItem>
                <SelectItem value="specific">{t(language, 'availability_specific')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
