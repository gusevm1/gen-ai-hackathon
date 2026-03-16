import { describe, it, expect } from 'vitest'
import { mergeExtractedFields } from '@/lib/chat/merge-fields'
import type { DynamicField } from '@/lib/schemas/preferences'

describe('mergeExtractedFields', () => {
  it('appends new fields to empty existing array', () => {
    const existing: DynamicField[] = []
    const extracted: DynamicField[] = [
      { name: 'Quiet area', value: 'low traffic noise', importance: 'high' },
      { name: 'Balcony', value: 'south-facing preferred', importance: 'medium' },
    ]
    const result = mergeExtractedFields(existing, extracted)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Quiet area')
    expect(result[1].name).toBe('Balcony')
  })

  it('appends new fields to non-empty existing array', () => {
    const existing: DynamicField[] = [
      { name: 'Pet-friendly', value: 'cats allowed', importance: 'critical' },
    ]
    const extracted: DynamicField[] = [
      { name: 'Near transport', value: 'within 500m', importance: 'high' },
    ]
    const result = mergeExtractedFields(existing, extracted)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Pet-friendly')
    expect(result[1].name).toBe('Near transport')
  })

  it('does not modify standard fields (location, budget, etc.)', () => {
    // mergeExtractedFields only deals with DynamicField arrays,
    // so it inherently does not touch standard form fields
    const existing: DynamicField[] = [
      { name: 'Good light', value: 'morning sun', importance: 'medium' },
    ]
    const extracted: DynamicField[] = [
      { name: 'Storage', value: 'cellar needed', importance: 'low' },
    ]
    const result = mergeExtractedFields(existing, extracted)
    // Only dynamic fields in, only dynamic fields out
    expect(result).toHaveLength(2)
    expect(result.every((f) => 'name' in f && 'value' in f && 'importance' in f)).toBe(true)
  })

  it('handles duplicate field names (allows duplicates -- simple append)', () => {
    const existing: DynamicField[] = [
      { name: 'Parking', value: 'outdoor', importance: 'medium' },
    ]
    const extracted: DynamicField[] = [
      { name: 'Parking', value: 'underground preferred', importance: 'high' },
    ]
    const result = mergeExtractedFields(existing, extracted)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('outdoor')
    expect(result[1].value).toBe('underground preferred')
  })

  it('with empty extracted array returns existing unchanged', () => {
    const existing: DynamicField[] = [
      { name: 'View', value: 'lake view', importance: 'high' },
    ]
    const result = mergeExtractedFields(existing, [])
    expect(result).toEqual(existing)
    expect(result).toHaveLength(1)
  })
})
