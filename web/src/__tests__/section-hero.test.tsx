import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Note: Task 1 must add data-testid="hero-chip" to each chip motion.div
// so that querySelectorAll('[data-testid="hero-chip"]') returns 7 elements.

import { SectionHero } from '@/components/landing/SectionHero'

describe('SectionHero', () => {
  it('renders without crashing', () => {
    const { container } = render(<SectionHero lang="en" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('CHIPS array has 7 entries (data-testid="hero-chip" count)', () => {
    const { container } = render(<SectionHero lang="en" />)
    // Task 1 must add data-testid="hero-chip" to each chip — currently 4 chips exist, so this fails (RED)
    const chips = container.querySelectorAll('[data-testid="hero-chip"]')
    expect(chips.length).toBe(7)
  })

  it('chip tiers include excellent, good, fair, and poor', () => {
    const { queryAllByText } = render(<SectionHero lang="en" />)
    // Each chip renders its tier name as a label span
    const excellent = queryAllByText('excellent')
    const good = queryAllByText('good')
    const fair = queryAllByText('fair')
    const poor = queryAllByText('poor')
    expect(excellent.length).toBeGreaterThanOrEqual(1)
    expect(good.length).toBeGreaterThanOrEqual(1)
    expect(fair.length).toBeGreaterThanOrEqual(1)
    expect(poor.length).toBeGreaterThanOrEqual(1)
  })

  it('no dark card background (regression guard)', () => {
    const { container } = render(<SectionHero lang="en" />)
    // The old chip style used: hsl(0 0% 6% / 0.88) — this must NOT appear after the overhaul
    expect(container.innerHTML).not.toContain('hsl(0 0% 6% / 0.88)')
  })
})
