import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const mockStartTour = vi.fn()

vi.mock("@/lib/language-context", () => ({
  useLanguage: () => ({ language: "en", setLanguage: vi.fn() }),
}))
vi.mock("@/lib/translations", () => ({
  t: (_lang: string, key: string) => key,
}))
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboardingContext: () => ({ startTour: mockStartTour }),
}))
vi.mock("@/app/(dashboard)/profiles/actions", () => ({
  updateProfilesLanguage: vi.fn(),
}))
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import SettingsPage from "@/app/(dashboard)/settings/page"

describe("SettingsPage — Onboarding Tour section", () => {
  it("renders an 'Onboarding Tour' section heading", () => {
    render(<SettingsPage />)
    expect(screen.getByText(/onboarding tour/i)).toBeDefined()
  })

  it("renders a 'Restart tour' button", () => {
    render(<SettingsPage />)
    expect(screen.getByRole("button", { name: /restart tour/i })).toBeDefined()
  })

  it("calls startTour when 'Restart tour' is clicked", () => {
    render(<SettingsPage />)
    const btn = screen.getByRole("button", { name: /restart tour/i })
    fireEvent.click(btn)
    expect(mockStartTour).toHaveBeenCalledOnce()
  })
})
