import type { HangmanPlayer, HangmanPlayerBundle } from "@/app/lib/minigames/types"

/** Per-player guessing window (Who He Play For). */
export const WHO_HE_ROUND_SECONDS = 30
export const WHO_HE_ROUND_MS = WHO_HE_ROUND_SECONDS * 1000

export function findPlayerById(
  bundle: HangmanPlayerBundle,
  id: string
): HangmanPlayer | undefined {
  return bundle.players.find((p) => p.id === id)
}

export function pickRandomPlayer(
  bundle: HangmanPlayerBundle,
  excludeId?: string
): HangmanPlayer {
  const { players } = bundle
  const pool =
    excludeId && players.length > 1
      ? players.filter((p) => p.id !== excludeId)
      : players
  const use = pool.length > 0 ? pool : players
  const i = Math.floor(Math.random() * use.length)
  return use[i]
}

export function normalizeAbbr(abbr: string): string {
  return abbr.trim().toUpperCase()
}
