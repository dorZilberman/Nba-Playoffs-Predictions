import { calculateSeriesScore } from "@/app/lib/scoring/calculator"
import type { IPrediction } from "@/app/lib/models/Prediction"
import type { ConferenceType, ISeries, RoundType } from "@/app/lib/models/Series"

/** All valid best-of-7 ending records (wins, wins). */
const VALID_FINALS: readonly (readonly [number, number])[] = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
]

/**
 * Endings still reachable from the current series score (wins cannot decrease).
 * E.g. 3–1 → 4–0 is impossible because the loser already has a win.
 */
export function enumerateFeasibleFinalScores(
  team1Current: number,
  team2Current: number
): { team1Wins: number; team2Wins: number }[] {
  const c1 = team1Current
  const c2 = team2Current
  const out: { team1Wins: number; team2Wins: number }[] = []
  for (const [a, b] of VALID_FINALS) {
    if (a >= c1 && b >= c2) {
      out.push({ team1Wins: a, team2Wins: b })
    }
  }
  return out
}

/** Whether a legal best-of-7 final can still happen from the current in-series record. */
export function isFinalScoreFeasibleFromCurrentRecord(
  team1Current: number,
  team2Current: number,
  finalTeam1Wins: number,
  finalTeam2Wins: number
): boolean {
  if (
    !Number.isInteger(finalTeam1Wins) ||
    !Number.isInteger(finalTeam2Wins)
  ) {
    return false
  }
  return enumerateFeasibleFinalScores(team1Current, team2Current).some(
    (f) =>
      f.team1Wins === finalTeam1Wins && f.team2Wins === finalTeam2Wins
  )
}

function pickShortestFeasible(
  feasible: { team1Wins: number; team2Wins: number }[]
): { team1Wins: number; team2Wins: number } {
  if (feasible.length === 0) return { team1Wins: 4, team2Wins: 0 }
  let best = feasible[0]!
  let bestGames = best.team1Wins + best.team2Wins
  for (let i = 1; i < feasible.length; i++) {
    const h = feasible[i]!
    const g = h.team1Wins + h.team2Wins
    if (g < bestGames) {
      best = h
      bestGames = g
    }
  }
  return best
}

function toCompletedISeries(
  s: {
    _id: string
    seasonId: string
    round: RoundType
    conference: ConferenceType
    team1: string
    team2: string
    team1Seed?: number
    team2Seed?: number
    startTime: string
  },
  fin: { team1Wins: number; team2Wins: number }
): ISeries {
  const t = new Date(s.startTime)
  return {
    _id: s._id,
    seasonId: s.seasonId as unknown as ISeries["seasonId"],
    round: s.round,
    conference: s.conference,
    team1: s.team1,
    team2: s.team2,
    team1Seed: s.team1Seed,
    team2Seed: s.team2Seed,
    startTime: t,
    currentScore: {
      team1Wins: fin.team1Wins,
      team2Wins: fin.team2Wins,
    },
    winner: fin.team1Wins === 4 ? s.team1 : s.team2,
    createdAt: t,
    updatedAt: t,
  }
}

function rowToPrediction(row: {
  predictedWinner: string
  predictedScore?: { team1Wins: number; team2Wins: number }
}): IPrediction {
  return {
    _id: "",
    userId: "" as unknown as IPrediction["userId"],
    seriesId: "" as unknown as IPrediction["seriesId"],
    predictedWinner: row.predictedWinner,
    predictedScore: row.predictedScore,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function bestOutcomeForUserPrediction(
  series: {
    _id: string
    seasonId: string
    round: RoundType
    conference: ConferenceType
    team1: string
    team2: string
    team1Seed?: number
    team2Seed?: number
    startTime: string
  },
  current: { team1Wins: number; team2Wins: number },
  predRow: {
    predictedWinner: string
    predictedScore?: { team1Wins: number; team2Wins: number }
  }
): { team1Wins: number; team2Wins: number } {
  const feasible = enumerateFeasibleFinalScores(
    current.team1Wins,
    current.team2Wins
  )
  if (feasible.length === 0) {
    return { team1Wins: 4, team2Wins: 0 }
  }

  if (!predRow.predictedScore) {
    return pickShortestFeasible(feasible)
  }

  const pred = rowToPrediction(predRow)

  const tieKey = (fin: { team1Wins: number; team2Wins: number }) => {
    const syn = toCompletedISeries(series, fin)
    const { points, breakdown } = calculateSeriesScore(pred, syn, series.round)
    const ex =
      pred.predictedScore != null &&
      fin.team1Wins === pred.predictedScore.team1Wins &&
      fin.team2Wins === pred.predictedScore.team2Wins
    const games = fin.team1Wins + fin.team2Wins
    const penalty = breakdown?.penalty ?? 0
    return { points, ex, games, penalty }
  }

  let best = feasible[0]!
  let bestKey = tieKey(best)

  for (let i = 1; i < feasible.length; i++) {
    const h = feasible[i]!
    const k = tieKey(h)
    if (k.points > bestKey.points) {
      best = h
      bestKey = k
      continue
    }
    if (k.points < bestKey.points) continue
    if (k.ex && !bestKey.ex) {
      best = h
      bestKey = k
      continue
    }
    if (k.ex === bestKey.ex && k.games < bestKey.games) {
      best = h
      bestKey = k
      continue
    }
    if (
      k.points === bestKey.points &&
      k.ex === bestKey.ex &&
      k.games === bestKey.games &&
      k.penalty < bestKey.penalty
    ) {
      best = h
      bestKey = k
    }
  }

  return best
}

export type MostPointsSeriesInput = {
  _id: string
  seasonId: string
  round: RoundType
  conference: ConferenceType
  team1: string
  team2: string
  team1Seed?: number
  team2Seed?: number
  startTime: string
  currentScore?: { team1Wins: number; team2Wins: number }
  winner?: string
}

export type MostPointsPredictionInput = {
  userId: string
  seriesId?: string
  playInGameId?: string
  predictedWinner: string
  predictedScore?: { team1Wins: number; team2Wins: number }
}

/**
 * Hypothetical final scores for every eligible open series that maximize the
 * given user’s series prediction points (subject to scores still possible from
 * the current series record). Series without a score prediction use the
 * shortest possible completion.
 */
export function buildMostPointsHypoScores(args: {
  series: MostPointsSeriesInput[]
  predictions: MostPointsPredictionInput[]
  userId: string
  eligibleSeriesIds: Set<string>
}): Record<string, { team1Wins: number; team2Wins: number }> {
  const predBySeries = new Map<string, MostPointsPredictionInput>()
  for (const p of args.predictions) {
    if (p.userId !== args.userId || !p.seriesId || p.playInGameId) continue
    predBySeries.set(p.seriesId, p)
  }

  const out: Record<string, { team1Wins: number; team2Wins: number }> = {}

  for (const s of args.series) {
    if (!args.eligibleSeriesIds.has(s._id)) continue
    if (s.winner) continue

    const cur = s.currentScore ?? { team1Wins: 0, team2Wins: 0 }
    const predRow = predBySeries.get(s._id)

    if (predRow) {
      out[s._id] = bestOutcomeForUserPrediction(s, cur, predRow)
    } else {
      const feasible = enumerateFeasibleFinalScores(
        cur.team1Wins,
        cur.team2Wins
      )
      out[s._id] = pickShortestFeasible(feasible)
    }
  }

  return out
}
