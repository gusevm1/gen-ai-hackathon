import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnalysesGrid } from '@/components/analyses/AnalysesGrid'

// Mock next/link to render as a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock translations — return key as string
vi.mock('@/lib/translations', () => ({
  t: (_lang: string, key: string) => key,
}))

// Mock motion components to render children directly
vi.mock('@/components/motion/StaggerGroup', () => ({
  StaggerGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  StaggerItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const singleAnalysis = [
  {
    id: 'analysis-1',
    listing_id: 'listing-1',
    score: 85,
    breakdown: {
      match_tier: 'excellent',
      listing_title: 'Nice Apartment',
      listing_address: 'Musterstrasse 1',
      listing_rooms: undefined,
      listing_object_type: undefined,
    },
    profile_id: null,
    created_at: '2026-04-01T00:00:00Z',
  },
]

describe('AnalysesGrid', () => {
  it('PG-05: Card has left-edge border bar — border-l-4 and tier color border-teal-500 for excellent', () => {
    const { container } = render(
      <AnalysesGrid analyses={singleAnalysis} profileMap={{}} lang="en" />
    )

    // The Card element should have border-l-4 for the tier bar
    expect(container.querySelector('.border-l-4')).not.toBeNull()
    // Tier color for 'excellent' should be teal-500
    expect(container.querySelector('.border-teal-500')).not.toBeNull()
  })

  it('PG-06: score number is rendered as large text with text-3xl class', () => {
    render(<AnalysesGrid analyses={singleAnalysis} profileMap={{}} lang="en" />)

    const scoreEl = screen.getByText('85')
    expect(scoreEl.className).toContain('text-3xl')
  })

  it('PG-06: pill badge removed — no rounded-full element in the card', () => {
    const { container } = render(
      <AnalysesGrid analyses={singleAnalysis} profileMap={{}} lang="en" />
    )

    // Old pill had rounded-full — should be removed in the new design
    expect(container.querySelector('.rounded-full')).toBeNull()
  })
})
