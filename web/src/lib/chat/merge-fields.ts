import type { DynamicField } from '@/lib/schemas/preferences'

/**
 * Merge extracted dynamic fields with existing ones.
 * Simple append strategy: returns [...existing, ...extracted].
 *
 * The complexity of replace-vs-append on re-extraction is handled
 * at the call site, not here. This utility is a pure append.
 */
export function mergeExtractedFields(
  existing: DynamicField[],
  extracted: DynamicField[],
): DynamicField[] {
  return [...existing, ...extracted]
}
