/**
 * "Run" = from Start New Game (after a loss) until the next loss or give up.
 * Hints in that period accumulate in `runHintsUsed`. Leaderboard tie-break is
 * `minHintsForBestTie` (lower is better when `bestStreak` matches).
 */
export function applyStreakOnRoundWin(
  d: {
    currentStreak: number
    bestStreak: number
    runHintsUsed: number
    minHintsForBestTie?: number | null
  }
): void {
  const previousBest = d.bestStreak
  const newStreak = d.currentStreak + 1
  const runHintsAtThisWin = d.runHintsUsed

  if (newStreak > previousBest) {
    d.bestStreak = newStreak
    d.currentStreak = newStreak
    d.minHintsForBestTie = runHintsAtThisWin
  } else if (newStreak === previousBest && previousBest > 0) {
    d.currentStreak = newStreak
    const prev = d.minHintsForBestTie
    d.minHintsForBestTie =
      prev == null || prev === undefined
        ? runHintsAtThisWin
        : Math.min(prev, runHintsAtThisWin)
  } else {
    d.currentStreak = newStreak
  }
}

export function applyStreakOnRoundLoss(
  d: { currentStreak: number; runHintsUsed: number }
): void {
  d.currentStreak = 0
  d.runHintsUsed = 0
}
