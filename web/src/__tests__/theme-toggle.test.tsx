import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ThemeToggle } from "@/components/theme-toggle"

// Mock next-themes
const mockSetTheme = vi.fn()
let mockTheme = "light"

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    resolvedTheme: mockTheme,
  }),
}))

describe("ThemeToggle", () => {
  it("renders a button with sr-only text", () => {
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    expect(button).toBeDefined()
  })

  it("calls setTheme when clicked in light mode", () => {
    mockTheme = "light"
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })

  it("calls setTheme when clicked in dark mode", () => {
    mockTheme = "dark"
    mockSetTheme.mockClear()
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })
})
