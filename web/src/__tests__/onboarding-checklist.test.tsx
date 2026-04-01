import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboardingContext: vi.fn(),
}))
vi.mock("@/lib/language-context", () => ({
  useLanguage: () => ({ language: "en" }),
}))
vi.mock("@/lib/translations", () => ({
  t: (_lang: string, key: string) => key,
}))
vi.mock("@/components/motion/FadeIn", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { useOnboardingContext } from "@/components/onboarding/OnboardingProvider"
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist"

const mockContext = (overrides = {}) => {
  ;(useOnboardingContext as ReturnType<typeof vi.fn>).mockReturnValue({
    state: { onboarding_step: 1, onboarding_completed: false },
    isActive: true,
    skip: vi.fn(),
    ...overrides,
  })
}

describe("OnboardingChecklist", () => {
  it("renders 'In the app' section label", () => {
    mockContext()
    render(<OnboardingChecklist />)
    expect(screen.getByText(/in the app/i)).toBeDefined()
  })

  it("renders 'In the extension' section label", () => {
    mockContext()
    render(<OnboardingChecklist />)
    expect(screen.getByText(/in the extension/i)).toBeDefined()
  })

  it("renders success state when onboarding_completed is true", () => {
    mockContext({ state: { onboarding_step: 9, onboarding_completed: true }, isActive: false })
    render(<OnboardingChecklist />)
    expect(screen.getByText(/you.re all set/i)).toBeDefined()
  })

  it("renders flatfox.ch link in success state", () => {
    mockContext({ state: { onboarding_step: 9, onboarding_completed: true }, isActive: false })
    render(<OnboardingChecklist />)
    const link = screen.getByRole("link", { name: /start scoring on flatfox/i })
    expect(link).toBeDefined()
    expect(link.getAttribute("href")).toBe("https://flatfox.ch")
  })

  it("does not render success state when checklist is active", () => {
    mockContext({ state: { onboarding_step: 3, onboarding_completed: false }, isActive: true })
    render(<OnboardingChecklist />)
    expect(screen.queryByText(/you.re all set/i)).toBeNull()
  })
})
