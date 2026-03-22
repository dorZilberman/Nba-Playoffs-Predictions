"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Lock } from "lucide-react"
import { formatToIST } from "@/app/lib/utils/timezone"
import { isSeriesLocked } from "@/app/lib/locking/lockChecker"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import { LockCountdown } from "@/components/bracket/LockCountdown"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface PredictionModalProps {
  series: ISeries
  prediction?: IPrediction
  isOpen: boolean
  onClose: () => void
  onSave: (prediction: {
    seriesId: string
    predictedWinner: string
    predictedScore: {
      team1Wins: number
      team2Wins: number
    }
  }) => Promise<void>
  /** Simulator page: same UI as predictions, but nothing is persisted; optional clear */
  simulationMode?: boolean
  /** Pre-fill when reopening the simulator dialog */
  initialSimulatedScore?: { team1Wins: number; team2Wins: number } | null
  onClearSimulation?: () => void
}

export function PredictionModal({
  series,
  prediction,
  isOpen,
  onClose,
  onSave,
  simulationMode = false,
  initialSimulatedScore,
  onClearSimulation,
}: PredictionModalProps) {
  const locked = simulationMode
    ? false
    : isSeriesLocked(series) || !!series.winner
  const [selectedWinner, setSelectedWinner] = useState<string | null>(
    prediction?.predictedWinner || null
  )
  const [team1Wins, setTeam1Wins] = useState(
    prediction?.predictedScore?.team1Wins ?? 0
  )
  const [team2Wins, setTeam2Wins] = useState(
    prediction?.predictedScore?.team2Wins ?? 0
  )
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens or prediction / simulated score initial changes
  useEffect(() => {
    if (!isOpen) return
    if (simulationMode) {
      const h = initialSimulatedScore
      if (
        h &&
        ((h.team1Wins === 4 && h.team2Wins <= 3) ||
          (h.team2Wins === 4 && h.team1Wins <= 3))
      ) {
        setSelectedWinner(h.team1Wins === 4 ? series.team1 : series.team2)
        setTeam1Wins(h.team1Wins)
        setTeam2Wins(h.team2Wins)
      } else {
        setSelectedWinner(null)
        setTeam1Wins(0)
        setTeam2Wins(0)
      }
      return
    }
    setSelectedWinner(prediction?.predictedWinner || null)
    setTeam1Wins(prediction?.predictedScore?.team1Wins ?? 0)
    setTeam2Wins(prediction?.predictedScore?.team2Wins ?? 0)
  }, [isOpen, prediction, simulationMode, initialSimulatedScore, series.team1, series.team2])

  const handleSave = async () => {
    if (!selectedWinner) return

    // Double-check if locked (in case time passed or winner was set while modal was open)
    if (locked && !simulationMode) {
      if (series.winner) {
        alert("This series is locked. A winner has already been determined.")
      } else {
        alert("This series is locked. Predictions cannot be made after the deadline.")
      }
      return
    }

    // Validate score (winner must have 4 wins, loser can have 0-3)
    if (selectedWinner === series.team1 && team1Wins !== 4) {
      alert("Selected winner must have 4 wins")
      return
    }

    if (selectedWinner === series.team2 && team2Wins !== 4) {
      alert("Selected winner must have 4 wins")
      return
    }

    // Validate loser has 0-3 wins
    if (selectedWinner === series.team1 && (team2Wins < 0 || team2Wins > 3)) {
      alert("Loser must have between 0 and 3 wins")
      return
    }

    if (selectedWinner === series.team2 && (team1Wins < 0 || team1Wins > 3)) {
      alert("Loser must have between 0 and 3 wins")
      return
    }

    setSaving(true)
    try {
      await onSave({
        seriesId: series._id,
        predictedWinner: selectedWinner,
        predictedScore: {
          team1Wins,
          team2Wins,
        },
      })
      onClose()
    } catch (error) {
      console.error("Error saving prediction:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save prediction"
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleTeamClick = (team: string) => {
    if (locked) return
    setSelectedWinner(team)
    // Reset to default 4-0 when selecting a winner
    if (team === series.team1) {
      setTeam1Wins(4)
      setTeam2Wins(0)
    } else {
      setTeam1Wins(0)
      setTeam2Wins(4)
    }
  }

  const handleScoreSelect = (loserWins: number) => {
    if (locked || !selectedWinner) return
    if (selectedWinner === series.team1) {
      setTeam1Wins(4)
      setTeam2Wins(loserWins)
    } else {
      setTeam1Wins(loserWins)
      setTeam2Wins(4)
    }
  }

  // Get the currently selected score option (0-3 for loser wins)
  const getSelectedScoreOption = (): number | null => {
    if (!selectedWinner) return null
    if (selectedWinner === series.team1) {
      return team2Wins
    } else {
      return team1Wins
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="grid min-w-0 sm:max-w-md max-w-[min(100vw-1.5rem,28rem)] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {simulationMode ? (
              <>
                Simulated final score
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {series.round.charAt(0).toUpperCase() + series.round.slice(1)} round
                  {series.conference
                    ? ` — ${series.conference.toUpperCase()}`
                    : ""}
                </span>
              </>
            ) : (
              `${series.round.charAt(0).toUpperCase() + series.round.slice(1)} Round${
                series.conference ? ` - ${series.conference.toUpperCase()}` : ""
              }`
            )}
          </DialogTitle>
          {simulationMode ? (
            <DialogDescription className="sr-only">
              Choose a simulated final score for this series.
            </DialogDescription>
          ) : (
            <DialogDescription>
              {locked ? (
                <span className="flex items-center gap-2 text-destructive">
                  <Lock className="h-4 w-4" />
                  {series.winner
                    ? "This series is locked. A winner has already been determined."
                    : "This series is locked"}
                </span>
              ) : (
                <span>Make your prediction for this series</span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-4">
          {/* Series Info */}
          <div className="text-sm text-muted-foreground">
            <div>Start Time: {formatToIST(series.startTime)}</div>
            <LockCountdown
              lockAt={series.startTime}
              hide={locked || simulationMode}
            />
            {(() => {
              const now = new Date()
              const startTime = new Date(series.startTime)
              const isLockedByTime = now >= startTime
              // Show current score when: series is locked by time (deadline passed)
              const shouldShowScore = isLockedByTime && series.currentScore !== undefined
              
              return shouldShowScore ? (
                <div className="flex max-w-full flex-nowrap items-center gap-x-2 gap-y-1 overflow-x-auto">
                  <span className="shrink-0 text-muted-foreground">Current Score:</span>
                  <TeamDisplay
                    teamName={series.team1}
                    size="sm"
                    showName={false}
                    className="shrink-0"
                  />
                  <span className="shrink-0 whitespace-nowrap font-medium tabular-nums text-foreground">
                    {series.currentScore.team1Wins} – {series.currentScore.team2Wins}
                  </span>
                  <TeamDisplay
                    teamName={series.team2}
                    size="sm"
                    showName={false}
                    className="shrink-0"
                  />
                </div>
              ) : null
            })()}
            {series.winner && !simulationMode && (
              <div className="font-semibold text-foreground flex items-center gap-2">
                Winner: <TeamDisplay teamName={series.winner} size="sm" />
              </div>
            )}
          </div>

          {/* Team Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Winner
            </label>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
              <Button
                type="button"
                variant={selectedWinner === series.team1 ? "default" : "outline"}
                onClick={() => handleTeamClick(series.team1)}
                disabled={locked}
                className="h-auto min-h-[64px] min-w-0 w-full max-w-full flex flex-col items-center justify-center gap-2 overflow-hidden px-2 py-3 sm:px-3"
              >
                <TeamDisplay teamName={series.team1} size="sm" showName={false} />
                <div className="w-full max-w-full font-semibold text-xs text-center break-words hyphens-auto">
                  {series.team1}
                </div>
                {selectedWinner === series.team1 && (
                  <Check className="h-5 w-5 mt-1 shrink-0" />
                )}
              </Button>
              <Button
                type="button"
                variant={selectedWinner === series.team2 ? "default" : "outline"}
                onClick={() => handleTeamClick(series.team2)}
                disabled={locked}
                className="h-auto min-h-[64px] min-w-0 w-full max-w-full flex flex-col items-center justify-center gap-2 overflow-hidden px-2 py-3 sm:px-3"
              >
                <TeamDisplay teamName={series.team2} size="sm" showName={false} />
                <div className="w-full max-w-full font-semibold text-xs text-center break-words hyphens-auto">
                  {series.team2}
                </div>
                {selectedWinner === series.team2 && (
                  <Check className="h-5 w-5 mt-1 shrink-0" />
                )}
              </Button>
            </div>
          </div>

          {/* Score Selection */}
          {selectedWinner && (!locked || simulationMode) && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Final Series Score
              </label>
              <div className="grid min-w-0 grid-cols-4 gap-1.5 sm:gap-2">
                {[0, 1, 2, 3].map((loserWins) => {
                  const isSelected = getSelectedScoreOption() === loserWins
                  const winnerWins = 4
                  const displayScore = selectedWinner === series.team1
                    ? `${winnerWins}-${loserWins}`
                    : `${loserWins}-${winnerWins}`
                  
                  return (
                    <Button
                      key={loserWins}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleScoreSelect(loserWins)}
                      className="h-12 min-w-0 px-1 font-semibold sm:px-3"
                    >
                      {displayScore}
                      {isSelected && <Check className="h-4 w-4 ml-1" />}
                    </Button>
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-2 text-center">
                {selectedWinner === series.team1
                  ? `${series.team1} wins ${team1Wins}-${team2Wins}`
                  : `${series.team2} wins ${team2Wins}-${team1Wins}`}
              </div>
            </div>
          )}

          {/* Current Prediction Display */}
          {prediction && !simulationMode && (
            <div className="rounded border-2 border-secondary p-3">
              <div className="text-sm font-semibold text-foreground mb-2">
                Your Current Prediction
              </div>
              {prediction.predictedScore && (
                <div className="text-sm flex items-center gap-2 whitespace-nowrap overflow-hidden">
                  <div className="shrink-0">
                    <TeamDisplay teamName={series.team1} size="sm" />
                  </div>
                  <span className="font-semibold shrink-0">
                    {prediction.predictedScore.team1Wins} - {prediction.predictedScore.team2Wins}
                  </span>
                  <div className="shrink-0">
                    <TeamDisplay teamName={series.team2} size="sm" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-row flex-nowrap items-center justify-center gap-2">
          <Button variant="outline" onClick={onClose} className="shrink-0">
            Cancel
          </Button>
          {simulationMode && onClearSimulation && (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                onClearSimulation()
                onClose()
              }}
            >
              Clear Score
            </Button>
          )}
          {(!locked || simulationMode) && (
            <Button
              onClick={handleSave}
              disabled={!selectedWinner || saving}
              className="shrink-0"
            >
              {simulationMode
                ? "Apply Score"
                : prediction
                  ? "Update Prediction"
                  : "Save Prediction"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
