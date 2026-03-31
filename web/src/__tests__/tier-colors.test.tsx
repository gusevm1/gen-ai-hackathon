import { describe, it, expect } from "vitest"
import { getTierColor } from "@/components/analysis/ScoreHeader"

describe("getTierColor", () => {
  it("excellent → teal-500", () => {
    const c = getTierColor("excellent")
    expect(c.bg).toBe("bg-teal-500")
    expect(c.ring).toBe("ring-teal-500/40")
  })

  it("good → green-500", () => {
    const c = getTierColor("good")
    expect(c.bg).toBe("bg-green-500")
    expect(c.ring).toBe("ring-green-500/40")
  })

  it("fair → amber-500 (unchanged)", () => {
    const c = getTierColor("fair")
    expect(c.bg).toBe("bg-amber-500")
    expect(c.ring).toBe("ring-amber-500/40")
  })

  it("poor → red-500", () => {
    const c = getTierColor("poor")
    expect(c.bg).toBe("bg-red-500")
    expect(c.ring).toBe("ring-red-500/40")
  })

  it("unknown tier falls back to poor values", () => {
    const c = getTierColor("unknown")
    expect(c.bg).toBe("bg-red-500")
    expect(c.ring).toBe("ring-red-500/40")
  })
})
