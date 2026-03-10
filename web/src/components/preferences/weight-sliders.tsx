'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Slider } from '@/components/ui/slider'

interface WeightSlidersProps {
  form: UseFormReturn<Preferences>
}

const WEIGHT_CATEGORIES = [
  { name: 'weights.location' as const, label: 'Location' },
  { name: 'weights.price' as const, label: 'Price & Budget' },
  { name: 'weights.size' as const, label: 'Size & Rooms' },
  { name: 'weights.features' as const, label: 'Features & Amenities' },
  { name: 'weights.condition' as const, label: 'Condition & Age' },
] as const

export function WeightSliders({ form }: WeightSlidersProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Adjust how important each category is when scoring listings (0 = not important, 100 = very important)
      </p>
      {WEIGHT_CATEGORIES.map((category) => (
        <FormField
          key={category.name}
          control={form.control}
          name={category.name}
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>{category.label}</FormLabel>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {field.value}
                </span>
              </div>
              <FormControl>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[field.value as number]}
                  onValueChange={(val) => {
                    const numVal = Array.isArray(val) ? val[0] : val
                    field.onChange(numVal)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  )
}
