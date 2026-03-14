'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'

interface ImportanceSectionProps {
  form: UseFormReturn<Preferences>
}

const IMPORTANCE_CATEGORIES = [
  { name: 'importance.location' as const, label: 'Location' },
  { name: 'importance.price' as const, label: 'Price & Budget' },
  { name: 'importance.size' as const, label: 'Size & Rooms' },
  { name: 'importance.features' as const, label: 'Features & Amenities' },
  { name: 'importance.condition' as const, label: 'Condition & Age' },
] as const

const IMPORTANCE_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const

export function ImportanceSection({ form }: ImportanceSectionProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Set how important each category is when scoring listings
      </p>
      {IMPORTANCE_CATEGORIES.map((category) => (
        <FormField
          key={category.name}
          control={form.control}
          name={category.name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{category.label}</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  {IMPORTANCE_LEVELS.map((level) => (
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
                      {level.label}
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
