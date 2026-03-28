import React from 'react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Allow AnimatePresence to immediately render new children (no exit animation blocking)
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

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

  it('browser demo wrapper has max-w-3xl class (SOLN-01)', () => {
    const { container } = render(<SectionSolution lang="en" />)
    const demo = container.querySelector('.max-w-3xl')
    expect(demo).toBeTruthy()
  })

  it('score display uses green color for high scores (SOLN-03)', () => {
    const { container, getByText } = render(<SectionSolution lang="en" />)
    // Navigate to step 3 (scene=2) to render SceneAnalysis which uses scoreColor(94)
    const step3Button = getByText('See the full picture').closest('button')!
    act(() => { fireEvent.click(step3Button) })
    // SceneAnalysis overall score badge uses scoreColor(94).color = '#10b981' (green)
    // jsdom normalizes hex #10b981 → rgb(16, 185, 129) in inline styles
    expect(container.innerHTML).toContain('rgb(16, 185, 129)')
  })

})
