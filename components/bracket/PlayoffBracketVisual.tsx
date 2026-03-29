"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PredictionModal } from "./PredictionModal"
import { LockCountdown } from "@/components/bracket/LockCountdown"
import { Lock } from "lucide-react"
import { BracketTeamBox } from "@/components/bracket/BracketTeamBox"
import { cn } from "@/app/lib/utils/cn"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPrediction } from "@/app/lib/models/Prediction"
import { calculateSeriesScore } from "@/app/lib/scoring/calculator"

export interface WhatIfBracketMode {
  eligibleSeriesIds: Set<string>
  hypoScores: Record<string, { team1Wins: number; team2Wins: number }>
  onHypoSelect: (seriesId: string, team1Wins: number, team2Wins: number) => void
  onHypoClear: (seriesId: string) => void
}

function isWhatIfEligibleSeries(
  s: Series,
  eligible: Set<string> | undefined
): boolean {
  if (!eligible?.size) return false
  const id = String(s._id)
  if (id.startsWith("placeholder")) return false
  return eligible.has(id)
}

/** Strip simulated winner so the modal matches the normal prediction flow */
function seriesToISeriesForWhatIfModal(s: Series): ISeries {
  const startTime = new Date(s.startTime)
  return {
    _id: s._id,
    seasonId: (s as unknown as Partial<ISeries>).seasonId ?? ({} as ISeries["seasonId"]),
    round: s.round,
    conference: s.conference,
    team1: s.team1,
    team2: s.team2,
    team1Seed: s.team1Seed,
    team2Seed: s.team2Seed,
    startTime,
    currentScore: s.currentScore ?? { team1Wins: 0, team2Wins: 0 },
    winner: undefined,
    createdAt: startTime,
    updatedAt: startTime,
  }
}

interface Series {
  _id: string
  round: "first" | "second" | "conference" | "finals"
  conference: "east" | "west" | null
  team1: string
  team2: string
  team1Seed?: number
  team2Seed?: number
  winner?: string
  startTime: Date | string
  currentScore?: {
    team1Wins: number
    team2Wins: number
  }
  status?: string
}

function bracketSeriesToISeriesForScoring(s: Series): ISeries {
  const startTime = new Date(s.startTime)
  return {
    _id: s._id,
    seasonId: (s as unknown as Partial<ISeries>).seasonId ?? ({} as ISeries["seasonId"]),
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
}

function formatPointsLabel(n: number): string {
  return n === 1 ? "1 point" : `${n} points`
}

/** First-round bracket order: each slot is a canonical seed pair (home/away order may vary in DB). */
const FIRST_ROUND_SEED_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7],
]

function seedsMatchFirstRoundSlot(
  s: Series,
  slot: readonly [number, number]
): boolean {
  const a = s.team1Seed
  const b = s.team2Seed
  if (a == null || b == null) return false
  return (
    (a === slot[0] && b === slot[1]) || (a === slot[1] && b === slot[0])
  )
}

/**
 * Map DB series to fixed first-round slots by seed pair — not by array order,
 * so e.g. only creating 4 vs 5 does not appear in the 1 vs 8 cell.
 */
function getFirstRoundMatchups(
  existing: Series[],
  conference: "west" | "east"
): Series[] {
  const used = new Set<string>()
  const bySlot: (Series | null)[] = FIRST_ROUND_SEED_SLOTS.map((slot) => {
    const found = existing.find((s) => {
      if (used.has(String(s._id))) return false
      return seedsMatchFirstRoundSlot(s, slot)
    })
    if (found) {
      used.add(String(found._id))
      return found
    }
    return null
  })

  const unplaced = existing.filter((s) => !used.has(String(s._id)))
  let u = 0
  return bySlot.map((slotSeries, idx) => {
    if (slotSeries) return slotSeries
    if (u < unplaced.length) {
      return unplaced[u++]
    }
    const slot = FIRST_ROUND_SEED_SLOTS[idx]
    return {
      _id: `placeholder-${conference}-${idx}`,
      round: "first",
      conference,
      team1: "TBD",
      team2: "TBD",
      team1Seed: slot[0],
      team2Seed: slot[1],
      startTime: new Date(),
      status: "upcoming",
    } as Series
  })
}

interface PlayoffBracketVisualProps {
  series: Series[]
  predictions?: IPrediction[]
  onPredictionSave?: (prediction: {
    seriesId: string
    predictedWinner: string
    predictedScore: {
      team1Wins: number
      team2Wins: number
    }
  }) => Promise<void>
  onSeriesClick?: (series: Series) => void // For admin mode
  isAdmin?: boolean
  isViewingOtherUser?: boolean
  viewingUserName?: string
  /** No prediction modal or admin series edit; display-only (e.g. what-if page) */
  readOnly?: boolean
  /** What-if page: highlight eligible matchups and open score picker on click */
  whatIfMode?: WhatIfBracketMode
  /** Omit outer card, border, and main title (e.g. inside a collapsible section) */
  embedded?: boolean
}


export function PlayoffBracketVisual({
  series,
  predictions = [],
  onPredictionSave,
  onSeriesClick,
  isAdmin = false,
  isViewingOtherUser = false,
  viewingUserName,
  readOnly = false,
  whatIfMode,
  embedded = false,
}: PlayoffBracketVisualProps) {
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [whatIfDialogSeries, setWhatIfDialogSeries] = useState<Series | null>(
    null
  )
  const [selectedRound, setSelectedRound] = useState<"first" | "second" | "conference" | "finals">("first")

  const handleBracketClick = (s: Series) => {
    if (
      whatIfMode &&
      isWhatIfEligibleSeries(s, whatIfMode.eligibleSeriesIds)
    ) {
      setWhatIfDialogSeries(s)
      return
    }
    handleSeriesClick(s)
  }

  const handleSeriesClick = (s: Series) => {
    console.log("Series clicked:", s)
    if (readOnly) {
      return
    }
    // Don't allow clicking when viewing another user's predictions
    if (isViewingOtherUser) {
      return
    }
    // If admin mode, use the provided handler
    if (isAdmin && onSeriesClick) {
      onSeriesClick(s)
      return
    }
    // Check if both teams are filled before allowing prediction
    if (s.team1 === "TBD" || s.team2 === "TBD" || !s.team1 || !s.team2) {
      alert("Both teams must be set before making a prediction")
      return
    }
    // Check if winner is already set
    if (s.winner) {
      alert("This series is locked. A winner has already been determined.")
      return
    }
    // Check if series is locked by time
    const now = new Date()
    const startTime = new Date(s.startTime)
    if (now >= startTime) {
      alert("This series is locked. Predictions cannot be made after the deadline.")
      return
    }
    // Otherwise, open prediction modal
    setSelectedSeries(s)
    setIsModalOpen(true)
  }

  const handleSavePrediction = async (prediction: {
    seriesId: string
    predictedWinner: string
    predictedScore: {
      team1Wins: number
      team2Wins: number
    }
  }) => {
    if (onPredictionSave) {
      await onPredictionSave(prediction)
    }
  }

  // Organize series by round (first round: placement by seed pair, not DB order)
  const firstRoundWest = series.filter(
    (s) => s.round === "first" && s.conference === "west"
  )
  const firstRoundEast = series.filter(
    (s) => s.round === "first" && s.conference === "east"
  )

  const secondRoundWest = series
    .filter((s) => s.round === "second" && s.conference === "west")
    .slice(0, 2)
  const secondRoundEast = series
    .filter((s) => s.round === "second" && s.conference === "east")
    .slice(0, 2)

  const conferenceWest = series.find(
    (s) => s.round === "conference" && s.conference === "west"
  )
  const conferenceEast = series.find(
    (s) => s.round === "conference" && s.conference === "east"
  )
  const finals = series.find((s) => s.round === "finals")

  const getSecondRoundMatchups = (existing: Series[], conference: "west" | "east") => {
    const matchups = [...existing]
    while (matchups.length < 2) {
      const idx = matchups.length
      matchups.push({
        _id: `placeholder-${conference}-second-${idx}`,
        round: "second",
        conference,
        team1: "TBD",
        team2: "TBD",
        startTime: new Date(),
        status: "upcoming",
      } as Series)
    }
    return matchups.slice(0, 2)
  }

  const getConferenceFinalsMatchup = (existing: Series | undefined, conference: "west" | "east") => {
    if (existing) return existing
    return {
      _id: `placeholder-${conference}-conf`,
      round: "conference",
      conference,
      team1: "TBD",
      team2: "TBD",
      startTime: new Date(),
      status: "upcoming",
    } as Series
  }

  const getFinalsMatchup = (existing: Series | undefined) => {
    if (existing) return existing
    return {
      _id: `placeholder-finals`,
      round: "finals",
      conference: null,
      team1: "TBD",
      team2: "TBD",
      startTime: new Date(),
      status: "upcoming",
    } as Series
  }

  const firstWest = getFirstRoundMatchups(firstRoundWest, "west")
  const firstEast = getFirstRoundMatchups(firstRoundEast, "east")
  const secondWest = getSecondRoundMatchups(secondRoundWest, "west")
  const secondEast = getSecondRoundMatchups(secondRoundEast, "east")
  const finalWestConf = getConferenceFinalsMatchup(conferenceWest, "west")
  const finalEastConf = getConferenceFinalsMatchup(conferenceEast, "east")
  const finalNBA = getFinalsMatchup(finals)

  // Round selector buttons (mobile only)
  const roundButtons = [
    { value: "first" as const, label: "First Round" },
    { value: "second" as const, label: "Second Round" },
    { value: "conference" as const, label: "Conference Finals" },
    { value: "finals" as const, label: "Finals" },
  ]

  // Helper function to render a round's content
  const renderRoundContent = (round: "first" | "second" | "conference" | "finals") => {
    if (round === "first") {
      return (
        <>
          {/* Column 1: Western First Round */}
          <div className="space-y-3 md:space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-xs md:text-sm">WESTERN CONFERENCE</h3>
            </div>
            {firstWest.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`west-first-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>

          {/* Column 7: Eastern First Round */}
          <div className="space-y-3 md:space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-xs md:text-sm">EASTERN CONFERENCE</h3>
            </div>
            {firstEast.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`east-first-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>
        </>
      )
    } else if (round === "second") {
      return (
        <>
          {/* Column 2: Western Second Round */}
          <div className="space-y-16 md:space-y-24 flex flex-col justify-center">
            <div className="text-center mb-2 md:hidden">
              <h3 className="font-bold text-xs md:text-sm">WESTERN CONFERENCE</h3>
            </div>
            {secondWest.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`west-second-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>

          {/* Column 6: Eastern Second Round */}
          <div className="space-y-16 md:space-y-24 flex flex-col justify-center">
            <div className="text-center mb-2 md:hidden">
              <h3 className="font-bold text-xs md:text-sm">EASTERN CONFERENCE</h3>
            </div>
            {secondEast.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`east-second-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>
        </>
      )
    } else if (round === "conference") {
      return (
        <>
          {/* Column 3: Western Conference Finals */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground">
                CONFERENCE FINALS
              </div>
            </div>
            <div className="text-center mb-2 md:hidden">
              <h3 className="font-bold text-xs md:text-sm">WESTERN CONFERENCE</h3>
            </div>
            <div className="relative" id="west-conf">
              <MatchupBox
                series={finalWestConf}
                prediction={predictions.find((p) => {
                  if (!p.seriesId) return false
                  const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                    ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                    : String(p.seriesId)
                  return seriesId === finalWestConf._id?.toString()
                })}
                onClick={() => handleBracketClick(finalWestConf)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
                readOnly={readOnly}
                whatIfEligible={
                  !!whatIfMode &&
                  isWhatIfEligibleSeries(
                    finalWestConf,
                    whatIfMode.eligibleSeriesIds
                  )
                }
              />
            </div>
          </div>

          {/* Column 5: Eastern Conference Finals */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground">
                CONFERENCE FINALS
              </div>
            </div>
            <div className="text-center mb-2 md:hidden">
              <h3 className="font-bold text-xs md:text-sm">EASTERN CONFERENCE</h3>
            </div>
            <div className="relative" id="east-conf">
              <MatchupBox
                series={finalEastConf}
                prediction={predictions.find((p) => {
                  if (!p.seriesId) return false
                  const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                    ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                    : String(p.seriesId)
                  return seriesId === finalEastConf._id?.toString()
                })}
                onClick={() => handleBracketClick(finalEastConf)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
                readOnly={readOnly}
                whatIfEligible={
                  !!whatIfMode &&
                  isWhatIfEligibleSeries(
                    finalEastConf,
                    whatIfMode.eligibleSeriesIds
                  )
                }
              />
            </div>
          </div>
        </>
      )
    } else if (round === "finals") {
      return (
        <>
          {/* Column 4: NBA Finals (Center) - Mobile: centered, Desktop: normal */}
          <div className="flex flex-col justify-center col-span-2">
            <div className="text-center mb-2">
              <div className="text-xs font-semibold text-muted-foreground">
                NBA FINALS
              </div>
            </div>
            <div className="relative flex justify-center" id="finals">
              <MatchupBox
                series={finalNBA}
                prediction={predictions.find((p) => {
                  if (!p.seriesId) return false
                  const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                    ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                    : String(p.seriesId)
                  return seriesId === finalNBA._id?.toString()
                })}
                onClick={() => handleBracketClick(finalNBA)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
                readOnly={readOnly}
                whatIfEligible={
                  !!whatIfMode &&
                  isWhatIfEligibleSeries(finalNBA, whatIfMode.eligibleSeriesIds)
                }
              />
            </div>
          </div>
        </>
      )
    }
    return null
  }

  return (
    <div
      className={cn(
        "w-full",
        embedded
          ? "p-0"
          : "bg-background border rounded-lg p-4 md:p-6"
      )}
    >
      {!embedded && (
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold">PLAYOFFS</h2>
        </div>
      )}

      {/* Round Selector Buttons (Mobile Only) */}
      <div className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-2">
        {roundButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={selectedRound === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRound(btn.value)}
            className="whitespace-nowrap text-xs px-3 py-1.5"
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Bracket Container - Desktop: 7 columns, Mobile: 2 columns (one round at a time) */}
      <div className="relative w-full min-h-[800px]">
        {/* Desktop: Full bracket */}
        <div className="hidden md:grid md:grid-cols-7 gap-2 md:gap-4 max-w-full">
          {/* Column 1: Western First Round */}
          <div className="space-y-3 md:space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-xs md:text-sm">WESTERN CONFERENCE</h3>
            </div>
            {firstWest.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`west-first-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>

          {/* Column 2: Western Second Round */}
          <div className="space-y-16 md:space-y-24 flex flex-col justify-center">
            {secondWest.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`west-second-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>

          {/* Column 3: Western Conference Finals */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground">
                CONFERENCE FINALS
              </div>
            </div>
            <div className="relative" id="west-conf">
              <MatchupBox
                series={finalWestConf}
                prediction={predictions.find((p) => {
                  if (!p.seriesId) return false
                  const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                    ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                    : String(p.seriesId)
                  return seriesId === finalWestConf._id?.toString()
                })}
                onClick={() => handleBracketClick(finalWestConf)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
                readOnly={readOnly}
                whatIfEligible={
                  !!whatIfMode &&
                  isWhatIfEligibleSeries(
                    finalWestConf,
                    whatIfMode.eligibleSeriesIds
                  )
                }
              />
            </div>
          </div>

          {/* Column 4: NBA Finals (Center) */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-xs font-semibold text-muted-foreground">
                NBA FINALS
              </div>
            </div>
            <div className="relative" id="finals">
              <MatchupBox
                series={finalNBA}
                prediction={predictions.find((p) => {
                  if (!p.seriesId) return false
                  const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                    ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                    : String(p.seriesId)
                  return seriesId === finalNBA._id?.toString()
                })}
                onClick={() => handleBracketClick(finalNBA)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
                readOnly={readOnly}
                whatIfEligible={
                  !!whatIfMode &&
                  isWhatIfEligibleSeries(finalNBA, whatIfMode.eligibleSeriesIds)
                }
              />
            </div>
          </div>

          {/* Column 5: Eastern Conference Finals */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground">
                CONFERENCE FINALS
              </div>
            </div>
            <div className="relative" id="east-conf">
              <MatchupBox
                series={finalEastConf}
                prediction={predictions.find((p) => {
                  if (!p.seriesId) return false
                  const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                    ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                    : String(p.seriesId)
                  return seriesId === finalEastConf._id?.toString()
                })}
                onClick={() => handleBracketClick(finalEastConf)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
                readOnly={readOnly}
                whatIfEligible={
                  !!whatIfMode &&
                  isWhatIfEligibleSeries(
                    finalEastConf,
                    whatIfMode.eligibleSeriesIds
                  )
                }
              />
            </div>
          </div>

          {/* Column 6: Eastern Second Round */}
          <div className="space-y-16 md:space-y-24 flex flex-col justify-center">
            {secondEast.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`east-second-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>

          {/* Column 7: Eastern First Round */}
          <div className="space-y-3 md:space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-xs md:text-sm">EASTERN CONFERENCE</h3>
            </div>
            {firstEast.map((matchup, idx) => {
              const prediction = predictions.find((p) => {
                if (!p.seriesId) return false
                const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                  ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                  : String(p.seriesId)
                return seriesId === matchup._id?.toString()
              })
              return (
                <div
                  key={matchup._id}
                  id={`east-first-${idx}`}
                  className="relative"
                >
                  <MatchupBox
                    series={matchup}
                    prediction={prediction}
                    onClick={() => handleBracketClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                    readOnly={readOnly}
                    whatIfEligible={
                      !!whatIfMode &&
                      isWhatIfEligibleSeries(matchup, whatIfMode.eligibleSeriesIds)
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile: Single round at a time with smooth animation.
            Use overflow-x-hidden only — overflow-hidden clips ring-offset / shadows
            on what-if eligible cells and the bottom row of first round. */}
        <div className="md:hidden relative min-h-[400px] w-full overflow-x-hidden pb-2">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${roundButtons.findIndex((btn) => btn.value === selectedRound) * 100}%)`,
            }}
          >
            {roundButtons.map((btn) => (
              <div
                key={btn.value}
                className="w-full flex-shrink-0 grid grid-cols-2 gap-4 px-2 pb-8 pt-1 items-start"
              >
                {renderRoundContent(btn.value)}
              </div>
            ))}
          </div>
        </div>

        {/* Prediction Modal (only for non-admin mode) */}
        {!isAdmin && selectedSeries ? (
          <PredictionModal
            series={{
              ...selectedSeries,
              seasonId: (selectedSeries as any).seasonId || ({} as any),
              createdAt: (selectedSeries as any).createdAt || new Date(),
              updatedAt: (selectedSeries as any).updatedAt || new Date(),
            } as ISeries}
            prediction={predictions.find((p) => {
              if (!p.seriesId) return false
              const seriesId = typeof p.seriesId === 'object' && p.seriesId !== null
                ? (p.seriesId as any)._id?.toString() || (p.seriesId as any).toString()
                : String(p.seriesId)
              return seriesId === selectedSeries._id?.toString()
            })}
            isOpen={isModalOpen}
            onClose={() => {
              console.log("Closing modal")
              setIsModalOpen(false)
              setSelectedSeries(null)
            }}
            onSave={handleSavePrediction}
          />
        ) : null}

        {whatIfMode && whatIfDialogSeries ? (
          <PredictionModal
            series={seriesToISeriesForWhatIfModal(whatIfDialogSeries)}
            isOpen={true}
            onClose={() => setWhatIfDialogSeries(null)}
            onSave={async (pred) => {
              whatIfMode.onHypoSelect(
                pred.seriesId,
                pred.predictedScore.team1Wins,
                pred.predictedScore.team2Wins
              )
              setWhatIfDialogSeries(null)
            }}
            simulationMode
            initialSimulatedScore={
              whatIfMode.hypoScores[String(whatIfDialogSeries._id)] ?? null
            }
            onClearSimulation={() => {
              whatIfMode.onHypoClear(String(whatIfDialogSeries._id))
            }}
          />
        ) : null}
      </div>
    </div>
  )
}


function MatchupBox({
  series,
  prediction,
  onClick,
  isAdmin = false,
  isViewingOtherUser = false,
  viewingUserName,
  readOnly = false,
  whatIfEligible = false,
}: {
  series: Series
  prediction?: IPrediction
  onClick?: () => void
  isAdmin?: boolean
  isViewingOtherUser?: boolean
  viewingUserName?: string
  readOnly?: boolean
  whatIfEligible?: boolean
}) {
  const team1Wins = series.currentScore?.team1Wins || 0
  const team2Wins = series.currentScore?.team2Wins || 0
  // Check if teams are set - handle "TBD", "none", empty strings, and null/undefined
  const teamsSet = 
    series.team1 && 
    series.team2 && 
    series.team1 !== "TBD" && 
    series.team2 !== "TBD" && 
    series.team1 !== "none" && 
    series.team2 !== "none" &&
    String(series.team1).trim() !== "" &&
    String(series.team2).trim() !== ""
  const now = new Date()
  const startTime = new Date(series.startTime)
  const isLockedByTime = now >= startTime
  const isLockedByWinner = !!series.winner
  const isLocked = !teamsSet || isLockedByTime || isLockedByWinner
  // Current score should show when: series is locked by time (deadline passed)
  const hasScore = isLockedByTime && series.currentScore !== undefined
  // Admins can always click, regular users can only click if teams are set and not locked (by time or winner)
  // When viewing another user, disable clicking
  const canClick =
    (whatIfEligible && teamsSet) ||
    (!readOnly &&
      !isViewingOtherUser &&
      (isAdmin || (teamsSet && !isLockedByTime && !isLockedByWinner)))
  
  // Lock visibility logic (matching Play-In behavior):
  // - Big lock: Only when teams are NOT set (for non-admin users)
  // - Small lock: Only when teams ARE set AND (deadline passed OR winner set) (for non-admin users, or when viewing another user's locked predictions)
  // - No lock: When teams are set AND deadline has NOT passed AND winner is NOT set (user can make prediction)
  const showBigLock = !teamsSet && !isAdmin
  const showSmallLock = teamsSet && (isLockedByTime || isLockedByWinner) && (!isAdmin || isViewingOtherUser)

  const playoffPointsEarned =
    series.winner && prediction?.predictedScore
      ? calculateSeriesScore(
          prediction,
          bracketSeriesToISeriesForScoring(series),
          series.round
        ).points
      : null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (whatIfEligible && teamsSet) {
      onClick?.()
      return
    }
    if (readOnly) return
    // Admins can always click, regular users need teams set and not locked by time
    if (!isAdmin) {
      if (!teamsSet) {
        return // Don't allow clicking if teams aren't set
      }
      if (isLockedByTime || isLockedByWinner) {
        return // Don't allow clicking if locked by time or winner (handled in parent)
      }
    }
    if (onClick) {
      console.log("MatchupBox clicked, calling onClick")
      onClick()
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 w-full max-w-[160px] md:max-w-[200px]",
        canClick && "cursor-pointer hover:opacity-80 transition-opacity",
        whatIfEligible &&
          teamsSet &&
          "rounded-md p-0.5 ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-2 ring-offset-background shadow-sm"
      )}
      onClick={canClick ? handleClick : undefined}
      title={
        whatIfEligible && teamsSet
          ? "Click to set a simulated final score (not saved)"
          : canClick
            ? undefined
            : !teamsSet
              ? "Both teams must be set before making a prediction"
              : isLockedByWinner
                ? "This series is locked. A winner has already been determined."
                : "This series is locked. Predictions cannot be made after the deadline."
      }
    >
      <div className={showBigLock ? "opacity-40" : ""}>
        <BracketTeamBox
        team={series.team1}
        seed={series.team1Seed}
        isWinner={series.winner === series.team1}
        wins={team1Wins}
        hasScore={hasScore}
        hasPrediction={prediction?.predictedWinner === series.team1}
        actualWinner={series.winner}
      />
      <div className="text-center text-[8px] md:text-[9px] text-muted-foreground">vs</div>
      <BracketTeamBox
        team={series.team2}
        seed={series.team2Seed}
        isWinner={series.winner === series.team2}
        wins={team2Wins}
        hasScore={hasScore}
        hasPrediction={prediction?.predictedWinner === series.team2}
        actualWinner={series.winner}
      />
      {/* Predicted Score Display */}
      {prediction?.predictedScore && (
        <div className="text-center mt-1 flex items-center justify-center gap-1">
          <span className="text-[8px] md:text-[9px] text-muted-foreground font-medium">
            {isViewingOtherUser && viewingUserName 
              ? `${viewingUserName.split(' ')[0]}'s prediction:`
              : "Predicted:"}{" "}
            {prediction.predictedScore.team1Wins}-{prediction.predictedScore.team2Wins}
            {playoffPointsEarned !== null && (
              <span className="whitespace-nowrap">
                {" "}
                ({formatPointsLabel(playoffPointsEarned)})
              </span>
            )}
          </span>
          {showSmallLock && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      )}
      {/* Show lock icon and "No prediction submitted" text when series is over and no prediction exists */}
      {showSmallLock && !prediction?.predictedScore && (
        <div className="text-center mt-1 flex items-center justify-center gap-1">
          <span className="text-[8px] md:text-[9px] text-muted-foreground font-medium">
            No prediction submitted ({formatPointsLabel(0)})
          </span>
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      <LockCountdown
        lockAt={series.startTime}
        hide={isLockedByTime || isLockedByWinner}
        className="mt-0.5 text-[7px] md:text-[8px] leading-tight gap-0.5"
        iconClassName="h-2 w-2 md:h-2.5 md:w-2.5"
      />
      </div>
      
      {/* Big lock overlay (only when teams are NOT set) */}
      {showBigLock && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Lock className="h-8 w-8 md:h-10 md:w-10 text-foreground drop-shadow-lg" />
        </div>
      )}
    </div>
  )
}

function EmptyMatchupBox() {
  return (
    <div className="w-full max-w-[160px] md:max-w-[200px] h-20 md:h-24 border-2 border-dashed border-border rounded flex items-center justify-center">
      <span className="text-[10px] md:text-xs text-muted-foreground">TBD</span>
    </div>
  )
}

function EmptyConferenceFinalsBox({
  onClick,
  isAdmin,
}: {
  onClick?: () => void
  isAdmin?: boolean
}) {
  // Show two team boxes like a regular matchup
  const handleClick = (e: React.MouseEvent) => {
    if (isAdmin && onClick) {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }
  }

  return (
    <div
      className={`flex flex-col gap-1 w-full max-w-[160px] md:max-w-[200px] ${
        isAdmin && onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={handleClick}
    >
      <Card className="h-10 md:h-12 flex items-center justify-between px-2 border-2 border-dashed border-border">
        <CardContent className="p-0 flex items-center gap-1.5 md:gap-2 w-full">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0">
            ?
          </div>
          <div className="flex-1 font-medium text-[10px] md:text-xs truncate">
            TBD
          </div>
        </CardContent>
      </Card>
      <Card className="h-10 md:h-12 flex items-center justify-between px-2 border-2 border-dashed border-border">
        <CardContent className="p-0 flex items-center gap-1.5 md:gap-2 w-full">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0">
            ?
          </div>
          <div className="flex-1 font-medium text-[10px] md:text-xs truncate">
            TBD
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
