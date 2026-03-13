import { ISeries } from "../models/Series"
import { IPlayInGame } from "../models/PlayInGame"

/**
 * Check if a series is locked based on its start time
 * A series locks when the current time >= start time
 */
export function isSeriesLocked(series: ISeries): boolean {
  const now = new Date()
  const startTime = new Date(series.startTime)
  return now >= startTime
}

/**
 * Check if a Play-In game is locked based on its start time
 */
export function isPlayInGameLocked(game: IPlayInGame): boolean {
  const now = new Date()
  const startTime = new Date(game.startTime)
  return now >= startTime
}
