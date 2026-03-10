import { z } from 'zod'

export const preferencesSchema = z.object({
  // Standard filters (PREF-01 through PREF-06)
  location: z.string().default(''),
  offerType: z.enum(['RENT', 'SALE']).default('RENT'),
  objectCategory: z.enum(['APARTMENT', 'HOUSE', 'ANY']).default('ANY'),
  budgetMin: z.number().nullable().default(null),
  budgetMax: z.number().nullable().default(null),
  roomsMin: z.number().nullable().default(null),
  roomsMax: z.number().nullable().default(null),
  livingSpaceMin: z.number().nullable().default(null),
  livingSpaceMax: z.number().nullable().default(null),
  // Soft criteria (PREF-07 and PREF-08)
  softCriteria: z.array(z.string()).default([]),
  selectedFeatures: z.array(z.string()).default([]),
  // Weights (PREF-09) - 0 to 100, default 50
  weights: z.object({
    location: z.number().min(0).max(100).default(50),
    price: z.number().min(0).max(100).default(50),
    size: z.number().min(0).max(100).default(50),
    features: z.number().min(0).max(100).default(50),
    condition: z.number().min(0).max(100).default(50),
  }).default({
    location: 50,
    price: 50,
    size: 50,
    features: 50,
    condition: 50,
  }),
})

export type Preferences = z.infer<typeof preferencesSchema>
