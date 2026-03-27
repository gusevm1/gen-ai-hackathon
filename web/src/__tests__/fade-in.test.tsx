import { describe, it, expect, beforeAll } from "vitest"
import { render } from "@testing-library/react"
import { FadeIn } from "@/components/motion/FadeIn"

beforeAll(() => {
  // jsdom does not implement IntersectionObserver — mock it for motion/react viewport features
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

describe("FadeIn", () => {
  it("renders children", () => {
    const { getByText } = render(
      <FadeIn>
        <span>Hello</span>
      </FadeIn>
    )
    expect(getByText("Hello")).toBeTruthy()
  })

  it("renders with custom className", () => {
    const { container } = render(
      <FadeIn className="test-class">
        <span>Content</span>
      </FadeIn>
    )
    expect(container.firstChild).toBeTruthy()
  })
})
