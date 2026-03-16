import { describe, it, expect } from 'vitest'
import {
  extractedFieldSchema,
  extractionResultSchema,
} from '@/lib/chat/extraction-schema'

describe('extractedFieldSchema', () => {
  it('parses valid {name, value, importance} objects', () => {
    const input = { name: 'Near public transport', value: 'within 500m of train', importance: 'high' }
    const result = extractedFieldSchema.parse(input)
    expect(result).toEqual(input)
  })

  it('rejects empty name strings (min 1 char)', () => {
    const input = { name: '', value: 'some value', importance: 'medium' }
    expect(() => extractedFieldSchema.parse(input)).toThrow()
  })

  it('defaults importance to medium when omitted', () => {
    const input = { name: 'Quiet area', value: 'low noise' }
    const result = extractedFieldSchema.parse(input)
    expect(result.importance).toBe('medium')
  })

  it('rejects invalid enum values for importance', () => {
    const input = { name: 'Nice view', value: 'lake view', importance: 'super-important' }
    expect(() => extractedFieldSchema.parse(input)).toThrow()
  })
})

describe('extractionResultSchema', () => {
  it('parses {fields: [...]} with multiple entries', () => {
    const input = {
      fields: [
        { name: 'Balcony', value: 'south-facing', importance: 'critical' },
        { name: 'Pet-friendly', value: 'cats allowed', importance: 'high' },
        { name: 'Parking', value: 'underground', importance: 'low' },
      ],
    }
    const result = extractionResultSchema.parse(input)
    expect(result.fields).toHaveLength(3)
    expect(result.fields[0].name).toBe('Balcony')
    expect(result.fields[2].importance).toBe('low')
  })

  it('handles empty fields array', () => {
    const result = extractionResultSchema.parse({ fields: [] })
    expect(result.fields).toEqual([])
  })
})
