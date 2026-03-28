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

import { SectionProblem } from '@/components/landing/SectionProblem'

describe('SectionProblem', () => {
  it('renders without crashing', () => {
    const { container } = render(<SectionProblem lang="en" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders overline text', () => {
    const { getByText } = render(<SectionProblem lang="en" />)
    expect(getByText('The problem')).toBeTruthy()
  })

  it('renders headline text', () => {
    const { getByText } = render(<SectionProblem lang="en" />)
    expect(getByText('Finding a flat in Switzerland is exhausting.')).toBeTruthy()
  })

  it('renders 3 bullet points', () => {
    const { container } = render(<SectionProblem lang="en" />)
    // Each bullet has a teal dash separator
    const dashes = container.querySelectorAll('span')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })
})
