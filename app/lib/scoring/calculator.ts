import { IPrediction } from "../models/Prediction"
import { ISeries } from "../models/Series"
import { IPlayInGame } from "../models/PlayInGame"
import { RoundType, ROUND_BASE_VALUES, ScoreResult } from "./types"

/**
 * Calculate score for a Play-In game prediction
 */
export function calculatePlayInScore(
  prediction: IPrediction,
  game: IPlayInGame
): number {
  if (!game.winner) {
    return 0 // Game not completed yet
  }

  if (prediction.predictedWinner === game.winner) {
    return 2
  }

  return 0
}

/**
 * Calculate score for a playoff series prediction
 */
export function calculateSeriesScore(
  prediction: IPrediction,
  series: ISeries,
  round: RoundType
): ScoreResult {
  // Series not completed
  if (!series.winner) {
    return { points: 0 }
  }

  // Missing prediction
  if (!prediction.predictedScore) {
    return { points: 0 }
  }

  const baseX = ROUND_BASE_VALUES[round]
  const predicted = prediction.predictedScore
  const actual = series.currentScore

  const predictedWinner = prediction.predictedWinner
  const actualWinner = series.winner

  // Check if predicted winner is correct
  const correctWinner = predictedWinner === actualWinner

  // Calculate losing team's wins for both prediction and actual
  const predictedLoserWins =
    predictedWinner === series.team1
      ? predicted.team2Wins
      : predicted.team1Wins

  const actualLoserWins =
    actualWinner === series.team1
      ? actual.team2Wins
      : actual.team1Wins

  let points = 0
  const breakdown = {
    base: baseX,
    exact: 0,
    penalty: 0,
    bonuses: {} as { sweep?: number; sevenGame?: number },
  }

  if (correctWinner) {
    // Check for exact match
    const exactMatch =
      predicted.team1Wins === actual.team1Wins &&
      predicted.team2Wins === actual.team2Wins

    if (exactMatch) {
      points = baseX + 4
      breakdown.exact = 4
    } else {
      // Correct winner, wrong score
      const y = Math.abs(predictedLoserWins - actualLoserWins)
      points = Math.max(0, baseX - y)
      breakdown.penalty = y
    }
  } else {
    // Wrong winner - normally 0, but check for 7-game bonus
    points = 0
  }

  // Apply bonuses
  // Sweep bonus: predicted 4-0 and actual is 4-0
  if (
    predicted.team1Wins === 4 &&
    predicted.team2Wins === 0 &&
    actual.team1Wins === 4 &&
    actual.team2Wins === 0
  ) {
    points += 2
    breakdown.bonuses.sweep = 2
  } else if (
    predicted.team1Wins === 0 &&
    predicted.team2Wins === 4 &&
    actual.team1Wins === 0 &&
    actual.team2Wins === 4
  ) {
    points += 2
    breakdown.bonuses.sweep = 2
  }

  // 7-game distance bonus: predicted 4-3 but wrong team won 4-3
  // Check if both prediction and actual are 4-3 series (regardless of which team won)
  const predictedIsSevenGame = 
    (predicted.team1Wins === 4 && predicted.team2Wins === 3) ||
    (predicted.team1Wins === 3 && predicted.team2Wins === 4)
  
  const actualIsSevenGame =
    (actual.team1Wins === 4 && actual.team2Wins === 3) ||
    (actual.team1Wins === 3 && actual.team2Wins === 4)
  
  if (!correctWinner && predictedIsSevenGame && actualIsSevenGame) {
    points += 2
    breakdown.bonuses.sevenGame = 2
  }

  return {
    points: Math.max(0, points), // Ensure non-negative
    breakdown,
  }
}
