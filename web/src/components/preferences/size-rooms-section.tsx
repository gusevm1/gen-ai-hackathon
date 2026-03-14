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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface SizeRoomsSectionProps {
  form: UseFormReturn<Preferences>
}

export function SizeRoomsSection({ form }: SizeRoomsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Rooms Range */}
      <div>
        <label className="text-sm font-medium">Rooms</label>
        <div className="flex gap-4 mt-2">
          <FormField
            control={form.control}
            name="roomsMin"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Min rooms"
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
            name="roomsMax"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Max rooms"
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

      {/* Rooms Dealbreaker */}
      <FormField
        control={form.control}
        name="roomsDealbreaker"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="rooms-dealbreaker"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-labelledby="rooms-dealbreaker-label"
            />
            <label
              id="rooms-dealbreaker-label"
              htmlFor="rooms-dealbreaker"
              className="text-sm cursor-pointer select-none"
              onClick={() => field.onChange(!field.value)}
            >
              Hard limit — score 0 if below minimum rooms
            </label>
          </div>
        )}
      />

      {/* Living Space Range */}
      <div>
        <label className="text-sm font-medium">Living Space (sqm)</label>
        <div className="flex gap-4 mt-2">
          <FormField
            control={form.control}
            name="livingSpaceMin"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Min sqm"
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
            name="livingSpaceMax"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Max sqm"
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

      {/* Living Space Dealbreaker */}
      <FormField
        control={form.control}
        name="livingSpaceDealbreaker"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="living-space-dealbreaker"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-labelledby="living-space-dealbreaker-label"
            />
            <label
              id="living-space-dealbreaker-label"
              htmlFor="living-space-dealbreaker"
              className="text-sm cursor-pointer select-none"
              onClick={() => field.onChange(!field.value)}
            >
              Hard limit — score 0 if below minimum space
            </label>
          </div>
        )}
      />

      {/* Floor Preference */}
      <FormField
        control={form.control}
        name="floorPreference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Floor Preference</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="floor-any" />
                  <label htmlFor="floor-any" className="text-sm cursor-pointer">
                    Any floor
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ground" id="floor-ground" />
                  <label htmlFor="floor-ground" className="text-sm cursor-pointer">
                    Ground floor only
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_ground" id="floor-not-ground" />
                  <label htmlFor="floor-not-ground" className="text-sm cursor-pointer">
                    Not ground floor
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
