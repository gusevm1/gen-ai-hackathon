import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import AuthPage from '@/app/auth/page'

describe('AuthPage', () => {
  it('renders sign in form', () => {
    const { getByLabelText } = render(<AuthPage />)
    expect(getByLabelText(/email/i)).toBeTruthy()
    expect(getByLabelText(/password/i)).toBeTruthy()
  })
})
