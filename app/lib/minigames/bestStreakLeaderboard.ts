/** Shared shape for minigame “best win streak” leaderboards (Hangman, Who He Play For?, etc.). */
export type BestStreakLeaderboardRow = {
  rank: number
  userId: string
  userName: string
  bestStreak: number
}
