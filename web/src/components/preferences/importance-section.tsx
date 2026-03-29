'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { useLanguage } from '@/lib/language-context'
import { t, type TranslationKey } from '@/lib/translations'

interface ImportanceSectionProps {
  form: UseFormReturn<Preferences>
}

const IMPORTANCE_CATEGORIES: { name: 'importance.location' | 'importance.price' | 'importance.size' | 'importance.features' | 'importance.condition'; labelKey: TranslationKey }[] = [
  { name: 'importance.location', labelKey: 'importance_location' },
  { name: 'importance.price', labelKey: 'importance_price' },
  { name: 'importance.size', labelKey: 'importance_size' },
  { name: 'importance.features', labelKey: 'importance_features' },
  { name: 'importance.condition', labelKey: 'importance_condition' },
]

const IMPORTANCE_LEVEL_KEYS: { value: 'low' | 'medium' | 'high' | 'critical'; labelKey: TranslationKey }[] = [
  { value: 'low', labelKey: 'importance_low' },
  { value: 'medium', labelKey: 'importance_medium' },
  { value: 'high', labelKey: 'importance_high' },
  { value: 'critical', labelKey: 'importance_critical' },
]

export function ImportanceSection({ form }: ImportanceSectionProps) {
  const { language } = useLanguage()

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t(language, 'importance_section_hint')}
      </p>
      {IMPORTANCE_CATEGORIES.map((category) => (
        <FormField
          key={category.name}
          control={form.control}
          name={category.name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(language, category.labelKey)}</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  {IMPORTANCE_LEVEL_KEYS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => field.onChange(level.value)}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        field.value === level.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {t(language, level.labelKey)}
                    </button>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  )
}
