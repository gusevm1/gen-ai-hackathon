'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { Preferences } from '@/lib/schemas/preferences'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

interface BudgetSectionProps {
  form: UseFormReturn<Preferences>
}

export function BudgetSection({ form }: BudgetSectionProps) {
  return (
    <div className="space-y-4">
      {/* Budget Range */}
      <div>
        <label className="text-sm font-medium">Budget (CHF)</label>
        <div className="flex gap-4 mt-2">
          <FormField
            control={form.control}
            name="budgetMin"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Min CHF"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? null : Number(val))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budgetMax"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Max CHF"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? null : Number(val))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Budget Dealbreaker */}
      <FormField
        control={form.control}
        name="budgetDealbreaker"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="budget-dealbreaker"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-labelledby="budget-dealbreaker-label"
            />
            <label
              id="budget-dealbreaker-label"
              htmlFor="budget-dealbreaker"
              className="text-sm cursor-pointer select-none"
              onClick={() => field.onChange(!field.value)}
            >
              Hard limit — score 0 if over budget
            </label>
          </div>
        )}
      />
    </div>
  )
}
