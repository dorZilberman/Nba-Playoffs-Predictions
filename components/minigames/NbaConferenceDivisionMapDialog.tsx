"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { HangmanPlayer } from "@/app/lib/minigames/types"
import type { WhoAmIMapExclusions } from "@/app/lib/minigames/whoAmIMapExclusions"
import { cn } from "@/app/lib/utils/cn"
import { Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { TeamDisplay } from "@/components/ui/TeamDisplay"

type ConferenceKey = "East" | "West"

const ORDER_EAST = ["Atlantic", "Central", "Southeast"] as const
const ORDER_WEST = ["Northwest", "Pacific", "Southwest"] as const

function sortDivName(divs: string[], order: readonly string[]): string[] {
  return [...divs].sort((a, b) => {
    const ia = order.indexOf(a as never)
    const ib = order.indexOf(b as never)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export type ConferenceDivisionTeam = { name: string; abbr: string }

export function useConferenceDivisionTree(players: HangmanPlayer[] | null) {
  return useMemo(() => {
    if (!players?.length) {
      return {
        East: [] as { division: string; teams: ConferenceDivisionTeam[] }[],
        West: [] as { division: string; teams: ConferenceDivisionTeam[] }[],
      }
    }
    const east = new Map<string, Map<string, string>>()
    const west = new Map<string, Map<string, string>>()
    for (const p of players) {
      const target = p.conference === "East" ? east : p.conference === "West" ? west : null
      if (!target) continue
      if (!target.has(p.division)) target.set(p.division, new Map())
      target.get(p.division)!.set(p.team, p.teamAbbr)
    }
    function pack(
      m: Map<string, Map<string, string>>,
      order: readonly string[]
    ): { division: string; teams: ConferenceDivisionTeam[] }[] {
      return sortDivName([...m.keys()], order).map((division) => {
        const byTeam = m.get(division)!
        const teams = [...byTeam.entries()]
          .map(([name, abbr]) => ({ name, abbr }))
          .sort((a, b) => a.name.localeCompare(b.name))
        return { division, teams }
      })
    }
    return {
      East: pack(east, ORDER_EAST),
      West: pack(west, ORDER_WEST),
    }
  }, [players])
}

const RuledOutHint =
  "Ruled out for the mystery player by your Team, Conference, or Division column feedback so far"

function isDivisionRuledOut(
  ex: WhoAmIMapExclusions,
  tab: ConferenceKey,
  division: string
): boolean {
  if (ex.excludedConferences.has(tab)) return true
  return ex.excludedDivisions.has(division)
}

function isTeamRuledOut(
  ex: WhoAmIMapExclusions,
  tab: ConferenceKey,
  division: string,
  teamName: string
): boolean {
  if (isDivisionRuledOut(ex, tab, division)) return true
  return ex.excludedTeams.has(teamName)
}

export function NbaConferenceDivisionMapDialog({
  open,
  onOpenChange,
  tree,
  clueExclusions,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  tree: {
    East: { division: string; teams: ConferenceDivisionTeam[] }[]
    West: { division: string; teams: ConferenceDivisionTeam[] }[]
  }
  /** Optional: mark conferences / divisions / franchises ruled out from grid clues. */
  clueExclusions?: WhoAmIMapExclusions | null
}) {
  const [tab, setTab] = useState<ConferenceKey>("East")
  const rows = tab === "East" ? tree.East : tree.West

  const ex: WhoAmIMapExclusions = clueExclusions ?? {
    excludedConferences: new Set(),
    excludedDivisions: new Set(),
    excludedTeams: new Set(),
  }

  const hasClueNarrowing =
    ex.excludedConferences.size + ex.excludedDivisions.size + ex.excludedTeams.size > 0

  const eastOut = ex.excludedConferences.has("East")
  const westOut = ex.excludedConferences.has("West")

  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      if (!eastOut) setTab("East")
      else if (!westOut) setTab("West")
      else setTab("East")
    }
    prevOpen.current = open
  }, [open, eastOut, westOut])

  useEffect(() => {
    if (!open) return
    if (tab === "East" && eastOut && !westOut) setTab("West")
    if (tab === "West" && westOut && !eastOut) setTab("East")
  }, [open, tab, eastOut, westOut])

  const tabConflict = eastOut && westOut

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,800px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 bg-muted/20 px-5 py-4 text-left">
          <DialogTitle className="pr-6 text-base">Conferences and divisions</DialogTitle>
          <DialogDescription className="text-left text-sm">
            2025-26 season teams in this game, grouped the same way as the Team, Conference, and
            Division columns.
            {hasClueNarrowing ? (
              <>
                {" "}
                <span className="text-foreground/90">
                  Dimmed entries match locations ruled out from your past guesses (Team /
                  Conference / Division cells only).
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 border-b border-border/40 bg-muted/10 px-4 py-3">
          <SegmentedControl<ConferenceKey>
            aria-label="Choose conference"
            value={tab}
            onChange={setTab}
            isOptionDisabled={
              tabConflict ? () => false : (c) => (c === "East" ? eastOut : westOut)
            }
            className="w-full justify-stretch"
            options={[
              { value: "East", label: "Eastern" },
              { value: "West", label: "Western" },
            ]}
          />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4"
          role="region"
          aria-label={tab === "East" ? "Eastern conference" : "Western conference"}
        >
          {tabConflict ? (
            <p className="text-sm text-destructive" role="status">
              Conference clues conflict; both conferences look ruled out. Keep guessing in the
              main grid to refine.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams loaded for this conference.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {rows.map(({ division, teams }) => {
                const divOut = isDivisionRuledOut(ex, tab, division)
                return (
                  <div
                    key={division}
                    className={cn(
                      "flex min-w-0 flex-col gap-2 rounded-lg border border-border/40 bg-muted/15 p-2 sm:p-2.5",
                      divOut && "bg-muted/5 opacity-45"
                    )}
                    title={divOut ? RuledOutHint : undefined}
                  >
                    <h3
                      className={cn(
                        "text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs",
                        divOut
                          ? "line-through text-muted-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {division}
                    </h3>
                    <ul className="flex min-w-0 flex-col gap-2 sm:gap-2.5">
                      {teams.map((t) => {
                        const teamOut = isTeamRuledOut(ex, tab, division, t.name)
                        return (
                          <li
                            key={t.abbr}
                            className={cn(
                              "min-w-0 border-b border-border/25 pb-2 last:border-0 last:pb-0",
                              teamOut && "relative"
                            )}
                            title={teamOut ? RuledOutHint : undefined}
                          >
                            <div
                              className={cn(
                                teamOut &&
                                  "pointer-events-none opacity-40 [filter:grayscale(0.35)]"
                              )}
                            >
                              <TeamDisplay
                                teamName={t.name}
                                size="sm"
                                showName
                                className="gap-1.5"
                              />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Info control next to a column label — opening the conference/division map. */
export function NbaMapInfoButton({
  onOpen,
  label = "View NBA conference and division reference",
}: {
  onOpen: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        "text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      aria-label={label}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
    </button>
  )
}
