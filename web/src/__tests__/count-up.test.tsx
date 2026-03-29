import { describe, it, expect, beforeAll } from "vitest"
import { render } from "@testing-library/react"
import { CountUp } from "@/components/motion/CountUp"

beforeAll(() => {
  // jsdom does not implement IntersectionObserver — mock it for motion/react useInView
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

describe("CountUp", () => {
  it("renders without crashing with target prop", () => {
    const { container } = render(<CountUp target={87} />)
    expect(container.firstChild).toBeTruthy()
  })

  it("accepts className prop", () => {
    const { container } = render(<CountUp target={100} className="score" />)
    expect(container.firstChild).toBeTruthy()
  })
})
