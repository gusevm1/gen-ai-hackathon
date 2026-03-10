import { describe, it, expect } from 'vitest'
import { preferencesSchema } from '@/lib/schemas/preferences'

describe('preferencesSchema', () => {
  it('returns all defaults when parsing empty object', () => {
    const result = preferencesSchema.parse({})

    expect(result.location).toBe('')
    expect(result.offerType).toBe('RENT')
    expect(result.objectCategory).toBe('ANY')
    expect(result.budgetMin).toBeNull()
    expect(result.budgetMax).toBeNull()
    expect(result.roomsMin).toBeNull()
    expect(result.roomsMax).toBeNull()
    expect(result.livingSpaceMin).toBeNull()
    expect(result.livingSpaceMax).toBeNull()
    expect(result.softCriteria).toEqual([])
    expect(result.selectedFeatures).toEqual([])
    expect(result.weights.location).toBe(50)
    expect(result.weights.price).toBe(50)
    expect(result.weights.size).toBe(50)
    expect(result.weights.features).toBe(50)
    expect(result.weights.condition).toBe(50)
  })

  it('round-trips valid data correctly', () => {
    const input = {
      location: 'Zurich',
      offerType: 'SALE' as const,
      objectCategory: 'APARTMENT' as const,
      budgetMin: 500000,
      budgetMax: 1000000,
      roomsMin: 3,
      roomsMax: 5,
      livingSpaceMin: 80,
      livingSpaceMax: 150,
      softCriteria: ['near Bahnhof', 'quiet neighborhood'],
      selectedFeatures: ['balconygarden', 'lift'],
      weights: {
        location: 80,
        price: 60,
        size: 70,
        features: 40,
        condition: 30,
      },
    }

    const result = preferencesSchema.parse(input)

    expect(result.location).toBe('Zurich')
    expect(result.offerType).toBe('SALE')
    expect(result.objectCategory).toBe('APARTMENT')
    expect(result.budgetMin).toBe(500000)
    expect(result.budgetMax).toBe(1000000)
    expect(result.roomsMin).toBe(3)
    expect(result.roomsMax).toBe(5)
    expect(result.livingSpaceMin).toBe(80)
    expect(result.livingSpaceMax).toBe(150)
    expect(result.softCriteria).toEqual(['near Bahnhof', 'quiet neighborhood'])
    expect(result.selectedFeatures).toEqual(['balconygarden', 'lift'])
    expect(result.weights.location).toBe(80)
    expect(result.weights.price).toBe(60)
    expect(result.weights.size).toBe(70)
    expect(result.weights.features).toBe(40)
    expect(result.weights.condition).toBe(30)
  })

  it('rejects invalid offerType', () => {
    expect(() =>
      preferencesSchema.parse({ offerType: 'LEASE' })
    ).toThrow()
  })

  it('rejects weights outside 0-100 range', () => {
    expect(() =>
      preferencesSchema.parse({
        weights: { location: 150, price: 50, size: 50, features: 50, condition: 50 },
      })
    ).toThrow()

    expect(() =>
      preferencesSchema.parse({
        weights: { location: -10, price: 50, size: 50, features: 50, condition: 50 },
      })
    ).toThrow()
  })

  it('defaults softCriteria to empty array', () => {
    const result = preferencesSchema.parse({})
    expect(result.softCriteria).toEqual([])
    expect(Array.isArray(result.softCriteria)).toBe(true)
  })

  it('defaults selectedFeatures to empty array', () => {
    const result = preferencesSchema.parse({})
    expect(result.selectedFeatures).toEqual([])
    expect(Array.isArray(result.selectedFeatures)).toBe(true)
  })

  it('accepts null for nullable number fields', () => {
    const result = preferencesSchema.parse({
      budgetMin: null,
      budgetMax: null,
      roomsMin: null,
      roomsMax: null,
      livingSpaceMin: null,
      livingSpaceMax: null,
    })

    expect(result.budgetMin).toBeNull()
    expect(result.budgetMax).toBeNull()
    expect(result.roomsMin).toBeNull()
    expect(result.roomsMax).toBeNull()
    expect(result.livingSpaceMin).toBeNull()
    expect(result.livingSpaceMax).toBeNull()
  })

  it('rejects invalid objectCategory', () => {
    expect(() =>
      preferencesSchema.parse({ objectCategory: 'VILLA' })
    ).toThrow()
  })
})
