import type { HangmanPlayer, HangmanPlayerBundle } from "@/app/lib/minigames/types"

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
