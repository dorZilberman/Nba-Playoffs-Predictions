"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PredictionModal } from "./PredictionModal"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import { Lock, X } from "lucide-react"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPrediction } from "@/app/lib/models/Prediction"

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
}


export function PlayoffBracketVisual({
  series,
  predictions = [],
  onPredictionSave,
  onSeriesClick,
  isAdmin = false,
  isViewingOtherUser = false,
  viewingUserName,
}: PlayoffBracketVisualProps) {
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSeriesClick = (s: Series) => {
    console.log("Series clicked:", s)
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

  // Organize series by round
  const firstRoundWest = series
    .filter((s) => s.round === "first" && s.conference === "west")
    .slice(0, 4)
  const firstRoundEast = series
    .filter((s) => s.round === "first" && s.conference === "east")
    .slice(0, 4)

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

  // Create placeholder matchups
  const getFirstRoundMatchups = (existing: Series[], conference: "west" | "east") => {
    const matchups = [...existing]
    const seeds = [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ]
    while (matchups.length < 4) {
      const idx = matchups.length
      matchups.push({
        _id: `placeholder-${conference}-${idx}`,
        round: "first",
        conference,
        team1: "TBD",
        team2: "TBD",
        team1Seed: seeds[idx][0],
        team2Seed: seeds[idx][1],
        startTime: new Date(),
        status: "upcoming",
      } as Series)
    }
    return matchups.slice(0, 4)
  }

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

  return (
    <div className="w-full bg-background border rounded-lg p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">PLAYOFFS</h2>
      </div>

        {/* Bracket Container - Now 7 columns to include conference finals and NBA finals in center */}
        <div className="relative w-full min-h-[800px]">
          <div className="grid grid-cols-7 gap-2 md:gap-4 max-w-full">
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
                    onClick={() => handleSeriesClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
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
                    onClick={() => handleSeriesClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
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
                onClick={() => handleSeriesClick(finalWestConf)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
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
                onClick={() => handleSeriesClick(finalNBA)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
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
                onClick={() => handleSeriesClick(finalEastConf)}
                isAdmin={isAdmin}
                isViewingOtherUser={isViewingOtherUser}
                viewingUserName={viewingUserName}
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
                    onClick={() => handleSeriesClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
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
                    onClick={() => handleSeriesClick(matchup)}
                    isAdmin={isAdmin}
                    isViewingOtherUser={isViewingOtherUser}
                    viewingUserName={viewingUserName}
                  />
                </div>
              )
            })}
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
}: {
  series: Series
  prediction?: IPrediction
  onClick?: () => void
  isAdmin?: boolean
  isViewingOtherUser?: boolean
  viewingUserName?: string
}) {
  const team1Wins = series.currentScore?.team1Wins || 0
  const team2Wins = series.currentScore?.team2Wins || 0
  const hasScore = team1Wins + team2Wins > 0
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
  // Admins can always click, regular users can only click if teams are set and not locked (by time or winner)
  // When viewing another user, disable clicking
  const canClick = !isViewingOtherUser && (isAdmin || (teamsSet && !isLockedByTime && !isLockedByWinner))
  
  // Lock visibility logic (matching Play-In behavior):
  // - Big lock: Only when teams are NOT set (for non-admin users)
  // - Small lock: Only when teams ARE set AND (deadline passed OR winner set) (for non-admin users, or when viewing another user's locked predictions)
  // - No lock: When teams are set AND deadline has NOT passed AND winner is NOT set (user can make prediction)
  const showBigLock = !teamsSet && !isAdmin
  const showSmallLock = teamsSet && (isLockedByTime || isLockedByWinner) && (!isAdmin || isViewingOtherUser)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
      className={`relative flex flex-col gap-1 w-full max-w-[160px] md:max-w-[200px] ${
        canClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={canClick ? handleClick : undefined}
      title={
        canClick
          ? undefined
          : !teamsSet
            ? "Both teams must be set before making a prediction"
            : isLockedByWinner
              ? "This series is locked. A winner has already been determined."
              : "This series is locked. Predictions cannot be made after the deadline."
      }
    >
      <div className={showBigLock ? "opacity-40" : ""}>
        <TeamBox
        team={series.team1}
        seed={series.team1Seed}
        isWinner={series.winner === series.team1}
        wins={team1Wins}
        hasScore={hasScore}
        hasPrediction={prediction?.predictedWinner === series.team1}
        actualWinner={series.winner}
      />
      <div className="text-center text-[8px] md:text-[9px] text-muted-foreground">vs</div>
      <TeamBox
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
              : "Predicted:"} {prediction.predictedScore.team1Wins}-{prediction.predictedScore.team2Wins}
          </span>
          {showSmallLock && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      )}
      {/* Show lock icon even if no predicted score exists */}
      {showSmallLock && !prediction?.predictedScore && (
        <div className="text-center mt-1">
          <Lock className="h-3 w-3 text-muted-foreground mx-auto" />
        </div>
      )}
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

function TeamBox({
  team,
  seed,
  isWinner,
  wins,
  hasScore,
  hasPrediction,
  actualWinner,
}: {
  team: string
  seed?: number
  isWinner?: boolean
  wins: number
  hasScore: boolean
  hasPrediction?: boolean
  actualWinner?: string
}) {
  // Check if user predicted correctly
  const correctPrediction = hasPrediction && isWinner
  // Check if user predicted incorrectly
  const wrongPrediction = hasPrediction && !isWinner && actualWinner

  return (
    <Card
      className={`h-10 md:h-12 flex items-center border-2 ${
        isWinner
          ? "bg-yellow-400/40 dark:bg-yellow-500/30 border-yellow-500 dark:border-yellow-400 font-semibold"
          : hasPrediction
            ? "bg-primary/20 border-2 border-primary"
            : "bg-card border-border"
      }`}
    >
      <CardContent className="p-0 flex items-center gap-1 w-full min-w-0 overflow-hidden px-2">
        <div className="shrink-0 w-4 h-4 flex items-center justify-center">
          <TeamDisplay teamName={team} size="sm" showName={false} />
        </div>
        <div className="flex-1 font-medium text-[9px] md:text-[10px] truncate min-w-0 overflow-hidden" title={team}>
          {team}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {seed !== undefined && (
            <span className="text-[8px] md:text-[9px] text-muted-foreground whitespace-nowrap">
              ({seed})
            </span>
          )}
          {hasScore && (
            <span className="text-[9px] md:text-[10px] font-semibold whitespace-nowrap">{wins}</span>
          )}
          {correctPrediction && (
            <span className="text-[9px] md:text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">✓</span>
          )}
          {wrongPrediction && (
            <X className="h-2.5 w-2.5 md:h-3 md:w-3 text-red-600 dark:text-red-400 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
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
