/**
 * Bit i (0..3) = conference, team, position, photo. User may reveal any in any order.
 * Legacy `hintsUsed` 0..4 meant “first N hints in fixed order” — map to full lower mask.
 */
export function legacySequentialHintsToMask(sequential: number): number {
  const s = Math.min(4, Math.max(0, Math.floor(sequential)))
  if (s === 0) return 0
  if (s === 4) return 0b1111
  return (1 << s) - 1
}

export function normalizeHangmanHintMask(
  m: number | null | undefined
): number {
  if (m == null || !Number.isFinite(m)) return 0
  return Math.min(0b1111, Math.max(0, Math.floor(m)))
}

export function getHangmanHintMask(doc: {
  hintMask?: number | null
  /** @deprecated sequential count from older clients */
  hintsUsed?: number | null
}): number {
  const direct = doc.hintMask
  if (direct != null && Number.isFinite(direct)) {
    return normalizeHangmanHintMask(direct)
  }
  return legacySequentialHintsToMask(Number(doc.hintsUsed) || 0)
}

export function withHangmanHintBit(mask: number, bit: number): number {
  return normalizeHangmanHintMask(mask) | (1 << bit)
}
