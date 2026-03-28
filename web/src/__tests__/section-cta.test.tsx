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

import { SectionCTA } from '@/components/landing/SectionCTA'

describe('SectionCTA', () => {
  it('renders without crashing', () => {
    const { container } = render(<SectionCTA lang="en" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders CTA overline', () => {
    const { getByText } = render(<SectionCTA lang="en" />)
    expect(getByText('Ready to find your flat?')).toBeTruthy()
  })

  it('renders CTA headline', () => {
    const { getByText } = render(<SectionCTA lang="en" />)
    expect(getByText('Start matching in minutes.')).toBeTruthy()
  })

  it('renders CTA subtext', () => {
    const { getByText } = render(<SectionCTA lang="en" />)
    expect(getByText('Free to use. No credit card. Works on Flatfox today.')).toBeTruthy()
  })

  it('renders link to /auth', () => {
    const { container } = render(<SectionCTA lang="en" />)
    const authLink = container.querySelector('a[href="/auth"]')
    expect(authLink).toBeTruthy()
  })

  it('renders CTA button text', () => {
    const { getByText } = render(<SectionCTA lang="en" />)
    expect(getByText('Create free account')).toBeTruthy()
  })
})
