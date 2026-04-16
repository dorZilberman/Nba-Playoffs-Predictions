import type { RoundType } from "@/app/lib/models/Series"

export type ShamingMissingUser = {
  userId: string
  userName: string
}

export type ShamingPlayInItem = {
  kind: "playIn"
  id: string
  gameType: string
  label: string
  startTime: string
  missingUsers: ShamingMissingUser[]
}

export type ShamingSeriesItem = {
  kind: "series"
  id: string
  round: RoundType
  roundLabel: string
  label: string
  startTime: string
  missingUsers: ShamingMissingUser[]
}

export type ShamingEarlyFinalsItem = {
  kind: "earlyFinals"
  id: "early-finals"
  label: string
  /** When early finals lock (first playoff game), if known */
  locksAt: string | null
  missingUsers: ShamingMissingUser[]
}

export type ShamingItem =
  | ShamingEarlyFinalsItem
  | ShamingPlayInItem
  | ShamingSeriesItem

export type ShamingApiResponse = {
  /** No active season or nothing open right now */
  items: ShamingItem[]
}
