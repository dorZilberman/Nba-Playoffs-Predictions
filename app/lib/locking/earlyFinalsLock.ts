import type { ISeason } from "../models/Season"

export function isEarlyFinalsLocked(season: {
  earlyFinalsLockTime?: Date | null
}): boolean {
  if (!season.earlyFinalsLockTime) return false
  return new Date() >= new Date(season.earlyFinalsLockTime)
}
