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

  it('renders 3 problem items with motion divs', () => {
    const { container } = render(<SectionProblem lang="en" />)
    const section = container.querySelector('section')
    expect(section).toBeTruthy()
    const itemDivs = container.querySelectorAll('[data-testid="problem-item"]')
    expect(itemDivs.length).toBeGreaterThanOrEqual(3)
  })

  it('no decorative background number span present (PROB-01)', () => {
    const { container } = render(<SectionProblem lang="en" />)
    // The decorative span has aria-hidden and large clamp font size
    const ariaHiddenSpans = Array.from(container.querySelectorAll('[aria-hidden]'))
    const bgNumbers = ariaHiddenSpans.filter(el =>
      (el as HTMLElement).style.fontSize?.includes('clamp(5rem') ||
      el.innerHTML === '01' || el.innerHTML === '02' || el.innerHTML === '03'
    )
    // After PROB-01, no such element should exist
    // We check by ensuring no aria-hidden span has the large clamp font
    const largeSpans = ariaHiddenSpans.filter(el =>
      (el as HTMLElement).style.fontSize?.includes('clamp')
    )
    expect(largeSpans.length).toBe(0)
  })

  it('problem card has elevated background color (PROB-03)', () => {
    const { container } = render(<SectionProblem lang="en" />)
    // Card background value should appear in rendered HTML
    expect(container.innerHTML).toContain('hsl(0 0% 100% / 0.03)')
  })
})
