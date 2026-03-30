import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TopNavbar } from "@/components/top-navbar"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/ai-search",
}))

describe("TopNavbar", () => {
  it("renders Home as first nav item", () => {
    render(<TopNavbar />)

    const links = screen.getAllByRole("link")
    expect(links[0].textContent).toContain("Home")
  })

  it("AI-Powered Search uses text-primary class", () => {
    render(<TopNavbar />)

    const link = screen.getByText("AI-Powered Search").closest("a")
    expect(link?.className).toContain("text-primary")
  })

  it("nav items render in correct order", () => {
    render(<TopNavbar />)

    const links = screen.getAllByRole("link")
    const titles = links.map((link) => link.textContent?.trim())
    expect(titles).toEqual([
      "Home",
      "AI-Powered Search",
      "Profiles",
      "Analyses",
      "Download",
      "Settings",
    ])
  })

  it("AI-Powered Search uses Sparkles icon", () => {
    render(<TopNavbar />)

    const link = screen.getByText("AI-Powered Search").closest("a")
    const svg = link?.querySelector("svg")
    expect(svg).toBeDefined()
    expect(svg).not.toBeNull()
  })
})
