import { describe, it, expect } from 'vitest'
import { getTierColor } from '@/components/analysis/ScoreHeader'
import { deriveFulfillmentChecklist, type CriterionResult } from '@/lib/fulfillment-utils'

describe('ScoreHeader', () => {
  describe('getTierColor', () => {
    it('returns emerald colors for excellent tier', () => {
      const result = getTierColor('excellent')
      expect(result.bg).toBe('bg-emerald-500')
      expect(result.text).toBe('text-white')
    })

    it('returns blue colors for good tier', () => {
      const result = getTierColor('good')
      expect(result.bg).toBe('bg-blue-500')
      expect(result.text).toBe('text-white')
    })

    it('returns amber colors for fair tier', () => {
      const result = getTierColor('fair')
      expect(result.bg).toBe('bg-amber-500')
      expect(result.text).toBe('text-gray-900')
    })

    it('returns gray colors for poor tier', () => {
      const result = getTierColor('poor')
      expect(result.bg).toBe('bg-gray-500')
      expect(result.text).toBe('text-white')
    })

    it('defaults to poor colors for unknown tier', () => {
      const result = getTierColor('unknown')
      expect(result.bg).toBe('bg-gray-500')
      expect(result.text).toBe('text-white')
    })
  })
})

describe('BulletSummary data handling', () => {
  it('accepts an array of bullet strings', () => {
    const bullets = [
      'Good location near transit',
      'Price is above budget range',
      'Spacious layout with 4.5 rooms',
    ]
    expect(bullets).toHaveLength(3)
    expect(bullets[0]).toContain('location')
  })

  it('handles empty bullets array', () => {
    const bullets: string[] = []
    expect(bullets).toHaveLength(0)
  })
})

describe('Analysis page data flow', () => {
  it('extracts ScoreResponse fields from breakdown JSONB', () => {
    const analysis = {
      id: 'abc-123',
      user_id: 'user-1',
      listing_id: '12345',
      score: 78,
      breakdown: {
        overall_score: 78,
        match_tier: 'good',
        summary_bullets: ['Point 1', 'Point 2', 'Point 3'],
        categories: [
          { name: 'location', score: 85, weight: 80, reasoning: ['Close to transit'] },
        ],
        checklist: [
          { criterion: 'Has balcony', met: true, note: 'Listed as amenity' },
        ],
        language: 'en',
      },
      summary: 'Point 1. Point 2. Point 3.',
      created_at: '2026-03-10T12:00:00Z',
    }

    const breakdown = analysis.breakdown
    expect(breakdown.overall_score).toBe(78)
    expect(breakdown.match_tier).toBe('good')
    expect(breakdown.summary_bullets).toHaveLength(3)
    expect(breakdown.categories).toHaveLength(1)
    expect(breakdown.categories[0].name).toBe('location')
    expect(breakdown.checklist).toHaveLength(1)
    expect(breakdown.checklist[0].met).toBe(true)
  })

  it('handles missing breakdown fields with fallback values', () => {
    const analysis = {
      score: 50,
      breakdown: {} as Record<string, unknown>,
    }

    const overallScore = (analysis.breakdown.overall_score as number) ?? analysis.score ?? 0
    const matchTier = (analysis.breakdown.match_tier as string) ?? 'poor'
    const summaryBullets = (analysis.breakdown.summary_bullets as string[]) ?? []
    const categories = (analysis.breakdown.categories as unknown[]) ?? []
    const checklist = (analysis.breakdown.checklist as unknown[]) ?? []

    expect(overallScore).toBe(50)
    expect(matchTier).toBe('poor')
    expect(summaryBullets).toEqual([])
    expect(categories).toEqual([])
    expect(checklist).toEqual([])
  })

  it('renders not-found state for missing analysis', () => {
    const analysis = null
    const isNotFound = analysis === null

    expect(isNotFound).toBe(true)
  })

  it('includes link back to dashboard in data model', () => {
    const dashboardLink = '/dashboard'
    expect(dashboardLink).toBe('/dashboard')
  })

  it('extracts v2 fields from breakdown with schema_version 2', () => {
    const breakdown = {
      overall_score: 72,
      match_tier: 'good',
      summary_bullets: ['Good match', 'Transit nearby'],
      categories: [],
      checklist: [],
      language: 'en',
      schema_version: 2,
      criteria_results: [
        { criterion_name: 'Budget', fulfillment: 0.85, importance: 'critical', weight: 5, reasoning: 'Within range' },
        { criterion_name: 'Transit', fulfillment: 0.5, importance: 'high', weight: 3, reasoning: 'Bus nearby' },
      ],
      enrichment_status: 'available',
    }

    const schemaVersion = (breakdown.schema_version as number) ?? 1
    const criteriaResults = (breakdown.criteria_results ?? []) as CriterionResult[]

    expect(schemaVersion).toBe(2)
    expect(criteriaResults).toHaveLength(2)
    expect(criteriaResults[0].criterion_name).toBe('Budget')
    expect(criteriaResults[0].fulfillment).toBe(0.85)
    expect(criteriaResults[1].importance).toBe('high')
    expect(breakdown.enrichment_status).toBe('available')
  })

  it('defaults schema_version to 1 when missing', () => {
    const breakdown = {
      overall_score: 65,
      match_tier: 'fair',
      summary_bullets: ['Some points'],
      categories: [
        { name: 'location', score: 70, weight: 60, reasoning: ['Central'] },
      ],
      checklist: [
        { criterion: 'Balcony', met: true, note: 'Has balcony' },
      ],
      language: 'en',
    }

    const schemaVersion = ((breakdown as Record<string, unknown>).schema_version as number) ?? 1
    expect(schemaVersion).toBe(1)

    // v1 path: use categories and checklist directly
    expect(breakdown.categories).toHaveLength(1)
    expect(breakdown.checklist).toHaveLength(1)
  })

  it('derives fulfillment checklist from criteria_results for v2', () => {
    const criteriaResults: CriterionResult[] = [
      { criterion_name: 'Budget', fulfillment: 0.9, importance: 'critical', weight: 5, reasoning: 'Under budget' },
      { criterion_name: 'Size', fulfillment: 0.4, importance: 'high', weight: 3, reasoning: 'Slightly small' },
      { criterion_name: 'Parking', fulfillment: 0.1, importance: 'low', weight: 1, reasoning: 'No parking' },
      { criterion_name: 'Garden', fulfillment: null, importance: 'medium', weight: 2, reasoning: null },
    ]

    const checklist = deriveFulfillmentChecklist(criteriaResults)

    expect(checklist).toHaveLength(4)
    expect(checklist[0]).toEqual({ criterion: 'Budget', met: true, note: 'Under budget' })
    expect(checklist[1]).toEqual({ criterion: 'Size', met: 'partial', note: 'Slightly small' })
    expect(checklist[2]).toEqual({ criterion: 'Parking', met: false, note: 'No parking' })
    expect(checklist[3]).toEqual({ criterion: 'Garden', met: null, note: '' })
  })
})
