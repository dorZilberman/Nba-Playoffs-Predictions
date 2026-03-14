"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Check } from "lucide-react"
import { formatToIST } from "@/app/lib/utils/timezone"
import { isPlayInGameLocked } from "@/app/lib/locking/lockChecker"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface PlayInCardProps {
  game: IPlayInGame
  prediction?: IPrediction
  isCurrentUser: boolean
  onPredictionChange: (prediction: Partial<IPrediction>) => Promise<void>
}

export function PlayInCard({
  game,
  prediction,
  isCurrentUser,
  onPredictionChange,
}: PlayInCardProps) {
  const locked = isPlayInGameLocked(game)
  const [selectedWinner, setSelectedWinner] = useState<string | null>(
    prediction?.predictedWinner || null
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selectedWinner) return

    setSaving(true)
    try {
      await onPredictionChange({
        playInGameId: game._id as any,
        predictedWinner: selectedWinner,
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
          <div className="text-xs text-muted-foreground">{game.gameType}</div>
          <div className="text-xs text-muted-foreground">
            Prediction Deadline: {formatToIST(game.startTime)}
          </div>

          {/* Real Result */}
          {game.winner && (
            <div className="rounded bg-primary/10 p-2">
              <div className="text-xs font-semibold text-primary">Real Result</div>
              <div className="font-bold">
                {game.team1} vs {game.team2}
              </div>
              <div className="text-sm font-medium">Winner: {game.winner}</div>
            </div>
          )}

          {/* User Prediction Display */}
          {prediction && (locked || isCurrentUser) && (
            <div className="rounded border-2 border-secondary p-2">
              <div className="text-xs font-semibold text-secondary">
                {isCurrentUser ? "Your Prediction" : "Prediction"}
              </div>
              <div className="text-sm font-medium">
                Winner: {prediction.predictedWinner}
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
                    selectedWinner === game.team1 ? "default" : "outline"
                  }
                  onClick={() => handleTeamClick(game.team1)}
                  className="w-full"
                >
                  {game.team1}
                  {selectedWinner === game.team1 && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={
                    selectedWinner === game.team2 ? "default" : "outline"
                  }
                  onClick={() => handleTeamClick(game.team2)}
                  className="w-full"
                >
                  {game.team2}
                  {selectedWinner === game.team2 && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </div>

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
