import { describe, it, expect } from 'vitest';
import { ensureNormalizedWeights, normalizeWeights } from '../utils/weight-redistribution';

function sumValues(weights: Record<string, number>): number {
  return Object.values(weights).reduce((s, v) => s + v, 0);
}

describe('normalizeWeights', () => {
  it('returns values that sum to 1', () => {
    const weights = { price: 40, location: 30, size: 30 };
    const result = normalizeWeights(weights);

    expect(sumValues(result)).toBeCloseTo(1, 6);
  });

  it('preserves proportionality', () => {
    const weights = { a: 10, b: 50, c: 20 };
    const result = normalizeWeights(weights);

    const ratioAB = result.b / result.a;
    const ratioBC = result.b / result.c;
    expect(ratioAB).toBeCloseTo(5, 3);
    expect(ratioBC).toBeCloseTo(2.5, 3);
  });

  it('returns zeros when sum is zero', () => {
    const weights = { a: 0, b: 0, c: 0 };
    const result = normalizeWeights(weights);

    expect(result.a).toBe(0);
    expect(sumValues(result)).toBe(0);
  });
});

describe('ensureNormalizedWeights', () => {
  it('returns input when already normalized', () => {
    const normalized = { a: 0.5, b: 0.3, c: 0.2 };
    const result = ensureNormalizedWeights(normalized);

    expect(result).toEqual(normalized);
  });

  it('normalizes raw percentages by sum', () => {
    const raw = { a: 60, b: 30, c: 10 };
    const result = ensureNormalizedWeights(raw);

    expect(sumValues(result)).toBeCloseTo(1, 6);
    expect(result.a).toBeGreaterThan(result.b);
    expect(result.b).toBeGreaterThan(result.c);
  });
});
