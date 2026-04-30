import type { HangmanPlayer, HangmanPlayerBundle } from "@/app/lib/minigames/types"
import {
  WHO_HE_ROUND_MS,
  WHO_HE_ROUND_SECONDS,
} from "@/app/lib/minigames/whoHePlayForGame"

export { WHO_HE_ROUND_MS, WHO_HE_ROUND_SECONDS }

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
