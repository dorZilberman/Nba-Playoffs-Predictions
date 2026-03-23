"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PlayoffBracket } from "@/components/bracket/PlayoffBracket"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from "lucide-react"
import {
  calculatePlayInScore,
  calculateSeriesScore,
} from "@/app/lib/scoring/calculator"
import {
  calculateEarlyFinalsScore,
  resolveFinalsOutcomesFromSeries,
} from "@/app/lib/scoring/earlyFinals"
import { isSeriesLocked } from "@/app/lib/locking/lockChecker"
import type { ISeries, RoundType } from "@/app/lib/models/Series"
import type { IPlayInGame, PlayInGameType } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"

type HypoScores = Record<string, { team1Wins: number; team2Wins: number }>

interface ApiUser {
  userId: string
  userName: string
  hasPayed?: boolean
}

interface ApiSeries {
  _id: string
  seasonId: string
  round: RoundType
  conference: "east" | "west" | null
  team1: string
  team2: string
  team1Seed?: number
  team2Seed?: number
  startTime: string
  currentScore?: { team1Wins: number; team2Wins: number }
  winner?: string
}

interface ApiPlayIn {
  _id: string
  seasonId: string
  gameType: PlayInGameType
  team1: string
  team2: string
  startTime: string
  winner?: string
}

interface ApiPredictionRow {
  userId: string
  seriesId?: string
  playInGameId?: string
  predictedWinner: string
  predictedScore?: { team1Wins: number; team2Wins: number }
}

interface ApiEarlyFinalsRow {
  userId: string
  eastFinalist: string
  westFinalist: string
  nbaChampion: string
}

interface WhatIfPayload {
  users: ApiUser[]
  series: ApiSeries[]
  playInGames: ApiPlayIn[]
  predictions: ApiPredictionRow[]
  earlyFinals: ApiEarlyFinalsRow[]
}

export interface SimulatedStanding {
  userId: string
  userName: string
  hasPayed: boolean
  totalScore: number
  earlyFinalsScore: number
  playInScore: number
  firstRoundScore: number
  secondRoundScore: number
  conferenceFinalsScore: number
  finalsScore: number
}

function isValidSeriesScore(t1: number, t2: number): boolean {
  if (!Number.isInteger(t1) || !Number.isInteger(t2)) return false
  if (t1 < 0 || t2 < 0 || t1 > 4 || t2 > 4) return false
  if (t1 === 4 && t2 <= 3) return true
  if (t2 === 4 && t1 <= 3) return true
  return false
}

function toISeriesForBracket(s: ApiSeries, hypo?: HypoScores[string]): ISeries {
  const startTime = new Date(s.startTime)
  const base: ISeries = {
    _id: s._id,
    seasonId: s.seasonId as unknown as ISeries["seasonId"],
    round: s.round,
    conference: s.conference,
    team1: s.team1,
    team2: s.team2,
    team1Seed: s.team1Seed,
    team2Seed: s.team2Seed,
    startTime,
    currentScore: s.currentScore ?? { team1Wins: 0, team2Wins: 0 },
    winner: s.winner,
    createdAt: startTime,
    updatedAt: startTime,
  }
  if (hypo && isValidSeriesScore(hypo.team1Wins, hypo.team2Wins)) {
    return {
      ...base,
      winner: hypo.team1Wins === 4 ? s.team1 : s.team2,
      currentScore: {
        team1Wins: hypo.team1Wins,
        team2Wins: hypo.team2Wins,
      },
    }
  }
  return base
}

function toISeriesForCalc(
  s: ApiSeries,
  hypo?: HypoScores[string]
): ISeries | null {
  if (s.winner) {
    return toISeriesForBracket(s)
  }
  if (hypo && isValidSeriesScore(hypo.team1Wins, hypo.team2Wins)) {
    return toISeriesForBracket(s, hypo)
  }
  return null
}

function toIPlayInGame(g: ApiPlayIn): IPlayInGame {
  return {
    _id: g._id,
    seasonId: g.seasonId as unknown as IPlayInGame["seasonId"],
    gameType: g.gameType,
    team1: g.team1,
    team2: g.team2,
    startTime: new Date(g.startTime),
    winner: g.winner,
    createdAt: new Date(),
  }
}

function rowToIPrediction(row: ApiPredictionRow): IPrediction {
  return {
    _id: "",
    userId: row.userId as unknown as IPrediction["userId"],
    seriesId: row.seriesId as unknown as IPrediction["seriesId"],
    playInGameId: row.playInGameId as unknown as IPrediction["playInGameId"],
    predictedWinner: row.predictedWinner,
    predictedScore: row.predictedScore,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function mergedSeriesOutcomesForEarlyFinals(
  series: ApiSeries[],
  hypo: HypoScores
) {
  return series.map((s) => {
    if (s.winner) {
      return { round: s.round, conference: s.conference, winner: s.winner }
    }
    const h = hypo[s._id]
    if (h && isValidSeriesScore(h.team1Wins, h.team2Wins)) {
      const winner = h.team1Wins === 4 ? s.team1 : s.team2
      return { round: s.round, conference: s.conference, winner }
    }
    return { round: s.round, conference: s.conference, winner: undefined }
  })
}

function computeStandings(
  payload: WhatIfPayload,
  hypo: HypoScores
): SimulatedStanding[] {
  const seriesById = new Map(payload.series.map((s) => [s._id, s]))
  const playInById = new Map(payload.playInGames.map((g) => [g._id, g]))
  const earlyRows = payload.earlyFinals ?? []
  const finalsOutcomes = resolveFinalsOutcomesFromSeries(
    mergedSeriesOutcomesForEarlyFinals(payload.series, hypo)
  )

  const standings: SimulatedStanding[] = payload.users.map((user) => {
    const earlyRow = earlyRows.find((e) => e.userId === user.userId)
    const earlyFinalsScore = calculateEarlyFinalsScore(
      earlyRow
        ? {
            eastFinalist: earlyRow.eastFinalist,
            westFinalist: earlyRow.westFinalist,
            nbaChampion: earlyRow.nbaChampion,
          }
        : null,
      finalsOutcomes
    )

    let playInScore = 0
    let firstRoundScore = 0
    let secondRoundScore = 0
    let conferenceFinalsScore = 0
    let finalsScore = 0

    const userPreds = payload.predictions.filter((p) => p.userId === user.userId)

    for (const row of userPreds) {
      const pred = rowToIPrediction(row)

      if (row.playInGameId) {
        const g = playInById.get(row.playInGameId)
        if (!g) continue
        playInScore += calculatePlayInScore(pred, toIPlayInGame(g))
        continue
      }

      if (row.seriesId) {
        const s = seriesById.get(row.seriesId)
        if (!s) continue

        let points = 0
        if (s.winner) {
          const iser = toISeriesForBracket(s)
          points = calculateSeriesScore(pred, iser, s.round).points
        } else {
          const hypoRow = hypo[s._id]
          const syn = toISeriesForCalc(s, hypoRow)
          if (syn) {
            points = calculateSeriesScore(pred, syn, s.round).points
          }
        }

        switch (s.round) {
          case "first":
            firstRoundScore += points
            break
          case "second":
            secondRoundScore += points
            break
          case "conference":
            conferenceFinalsScore += points
            break
          case "finals":
            finalsScore += points
            break
        }
      }
    }

    const totalScore =
      earlyFinalsScore +
      playInScore +
      firstRoundScore +
      secondRoundScore +
      conferenceFinalsScore +
      finalsScore

    return {
      userId: user.userId,
      userName: user.userName,
      hasPayed: Boolean(user.hasPayed),
      totalScore,
      earlyFinalsScore,
      playInScore,
      firstRoundScore,
      secondRoundScore,
      conferenceFinalsScore,
      finalsScore,
    }
  })

  standings.sort((a, b) => b.totalScore - a.totalScore)
  return standings
}

type SortField =
  | "totalScore"
  | "earlyFinalsScore"
  | "playInScore"
  | "firstRoundScore"
  | "secondRoundScore"
  | "conferenceFinalsScore"
  | "finalsScore"
  | "userName"

type SortDirection = "asc" | "desc"

export function WhatIfClient() {
  const [payload, setPayload] = useState<WhatIfPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hypoScores, setHypoScores] = useState<HypoScores>({})
  const [sortField, setSortField] = useState<SortField>("totalScore")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [onlyPaidUsers, setOnlyPaidUsers] = useState(false)

  const setHypoForSeries = useCallback(
    (seriesId: string, team1Wins: number, team2Wins: number) => {
      if (!isValidSeriesScore(team1Wins, team2Wins)) return
      setHypoScores((prev) => ({
        ...prev,
        [seriesId]: { team1Wins, team2Wins },
      }))
    },
    []
  )

  const clearHypoSeries = useCallback((seriesId: string) => {
    setHypoScores((prev) => {
      const next = { ...prev }
      delete next[seriesId]
      return next
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/what-if/data")
      if (!res.ok) {
        throw new Error("Failed to load simulation data")
      }
      const data = (await res.json()) as WhatIfPayload
      setPayload({
        ...data,
        earlyFinals: data.earlyFinals ?? [],
        users: (data.users ?? []).map((u) => ({
          ...u,
          hasPayed: Boolean(u.hasPayed),
        })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const standings = useMemo(() => {
    if (!payload) return []
    return computeStandings(payload, hypoScores)
  }, [payload, hypoScores])

  const displaySeries = useMemo(() => {
    if (!payload) return []
    return payload.series.map((s) => toISeriesForBracket(s, hypoScores[s._id]))
  }, [payload, hypoScores])

  const eligibleSeries = useMemo(() => {
    if (!payload) return []
    return payload.series.filter((s) => {
      const st = { ...s, startTime: new Date(s.startTime) } as unknown as ISeries
      return isSeriesLocked(st) && !s.winner
    })
  }, [payload])

  const eligibleSeriesIds = useMemo(
    () => new Set(eligibleSeries.map((s) => s._id)),
    [eligibleSeries]
  )

  const whatIfMode = useMemo(() => {
    if (eligibleSeries.length === 0) return undefined
    return {
      eligibleSeriesIds,
      hypoScores,
      onHypoSelect: setHypoForSeries,
      onHypoClear: clearHypoSeries,
    }
  }, [
    eligibleSeries.length,
    eligibleSeriesIds,
    hypoScores,
    setHypoForSeries,
    clearHypoSeries,
  ])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedStandings = useMemo(() => {
    const base = onlyPaidUsers ? standings.filter((s) => s.hasPayed) : standings
    return [...base].sort((a, b) => {
      let aVal: string | number = a[sortField]
      let bVal: string | number = b[sortField]
      if (sortField === "userName") {
        aVal = (aVal as string).toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })
  }, [standings, onlyPaidUsers, sortField, sortDirection])

  const SortButton = ({ field }: { field: SortField }) => {
    const isActive = sortField === field
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => handleSort(field)}
      >
        {isActive && sortDirection === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : isActive && sortDirection === "desc" ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4" />
        )}
      </Button>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading simulation data…
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? "No data"}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Use this page to see how the standings might look if undecided series
          ended a certain way. Trial scores stay here in your browser—they are
          not saved and do not change your real bracket picks or the live
          standings everyone sees. On the playoff bracket, click highlighted
          matchups (past lock time, no official winner yet) to enter trial
          scores—the simulated standings update as you go.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setHypoScores({})}
          className="shrink-0 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset simulation
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Simulated standings</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Users:</span>
            <SegmentedControl
              aria-label="Which users to include in simulated standings"
              value={onlyPaidUsers ? "paid" : "all"}
              onChange={(v) => setOnlyPaidUsers(v === "paid")}
              options={[
                { value: "all", label: "All" },
                { value: "paid", label: "Paid only" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      User
                      <SortButton field="userName" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Total
                      <SortButton field="totalScore" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Early finals
                      <SortButton field="earlyFinalsScore" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Play-In
                      <SortButton field="playInScore" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      First Round
                      <SortButton field="firstRoundScore" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Second Round
                      <SortButton field="secondRoundScore" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Conference Finals
                      <SortButton field="conferenceFinalsScore" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Finals
                      <SortButton field="finalsScore" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStandings.map((row, index) => (
                  <TableRow key={row.userId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.userName}</TableCell>
                    <TableCell className="font-bold">{row.totalScore}</TableCell>
                    <TableCell>{row.earlyFinalsScore}</TableCell>
                    <TableCell>{row.playInScore}</TableCell>
                    <TableCell>{row.firstRoundScore}</TableCell>
                    <TableCell>{row.secondRoundScore}</TableCell>
                    <TableCell>{row.conferenceFinalsScore}</TableCell>
                    <TableCell>{row.finalsScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playoff bracket (what if)</CardTitle>
          <CardDescription>
            {eligibleSeries.length > 0 ? (
              <>
                Series that are past lock time with no official winner show an{" "}
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  amber outline
                </span>
                . Click a highlighted matchup to enter a simulated final score
                and update the table above.
              </>
            ) : (
              <>
                When a series is locked and still awaiting a final result, it will
                be highlighted here so you can try different outcomes. Until
                then, the bracket shows the current pool state only.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibleSeries.length > 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="inline-block h-4 w-4 shrink-0 rounded-sm ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-2 ring-offset-background"
                aria-hidden
              />
              <span>Eligible for simulation — click to open score options.</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No series are eligible right now (need past lock time with no
              winner set). The bracket still reflects real data; simulated picks
              will show up here when those series exist.
            </p>
          )}
          <PlayoffBracket
            series={displaySeries}
            predictions={[]}
            readOnly
            whatIfMode={whatIfMode}
          />
        </CardContent>
      </Card>
    </div>
  )
}
