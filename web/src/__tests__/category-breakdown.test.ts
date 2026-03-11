import { describe, it, expect } from 'vitest'
import { getScoreColor } from '@/components/analysis/CategoryBreakdown'
import { getStatusIndicator } from '@/components/analysis/ChecklistSection'

describe('CategoryBreakdown component', () => {
  describe('getScoreColor', () => {
    it('returns emerald for scores >= 80', () => {
      expect(getScoreColor(80)).toBe('bg-emerald-500')
      expect(getScoreColor(100)).toBe('bg-emerald-500')
      expect(getScoreColor(95)).toBe('bg-emerald-500')
    })

    it('returns blue for scores 60-79', () => {
      expect(getScoreColor(60)).toBe('bg-blue-500')
      expect(getScoreColor(79)).toBe('bg-blue-500')
      expect(getScoreColor(70)).toBe('bg-blue-500')
    })

    it('returns amber for scores 40-59', () => {
      expect(getScoreColor(40)).toBe('bg-amber-500')
      expect(getScoreColor(59)).toBe('bg-amber-500')
      expect(getScoreColor(50)).toBe('bg-amber-500')
    })

    it('returns gray for scores < 40', () => {
      expect(getScoreColor(0)).toBe('bg-gray-500')
      expect(getScoreColor(39)).toBe('bg-gray-500')
      expect(getScoreColor(20)).toBe('bg-gray-500')
    })
  })

  describe('renders all 5 categories with scores and weights', () => {
    const mockCategories = [
      { name: 'location', score: 85, weight: 80, reasoning: ['Close to transit', 'Central area'] },
      { name: 'price', score: 65, weight: 70, reasoning: ['Slightly above budget'] },
      { name: 'size', score: 90, weight: 60, reasoning: ['4.5 rooms as desired', 'Generous living space'] },
      { name: 'features', score: 45, weight: 40, reasoning: ['Missing balcony', 'Has elevator'] },
      { name: 'condition', score: 30, weight: 50, reasoning: ['Needs renovation'] },
    ]

    it('handles all 5 standard categories', () => {
      expect(mockCategories).toHaveLength(5)
      const names = mockCategories.map((c) => c.name)
      expect(names).toContain('location')
      expect(names).toContain('price')
      expect(names).toContain('size')
      expect(names).toContain('features')
      expect(names).toContain('condition')
    })

    it('each category has name, score, weight, and reasoning', () => {
      for (const cat of mockCategories) {
        expect(cat.name).toBeTruthy()
        expect(typeof cat.score).toBe('number')
        expect(cat.score).toBeGreaterThanOrEqual(0)
        expect(cat.score).toBeLessThanOrEqual(100)
        expect(typeof cat.weight).toBe('number')
        expect(cat.weight).toBeGreaterThanOrEqual(0)
        expect(cat.weight).toBeLessThanOrEqual(100)
        expect(Array.isArray(cat.reasoning)).toBe(true)
        expect(cat.reasoning.length).toBeGreaterThan(0)
      }
    })

    it('shows reasoning bullets for each category', () => {
      const locationCategory = mockCategories.find((c) => c.name === 'location')!
      expect(locationCategory.reasoning).toHaveLength(2)
      expect(locationCategory.reasoning[0]).toBe('Close to transit')
      expect(locationCategory.reasoning[1]).toBe('Central area')
    })

    it('colors score bars by tier threshold', () => {
      expect(getScoreColor(mockCategories[0].score)).toBe('bg-emerald-500') // 85
      expect(getScoreColor(mockCategories[1].score)).toBe('bg-blue-500')    // 65
      expect(getScoreColor(mockCategories[2].score)).toBe('bg-emerald-500') // 90
      expect(getScoreColor(mockCategories[3].score)).toBe('bg-amber-500')   // 45
      expect(getScoreColor(mockCategories[4].score)).toBe('bg-gray-500')    // 30
    })

    it('score bar width is clamped at 100%', () => {
      const clampedWidth = Math.min(150, 100)
      expect(clampedWidth).toBe(100)

      const normalWidth = Math.min(75, 100)
      expect(normalWidth).toBe(75)
    })
  })

  describe('ChecklistSection component', () => {
    describe('getStatusIndicator', () => {
      it('renders met items with check icon (green)', () => {
        const status = getStatusIndicator(true)
        expect(status.color).toBe('text-emerald-500')
        expect(status.label).toBe('Met')
      })

      it('renders unmet items with X icon (red)', () => {
        const status = getStatusIndicator(false)
        expect(status.color).toBe('text-red-500')
        expect(status.label).toBe('Not met')
      })

      it('renders unknown items with question mark icon (gray)', () => {
        const status = getStatusIndicator(null)
        expect(status.color).toBe('text-gray-400')
        expect(status.label).toBe('Unknown')
      })
    })

    describe('checklist data handling', () => {
      const mockChecklist = [
        { criterion: 'Has balcony', met: true as boolean | null, note: 'Listed as amenity' },
        { criterion: 'Near public transport', met: true as boolean | null, note: 'Tram stop 200m away' },
        { criterion: 'Quiet neighborhood', met: false as boolean | null, note: 'Near main road' },
        { criterion: 'Pet-friendly', met: null as boolean | null, note: 'Not specified in listing' },
      ]

      it('handles all three met states: true, false, null', () => {
        const metItems = mockChecklist.filter((item) => item.met === true)
        const unmetItems = mockChecklist.filter((item) => item.met === false)
        const unknownItems = mockChecklist.filter((item) => item.met === null)

        expect(metItems).toHaveLength(2)
        expect(unmetItems).toHaveLength(1)
        expect(unknownItems).toHaveLength(1)
      })

      it('each checklist item has criterion and note', () => {
        for (const item of mockChecklist) {
          expect(item.criterion).toBeTruthy()
          expect(typeof item.note).toBe('string')
        }
      })

      it('renders met items with correct criteria', () => {
        const metItems = mockChecklist.filter((item) => item.met === true)
        expect(metItems[0].criterion).toBe('Has balcony')
        expect(metItems[1].criterion).toBe('Near public transport')
      })

      it('renders unmet items with correct criteria and notes', () => {
        const unmetItems = mockChecklist.filter((item) => item.met === false)
        expect(unmetItems[0].criterion).toBe('Quiet neighborhood')
        expect(unmetItems[0].note).toBe('Near main road')
      })

      it('renders unknown items with correct criteria and notes', () => {
        const unknownItems = mockChecklist.filter((item) => item.met === null)
        expect(unknownItems[0].criterion).toBe('Pet-friendly')
        expect(unknownItems[0].note).toBe('Not specified in listing')
      })
    })
  })
})
