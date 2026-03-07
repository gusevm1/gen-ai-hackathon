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
  radiusKm: z.number().min(0).max(100).optional(),
  propertyTypes: z.array(z.string()).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  roomsMin: z.number().min(0).optional(),
  roomsMax: z.number().min(0).optional(),
  livingSpaceMin: z.number().min(0).optional(),
  livingSpaceMax: z.number().min(0).optional(),
  yearBuiltMin: z.number().optional(),
  yearBuiltMax: z.number().optional(),
  floorPreference: z.string().optional(),
  availability: z.string().optional(),
  features: z.array(z.string()).optional(),

  // Step 2: Soft criteria
  softCriteria: z.array(SoftCriterionSchema).default([]),

  // Step 3: Weights
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
  propertyTypes: true,
  priceMin: true,
  priceMax: true,
  roomsMin: true,
  roomsMax: true,
  livingSpaceMin: true,
  livingSpaceMax: true,
  yearBuiltMin: true,
  yearBuiltMax: true,
  floorPreference: true,
  availability: true,
  features: true,
});

export type StepFiltersData = z.infer<typeof StepFiltersSchema>;

export const StepSoftCriteriaSchema = PreferenceProfileSchema.pick({
  softCriteria: true,
});

export type StepSoftCriteriaData = z.infer<typeof StepSoftCriteriaSchema>;
