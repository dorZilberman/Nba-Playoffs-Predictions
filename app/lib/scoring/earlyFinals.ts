import type { IEarlyFinalsPrediction } from "../models/EarlyFinalsPrediction"
import type { ISeries } from "../models/Series"

export type ResolvedFinalsOutcomes = {
  eastConferenceWinner: string | null
  westConferenceWinner: string | null
  nbaChampion: string | null
}

type SeriesOutcome = Pick<ISeries, "round" | "conference" | "winner">

/**
 * Read actual (or simulated) conference and NBA champions from series data.
 */
export function resolveFinalsOutcomesFromSeries(series: SeriesOutcome[]): ResolvedFinalsOutcomes {
  const east = series.find(
    (s) => s.round === "conference" && s.conference === "east" && s.winner
  )
  const west = series.find(
    (s) => s.round === "conference" && s.conference === "west" && s.winner
  )
  const finals = series.find((s) => s.round === "finals" && s.winner)
  return {
    eastConferenceWinner: east?.winner ?? null,
    westConferenceWinner: west?.winner ?? null,
    nbaChampion: finals?.winner ?? null,
  }
}

const POINTS_PER_CORRECT_FINALIST = 5
const POINTS_CORRECT_CHAMPION = 5

/**
 * 5 pts per correct conference finalist, +5 if NBA champion is correct.
 */
export function calculateEarlyFinalsScore(
  prediction: Pick<
    IEarlyFinalsPrediction,
    "eastFinalist" | "westFinalist" | "nbaChampion"
  > | null,
  actual: ResolvedFinalsOutcomes
): number {
  if (!prediction) return 0

  let pts = 0
  if (
    actual.eastConferenceWinner &&
    prediction.eastFinalist === actual.eastConferenceWinner
  ) {
    pts += POINTS_PER_CORRECT_FINALIST
  }
  if (
    actual.westConferenceWinner &&
    prediction.westFinalist === actual.westConferenceWinner
  ) {
    pts += POINTS_PER_CORRECT_FINALIST
  }
  if (
    actual.nbaChampion &&
    prediction.nbaChampion === actual.nbaChampion
  ) {
    pts += POINTS_CORRECT_CHAMPION
  }
  return pts
}
