import { describe, it, expect } from 'vitest'
import { preferencesSchema, dynamicFieldSchema, migratePreferences } from '@/lib/schemas/preferences'

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

    // Soft criteria, dynamic fields, and features
    expect(result.softCriteria).toEqual([])
    expect(result.dynamicFields).toEqual([])
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

describe('dynamicFields', () => {
  it('empty object parse produces dynamicFields=[]', () => {
    const result = preferencesSchema.parse({})
    expect(result.dynamicFields).toEqual([])
  })

  it('dynamicFields with valid entries round-trips through parse', () => {
    const input = {
      dynamicFields: [
        { name: 'near Bahnhof', value: 'within 500m', importance: 'high' as const },
        { name: 'quiet area', value: '', importance: 'medium' as const },
      ],
    }
    const result = preferencesSchema.parse(input)

    expect(result.dynamicFields).toHaveLength(2)
    expect(result.dynamicFields[0].name).toBe('near Bahnhof')
    expect(result.dynamicFields[0].value).toBe('within 500m')
    expect(result.dynamicFields[0].importance).toBe('high')
    expect(result.dynamicFields[1].name).toBe('quiet area')
    expect(result.dynamicFields[1].value).toBe('')
    expect(result.dynamicFields[1].importance).toBe('medium')
  })

  it('dynamicFieldSchema rejects empty name (min 1 char)', () => {
    expect(() =>
      dynamicFieldSchema.parse({ name: '', importance: 'medium' })
    ).toThrow()
  })

  it('dynamicFieldSchema defaults value to empty string and importance to medium', () => {
    const result = dynamicFieldSchema.parse({ name: 'test criterion' })

    expect(result.value).toBe('')
    expect(result.importance).toBe('medium')
  })

  it('dynamicFieldSchema rejects invalid importance level', () => {
    expect(() =>
      dynamicFieldSchema.parse({ name: 'test', importance: 'urgent' })
    ).toThrow()
  })
})

describe('migratePreferences', () => {
  it('converts softCriteria strings to dynamicFields with importance=medium', () => {
    const raw = {
      softCriteria: ['near Bahnhof', 'quiet neighborhood'],
    }
    const migrated = migratePreferences(raw)

    expect(migrated.dynamicFields).toEqual([
      { name: 'near Bahnhof', value: '', importance: 'medium' },
      { name: 'quiet neighborhood', value: '', importance: 'medium' },
    ])
  })

  it('skips migration when dynamicFields already present', () => {
    const raw = {
      softCriteria: ['old criterion'],
      dynamicFields: [
        { name: 'new criterion', value: 'details', importance: 'high' },
      ],
    }
    const migrated = migratePreferences(raw)

    // dynamicFields preserved, softCriteria NOT migrated
    expect(migrated.dynamicFields).toEqual([
      { name: 'new criterion', value: 'details', importance: 'high' },
    ])
  })

  it('handles empty softCriteria array (no dynamicFields created)', () => {
    const raw = {
      softCriteria: [],
    }
    const migrated = migratePreferences(raw)

    expect(migrated.dynamicFields).toEqual([])
  })

  it('filters empty strings from softCriteria during migration', () => {
    const raw = {
      softCriteria: ['near Bahnhof', '', '  ', 'quiet area'],
    }
    const migrated = migratePreferences(raw)

    expect(migrated.dynamicFields).toEqual([
      { name: 'near Bahnhof', value: '', importance: 'medium' },
      { name: 'quiet area', value: '', importance: 'medium' },
    ])
  })

  it('passes through data without softCriteria unchanged', () => {
    const raw = {
      location: 'Zurich',
      features: ['balcony'],
    }
    const migrated = migratePreferences(raw)

    expect(migrated.location).toBe('Zurich')
    expect(migrated.features).toEqual(['balcony'])
    expect(migrated.dynamicFields).toBeUndefined()
  })
})
