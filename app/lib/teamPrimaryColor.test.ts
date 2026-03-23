import { describe, expect, it } from "vitest"
import { teamPrimaryColorOrFallback } from "./teamPrimaryColor"

describe("teamPrimaryColorOrFallback", () => {
  it("returns DB hex when valid 6-digit #RRGGBB", () => {
    const hex = teamPrimaryColorOrFallback(
      "Celtics",
      () => ({ primaryColor: "#007A33" }),
      0
    )
    expect(hex).toBe("#007A33")
  })

  it("ignores invalid hex and uses fallback palette by index", () => {
    const a = teamPrimaryColorOrFallback(
      "X",
      () => ({ primaryColor: "not-a-color" }),
      0
    )
    const b = teamPrimaryColorOrFallback(
      "X",
      () => ({ primaryColor: "not-a-color" }),
      1
    )
    expect(a).not.toBe(b)
    expect(a).toMatch(/^hsl/)
  })

  it("uses fallback when team is missing from lookup", () => {
    const c = teamPrimaryColorOrFallback("Unknown", () => null, 2)
    expect(c).toMatch(/^hsl/)
  })
})
