'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Check } from 'lucide-react'
import type { DynamicField } from '@/lib/schemas/preferences'

interface ExtractedFieldsReviewProps {
  fields: DynamicField[]
  onAccept: (fields: DynamicField[]) => void
  onCancel: () => void
}

const IMPORTANCE_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const

export function ExtractedFieldsReview({
  fields,
  onAccept,
  onCancel,
}: ExtractedFieldsReviewProps) {
  const [editableFields, setEditableFields] = useState<DynamicField[]>(
    () => fields.map((f) => ({ ...f }))
  )

  function updateField(index: number, key: keyof DynamicField, value: string) {
    setEditableFields((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, [key]: value } : f
      )
    )
  }

  function removeField(index: number) {
    setEditableFields((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAccept() {
    const filtered = editableFields.filter((f) => f.name.trim() !== '')
    onAccept(filtered)
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-sm">Extracted Preferences</h4>
        <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium size-5">
          {editableFields.length}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Review and edit before adding to your profile
      </p>

      <div className="space-y-2">
        {editableFields.map((field, index) => (
          <div key={index} className="flex gap-2 items-start">
            <Input
              value={field.name}
              onChange={(e) => updateField(index, 'name', e.target.value)}
              placeholder="Criterion name"
              className="flex-1"
            />
            <Input
              value={field.value}
              onChange={(e) => updateField(index, 'value', e.target.value)}
              placeholder="Details"
              className="flex-1"
            />
            <select
              value={field.importance}
              onChange={(e) => updateField(index, 'importance', e.target.value)}
              aria-label="Importance"
              className="h-9 w-[120px] rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {IMPORTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
              aria-label="Remove field"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleAccept} className="gap-2">
          <Check className="size-4" />
          Add to Profile
        </Button>
      </div>
    </div>
  )
}
