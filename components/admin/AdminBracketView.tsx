"use client"

import { useState, useEffect, useCallback } from "react"
import { PlayoffBracketVisual } from "@/components/bracket/PlayoffBracketVisual"
import { AdminSeriesModal } from "./AdminSeriesModal"
import { AdminPlayInModal } from "./AdminPlayInModal"
import { PlayInBracketVisual } from "@/components/bracket/PlayInBracketVisual"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"

export function AdminBracketView() {
  const [series, setSeries] = useState<ISeries[]>([])
  const [playInGames, setPlayInGames] = useState<IPlayInGame[]>([])
  const [selectedSeries, setSelectedSeries] = useState<ISeries | null>(null)
  const [selectedPlayIn, setSelectedPlayIn] = useState<IPlayInGame | null>(null)
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false)
  const [isPlayInModalOpen, setIsPlayInModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [seriesRes, playInRes] = await Promise.all([
        fetch("/api/admin/series"),
        fetch("/api/admin/playin"),
      ])

      if (seriesRes.ok) {
        const data = await seriesRes.json()
        setSeries(Array.isArray(data) ? data : [])
      }

      if (playInRes.ok) {
        const data = await playInRes.json()
        setPlayInGames(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSeriesClick = (s: any) => {
    console.log("Admin clicked series:", s)
    // Convert to ISeries format for the modal
    const seriesData: ISeries = {
      _id: s._id,
      seasonId: s.seasonId || ({} as any), // Will be set when saving
      round: s.round as ISeries["round"],
      conference: s.conference as ISeries["conference"],
      team1: s.team1,
      team2: s.team2,
      team1Seed: s.team1Seed,
      team2Seed: s.team2Seed,
      startTime: s.startTime,
      currentScore: s.currentScore,
      winner: s.winner,
      createdAt: s.createdAt || new Date(),
      updatedAt: s.updatedAt || new Date(),
    }
    setSelectedSeries(seriesData)
    setIsSeriesModalOpen(true)
  }

  const handlePlayInClick = (game: IPlayInGame | undefined) => {
    if (!game) return
    console.log("Admin clicked Play-In game:", game)
    setSelectedPlayIn(game)
    setIsPlayInModalOpen(true)
  }

  const handleSave = async (
    updatedSeries: Partial<ISeries> & { round: string; conference: string | null }
  ) => {
    if (!selectedSeries) return

    try {
      // Check if this is a placeholder (new series)
      const isPlaceholder = selectedSeries._id.startsWith("placeholder-")
      
      if (isPlaceholder) {
        // Create new series
        const seasonRes = await fetch("/api/admin/season")
        const seasonData = await seasonRes.json()
        const seasonId = seasonData._id || seasonData.id

        const newSeriesData = {
          seasonId,
          round: updatedSeries.round,
          conference: updatedSeries.conference,
          team1: updatedSeries.team1,
          team2: updatedSeries.team2,
          team1Seed: updatedSeries.team1Seed,
          team2Seed: updatedSeries.team2Seed,
          startTime: updatedSeries.startTime,
          currentScore: updatedSeries.currentScore,
          winner: updatedSeries.winner,
        }

        const res = await fetch("/api/admin/series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSeriesData),
        })

        if (res.ok) {
          await fetchData()
          setIsSeriesModalOpen(false)
          setSelectedSeries(null)
        } else {
          const error = await res.json()
          alert(`Error: ${error.error || "Failed to create series"}`)
        }
      } else {
        // Update existing series
        const res = await fetch(`/api/admin/series/${selectedSeries._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedSeries),
        })

        if (res.ok) {
          await fetchData()
          setIsSeriesModalOpen(false)
          setSelectedSeries(null)
        } else {
          const error = await res.json()
          alert(`Error: ${error.error || "Failed to update series"}`)
        }
      }
    } catch (error) {
      console.error("Error saving series:", error)
      alert("Failed to save series")
    }
  }

  const handlePlayInSave = async (
    updatedGame: Partial<IPlayInGame> & { gameType: string }
  ) => {
    if (!selectedPlayIn) return

    try {
      // Check if this is a placeholder (new game)
      const isPlaceholder = selectedPlayIn._id?.toString().startsWith("placeholder-")

      if (isPlaceholder) {
        // Create new game
        const seasonRes = await fetch("/api/admin/season")
        const seasonData = await seasonRes.json()
        const seasonId = seasonData._id || seasonData.id

        const newGameData = {
          seasonId,
          gameType: updatedGame.gameType,
          team1: updatedGame.team1,
          team2: updatedGame.team2,
          startTime: updatedGame.startTime,
          winner: updatedGame.winner,
        }

        const res = await fetch("/api/admin/playin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newGameData),
        })

        if (res.ok) {
          await fetchData()
          setIsPlayInModalOpen(false)
          setSelectedPlayIn(null)
        } else {
          const error = await res.json()
          alert(`Error: ${error.error || "Failed to create game"}`)
        }
      } else {
        // Update existing game
        const res = await fetch(`/api/admin/playin/${selectedPlayIn._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedGame),
        })

        if (res.ok) {
          await fetchData()
          setIsPlayInModalOpen(false)
          setSelectedPlayIn(null)
        } else {
          const error = await res.json()
          alert(`Error: ${error.error || "Failed to update game"}`)
        }
      }
    } catch (error) {
      console.error("Error saving game:", error)
      alert("Failed to save game")
    }
  }

  if (loading) {
    return <div>Loading bracket...</div>
  }

  return (
    <div className="w-full space-y-6">
      {/* Play-In Games Section */}
      <div className="bg-background border rounded-lg p-6">
        <PlayInBracketVisual
          games={playInGames}
          onGameClick={handlePlayInClick}
          isAdmin={true}
        />
      </div>

      {/* Playoff Bracket */}
      <div className="bg-background border rounded-lg p-6">
        <PlayoffBracketVisual
          series={series}
          predictions={[]}
          onSeriesClick={handleSeriesClick}
          isAdmin={true}
        />
      </div>

      {/* Series Modal */}
      {selectedSeries && (
        <AdminSeriesModal
          series={selectedSeries}
          isOpen={isSeriesModalOpen}
          onClose={() => {
            setIsSeriesModalOpen(false)
            setSelectedSeries(null)
          }}
          onSave={handleSave}
        />
      )}

      {/* Play-In Modal */}
      {selectedPlayIn && (
        <AdminPlayInModal
          game={selectedPlayIn}
          isOpen={isPlayInModalOpen}
          onClose={() => {
            setIsPlayInModalOpen(false)
            setSelectedPlayIn(null)
          }}
          onSave={handlePlayInSave}
        />
      )}
    </div>
  )
}
