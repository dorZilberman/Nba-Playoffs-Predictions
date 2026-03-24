/**
 * Playoffs start time: early-finals lock, What-if availability, early-finals analytics visibility.
 */
export type SeasonPlayoffsTimingInput = {
  playoffsStartTime?: Date | null
}

export type SeasonAnalyticsTimingInput = {
  playInStartTime?: Date | null
}

function resolvePlayoffsStart(
  season: SeasonPlayoffsTimingInput
): Date | null {
  const raw = season.playoffsStartTime
  if (raw == null) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Early-finals picks are locked (and pool is "closed") at or after playoffs start. */
export function isEarlyFinalsLocked(season: SeasonPlayoffsTimingInput): boolean {
  const d = resolvePlayoffsStart(season)
  if (!d) return false
  return Date.now() >= d.getTime()
}

/** What-if page and API are available only at or after playoffs start. */
export function isWhatIfAvailable(season: SeasonPlayoffsTimingInput): boolean {
  return isEarlyFinalsLocked(season)
}

/** Analytics page and API are available only at or after play-in start time (if configured). */
export function isAnalyticsAvailable(
  season: SeasonAnalyticsTimingInput
): boolean {
  if (season.playInStartTime == null) return false
  const d = new Date(season.playInStartTime)
  if (Number.isNaN(d.getTime())) return false
  return Date.now() >= d.getTime()
}

/** Raw BSON-friendly: pass fields from Season.collection.findOne */
export function seasonRawToPlayoffsInput(raw: Record<string, unknown> | null): SeasonPlayoffsTimingInput {
  if (!raw) return {}
  return {
    playoffsStartTime: raw.playoffsStartTime as Date | null | undefined,
  }
}

export function seasonRawToAnalyticsInput(
  raw: Record<string, unknown> | null
): SeasonAnalyticsTimingInput {
  if (!raw) return {}
  return {
    playInStartTime: raw.playInStartTime as Date | null | undefined,
  }
}
