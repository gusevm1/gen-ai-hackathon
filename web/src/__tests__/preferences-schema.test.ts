import { describe, it, expect } from 'vitest'
import { preferencesSchema } from '@/lib/schemas/preferences'

describe('preferencesSchema', () => {
  it('returns all defaults when parsing empty object', () => {
    const result = preferencesSchema.parse({})

    // Standard filters
    expect(result.location).toBe('')
    expect(result.offerType).toBe('RENT')
    expect(result.objectCategory).toBe('ANY')
    expect(result.budgetMin).toBeNull()
    expect(result.budgetMax).toBeNull()
    expect(result.roomsMin).toBeNull()
    expect(result.roomsMax).toBeNull()
    expect(result.livingSpaceMin).toBeNull()
    expect(result.livingSpaceMax).toBeNull()

    // Soft criteria and features
    expect(result.softCriteria).toEqual([])
    expect(result.features).toEqual([])

    // Dealbreaker toggles
    expect(result.budgetDealbreaker).toBe(false)
    expect(result.roomsDealbreaker).toBe(false)
    expect(result.livingSpaceDealbreaker).toBe(false)

    // New fields
    expect(result.floorPreference).toBe('any')
    expect(result.availability).toBe('any')
    expect(result.language).toBe('de')

    // Importance levels default to medium
    expect(result.importance.location).toBe('medium')
    expect(result.importance.price).toBe('medium')
    expect(result.importance.size).toBe('medium')
    expect(result.importance.features).toBe('medium')
    expect(result.importance.condition).toBe('medium')
  })

  it('round-trips valid data correctly', () => {
    const input = {
      location: 'Zurich',
      offerType: 'SALE' as const,
      objectCategory: 'APARTMENT' as const,
      budgetMin: 500000,
      budgetMax: 1000000,
      budgetDealbreaker: true,
      roomsMin: 3,
      roomsMax: 5,
      roomsDealbreaker: false,
      livingSpaceMin: 80,
      livingSpaceMax: 150,
      livingSpaceDealbreaker: true,
      floorPreference: 'not_ground' as const,
      availability: 'immediately',
      softCriteria: ['near Bahnhof', 'quiet neighborhood'],
      features: ['balconygarden', 'lift'],
      importance: {
        location: 'critical' as const,
        price: 'high' as const,
        size: 'medium' as const,
        features: 'low' as const,
        condition: 'high' as const,
      },
      language: 'en' as const,
    }

    const result = preferencesSchema.parse(input)

    expect(result.location).toBe('Zurich')
    expect(result.offerType).toBe('SALE')
    expect(result.objectCategory).toBe('APARTMENT')
    expect(result.budgetMin).toBe(500000)
    expect(result.budgetMax).toBe(1000000)
    expect(result.budgetDealbreaker).toBe(true)
    expect(result.roomsMin).toBe(3)
    expect(result.roomsMax).toBe(5)
    expect(result.roomsDealbreaker).toBe(false)
    expect(result.livingSpaceMin).toBe(80)
    expect(result.livingSpaceMax).toBe(150)
    expect(result.livingSpaceDealbreaker).toBe(true)
    expect(result.floorPreference).toBe('not_ground')
    expect(result.availability).toBe('immediately')
    expect(result.softCriteria).toEqual(['near Bahnhof', 'quiet neighborhood'])
    expect(result.features).toEqual(['balconygarden', 'lift'])
    expect(result.importance.location).toBe('critical')
    expect(result.importance.price).toBe('high')
    expect(result.importance.size).toBe('medium')
    expect(result.importance.features).toBe('low')
    expect(result.importance.condition).toBe('high')
    expect(result.language).toBe('en')
  })

  it('rejects invalid offerType', () => {
    expect(() =>
      preferencesSchema.parse({ offerType: 'LEASE' })
    ).toThrow()
  })

  it('rejects invalid objectCategory', () => {
    expect(() =>
      preferencesSchema.parse({ objectCategory: 'VILLA' })
    ).toThrow()
  })

  it('rejects invalid importance level', () => {
    expect(() =>
      preferencesSchema.parse({
        importance: { location: 'urgent', price: 'medium', size: 'medium', features: 'medium', condition: 'medium' },
      })
    ).toThrow()
  })

  it('defaults softCriteria to empty array', () => {
    const result = preferencesSchema.parse({})
    expect(result.softCriteria).toEqual([])
    expect(Array.isArray(result.softCriteria)).toBe(true)
  })

  it('defaults features to empty array', () => {
    const result = preferencesSchema.parse({})
    expect(result.features).toEqual([])
    expect(Array.isArray(result.features)).toBe(true)
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

  it('partial importance object defaults missing fields to medium', () => {
    const result = preferencesSchema.parse({
      importance: { location: 'critical' },
    })

    expect(result.importance.location).toBe('critical')
    expect(result.importance.price).toBe('medium')
    expect(result.importance.size).toBe('medium')
    expect(result.importance.features).toBe('medium')
    expect(result.importance.condition).toBe('medium')
  })

  it('rejects invalid floorPreference', () => {
    expect(() =>
      preferencesSchema.parse({ floorPreference: 'top_floor' })
    ).toThrow()
  })
})
