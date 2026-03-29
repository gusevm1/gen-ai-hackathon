import { z } from 'zod'

/** Importance level for scoring categories. */
export const importanceLevelSchema = z
  .enum(['critical', 'high', 'medium', 'low'])
  .default('medium')

/** Criterion type assigned by the classifier at profile save time. */
export const criterionTypeSchema = z.enum([
  'distance',
  'price',
  'size',
  'binary_feature',
  'proximity_quality',
  'subjective',
]).optional()

export type CriterionType = z.infer<typeof criterionTypeSchema>

/** A single dynamic preference field with name, value, and importance. */
export const dynamicFieldSchema = z.object({
  name: z.string().min(1),
  value: z.string().default(''),
  importance: importanceLevelSchema,
  criterionType: criterionTypeSchema,
})

/** Inferred DynamicField type. */
export type DynamicField = z.infer<typeof dynamicFieldSchema>

/** Category importance levels (replaces numeric 0-100 weights). */
const importanceSchema = z
  .object({
    location: importanceLevelSchema,
    price: importanceLevelSchema,
    size: importanceLevelSchema,
    features: importanceLevelSchema,
    condition: importanceLevelSchema,
  })
  .default({
    location: 'medium',
    price: 'medium',
    size: 'medium',
    features: 'medium',
    condition: 'medium',
  })

export const preferencesSchema = z.object({
  // Standard filters (PREF-01 through PREF-06)
  location: z.string().default(''),
  offerType: z.enum(['RENT', 'SALE']).default('RENT'),
  objectCategory: z.enum(['APARTMENT', 'HOUSE', 'ANY']).default('ANY'),

  // Numeric ranges
  budgetMin: z.number().nullable().default(null),
  budgetMax: z.number().nullable().default(null),
  roomsMin: z.number().nullable().default(null),
  roomsMax: z.number().nullable().default(null),
  livingSpaceMin: z.number().nullable().default(null),
  livingSpaceMax: z.number().nullable().default(null),

  // Dealbreaker toggles -- when true, violating the range yields score 0
  budgetDealbreaker: z.boolean().default(false),
  roomsDealbreaker: z.boolean().default(false),
  livingSpaceDealbreaker: z.boolean().default(false),

  // Additional filters
  floorPreference: z.enum(['any', 'ground', 'not_ground']).default('any'),
  availability: z.string().default('any'),
  features: z.array(z.string()).default([]),

  // Soft criteria (free text tags -- legacy, migrated to dynamicFields at load time)
  softCriteria: z.array(z.string()).default([]),

  // Dynamic fields with importance (replaces softCriteria)
  dynamicFields: z.array(dynamicFieldSchema).default([]),

  // Category importance (replaces weights)
  importance: importanceSchema,

  // Language preference -- tightened to Swiss national languages
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
})

export type Preferences = z.infer<typeof preferencesSchema>

/**
 * Pre-parse migration: converts legacy softCriteria strings to structured
 * dynamicFields objects with importance='medium'. Call before preferencesSchema.parse().
 *
 * Only migrates when dynamicFields key is absent (avoids double migration).
 * Filters out empty/whitespace-only strings.
 */
export function migratePreferences(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  if (
    raw.softCriteria &&
    Array.isArray(raw.softCriteria) &&
    !raw.dynamicFields
  ) {
    raw.dynamicFields = (raw.softCriteria as string[])
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => ({ name: s, value: '', importance: 'medium' as const }))
  }
  return raw
}
