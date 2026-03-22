"use client"

import { PlayoffBracket } from "./PlayoffBracket"
import { PlayInBracketVisual } from "./PlayInBracketVisual"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { PlayInPredictionModal } from "./PlayInPredictionModal"
import { useState, useEffect, useCallback } from "react"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface NBABracketViewProps {
  viewingUserId?: string
  isViewingOtherUser?: boolean
  viewingUserName?: string
}

export function NBABracketView({
  viewingUserId,
  isViewingOtherUser = false,
  viewingUserName = "User",
}: NBABracketViewProps = {}) {
  const [series, setSeries] = useState<ISeries[]>([])
  const [playInGames, setPlayInGames] = useState<IPlayInGame[]>([])
  const [predictions, setPredictions] = useState<IPrediction[]>([])
  const [selectedPlayIn, setSelectedPlayIn] = useState<IPlayInGame | null>(null)
  const [isPlayInModalOpen, setIsPlayInModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      // Build predictions URL with userId and lockedOnly params
      let predictionsUrl = "/api/predictions"
      if (viewingUserId) {
        predictionsUrl = `/api/predictions?userId=${viewingUserId}`
        if (isViewingOtherUser) {
          predictionsUrl += "&lockedOnly=true"
        }
      }

      const [seriesRes, playInRes, predictionsRes] = await Promise.all([
        fetch("/api/series"),
        fetch("/api/playin"),
        fetch(predictionsUrl),
      ])

      if (seriesRes.ok) {
        const data = await seriesRes.json()
        setSeries(Array.isArray(data) ? data : [])
      }

      if (playInRes.ok) {
        const data = await playInRes.json()
        setPlayInGames(Array.isArray(data) ? data : [])
      }

      if (predictionsRes.ok) {
        const data = await predictionsRes.json()
        setPredictions(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [viewingUserId, isViewingOtherUser])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePredictionSave = async (prediction: {
    seriesId: string
    predictedWinner: string
    predictedScore: {
      team1Wins: number
      team2Wins: number
    }
  }) => {
    try {
      const existingPrediction = predictions.find(
        (p) => p.seriesId?.toString() === prediction.seriesId
      )

      const url = existingPrediction
        ? `/api/predictions/${existingPrediction._id}`
        : "/api/predictions"
      const method = existingPrediction ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prediction),
      })

      if (res.ok) {
        await fetchData() // Refresh data
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  const handlePlayInClick = (game: IPlayInGame | undefined) => {
    if (!game) return // Don't open modal for empty games (only admins can create)
    // Don't allow clicking when viewing another user's predictions
    if (isViewingOtherUser) {
      return
    }
    // Check if both teams are filled before allowing prediction
    if (game.team1 === "TBD" || game.team2 === "TBD" || !game.team1 || !game.team2) {
      alert("Both teams must be set before making a prediction")
      return
    }
    // Check if winner is already set
    if (game.winner) {
      alert("This game is locked. A winner has already been determined.")
      return
    }
    // Check if game is locked by time
    const now = new Date()
    const startTime = new Date(game.startTime)
    if (now >= startTime) {
      alert("This game is locked. Predictions cannot be made after the deadline.")
      return
    }
    setSelectedPlayIn(game)
    setIsPlayInModalOpen(true)
  }

  const handlePlayInPredictionSave = async (prediction: {
    playInGameId: string
    predictedWinner: string
  }) => {
    try {
      const existingPrediction = predictions.find(
        (p) => p.playInGameId?.toString() === prediction.playInGameId
      )

      const url = existingPrediction
        ? `/api/predictions/${existingPrediction._id}`
        : "/api/predictions"
      const method = existingPrediction ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prediction),
      })

      if (res.ok) {
        await fetchData() // Refresh data
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  return (
    <div className="w-full space-y-6">
      <CollapsibleSection title="Play-In">
        <PlayInBracketVisual
          embedded
          games={playInGames}
          predictions={predictions}
          onGameClick={handlePlayInClick}
          isAdmin={false}
          isViewingOtherUser={isViewingOtherUser}
          viewingUserName={isViewingOtherUser ? viewingUserName : undefined}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Playoffs">
        <PlayoffBracket
          embedded
          series={series}
          predictions={predictions}
          onPredictionSave={handlePredictionSave}
          isViewingOtherUser={isViewingOtherUser}
          viewingUserName={isViewingOtherUser ? viewingUserName : undefined}
        />
      </CollapsibleSection>

      {/* Play-In Prediction Modal */}
      {selectedPlayIn && (
        <PlayInPredictionModal
          game={selectedPlayIn}
          prediction={predictions.find((p) => {
            const gameId = typeof p.playInGameId === 'object' && p.playInGameId !== null
              ? (p.playInGameId as any)._id?.toString()
              : (p.playInGameId as string | undefined)?.toString()
            return gameId === selectedPlayIn._id?.toString()
          })}
          isOpen={isPlayInModalOpen}
          onClose={() => {
            setIsPlayInModalOpen(false)
            setSelectedPlayIn(null)
          }}
          onSave={handlePlayInPredictionSave}
        />
      )}
    </div>
  )
}
