import { describe, it, expect } from 'vitest';
import { PreferenceProfileSchema, SoftCriterionSchema } from '../schema/profile';

const validMinimalProfile = {
  schemaVersion: 1 as const,
  createdAt: '2026-03-07T00:00:00Z',
  updatedAt: '2026-03-07T00:00:00Z',
};

const validCompleteProfile = {
  schemaVersion: 1 as const,
  listingType: 'rent' as const,
  location: 'Zurich',
  radiusKm: 10,
  propertyCategory: 'Apartment',
  priceMin: 1000,
  priceMax: 3000,
  onlyWithPrice: true,
  roomsMin: 2,
  roomsMax: 4,
  livingSpaceMin: 50,
  livingSpaceMax: 120,
  yearBuiltMin: 2000,
  yearBuiltMax: 2025,
  floorPreference: 'on_gf',
  availability: 'immediately',
  features: ['Balcony / terrace', 'Elevator', 'Parking space / garage'],
  free_text_search: '',
  softCriteria: [
    { id: 'sc-1', category: 'surroundings', text: 'Near lake', isCustom: false },
  ],
  weightInputs: { location: 30, price: 40, size: 30 },
  weights: { location: 0.3, price: 0.4, size: 0.3 },
  createdAt: '2026-03-07T00:00:00Z',
  updatedAt: '2026-03-07T00:00:00Z',
};

describe('PreferenceProfileSchema', () => {
  it('accepts a valid complete profile', () => {
    const result = PreferenceProfileSchema.safeParse(validCompleteProfile);
    expect(result.success).toBe(true);
  });

  it('accepts a valid minimal profile (only schemaVersion + timestamps)', () => {
    const result = PreferenceProfileSchema.safeParse(validMinimalProfile);
    expect(result.success).toBe(true);
  });

  it('requires schemaVersion, createdAt, and updatedAt', () => {
    const result = PreferenceProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('requires schemaVersion to be literal 1', () => {
    const result = PreferenceProfileSchema.safeParse({
      ...validMinimalProfile,
      schemaVersion: 2,
    });
    expect(result.success).toBe(false);
  });

  describe('listingType', () => {
    it('accepts "rent"', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        listingType: 'rent',
      });
      expect(result.success).toBe(true);
    });

    it('accepts "buy"', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        listingType: 'buy',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid listing type', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        listingType: 'lease',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('price range', () => {
    it('accepts valid priceMin and priceMax', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        priceMin: 500,
        priceMax: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative priceMin', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        priceMin: -100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative priceMax', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        priceMax: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('rooms range', () => {
    it('accepts valid roomsMin and roomsMax', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        roomsMin: 1,
        roomsMax: 5,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative roomsMin', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        roomsMin: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('living space range', () => {
    it('accepts valid livingSpaceMin and livingSpaceMax', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        livingSpaceMin: 30,
        livingSpaceMax: 200,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative livingSpaceMin', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        livingSpaceMin: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('radiusKm', () => {
    it('accepts radius within 0-100', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        radiusKm: 50,
      });
      expect(result.success).toBe(true);
    });

    it('rejects radius above 100', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        radiusKm: 150,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative radius', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        radiusKm: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('features', () => {
    it('accepts an array of strings', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        features: ['balcony', 'elevator'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-string array elements', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        features: [123, true],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('softCriteria', () => {
    it('accepts an array of soft criterion objects', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        softCriteria: [
          { id: 'sc-1', category: 'surroundings', text: 'Lake view', isCustom: true },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('defaults to empty array when not provided', () => {
      const result = PreferenceProfileSchema.safeParse(validMinimalProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.softCriteria).toEqual([]);
      }
    });
  });

  describe('weights', () => {
    it('accepts a record of string keys to numbers 0-100', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        weights: { price: 50, location: 30, size: 20 },
      });
      expect(result.success).toBe(true);
    });

    it('defaults to empty object when not provided', () => {
      const result = PreferenceProfileSchema.safeParse(validMinimalProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weights).toEqual({});
      }
    });

    it('rejects weight values above 100', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        weights: { price: 150 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative weight values', () => {
      const result = PreferenceProfileSchema.safeParse({
        ...validMinimalProfile,
        weights: { price: -10 },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SoftCriterionSchema', () => {
  it('accepts a valid soft criterion', () => {
    const result = SoftCriterionSchema.safeParse({
      id: 'sc-1',
      category: 'surroundings',
      text: 'Near a lake',
      isCustom: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isCustom to false', () => {
    const result = SoftCriterionSchema.safeParse({
      id: 'sc-1',
      category: 'surroundings',
      text: 'Near a lake',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isCustom).toBe(false);
    }
  });

  it('rejects missing required fields', () => {
    const result = SoftCriterionSchema.safeParse({ id: 'sc-1' });
    expect(result.success).toBe(false);
  });
});
