import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'

/**
 * Maps backend extracted_preferences (from POST /chat response) into a validated
 * Preferences object. The backend already does snake_case->camelCase mapping,
 * so this function primarily validates and fills defaults via Zod schema.
 */
export function mapExtractedPreferences(extracted: Record<string, unknown>): Preferences {
  // The backend's map_extracted_to_user_preferences already produces camelCase keys
  // matching the Preferences schema. We pass through preferencesSchema.parse() to:
  // 1. Validate types
  // 2. Fill any missing optional fields with defaults
  // 3. Ensure importance sub-object gets all 5 keys defaulted
  return preferencesSchema.parse(extracted)
}
