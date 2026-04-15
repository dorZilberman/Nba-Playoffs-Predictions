"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { UserStanding } from "@/app/api/standings/route"

type BracketStandingsContextValue = {
  /** Full standings row list from the bracket page bundle (null = not loaded or cleared). */
  standings: UserStanding[] | null
  setStandings: (rows: UserStanding[] | null) => void
}

const BracketStandingsContext = createContext<
  BracketStandingsContextValue | undefined
>(undefined)

export function BracketStandingsProvider({ children }: { children: ReactNode }) {
  const [standings, setStandingsState] = useState<UserStanding[] | null>(null)

  const setStandings = useCallback((rows: UserStanding[] | null) => {
    setStandingsState(rows)
  }, [])

  const value = useMemo(
    () => ({ standings, setStandings }),
    [standings, setStandings]
  )

  return (
    <BracketStandingsContext.Provider value={value}>
      {children}
    </BracketStandingsContext.Provider>
  )
}

export function useBracketStandings() {
  const ctx = useContext(BracketStandingsContext)
  if (!ctx) {
    throw new Error("useBracketStandings must be used within BracketStandingsProvider")
  }
  return ctx
}
