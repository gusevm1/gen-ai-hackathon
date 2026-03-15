'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'

interface DynamicFieldsSectionProps {
  form: UseFormReturn<Preferences>
}

const IMPORTANCE_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const

export function DynamicFieldsSection({ form }: DynamicFieldsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'dynamicFields',
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Custom Criteria</label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Add any additional preferences with importance levels
        </p>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <Input
                {...form.register(`dynamicFields.${index}.name`)}
                placeholder="Criterion name"
                className="flex-1"
              />
              <Input
                {...form.register(`dynamicFields.${index}.value`)}
                placeholder="Details (optional)"
                className="flex-1"
              />
              <Select
                value={form.watch(`dynamicFields.${index}.importance`)}
                onValueChange={(val) =>
                  form.setValue(`dynamicFields.${index}.importance`, val as 'critical' | 'high' | 'medium' | 'low', {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Importance" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
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
          onClick={() => append({ name: '', value: '', importance: 'medium' })}
          className="mt-3"
        >
          + Add Criterion
        </Button>
      </div>
    </div>
  )
}
