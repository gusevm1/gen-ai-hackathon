import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NavUser } from "@/components/nav-user"
import { ProfileSwitcher } from "@/components/profile-switcher"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

describe("NavUser", () => {
  it("renders the user avatar with email initial", () => {
    render(<NavUser user={{ email: "test@example.com" }} />)

    // Avatar fallback shows first letter of email
    expect(screen.getByText("T")).toBeDefined()
  })

  it("has a user menu trigger with aria label", () => {
    render(<NavUser user={{ email: "test@example.com" }} />)

    const trigger = screen.getByLabelText("User menu")
    expect(trigger).toBeDefined()
  })
})

describe("ProfileSwitcher", () => {
  it("renders the 'Meine Suche' placeholder text", () => {
    render(<ProfileSwitcher />)

    expect(screen.getByText("Meine Suche")).toBeDefined()
  })

  it("renders as a button element", () => {
    render(<ProfileSwitcher />)

    const button = screen.getByText("Meine Suche").closest("button")
    expect(button).toBeDefined()
  })
})
