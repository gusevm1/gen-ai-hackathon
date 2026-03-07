import { describe, it, expect } from 'vitest';
import { redistributeWeights } from '../utils/weight-redistribution';

function sumValues(weights: Record<string, number>): number {
  return Object.values(weights).reduce((s, v) => s + v, 0);
}

describe('redistributeWeights', () => {
  it('redistributes others proportionally when one slider moves', () => {
    const weights = { price: 40, location: 30, size: 30 };
    const result = redistributeWeights(weights, 'price', 60);

    expect(result.price).toBe(60);
    expect(sumValues(result)).toBeCloseTo(100, 1);
    // location and size should have proportional shares of remaining 40
    // location had 30/60 = 0.5 of others, size had 30/60 = 0.5
    // So location = 0.5 * 40 = 20, size = 0.5 * 40 = 20
    expect(result.location).toBe(20);
    expect(result.size).toBe(20);
  });

  it('always sums to exactly 100', () => {
    const weights = { a: 33.3, b: 33.3, c: 33.4 };
    const result = redistributeWeights(weights, 'a', 50);
    expect(sumValues(result)).toBeCloseTo(100, 1);
  });

  it('sets all others to 0 when one slider is set to 100', () => {
    const weights = { price: 40, location: 30, size: 30 };
    const result = redistributeWeights(weights, 'price', 100);

    expect(result.price).toBe(100);
    expect(result.location).toBe(0);
    expect(result.size).toBe(0);
    expect(sumValues(result)).toBe(100);
  });

  it('distributes share to others when one slider is set to 0', () => {
    const weights = { price: 40, location: 30, size: 30 };
    const result = redistributeWeights(weights, 'price', 0);

    expect(result.price).toBe(0);
    expect(sumValues(result)).toBeCloseTo(100, 1);
    // location had 30/60 of others = 50, size had 30/60 = 50
    expect(result.location).toBe(50);
    expect(result.size).toBe(50);
  });

  it('works with 2 categories', () => {
    const weights = { a: 60, b: 40 };
    const result = redistributeWeights(weights, 'a', 70);

    expect(result.a).toBe(70);
    expect(result.b).toBe(30);
    expect(sumValues(result)).toBe(100);
  });

  it('works with 5+ categories', () => {
    const weights = { a: 20, b: 20, c: 20, d: 20, e: 20 };
    const result = redistributeWeights(weights, 'a', 40);

    expect(result.a).toBe(40);
    expect(sumValues(result)).toBeCloseTo(100, 1);
    // Each other should get 15 (60/4 = 15)
    expect(result.b).toBe(15);
    expect(result.c).toBe(15);
    expect(result.d).toBe(15);
    expect(result.e).toBe(15);
  });

  it('handles all-zero others by distributing equally', () => {
    const weights = { a: 100, b: 0, c: 0 };
    const result = redistributeWeights(weights, 'a', 40);

    expect(result.a).toBe(40);
    expect(sumValues(result)).toBeCloseTo(100, 1);
    // Others were all 0, so distribute 60 equally: 30 each
    expect(result.b).toBe(30);
    expect(result.c).toBe(30);
  });

  it('rounds values to 1 decimal place', () => {
    const weights = { a: 33.3, b: 33.3, c: 33.4 };
    const result = redistributeWeights(weights, 'a', 10);

    // Check all values are rounded to at most 1 decimal
    Object.values(result).forEach((v) => {
      const decimalPlaces = (v.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  it('rounding correction ensures exact 100 sum', () => {
    // Use values that would produce rounding errors
    const weights = { a: 33, b: 33, c: 34 };
    const result = redistributeWeights(weights, 'a', 17);

    const sum = sumValues(result);
    expect(sum).toBe(100);
  });
});
