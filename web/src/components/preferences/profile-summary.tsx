'use client'

import { type UseFormReturn } from 'react-hook-form'
import { type Preferences } from '@/lib/schemas/preferences'
import { generateProfileSummary } from '@/lib/profile-summary'

interface ProfileSummaryProps {
  form: UseFormReturn<Preferences>
}

export function ProfileSummary({ form }: ProfileSummaryProps) {
  const watched = form.watch()
  const summary = generateProfileSummary(watched)

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Profile Summary
      </h3>
      <p className="text-sm italic text-foreground/80">
        {summary}
      </p>
    </div>
  )
}
