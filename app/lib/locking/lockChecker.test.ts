import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { ISeries } from "@/app/lib/models/Series"
import { isPlayInGameLocked, isSeriesLocked } from "./lockChecker"

describe("isSeriesLocked", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-04-20T18:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("is locked when now >= series startTime", () => {
    const s = {
      startTime: new Date("2025-04-20T17:00:00.000Z"),
    } as ISeries
    expect(isSeriesLocked(s)).toBe(true)
  })

  it("is not locked when startTime is in the future", () => {
    const s = {
      startTime: new Date("2025-04-20T19:00:00.000Z"),
    } as ISeries
    expect(isSeriesLocked(s)).toBe(false)
  })
})

describe("isPlayInGameLocked", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-04-10T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("mirrors startTime comparison like series", () => {
    const g = {
      startTime: new Date("2025-04-10T11:59:00.000Z"),
    } as IPlayInGame
    expect(isPlayInGameLocked(g)).toBe(true)
    const g2 = {
      startTime: new Date("2025-04-10T12:01:00.000Z"),
    } as IPlayInGame
    expect(isPlayInGameLocked(g2)).toBe(false)
  })
})
