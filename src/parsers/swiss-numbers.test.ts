import { describe, expect, it } from '@jest/globals';
import {
  parseSwissPrice,
  parseSwissRooms,
  parseSwissArea,
} from './swiss-numbers.js';

describe('parseSwissPrice', () => {
  it('parses standard Swiss price with apostrophes', () => {
    expect(parseSwissPrice("CHF 1'200'000")).toBe(1200000);
  });

  it('parses Swiss price with dash suffix', () => {
    expect(parseSwissPrice("CHF 2'500.\u2014")).toBe(2500);
  });

  it('parses Swiss price with decimal cents', () => {
    expect(parseSwissPrice("CHF 850'000.50")).toBe(850000.5);
  });

  it('parses plain number string', () => {
    expect(parseSwissPrice('1200000')).toBe(1200000);
  });

  it('parses price with /month suffix', () => {
    expect(parseSwissPrice("CHF 3'500 /month")).toBe(3500);
  });

  it('returns null for null input', () => {
    expect(parseSwissPrice(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseSwissPrice(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSwissPrice('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseSwissPrice('contact us')).toBeNull();
  });
});

describe('parseSwissRooms', () => {
  it('parses rooms with Zimmer suffix', () => {
    expect(parseSwissRooms('3.5 Zimmer')).toBe(3.5);
  });

  it('parses integer rooms', () => {
    expect(parseSwissRooms('4')).toBe(4);
  });

  it('parses decimal rooms without suffix', () => {
    expect(parseSwissRooms('1.5')).toBe(1.5);
  });

  it('returns null for null input', () => {
    expect(parseSwissRooms(null)).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseSwissRooms('studio')).toBeNull();
  });
});

describe('parseSwissArea', () => {
  it('parses area with m2 suffix', () => {
    expect(parseSwissArea('120 m2')).toBe(120);
  });

  it('parses area with m-squared symbol', () => {
    expect(parseSwissArea('85.5 m\u00B2')).toBe(85.5);
  });

  it('returns null for null input', () => {
    expect(parseSwissArea(null)).toBeNull();
  });
});
