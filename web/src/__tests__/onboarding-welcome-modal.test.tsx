import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock all external dependencies
vi.mock("driver.js", () => ({ driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })) }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn() }, from: vi.fn(() => ({ select: vi.fn() })) }),
}))
vi.mock("@/hooks/use-onboarding", () => ({
  useOnboarding: () => ({
    state: { onboarding_step: 1, onboarding_completed: false, onboarding_skipped: false, onboarding_active: true },
    isLoading: false,
    skip: vi.fn(),
    advance: vi.fn(),
    completeTour: vi.fn(),
    startTour: vi.fn(),
  }),
}))

import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider"

describe("WelcomeModal (rebuilt)", () => {
  it("renders the HomeMatch value proposition sentence", async () => {
    render(<OnboardingProvider><div /></OnboardingProvider>)
    // Wait for async state
    await vi.waitFor(() => {
      expect(screen.getByText(/HomeMatch scores property listings against your preferences/i)).toBeDefined()
    })
  })

  it("renders 'Let's get started' as the primary CTA", async () => {
    render(<OnboardingProvider><div /></OnboardingProvider>)
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /let.s get started/i })).toBeDefined()
    })
  })

  it("renders 'Skip tour' as a secondary exit option", async () => {
    render(<OnboardingProvider><div /></OnboardingProvider>)
    await vi.waitFor(() => {
      expect(screen.getByText(/skip tour/i)).toBeDefined()
    })
  })

  it("WelcomeModal has no hardcoded hex color inline styles", async () => {
    const { container } = render(<OnboardingProvider><div /></OnboardingProvider>)
    await vi.waitFor(() => {
      // After welcome shows, no element should have style with #111, #555, #fff
      const elementsWithStyle = container.querySelectorAll("[style]")
      elementsWithStyle.forEach((el) => {
        const style = el.getAttribute("style") || ""
        expect(style).not.toMatch(/#[0-9a-fA-F]{3,6}/)
      })
    })
  })
})
