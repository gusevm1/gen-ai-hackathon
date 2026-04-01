import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileCard } from '@/components/profiles/profile-card'

// Mock dependencies
vi.mock('@/lib/language-context', () => ({
  useLanguage: () => ({ language: 'en' }),
}))

vi.mock('@/lib/translations', () => ({
  t: (_lang: string, key: string) => key,
}))

vi.mock('@/components/profiles/open-in-flatfox-button', () => ({
  OpenInFlatfoxButton: () => null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const profileProps = {
  profile: {
    id: '1',
    name: 'Test Profile',
    is_default: false,
    preferences: {},
    updated_at: '2026-04-01T00:00:00Z',
  },
  isOnly: false,
  onEdit: vi.fn(),
  onSetActive: vi.fn(),
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
}

describe('ProfileCard', () => {
  it('PG-01: shows last-used date with month/day short format', () => {
    render(<ProfileCard {...profileProps} />)

    // Expect "last used" label to be present
    expect(screen.getByText(/last used/i)).toBeDefined()

    // Expect formatted date to show "Apr 1"
    const dateEl = screen.getByText(/Apr 1/i)
    expect(dateEl).toBeDefined()
  })

  it('PG-02: active ring — Card root has static ring-2 and ring-primary when is_default is true', () => {
    const { container } = render(
      <ProfileCard {...profileProps} profile={{ ...profileProps.profile, is_default: true }} />
    )

    const card = container.firstChild as HTMLElement
    // Only static (non-prefixed) ring-2 and ring-primary classes count
    const staticClasses = card.className
      .split(' ')
      .filter((cls) => !cls.startsWith('hover:') && !cls.startsWith('focus:'))
      .join(' ')
    expect(staticClasses).toContain('ring-2')
    expect(staticClasses).toContain('ring-primary')
  })

  it('PG-02: inactive no ring — Card root does NOT have ring-primary when is_default is false', () => {
    const { container } = render(
      <ProfileCard {...profileProps} profile={{ ...profileProps.profile, is_default: false }} />
    )

    const card = container.firstChild as HTMLElement
    // Static ring-primary should NOT be present (hover-only ring is acceptable in hover: prefix)
    const staticClasses = card.className
      .split(' ')
      .filter((cls) => !cls.startsWith('hover:'))
      .join(' ')
    expect(staticClasses).not.toContain('ring-primary')
  })

  it('PG-02: star icon removed — no lucide-star svg when is_default is true', () => {
    const { container } = render(
      <ProfileCard {...profileProps} profile={{ ...profileProps.profile, is_default: true }} />
    )

    // Lucide icons render with class lucide-{name}
    expect(container.querySelector('svg.lucide-star')).toBeNull()
  })
})
