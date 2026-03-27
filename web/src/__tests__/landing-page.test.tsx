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
vi.mock('@/lib/language-context', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }),
}))

import { LandingPageContent } from '@/components/landing/LandingPageContent'
import { HeroDemo } from '@/components/landing/HeroDemo'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

describe('LandingPageContent', () => {
  it('renders without crashing', () => {
    const { container } = render(<LandingPageContent />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('HeroDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<HeroDemo />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('LandingNavbar', () => {
  it('renders Sign In link', () => {
    const { getByText } = render(<LandingNavbar lang="en" />)
    expect(getByText('Sign In')).toBeTruthy()
  })
})
