/** Series shape needed to pick a mobile playoff tab by lock (start) time. */
export type SeriesForRoundSnap = {
  _id: string
  round: "first" | "second" | "conference" | "finals"
  startTime: Date | string
}

/** Stable signature for “data arrived / lock times changed” without object identity noise. */
export function computeSeriesSig(series: SeriesForRoundSnap[]): string {
  return series
    .filter((s) => !String(s._id).startsWith("placeholder"))
    .map((s) => {
      const t = new Date(s.startTime).getTime()
      return `${String(s._id)}:${Number.isNaN(t) ? 0 : t}`
    })
    .sort()
    .join("|")
}

/**
 * Pick the mobile round tab:
 * - Prefer the round that contains the series whose start time is next (soonest lock still in the future).
 * - If all series have started, prefer the round with the series that started most recently (last lock).
 */
export function pickMobilePlayoffRound(
  seriesList: SeriesForRoundSnap[]
): "first" | "second" | "conference" | "finals" {
  const now = Date.now()
  const real = seriesList.filter(
    (s) => !String(s._id).startsWith("placeholder")
  )
  if (real.length === 0) return "first"

  const upcoming = real.filter((s) => {
    const t = new Date(s.startTime).getTime()
    return !Number.isNaN(t) && t > now
  })

  if (upcoming.length > 0) {
    upcoming.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    return upcoming[0]!.round
  }

  const past = real.filter((s) => {
    const t = new Date(s.startTime).getTime()
    return !Number.isNaN(t) && t <= now
  })

  if (past.length > 0) {
    past.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
    return past[0]!.round
  }

  return "first"
}
