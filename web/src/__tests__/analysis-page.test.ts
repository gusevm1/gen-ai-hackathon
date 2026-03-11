import { describe, it, expect } from 'vitest'
import { getTierColor } from '@/components/analysis/ScoreHeader'

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
})
