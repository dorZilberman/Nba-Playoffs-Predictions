import type { HangmanPlayer, HangmanPlayerBundle } from "@/app/lib/minigames/types"

/** Round length for Now You See Me only (Who He Play For keeps its own 30s). */
export const NOW_YOU_SEE_ME_ROUND_SECONDS = 60
export const NOW_YOU_SEE_ME_ROUND_MS =
  NOW_YOU_SEE_ME_ROUND_SECONDS * 1000

export function playersWithPhotos(bundle: HangmanPlayerBundle): HangmanPlayer[] {
  return bundle.players.filter(
    (p) => p.photoUrl != null && String(p.photoUrl).trim().length > 0
  )
}

export function pickRandomPlayerWithPhoto(
  bundle: HangmanPlayerBundle,
  excludeId?: string
): HangmanPlayer {
  const withPhotos = playersWithPhotos(bundle)
  if (withPhotos.length === 0) {
    throw new Error("No players with photos in bundle")
  }
  let pool =
    excludeId && withPhotos.length > 1
      ? withPhotos.filter((p) => p.id !== excludeId)
      : withPhotos
  if (pool.length === 0) pool = withPhotos
  const i = Math.floor(Math.random() * pool.length)
  return pool[i]!
}
