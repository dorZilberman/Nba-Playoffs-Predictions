export type HangmanPlayer = {
  id: string
  displayName: string
  team: string
  teamAbbr: string
  conference: string
  position: string
}

export type HangmanPlayerBundle = {
  seasonLabel: string
  source: string
  updatedAt: string
  players: HangmanPlayer[]
}
