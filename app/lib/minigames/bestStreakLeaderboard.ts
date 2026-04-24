/** Shared shape for minigame “best win streak” leaderboards (Hangman, Who He Play For?, etc.). */
export type BestStreakLeaderboardRow = {
  rank: number
  userId: string
  userName: string
  bestStreak: number
  /** Tie-break: minimum total hints in a run that achieved (or matched) that row’s best streak; lower ranks higher. */
  hintsUsedTotal?: number
}
