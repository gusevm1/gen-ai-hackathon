import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { AIAvatar } from "@/components/chat/ai-avatar"

describe("AIAvatar", () => {
  it("renders circular container with bg-primary", () => {
    const { container } = render(<AIAvatar />)

    const div = container.firstElementChild as HTMLElement
    expect(div.className).toContain("rounded-full")
    expect(div.className).toContain("bg-primary")
  })

  it("renders house SVG icon", () => {
    const { container } = render(<AIAvatar />)

    const svg = container.querySelector("svg")
    expect(svg).toBeDefined()
    expect(svg).not.toBeNull()
  })

  it("container is 32px (size-8)", () => {
    const { container } = render(<AIAvatar />)

    const div = container.firstElementChild as HTMLElement
    expect(div.className).toContain("size-8")
  })
})
