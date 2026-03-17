import { describe, it, expect } from 'vitest'
import { mapExtractedPreferences } from '@/lib/chat-preferences-mapper'

describe('mapExtractedPreferences', () => {
  it('converts a full extraction with all fields into a valid Preferences object', () => {
    const extracted = {
      location: 'Zurich',
      offerType: 'RENT',
      objectCategory: 'APARTMENT',
      budgetMin: 1000,
      budgetMax: 3000,
      roomsMin: 2,
      roomsMax: 4,
      livingSpaceMin: 50,
      livingSpaceMax: 100,
      budgetDealbreaker: true,
      roomsDealbreaker: false,
      livingSpaceDealbreaker: false,
      floorPreference: 'not_ground',
      availability: 'immediate',
      features: ['balcony', 'parking'],
      softCriteria: ['quiet neighborhood', 'close to public transport'],
      importance: {
        location: 'critical',
        price: 'high',
        size: 'medium',
        features: 'low',
        condition: 'medium',
      },
      language: 'de',
    }

    const result = mapExtractedPreferences(extracted)

    expect(result.location).toBe('Zurich')
    expect(result.offerType).toBe('RENT')
    expect(result.objectCategory).toBe('APARTMENT')
    expect(result.budgetMin).toBe(1000)
    expect(result.budgetMax).toBe(3000)
    expect(result.roomsMin).toBe(2)
    expect(result.roomsMax).toBe(4)
    expect(result.livingSpaceMin).toBe(50)
    expect(result.livingSpaceMax).toBe(100)
    expect(result.budgetDealbreaker).toBe(true)
    expect(result.roomsDealbreaker).toBe(false)
    expect(result.livingSpaceDealbreaker).toBe(false)
    expect(result.floorPreference).toBe('not_ground')
    expect(result.availability).toBe('immediate')
    expect(result.features).toEqual(['balcony', 'parking'])
    expect(result.softCriteria).toEqual(['quiet neighborhood', 'close to public transport'])
    expect(result.importance).toEqual({
      location: 'critical',
      price: 'high',
      size: 'medium',
      features: 'low',
      condition: 'medium',
    })
    expect(result.language).toBe('de')
  })

  it('fills defaults for empty/minimal extraction with only location', () => {
    const extracted = { location: 'Basel' }

    const result = mapExtractedPreferences(extracted)

    expect(result.location).toBe('Basel')
    expect(result.offerType).toBe('RENT')
    expect(result.objectCategory).toBe('ANY')
    expect(result.budgetMin).toBeNull()
    expect(result.budgetMax).toBeNull()
    expect(result.roomsMin).toBeNull()
    expect(result.roomsMax).toBeNull()
    expect(result.livingSpaceMin).toBeNull()
    expect(result.livingSpaceMax).toBeNull()
    expect(result.budgetDealbreaker).toBe(false)
    expect(result.roomsDealbreaker).toBe(false)
    expect(result.livingSpaceDealbreaker).toBe(false)
    expect(result.floorPreference).toBe('any')
    expect(result.availability).toBe('any')
    expect(result.features).toEqual([])
    expect(result.softCriteria).toEqual([])
    expect(result.language).toBe('de')
  })

  it('defaults remaining importance keys when only partial keys provided', () => {
    const extracted = {
      importance: { location: 'critical' },
    }

    const result = mapExtractedPreferences(extracted)

    expect(result.importance.location).toBe('critical')
    expect(result.importance.price).toBe('medium')
    expect(result.importance.size).toBe('medium')
    expect(result.importance.features).toBe('medium')
    expect(result.importance.condition).toBe('medium')
  })

  it('preserves null numeric fields after mapping', () => {
    const extracted = {
      budgetMin: null,
      budgetMax: 2000,
      roomsMin: null,
      roomsMax: null,
      livingSpaceMin: null,
      livingSpaceMax: 80,
    }

    const result = mapExtractedPreferences(extracted)

    expect(result.budgetMin).toBeNull()
    expect(result.budgetMax).toBe(2000)
    expect(result.roomsMin).toBeNull()
    expect(result.roomsMax).toBeNull()
    expect(result.livingSpaceMin).toBeNull()
    expect(result.livingSpaceMax).toBe(80)
  })

  it('defaults language to "de" when not provided', () => {
    const extracted = { location: 'Geneva' }

    const result = mapExtractedPreferences(extracted)

    expect(result.language).toBe('de')
  })

  it('ignores unknown/extra fields without runtime error', () => {
    const extracted = {
      location: 'Bern',
      unknownField: 'should be ignored',
      anotherExtra: 42,
      nested: { deep: true },
    }

    const result = mapExtractedPreferences(extracted)

    expect(result.location).toBe('Bern')
    // Extra fields should not appear on the result
    expect((result as Record<string, unknown>)['unknownField']).toBeUndefined()
    expect((result as Record<string, unknown>)['anotherExtra']).toBeUndefined()
    expect((result as Record<string, unknown>)['nested']).toBeUndefined()
  })
})
