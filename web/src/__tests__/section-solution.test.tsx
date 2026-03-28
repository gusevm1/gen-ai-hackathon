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

import { SectionSolution } from '@/components/landing/SectionSolution'

describe('SectionSolution', () => {
  it('renders without crashing', () => {
    const { container } = render(<SectionSolution lang="en" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders howit overline', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('How to avoid this')).toBeTruthy()
  })

  it('renders howit headline', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('Three steps from search to certainty.')).toBeTruthy()
  })

  it('renders step 1 label', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('Tell us what you need')).toBeTruthy()
  })

  it('renders step 2 label', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('We score every listing')).toBeTruthy()
  })

  it('renders step 3 label', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('See the full picture')).toBeTruthy()
  })

  it('renders features overline', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('Built for Swiss renters')).toBeTruthy()
  })

  it('renders feature 1 title', () => {
    const { getByText } = render(<SectionSolution lang="en" />)
    expect(getByText('AI match scoring')).toBeTruthy()
  })
})
