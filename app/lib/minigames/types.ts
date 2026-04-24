export type HangmanPlayer = {
  id: string
  displayName: string
  team: string
  teamAbbr: string
  conference: string
  /** NBA division for the player’s current team (from static map in fetch script). */
  division: string
  position: string
  /** ESPN CDN headshot URL when available. */
  photoUrl: string | null
  /** Human-readable height, e.g. `6' 5\"`. */
  height: string | null
  /** Country from ESPN `birthPlace` (e.g. USA, Canada). */
  nationality: string | null
  age: number | null
  /** Roster jersey as string (e.g. `7`, `00`) from ESPN. */
  jerseyNumber: string | null
}

export type HangmanPlayerBundle = {
  seasonLabel: string
  source: string
  updatedAt: string
  players: HangmanPlayer[]
}
