import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("filters falsy inputs", () => {
    expect(cn("a", false, "b", undefined, null, "c")).toBe("a b c")
  })
})
