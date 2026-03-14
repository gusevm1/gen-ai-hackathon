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
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LocationTypeSectionProps {
  form: UseFormReturn<Preferences>
}

export function LocationTypeSection({ form }: LocationTypeSectionProps) {
  return (
    <div className="space-y-6">
      {/* Location */}
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Zurich, Basel" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Offer Type (Buy/Rent) */}
      <FormField
        control={form.control}
        name="offerType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Offer Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="RENT" id="offer-rent" />
                  <label htmlFor="offer-rent" className="text-sm cursor-pointer">
                    Rent
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SALE" id="offer-sale" />
                  <label htmlFor="offer-sale" className="text-sm cursor-pointer">
                    Buy
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Property Type */}
      <FormField
        control={form.control}
        name="objectCategory"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                <SelectItem value="APARTMENT">Apartment</SelectItem>
                <SelectItem value="HOUSE">House</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
