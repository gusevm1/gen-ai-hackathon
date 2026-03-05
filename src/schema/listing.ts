import { z } from 'zod';

export const AddressSchema = z.object({
  raw: z.string(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string(),
  canton: z.string(),
});

export const PropertyListingSchema = z.object({
  // Required fields (per user decision)
  url: z.string().url(),
  title: z.string().min(1),
  listingType: z.enum(['rent', 'buy']),
  price: z.number().positive(),
  rooms: z.number().positive(),
  address: AddressSchema,

  // Traceability (per user decision)
  source: z.string(),
  scrapedAt: z.string().datetime(),

  // Optional comprehensive fields
  livingSpace: z.number().optional(),
  floor: z.number().optional(),
  yearBuilt: z.number().optional(),
  description: z.string().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  features: z.array(z.string()).optional(),
  propertyType: z.string().optional(),
  agencyName: z.string().optional(),
  agencyContact: z.string().optional(),

  // Coordinates
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // Defaults
  currency: z.string().default('CHF'),
});

export type PropertyListing = z.infer<typeof PropertyListingSchema>;
