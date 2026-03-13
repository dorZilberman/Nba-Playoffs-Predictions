"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, Check } from "lucide-react"
import { formatToIST } from "@/app/lib/utils/timezone"
import { isSeriesLocked } from "@/app/lib/locking/lockChecker"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface SeriesCardProps {
  series: ISeries
  prediction?: IPrediction
  isCurrentUser: boolean
  onPredictionChange: (prediction: Partial<IPrediction>) => Promise<void>
}

export function SeriesCard({
  series,
  prediction,
  isCurrentUser,
  onPredictionChange,
}: SeriesCardProps) {
  const locked = isSeriesLocked(series)
  const [team1Wins, setTeam1Wins] = useState(
    prediction?.predictedScore?.team1Wins ?? 0
  )
  const [team2Wins, setTeam2Wins] = useState(
    prediction?.predictedScore?.team2Wins ?? 0
  )
  const [selectedWinner, setSelectedWinner] = useState<string | null>(
    prediction?.predictedWinner || null
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selectedWinner) return

    // Validate score
    const totalWins = team1Wins + team2Wins
    if (totalWins !== 4) {
      alert("Total wins must equal 4")
      return
    }

    if (selectedWinner === series.team1 && team1Wins !== 4) {
      alert("Selected winner must have 4 wins")
      return
    }

    if (selectedWinner === series.team2 && team2Wins !== 4) {
      alert("Selected winner must have 4 wins")
      return
    }

    setSaving(true)
    try {
      await onPredictionChange({
        seriesId: series._id,
        predictedWinner: selectedWinner,
        predictedScore: {
          team1Wins,
          team2Wins,
        },
      })
    } catch (error) {
      console.error("Error saving prediction:", error)
      alert("Failed to save prediction")
    } finally {
      setSaving(false)
    }
  }

  const handleTeamClick = (team: string) => {
    if (locked || !isCurrentUser) return
    setSelectedWinner(team)
    if (team === series.team1) {
      setTeam1Wins(4)
      setTeam2Wins(0)
    } else {
      setTeam1Wins(0)
      setTeam2Wins(4)
    }
  }

  return (
    <Card className={`relative ${locked ? "opacity-75" : ""}`}>
      {locked && (
        <div className="absolute right-2 top-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {series.round} {series.conference && `(${series.conference})`}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatToIST(series.startTime)}
          </div>

          {/* Real Result */}
          {series.winner && (
            <div className="rounded bg-primary/10 p-2">
              <div className="text-xs font-semibold text-primary">Real Result</div>
              <div className="font-bold flex items-center gap-2">
                <TeamDisplay teamName={series.team1} size="sm" />
                {series.currentScore.team1Wins} - {series.currentScore.team2Wins}
                <TeamDisplay teamName={series.team2} size="sm" />
              </div>
              <div className="text-sm font-medium flex items-center gap-2">
                Winner: <TeamDisplay teamName={series.winner} size="sm" />
              </div>
            </div>
          )}

          {/* User Prediction Display */}
          {prediction && (locked || isCurrentUser) && (
            <div className="rounded border-2 border-secondary p-2">
              <div className="text-xs font-semibold text-secondary">
                {isCurrentUser ? "Your Prediction" : "Prediction"}
              </div>
              {prediction.predictedScore && (
                <div className="font-bold flex items-center gap-2">
                  <TeamDisplay teamName={series.team1} size="sm" />
                  {prediction.predictedScore.team1Wins} -{" "}
                  {prediction.predictedScore.team2Wins}
                  <TeamDisplay teamName={series.team2} size="sm" />
                </div>
              )}
              <div className="text-sm font-medium flex items-center gap-2">
                Winner: <TeamDisplay teamName={prediction.predictedWinner} size="sm" />
              </div>
            </div>
          )}

          {/* Prediction Input */}
          {!locked && isCurrentUser && (
            <div className="space-y-3 rounded border p-3">
              <div className="text-xs font-semibold">Make Your Prediction</div>

              {/* Team Selection */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={
                    selectedWinner === series.team1 ? "default" : "outline"
                  }
                  onClick={() => handleTeamClick(series.team1)}
                  className="w-full"
                >
                  {series.team1}
                  {selectedWinner === series.team1 && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={
                    selectedWinner === series.team2 ? "default" : "outline"
                  }
                  onClick={() => handleTeamClick(series.team2)}
                  className="w-full"
                >
                  {series.team2}
                  {selectedWinner === series.team2 && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Score Input */}
              {selectedWinner && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {series.team1} Wins
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={team1Wins}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        setTeam1Wins(val)
                        setTeam2Wins(4 - val)
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {series.team2} Wins
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={team2Wins}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        setTeam2Wins(val)
                        setTeam1Wins(4 - val)
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={!selectedWinner || saving}
                className="w-full"
              >
                {prediction ? "Update Prediction" : "Save Prediction"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
