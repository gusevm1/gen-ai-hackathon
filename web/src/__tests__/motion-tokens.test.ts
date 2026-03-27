import { describe, it, expect } from "vitest"
import { duration, ease, spring, fadeUpVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/motion"

describe("motion tokens", () => {
  it("exports duration constants", () => {
    expect(duration.fast).toBe(0.15)
    expect(duration.moderate).toBe(0.40)
    expect(duration.slow).toBe(0.60)
  })

  it("exports ease arrays with 4 values each", () => {
    expect(ease.enter).toHaveLength(4)
    expect(ease.exit).toHaveLength(4)
    expect(ease.linear).toBe("linear")
  })

  it("exports spring configs with type: spring", () => {
    expect(spring.snappy.type).toBe("spring")
    expect(spring.gentle.type).toBe("spring")
  })

  it("fadeUpVariants has hidden and visible states", () => {
    expect(fadeUpVariants.hidden.opacity).toBe(0)
    expect(fadeUpVariants.visible.opacity).toBe(1)
  })

  it("stagger variants have correct structure", () => {
    expect(staggerContainerVariants.visible.transition.staggerChildren).toBe(0.08)
    expect(staggerItemVariants.hidden.opacity).toBe(0)
    expect(staggerItemVariants.visible.opacity).toBe(1)
  })
})
