import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  isAnalyticsAvailable,
  isEarlyFinalsLocked,
  isWhatIfAvailable,
} from "./earlyFinalsLock"

describe("isEarlyFinalsLocked / isWhatIfAvailable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-01T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns false when no playoffs start time", () => {
    expect(isEarlyFinalsLocked({})).toBe(false)
    expect(isEarlyFinalsLocked({ playoffsStartTime: null })).toBe(false)
    expect(isWhatIfAvailable({})).toBe(false)
  })

  it("uses playoffsStartTime when set", () => {
    const lock = new Date("2025-06-01T15:00:00.000Z")
    expect(isEarlyFinalsLocked({ playoffsStartTime: lock })).toBe(false)
    expect(isWhatIfAvailable({ playoffsStartTime: lock })).toBe(false)
    vi.setSystemTime(new Date("2025-06-01T15:00:00.000Z"))
    expect(isEarlyFinalsLocked({ playoffsStartTime: lock })).toBe(true)
    expect(isWhatIfAvailable({ playoffsStartTime: lock })).toBe(true)
  })
})

describe("isAnalyticsAvailable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-10T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns false when playInStartTime is missing", () => {
    expect(isAnalyticsAvailable({})).toBe(false)
    expect(isAnalyticsAvailable({ playInStartTime: null })).toBe(false)
  })

  it("returns true at or after playInStartTime", () => {
    const t = new Date("2025-06-10T10:00:00.000Z")
    expect(isAnalyticsAvailable({ playInStartTime: t })).toBe(true)
  })

  it("returns false before playInStartTime", () => {
    const t = new Date("2025-06-10T14:00:00.000Z")
    expect(isAnalyticsAvailable({ playInStartTime: t })).toBe(false)
  })
})
