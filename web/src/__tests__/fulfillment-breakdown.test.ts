import { describe, it, expect } from 'vitest'
import {
  getFulfillmentStatus,
  deriveFulfillmentChecklist,
  getImportanceBadge,
  type CriterionResult,
} from '@/lib/fulfillment-utils'

describe('getFulfillmentStatus', () => {
  it('returns "met" for fulfillment >= 0.7', () => {
    expect(getFulfillmentStatus(0.8)).toBe('met')
    expect(getFulfillmentStatus(0.95)).toBe('met')
    expect(getFulfillmentStatus(1.0)).toBe('met')
  })

  it('returns "met" at the 0.7 boundary', () => {
    expect(getFulfillmentStatus(0.7)).toBe('met')
  })

  it('returns "partial" for fulfillment >= 0.3 and < 0.7', () => {
    expect(getFulfillmentStatus(0.5)).toBe('partial')
    expect(getFulfillmentStatus(0.45)).toBe('partial')
    expect(getFulfillmentStatus(0.69)).toBe('partial')
  })

  it('returns "partial" at the 0.3 boundary', () => {
    expect(getFulfillmentStatus(0.3)).toBe('partial')
  })

  it('returns "not-met" for fulfillment < 0.3', () => {
    expect(getFulfillmentStatus(0.1)).toBe('not-met')
    expect(getFulfillmentStatus(0.0)).toBe('not-met')
    expect(getFulfillmentStatus(0.29)).toBe('not-met')
  })

  it('returns "unknown" for null', () => {
    expect(getFulfillmentStatus(null)).toBe('unknown')
  })

  it('returns "unknown" for undefined', () => {
    expect(getFulfillmentStatus(undefined)).toBe('unknown')
  })
})

describe('deriveFulfillmentChecklist', () => {
  const mockCriteria: CriterionResult[] = [
    { criterion_name: 'Budget', fulfillment: 0.85, importance: 'critical', weight: 5, reasoning: 'Within budget range' },
    { criterion_name: 'Near transit', fulfillment: 0.5, importance: 'high', weight: 3, reasoning: 'Bus stop nearby but not tram' },
    { criterion_name: 'Has balcony', fulfillment: 0.1, importance: 'medium', weight: 2, reasoning: 'No balcony listed' },
    { criterion_name: 'Pet-friendly', fulfillment: null, importance: 'low', weight: 1, reasoning: null },
  ]

  it('maps criteria to ChecklistItem[] with correct met values', () => {
    const result = deriveFulfillmentChecklist(mockCriteria)

    // Budget: 0.85 >= 0.7 -> met=true
    const budget = result.find(item => item.criterion === 'Budget')
    expect(budget?.met).toBe(true)

    // Near transit: 0.5 in [0.3, 0.7) -> met="partial"
    const transit = result.find(item => item.criterion === 'Near transit')
    expect(transit?.met).toBe('partial')

    // Has balcony: 0.1 < 0.3 -> met=false
    const balcony = result.find(item => item.criterion === 'Has balcony')
    expect(balcony?.met).toBe(false)
  })

  it('sets met=null for null-fulfillment criteria', () => {
    const result = deriveFulfillmentChecklist(mockCriteria)
    const pet = result.find(item => item.criterion === 'Pet-friendly')
    expect(pet?.met).toBeNull()
  })

  it('maps criterion_name to criterion field', () => {
    const result = deriveFulfillmentChecklist(mockCriteria)
    expect(result[0].criterion).toBe('Budget')
    expect(result[1].criterion).toBe('Near transit')
  })

  it('maps reasoning to note field, defaulting to empty string', () => {
    const result = deriveFulfillmentChecklist(mockCriteria)
    expect(result[0].note).toBe('Within budget range')
    const pet = result.find(item => item.criterion === 'Pet-friendly')
    expect(pet?.note).toBe('')
  })

  it('handles empty criteria array', () => {
    const result = deriveFulfillmentChecklist([])
    expect(result).toEqual([])
  })
})

describe('getImportanceBadge', () => {
  it('returns Critical with destructive variant', () => {
    const result = getImportanceBadge('critical')
    expect(result).toEqual({ label: 'Critical', variant: 'destructive' })
  })

  it('returns High with default variant', () => {
    const result = getImportanceBadge('high')
    expect(result).toEqual({ label: 'High', variant: 'default' })
  })

  it('returns Medium with secondary variant', () => {
    const result = getImportanceBadge('medium')
    expect(result).toEqual({ label: 'Medium', variant: 'secondary' })
  })

  it('returns Low with outline variant', () => {
    const result = getImportanceBadge('low')
    expect(result).toEqual({ label: 'Low', variant: 'outline' })
  })

  it('handles uppercase importance strings', () => {
    const result = getImportanceBadge('CRITICAL')
    expect(result).toEqual({ label: 'Critical', variant: 'destructive' })
  })

  it('returns raw string as label for unknown importance', () => {
    const result = getImportanceBadge('extreme')
    expect(result).toEqual({ label: 'extreme', variant: 'outline' })
  })
})
