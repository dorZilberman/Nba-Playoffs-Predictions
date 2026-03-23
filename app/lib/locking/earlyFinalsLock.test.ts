import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isEarlyFinalsLocked } from "./earlyFinalsLock"

describe("isEarlyFinalsLocked", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-01T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns false when lock time is missing", () => {
    expect(isEarlyFinalsLocked({})).toBe(false)
    expect(isEarlyFinalsLocked({ earlyFinalsLockTime: null })).toBe(false)
  })

  it("returns false before lock time and true at or after lock time", () => {
    const lock = new Date("2025-06-01T15:00:00.000Z")
    expect(isEarlyFinalsLocked({ earlyFinalsLockTime: lock })).toBe(false)
    vi.setSystemTime(new Date("2025-06-01T15:00:00.000Z"))
    expect(isEarlyFinalsLocked({ earlyFinalsLockTime: lock })).toBe(true)
    vi.setSystemTime(new Date("2025-06-01T16:00:00.000Z"))
    expect(isEarlyFinalsLocked({ earlyFinalsLockTime: lock })).toBe(true)
  })
})
