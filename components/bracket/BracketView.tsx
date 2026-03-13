"use client"

import { useState, useEffect } from "react"
import { SeriesCard } from "./SeriesCard"
import { PlayInCard } from "./PlayInCard"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"
import { useSession } from "next-auth/react"

export function BracketView() {
  const { data: session } = useSession()
  const [series, setSeries] = useState<ISeries[]>([])
  const [playInGames, setPlayInGames] = useState<IPlayInGame[]>([])
  const [predictions, setPredictions] = useState<IPrediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [seriesRes, playInRes, predictionsRes] = await Promise.all([
        fetch("/api/series"),
        fetch("/api/playin"),
        fetch("/api/predictions"),
      ])

      // Handle series data
      let seriesData = []
      if (seriesRes.ok) {
        const data = await seriesRes.json()
        seriesData = Array.isArray(data) ? data : []
      } else {
        console.error("Failed to fetch series:", seriesRes.status)
      }

      // Handle Play-In games data
      let playInData = []
      if (playInRes.ok) {
        const data = await playInRes.json()
        playInData = Array.isArray(data) ? data : []
      } else {
        console.error("Failed to fetch Play-In games:", playInRes.status)
      }

      // Handle predictions data
      let predictionsData = []
      if (predictionsRes.ok) {
        const data = await predictionsRes.json()
        predictionsData = Array.isArray(data) ? data : []
      } else {
        console.error("Failed to fetch predictions:", predictionsRes.status)
      }

      setSeries(seriesData)
      setPlayInGames(playInData)
      setPredictions(predictionsData)
    } catch (error) {
      console.error("Error fetching bracket data:", error)
      // Set empty arrays on error
      setSeries([])
      setPlayInGames([])
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }

  const handlePredictionChange = async (prediction: Partial<IPrediction>) => {
    try {
      const existingPrediction = predictions.find(
        (p) => {
          const predictionSeriesId = prediction.seriesId
            ? (typeof prediction.seriesId === 'object' && prediction.seriesId !== null
                ? (prediction.seriesId as any)._id?.toString() || (prediction.seriesId as any).toString()
                : String(prediction.seriesId))
            : null
          const predictionPlayInGameId = prediction.playInGameId
            ? (typeof prediction.playInGameId === 'object' && prediction.playInGameId !== null
                ? (prediction.playInGameId as any)._id?.toString() || (prediction.playInGameId as any).toString()
                : String(prediction.playInGameId))
            : null
          
          return (
            (predictionSeriesId && p.seriesId?.toString() === predictionSeriesId) ||
            (predictionPlayInGameId && p.playInGameId?.toString() === predictionPlayInGameId)
          )
        }
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
        await fetchData()
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading bracket...</div>
  }

  const currentUserId = session?.user?.id

  // Group series by round - ensure series is an array
  const seriesByRound = {
    first: Array.isArray(series) ? series.filter((s) => s.round === "first") : [],
    second: Array.isArray(series) ? series.filter((s) => s.round === "second") : [],
    conference: Array.isArray(series) ? series.filter((s) => s.round === "conference") : [],
    finals: Array.isArray(series) ? series.filter((s) => s.round === "finals") : [],
  }

  return (
    <div className="space-y-8">
      {/* Play-In Games */}
      {playInGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Play-In Tournament</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playInGames.map((game) => {
              const prediction = predictions.find(
                (p) => p.playInGameId?.toString() === game._id
              )
              return (
                <PlayInCard
                  key={game._id}
                  game={game}
                  prediction={prediction}
                  isCurrentUser={
                    prediction?.userId?.toString() === currentUserId ||
                    !prediction
                  }
                  onPredictionChange={handlePredictionChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* First Round */}
      {seriesByRound.first.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">First Round</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seriesByRound.first.map((s) => {
              const prediction = predictions.find(
                (p) => p.seriesId?.toString() === s._id
              )
              return (
                <SeriesCard
                  key={s._id}
                  series={s}
                  prediction={prediction}
                  isCurrentUser={
                    prediction?.userId?.toString() === currentUserId ||
                    !prediction
                  }
                  onPredictionChange={handlePredictionChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Second Round */}
      {seriesByRound.second.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Second Round</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seriesByRound.second.map((s) => {
              const prediction = predictions.find(
                (p) => p.seriesId?.toString() === s._id
              )
              return (
                <SeriesCard
                  key={s._id}
                  series={s}
                  prediction={prediction}
                  isCurrentUser={
                    prediction?.userId?.toString() === currentUserId ||
                    !prediction
                  }
                  onPredictionChange={handlePredictionChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Conference Finals */}
      {seriesByRound.conference.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Conference Finals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seriesByRound.conference.map((s) => {
              const prediction = predictions.find(
                (p) => p.seriesId?.toString() === s._id
              )
              return (
                <SeriesCard
                  key={s._id}
                  series={s}
                  prediction={prediction}
                  isCurrentUser={
                    prediction?.userId?.toString() === currentUserId ||
                    !prediction
                  }
                  onPredictionChange={handlePredictionChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Finals */}
      {seriesByRound.finals.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">NBA Finals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {seriesByRound.finals.map((s) => {
              const prediction = predictions.find(
                (p) => p.seriesId?.toString() === s._id
              )
              return (
                <SeriesCard
                  key={s._id}
                  series={s}
                  prediction={prediction}
                  isCurrentUser={
                    prediction?.userId?.toString() === currentUserId ||
                    !prediction
                  }
                  onPredictionChange={handlePredictionChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {series.length === 0 && playInGames.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No bracket data available. Admin needs to add series and games.
        </div>
      )}
    </div>
  )
}
