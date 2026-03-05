import { describe, expect, it } from '@jest/globals';
import { normalizeFlatfox } from './normalize.js';
import { PropertyListingSchema } from '../../schema/listing.js';

// Fixture: residential apartment listing (mimics FlatFox API shape)
const apartmentListing = {
  url: '/en/flat/rent/zurich/pk-12345/',
  offer_type: 'RENT',
  object_category: 'APARTMENT',
  object_type: 'APARTMENT',
  price_display: 1690,
  number_of_rooms: '3.5',
  surface_living: 85,
  floor: 3,
  year_built: 2004,
  street: 'Bahnhofstr. 1',
  zipcode: 8001,
  city: 'Zurich',
  public_address: 'Bahnhofstr. 1, 8001 Zurich',
  latitude: 47.38,
  longitude: 8.51,
  short_title: 'Bright 3.5 room apartment',
  description: 'A lovely apartment',
  attributes: [{ name: 'lift' }, { name: 'balcony' }],
  agency: { name: 'Immo AG' },
  images: [{ url: '/thumb/ff/abc.jpg' }, { url: '/thumb/ff/def.jpg' }],
};

// Fixture: house listing
const houseListing = {
  ...apartmentListing,
  object_category: 'HOUSE',
  object_type: 'HOUSE',
  offer_type: 'SALE',
  url: '/en/house/buy/bern/pk-67890/',
  price_display: 950000,
  number_of_rooms: '5.5',
  short_title: 'Charming family house',
};

// Fixture: parking listing (should be filtered out)
const parkingListing = {
  ...apartmentListing,
  object_category: 'PARKING',
  url: '/en/parking/rent/zurich/pk-99999/',
};

// Fixture: industrial listing (should be filtered out)
const industrialListing = {
  ...apartmentListing,
  object_category: 'INDUSTRIAL',
  url: '/en/industrial/rent/zurich/pk-88888/',
};

// Fixture: commercial listing (should be filtered out)
const commercialListing = {
  ...apartmentListing,
  object_category: 'COMMERCIAL',
  url: '/en/commercial/rent/zurich/pk-77777/',
};

// Fixture: gastro listing (should be filtered out)
const gastroListing = {
  ...apartmentListing,
  object_category: 'GASTRO',
  url: '/en/gastro/rent/zurich/pk-66666/',
};

describe('normalizeFlatfox', () => {
  describe('residential filtering', () => {
    it('returns null for PARKING category', () => {
      expect(normalizeFlatfox(parkingListing)).toBeNull();
    });

    it('returns null for INDUSTRIAL category', () => {
      expect(normalizeFlatfox(industrialListing)).toBeNull();
    });

    it('returns null for COMMERCIAL category', () => {
      expect(normalizeFlatfox(commercialListing)).toBeNull();
    });

    it('returns null for GASTRO category', () => {
      expect(normalizeFlatfox(gastroListing)).toBeNull();
    });

    it('returns a valid object for APARTMENT category', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      const parsed = PropertyListingSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('returns a valid object for HOUSE category', () => {
      const result = normalizeFlatfox(houseListing);
      expect(result).not.toBeNull();
      const parsed = PropertyListingSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('offer type mapping', () => {
    it('maps RENT to listingType rent', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect(result!.listingType).toBe('rent');
    });

    it('maps SALE to listingType buy', () => {
      const result = normalizeFlatfox(houseListing);
      expect(result).not.toBeNull();
      expect(result!.listingType).toBe('buy');
    });
  });

  describe('URL handling', () => {
    it('prepends https://flatfox.ch to relative listing URLs', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect(result!.url).toBe('https://flatfox.ch/en/flat/rent/zurich/pk-12345/');
    });

    it('prepends https://flatfox.ch to relative image URLs', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect(result!.imageUrls).toEqual([
        'https://flatfox.ch/thumb/ff/abc.jpg',
        'https://flatfox.ch/thumb/ff/def.jpg',
      ]);
    });
  });

  describe('field conversions', () => {
    it('converts number_of_rooms string "3.5" to number 3.5', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect(result!.rooms).toBe(3.5);
    });

    it('converts zipcode integer 8001 to string "8001"', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect((result!.address as Record<string, unknown>).zip).toBe('8001');
    });

    it('sets canton to empty string', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect((result!.address as Record<string, unknown>).canton).toBe('');
    });
  });

  describe('optional field handling', () => {
    it('handles null/missing optional fields gracefully (returns undefined, not null)', () => {
      const listingWithNulls = {
        ...apartmentListing,
        surface_living: null,
        floor: null,
        year_built: null,
        description: null,
        attributes: null,
        agency: null,
        images: null,
        latitude: null,
        longitude: null,
      };

      const result = normalizeFlatfox(listingWithNulls);
      expect(result).not.toBeNull();

      // All optional fields should be undefined, not null
      expect(result!.livingSpace).toBeUndefined();
      expect(result!.floor).toBeUndefined();
      expect(result!.yearBuilt).toBeUndefined();
      expect(result!.description).toBeUndefined();
      expect(result!.features).toBeUndefined();
      expect(result!.agencyName).toBeUndefined();
      expect(result!.imageUrls).toBeUndefined();
      expect(result!.latitude).toBeUndefined();
      expect(result!.longitude).toBeUndefined();

      // Should still pass Zod validation
      const parsed = PropertyListingSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('field mapping completeness', () => {
    it('maps all fields correctly for a complete apartment listing', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();

      expect(result!.url).toBe('https://flatfox.ch/en/flat/rent/zurich/pk-12345/');
      expect(result!.title).toBe('Bright 3.5 room apartment');
      expect(result!.listingType).toBe('rent');
      expect(result!.price).toBe(1690);
      expect(result!.rooms).toBe(3.5);
      expect(result!.source).toBe('flatfox');
      expect(result!.livingSpace).toBe(85);
      expect(result!.floor).toBe(3);
      expect(result!.yearBuilt).toBe(2004);
      expect(result!.description).toBe('A lovely apartment');
      expect(result!.features).toEqual(['lift', 'balcony']);
      expect(result!.propertyType).toBe('APARTMENT');
      expect(result!.agencyName).toBe('Immo AG');
      expect(result!.latitude).toBe(47.38);
      expect(result!.longitude).toBe(8.51);
      expect(result!.currency).toBe('CHF');

      const address = result!.address as Record<string, unknown>;
      expect(address.raw).toBe('Bahnhofstr. 1, 8001 Zurich');
      expect(address.street).toBe('Bahnhofstr. 1');
      expect(address.zip).toBe('8001');
      expect(address.city).toBe('Zurich');
      expect(address.canton).toBe('');
    });

    it('uses public_address for address.raw when available', () => {
      const result = normalizeFlatfox(apartmentListing);
      expect(result).not.toBeNull();
      expect((result!.address as Record<string, unknown>).raw).toBe(
        'Bahnhofstr. 1, 8001 Zurich',
      );
    });

    it('falls back to constructed address when public_address is missing', () => {
      const listing = { ...apartmentListing, public_address: null };
      const result = normalizeFlatfox(listing);
      expect(result).not.toBeNull();
      expect((result!.address as Record<string, unknown>).raw).toBe(
        'Bahnhofstr. 1 8001 Zurich',
      );
    });

    it('uses title priority: short_title > public_title > description_title', () => {
      // short_title is present -> use it
      expect(normalizeFlatfox(apartmentListing)!.title).toBe(
        'Bright 3.5 room apartment',
      );

      // short_title missing, public_title present
      const listing2 = {
        ...apartmentListing,
        short_title: null,
        public_title: 'Public Title',
      };
      expect(normalizeFlatfox(listing2)!.title).toBe('Public Title');

      // short_title and public_title missing, description_title present
      const listing3 = {
        ...apartmentListing,
        short_title: null,
        public_title: null,
        description_title: 'Description Title',
      };
      expect(normalizeFlatfox(listing3)!.title).toBe('Description Title');

      // All title fields missing
      const listing4 = {
        ...apartmentListing,
        short_title: null,
        public_title: null,
        description_title: null,
      };
      expect(normalizeFlatfox(listing4)!.title).toBe('');
    });
  });
});
