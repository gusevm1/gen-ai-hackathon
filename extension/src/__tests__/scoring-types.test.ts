import { describe, it, expect } from 'vitest';
import {
  TIER_COLORS,
  type ScoreResponse,
  type CategoryScore,
  type ChecklistItem,
  type CriterionResult,
} from '@/types/scoring';

describe('TIER_COLORS', () => {
  it('has entries for all four match tiers', () => {
    expect(TIER_COLORS).toHaveProperty('excellent');
    expect(TIER_COLORS).toHaveProperty('good');
    expect(TIER_COLORS).toHaveProperty('fair');
    expect(TIER_COLORS).toHaveProperty('poor');
  });

  it('each entry has bg and text color strings', () => {
    for (const tier of ['excellent', 'good', 'fair', 'poor'] as const) {
      expect(TIER_COLORS[tier]).toHaveProperty('bg');
      expect(TIER_COLORS[tier]).toHaveProperty('text');
      expect(typeof TIER_COLORS[tier].bg).toBe('string');
      expect(typeof TIER_COLORS[tier].text).toBe('string');
    }
  });

  it('does NOT use traffic light hex values', () => {
    const trafficLightColors = ['#ff0000', '#ffff00', '#00ff00'];
    for (const tier of ['excellent', 'good', 'fair', 'poor'] as const) {
      for (const forbidden of trafficLightColors) {
        expect(TIER_COLORS[tier].bg.toLowerCase()).not.toBe(forbidden);
        expect(TIER_COLORS[tier].text.toLowerCase()).not.toBe(forbidden);
      }
    }
  });
});

describe('ScoreResponse type shape', () => {
  it('a sample ScoreResponse conforms to expected shape', () => {
    const sample: ScoreResponse = {
      overall_score: 82,
      match_tier: 'good',
      summary_bullets: [
        'Great location near transit',
        'Price slightly above budget',
        'Good natural light',
      ],
      categories: [
        {
          name: 'location',
          score: 90,
          weight: 30,
          reasoning: ['Close to public transit', '5 min walk to shops'],
        } satisfies CategoryScore,
      ],
      checklist: [
        {
          criterion: 'Has balcony',
          met: true,
          note: 'Large south-facing balcony',
        } satisfies ChecklistItem,
        {
          criterion: 'Pet-friendly',
          met: null,
          note: 'Not mentioned in listing',
        } satisfies ChecklistItem,
      ],
      language: 'en',
    };

    expect(sample.overall_score).toBeTypeOf('number');
    expect(sample.match_tier).toBeOneOf([
      'excellent',
      'good',
      'fair',
      'poor',
    ]);
    expect(Array.isArray(sample.summary_bullets)).toBe(true);
    expect(sample.summary_bullets.length).toBeGreaterThanOrEqual(1);

    expect(Array.isArray(sample.categories)).toBe(true);
    expect(sample.categories[0].name).toBeTypeOf('string');
    expect(sample.categories[0].score).toBeTypeOf('number');
    expect(sample.categories[0].weight).toBeTypeOf('number');
    expect(Array.isArray(sample.categories[0].reasoning)).toBe(true);

    expect(Array.isArray(sample.checklist)).toBe(true);
    expect(sample.checklist[0].criterion).toBeTypeOf('string');
    expect(sample.checklist[0].met).toBe(true);
    expect(sample.checklist[1].met).toBeNull();
    expect(sample.checklist[0].note).toBeTypeOf('string');

    expect(sample.language).toBeTypeOf('string');
  });
});

describe('v2 ScoreResponse shape', () => {
  it('a v2 ScoreResponse with criteria_results conforms to expected shape', () => {
    const sample: ScoreResponse = {
      overall_score: 65,
      match_tier: 'fair',
      summary_bullets: ['Near transit', 'Above budget', 'Good size'],
      categories: [], // Empty for v2
      checklist: [], // Empty for v2
      language: 'en',
      schema_version: 2,
      criteria_results: [
        { criterion_name: 'Budget', fulfillment: 0.8, importance: 'critical', weight: 5, reasoning: 'Under budget by 5%' } satisfies CriterionResult,
        { criterion_name: 'Balcony', fulfillment: 1.0, importance: 'medium', weight: 2, reasoning: 'Has south-facing balcony' } satisfies CriterionResult,
        { criterion_name: 'Quiet area', fulfillment: null, importance: 'low', weight: 1, reasoning: null } satisfies CriterionResult,
      ],
      enrichment_status: 'available',
    };
    // Verify types compile and values match
    expect(sample.schema_version).toBe(2);
    expect(sample.criteria_results).toHaveLength(3);
    expect(sample.criteria_results![0].criterion_name).toBe('Budget');
    expect(sample.criteria_results![2].fulfillment).toBeNull();
    expect(sample.enrichment_status).toBe('available');
  });

  it('v1 ScoreResponse still valid without v2 fields', () => {
    const v1: ScoreResponse = {
      overall_score: 82,
      match_tier: 'good',
      summary_bullets: ['Good', 'Fair', 'OK'],
      categories: [{ name: 'location', score: 90, weight: 30, reasoning: ['Near transit'] }],
      checklist: [{ criterion: 'Balcony', met: true, note: 'Yes' }],
      language: 'en',
    };
    expect(v1.schema_version).toBeUndefined();
    expect(v1.criteria_results).toBeUndefined();
    expect(v1.enrichment_status).toBeUndefined();
  });

  it('enrichment_status=unavailable produces valid ScoreResponse', () => {
    const unavailable: ScoreResponse = {
      overall_score: 0,
      match_tier: 'poor',
      summary_bullets: ['Scoring not available', 'Area not yet enriched', 'Check back later'],
      categories: [],
      checklist: [],
      language: 'en',
      schema_version: 2,
      criteria_results: [],
      enrichment_status: 'unavailable',
    };
    expect(unavailable.enrichment_status).toBe('unavailable');
    expect(unavailable.overall_score).toBe(0);
  });
});
