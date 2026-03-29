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
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

interface DynamicFieldsSectionProps {
  form: UseFormReturn<Preferences>
}

export function DynamicFieldsSection({ form }: DynamicFieldsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'dynamicFields',
  })
  const { language } = useLanguage()

  const importanceOptions = [
    { value: 'critical', label: t(language, 'importance_critical') },
    { value: 'high', label: t(language, 'importance_high') },
    { value: 'medium', label: t(language, 'importance_medium') },
    { value: 'low', label: t(language, 'importance_low') },
  ] as const

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t(language, 'custom_criteria_label')}</label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          {t(language, 'custom_criteria_hint')}
        </p>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <Input
                {...form.register(`dynamicFields.${index}.name`)}
                placeholder={t(language, 'criterion_name_placeholder')}
                className="flex-1"
              />
              <Input
                {...form.register(`dynamicFields.${index}.value`)}
                placeholder={t(language, 'criterion_details_placeholder')}
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
                  <SelectValue placeholder={t(language, 'importance_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {importanceOptions.map((opt) => (
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
          {t(language, 'add_criterion')}
        </Button>
      </div>
    </div>
  )
}
