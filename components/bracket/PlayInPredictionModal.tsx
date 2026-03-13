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
import { isPlayInGameLocked } from "@/app/lib/locking/lockChecker"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface PlayInPredictionModalProps {
  game: IPlayInGame
  prediction?: IPrediction
  isOpen: boolean
  onClose: () => void
  onSave: (prediction: {
    playInGameId: string
    predictedWinner: string
  }) => Promise<void>
}

export function PlayInPredictionModal({
  game,
  prediction,
  isOpen,
  onClose,
  onSave,
}: PlayInPredictionModalProps) {
  const locked = isPlayInGameLocked(game) || !!game.winner
  const [selectedWinner, setSelectedWinner] = useState<string | null>(
    prediction?.predictedWinner || null
  )
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens or prediction changes
  useEffect(() => {
    if (isOpen) {
      setSelectedWinner(prediction?.predictedWinner || null)
    }
  }, [isOpen, prediction])

  const handleSave = async () => {
    if (!selectedWinner) {
      alert("Please select a winning team")
      return
    }

    // Double-check if locked (in case time passed or winner was set while modal was open)
    if (locked) {
      if (game.winner) {
        alert("This game is locked. A winner has already been determined.")
      } else {
        alert("This game is locked. Predictions cannot be made after the deadline.")
      }
      return
    }

    setSaving(true)
    try {
      await onSave({
        playInGameId: game._id,
        predictedWinner: selectedWinner,
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Play-In Game: {game.gameType.replace("-", " ").toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            {locked ? (
              <span className="flex items-center gap-2 text-destructive">
                <Lock className="h-4 w-4" />
                {game.winner ? "This game is locked. A winner has already been determined." : "This game is locked"}
              </span>
            ) : (
              <span>Make your prediction for this Play-In game</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Game Info */}
          <div className="text-sm text-muted-foreground">
            <div>Start Time: {formatToIST(game.startTime)}</div>
            {game.winner && (
              <div className="font-semibold text-foreground flex items-center gap-2">
                Winner: <TeamDisplay teamName={game.winner} size="sm" />
              </div>
            )}
          </div>

          {/* Team Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Winner
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={selectedWinner === game.team1 ? "default" : "outline"}
                onClick={() => handleTeamClick(game.team1)}
                disabled={locked}
                className="h-16 flex flex-col items-center justify-center gap-2"
              >
                <TeamDisplay teamName={game.team1} size="sm" />
                <div className="font-semibold">{game.team1}</div>
                {selectedWinner === game.team1 && (
                  <Check className="h-5 w-5" />
                )}
              </Button>
              <Button
                type="button"
                variant={selectedWinner === game.team2 ? "default" : "outline"}
                onClick={() => handleTeamClick(game.team2)}
                disabled={locked}
                className="h-16 flex flex-col items-center justify-center gap-2"
              >
                <TeamDisplay teamName={game.team2} size="sm" />
                <div className="font-semibold">{game.team2}</div>
                {selectedWinner === game.team2 && (
                  <Check className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Current Prediction Display */}
          {prediction && (
            <div className="rounded border-2 border-secondary p-3">
              <div className="text-xs font-semibold text-secondary mb-1">
                Your Current Prediction
              </div>
              <div className="text-sm font-medium flex items-center gap-2">
                Winner: <TeamDisplay teamName={prediction.predictedWinner} size="sm" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!locked && (
            <Button onClick={handleSave} disabled={!selectedWinner || saving}>
              {prediction ? "Update" : "Save"} Prediction
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
