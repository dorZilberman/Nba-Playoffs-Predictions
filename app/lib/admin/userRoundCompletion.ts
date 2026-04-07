import type { RoundType } from "@/app/lib/models/Series"
import { isEarlyFinalsLocked, seasonRawToPlayoffsInput } from "@/app/lib/locking/earlyFinalsLock"

/** Same rules as the bracket: both teams known, no winner yet, before start time. */
export function teamsSetForMatchup(team1: string, team2: string): boolean {
  return (
    !!team1 &&
    !!team2 &&
    team1 !== "TBD" &&
    team2 !== "TBD" &&
    team1 !== "none" &&
    team2 !== "none" &&
    String(team1).trim() !== "" &&
    String(team2).trim() !== ""
  )
}

/** Both teams known, no winner yet, before start time — same rule as bracket open slots. */
export function isPredictionSlotOpen(
  team1: string,
  team2: string,
  winner: string | undefined,
  startTime: Date,
  now: Date
): boolean {
  if (!teamsSetForMatchup(team1, team2)) return false
  if (winner) return false
  return now.getTime() < new Date(startTime).getTime()
}

export type RoundCompletionKey =
  | "earlyFinals"
  | "playIn"
  | "first"
  | "second"
  | "conference"
  | "finals"

export type RoundCompletion = Record<RoundCompletionKey, boolean | null>

export type LeanSeries = {
  _id: unknown
  round: RoundType
  team1: string
  team2: string
  startTime: Date
  winner?: string
}

export type LeanPlayIn = {
  _id: unknown
  team1: string
  team2: string
  startTime: Date
  winner?: string
}

function completeForIds(
  userIds: Set<string>,
  openIds: string[]
): boolean | null {
  if (openIds.length === 0) return null
  return openIds.every((id) => userIds.has(id))
}

export function buildOpenPredictionIds(args: {
  now: Date
  /** When missing, early-finals column is N/A (no active season). */
  seasonId: string | null
  seasonRaw: Record<string, unknown> | null
  series: LeanSeries[]
  playInGames: LeanPlayIn[]
}): {
  earlyFinalsOpen: boolean
  openByRound: Record<Exclude<RoundCompletionKey, "earlyFinals">, string[]>
} {
  const { now, seasonId, seasonRaw, series, playInGames } = args
  const playoffsInput = seasonRawToPlayoffsInput(seasonRaw)
  const earlyFinalsOpen =
    !!seasonId && !isEarlyFinalsLocked(playoffsInput)

  const openByRound: Record<
    Exclude<RoundCompletionKey, "earlyFinals">,
    string[]
  > = {
    playIn: [],
    first: [],
    second: [],
    conference: [],
    finals: [],
  }

  for (const g of playInGames) {
    if (
      isPredictionSlotOpen(
        g.team1,
        g.team2,
        g.winner,
        new Date(g.startTime),
        now
      )
    ) {
      openByRound.playIn.push(String(g._id))
    }
  }

  for (const s of series) {
    if (
      !isPredictionSlotOpen(
        s.team1,
        s.team2,
        s.winner,
        new Date(s.startTime),
        now
      )
    ) {
      continue
    }
    const id = String(s._id)
    const r = s.round
    if (r === "first") openByRound.first.push(id)
    else if (r === "second") openByRound.second.push(id)
    else if (r === "conference") openByRound.conference.push(id)
    else if (r === "finals") openByRound.finals.push(id)
  }

  return { earlyFinalsOpen, openByRound }
}

export function completionForUser(args: {
  earlyFinalsOpen: boolean
  hasEarlyFinalsDoc: boolean
  openByRound: Record<Exclude<RoundCompletionKey, "earlyFinals">, string[]>
  userSeriesIds: Set<string>
  userPlayInIds: Set<string>
}): RoundCompletion {
  const { earlyFinalsOpen, hasEarlyFinalsDoc, openByRound, userSeriesIds, userPlayInIds } =
    args

  const earlyFinals: boolean | null = earlyFinalsOpen
    ? hasEarlyFinalsDoc
    : null

  const playIn = completeForIds(userPlayInIds, openByRound.playIn)
  const first = completeForIds(userSeriesIds, openByRound.first)
  const second = completeForIds(userSeriesIds, openByRound.second)
  const conference = completeForIds(userSeriesIds, openByRound.conference)
  const finals = completeForIds(userSeriesIds, openByRound.finals)

  return {
    earlyFinals,
    playIn,
    first,
    second,
    conference,
    finals,
  }
}
