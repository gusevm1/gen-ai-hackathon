import { z } from 'zod';

export const SoftCriterionSchema = z.object({
  id: z.string(),
  category: z.string(),
  text: z.string(),
  isCustom: z.boolean().default(false),
});

export const WeightsSchema = z.record(z.string(), z.number().min(0).max(100));

export const PreferenceProfileSchema = z.object({
  schemaVersion: z.literal(1),

  // Step 1: Standard filters (all optional -- user fills what they care about)
  listingType: z.enum(['rent', 'buy']).optional(),
  location: z.string().optional(),
  radiusKm: z.number().min(0).max(50).optional(),
  propertyCategory: z
    .enum([
      'Apartment and house',
      'Apartment',
      'House, chalet, rustico',
      'Furnished dwelling',
      'Parking space, garage',
      'Office',
      'Commercial and industry',
      'Storage room',
    ])
    .optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  onlyWithPrice: z.boolean().optional(),
  roomsMin: z.number().min(0).optional(),
  roomsMax: z.number().min(0).optional(),
  livingSpaceMin: z.number().min(0).optional(),
  livingSpaceMax: z.number().min(0).optional(),
  yearBuiltMin: z.number().optional(),
  yearBuiltMax: z.number().optional(),
  floorPreference: z.enum(['any', 'on_gf', 'not_on_gf']).optional(),
  availability: z
    .enum([
      'any',
      'immediately',
      '1m',
      '2m',
      '3m',
      '4m',
      '5m',
      '6m',
      '7m',
      '8m',
      '9m',
      '10m',
      '11m',
      '12m',
    ])
    .optional(),
  features: z
    .array(
      z.enum([
        'Balcony / terrace',
        'Elevator',
        'New building',
        'Old building',
        'Swimming pool',
        'Pets allowed',
        'Wheelchair access',
        'Parking space / garage',
        'Minergie',
      ]),
    )
    .optional(),
  free_text_search: z.string().default(''),

  // Step 2: Soft criteria
  softCriteria: z.array(SoftCriterionSchema).default([]),

  // Step 3: Weights
  weightInputs: WeightsSchema.default({}),
  weights: WeightsSchema.default({}),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PreferenceProfile = z.infer<typeof PreferenceProfileSchema>;
export type SoftCriterion = z.infer<typeof SoftCriterionSchema>;

// Step-specific sub-schemas for form validation
export const StepFiltersSchema = PreferenceProfileSchema.pick({
  listingType: true,
  location: true,
  radiusKm: true,
  propertyCategory: true,
  priceMin: true,
  priceMax: true,
  onlyWithPrice: true,
  roomsMin: true,
  roomsMax: true,
  livingSpaceMin: true,
  livingSpaceMax: true,
  yearBuiltMin: true,
  yearBuiltMax: true,
  floorPreference: true,
  availability: true,
  features: true,
  free_text_search: true,
});

export type StepFiltersData = z.infer<typeof StepFiltersSchema>;

export const StepSoftCriteriaSchema = PreferenceProfileSchema.pick({
  softCriteria: true,
});

export type StepSoftCriteriaData = z.infer<typeof StepSoftCriteriaSchema>;
