import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ShimmerButton } from "@/components/ui/shimmer-button"

describe("ShimmerButton (21st.dev component)", () => {
  it("renders without throwing", () => {
    render(<ShimmerButton>Click me</ShimmerButton>)

    expect(screen.getByText("Click me")).toBeDefined()
  })

  it("renders as a button element", () => {
    render(<ShimmerButton>Test Button</ShimmerButton>)

    const button = screen.getByRole("button")
    expect(button).toBeDefined()
    expect(button.textContent).toContain("Test Button")
  })

  it("accepts custom background and shimmer props", () => {
    render(
      <ShimmerButton
        background="hsl(var(--primary))"
        shimmerColor="#ffffff"
        shimmerDuration="2s"
      >
        Styled
      </ShimmerButton>
    )

    const button = screen.getByRole("button")
    expect(button.style.getPropertyValue("--bg")).toBe("hsl(var(--primary))")
    expect(button.style.getPropertyValue("--shimmer-color")).toBe("#ffffff")
    expect(button.style.getPropertyValue("--speed")).toBe("2s")
  })
})
