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
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

interface LocationTypeSectionProps {
  form: UseFormReturn<Preferences>
}

export function LocationTypeSection({ form }: LocationTypeSectionProps) {
  const { language } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Location */}
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(language, 'location_label')}</FormLabel>
            <FormControl>
              <Input placeholder={t(language, 'location_placeholder')} {...field} />
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
            <FormLabel>{t(language, 'offer_type_label')}</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="RENT" id="offer-rent" />
                  <label htmlFor="offer-rent" className="text-sm cursor-pointer">
                    {t(language, 'offer_type_rent')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SALE" id="offer-sale" />
                  <label htmlFor="offer-sale" className="text-sm cursor-pointer">
                    {t(language, 'offer_type_buy')}
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
            <FormLabel>{t(language, 'property_type_label')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t(language, 'property_type_placeholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ANY">{t(language, 'property_type_any')}</SelectItem>
                <SelectItem value="APARTMENT">{t(language, 'property_type_apartment')}</SelectItem>
                <SelectItem value="HOUSE">{t(language, 'property_type_house')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
