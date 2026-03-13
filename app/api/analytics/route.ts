import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import User from "@/app/lib/models/User"
import mongoose from "mongoose"

export interface GameAnalytics {
  gameId: string
  gameType: "series" | "playin"
  round: string
  conference?: string | null
  team1: string
  team2: string
  team1Seed?: number
  team2Seed?: number
  winner?: string
  description?: string // For Play-In games
  team1Count: number
  team2Count: number
  team1Percentage: number
  team2Percentage: number
  team1Users: Array<{ id: string; name: string }>
  team2Users: Array<{ id: string; name: string }>
  totalPredictions: number
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    await dbConnect()

    const searchParams = request.nextUrl.searchParams
    const round = searchParams.get("round") // "playin" | "first" | "second" | "conference" | "finals"

    const analytics: GameAnalytics[] = []

    if (!round || round === "playin") {
      // Get all Play-In games
      const playInGames = await PlayInGame.find({}).sort({ gameType: 1 })

      for (const game of playInGames) {
        // Get all predictions for this game
        const predictions = await Prediction.find({
          playInGameId: game._id,
        }).populate("userId", "name")

        const team1Predictions = predictions.filter(
          (p) => p.predictedWinner === game.team1
        )
        const team2Predictions = predictions.filter(
          (p) => p.predictedWinner === game.team2
        )

        const total = predictions.length
        const team1Count = team1Predictions.length
        const team2Count = team2Predictions.length

        // Generate description based on gameType
        let description: string | undefined
        if (game.gameType === "east-7-8" || game.gameType === "west-7-8") {
          description = "Game 1: 7th vs 8th Seed"
        } else if (game.gameType === "east-9-10" || game.gameType === "west-9-10") {
          description = "Game 2: 9th vs 10th Seed"
        } else if (game.gameType === "east-final" || game.gameType === "west-final") {
          description = "Game 3: Final (Loser 7-8 vs Winner 9-10)"
        }

        analytics.push({
          gameId: game._id.toString(),
          gameType: "playin",
          round: "playin",
          conference: game.gameType.startsWith("east") ? "east" : "west",
          team1: game.team1,
          team2: game.team2,
          winner: game.winner,
          description,
          team1Count,
          team2Count,
          team1Percentage: total > 0 ? Math.round((team1Count / total) * 100) : 0,
          team2Percentage: total > 0 ? Math.round((team2Count / total) * 100) : 0,
          team1Users: team1Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          team2Users: team2Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          totalPredictions: total,
        })
      }
    }

    if (!round || ["first", "second", "conference", "finals"].includes(round)) {
      // Get all series for the requested round(s)
      // If no round specified, get all rounds
      const roundFilter = round
        ? { round }
        : { round: { $in: ["first", "second", "conference", "finals"] } }

      const series = await Series.find(roundFilter).sort({
        round: 1,
        conference: 1,
      })

      for (const s of series) {
        // Get all predictions for this series
        const predictions = await Prediction.find({
          seriesId: s._id,
        }).populate("userId", "name")

        const team1Predictions = predictions.filter(
          (p) => p.predictedWinner === s.team1
        )
        const team2Predictions = predictions.filter(
          (p) => p.predictedWinner === s.team2
        )

        const total = predictions.length
        const team1Count = team1Predictions.length
        const team2Count = team2Predictions.length

        analytics.push({
          gameId: s._id.toString(),
          gameType: "series",
          round: s.round,
          conference: s.conference,
          team1: s.team1,
          team2: s.team2,
          team1Seed: s.team1Seed,
          team2Seed: s.team2Seed,
          winner: s.winner,
          team1Count,
          team2Count,
          team1Percentage: total > 0 ? Math.round((team1Count / total) * 100) : 0,
          team2Percentage: total > 0 ? Math.round((team2Count / total) * 100) : 0,
          team1Users: team1Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          team2Users: team2Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          totalPredictions: total,
        })
      }
    }

    // Sort analytics by round order
    const roundOrder: Record<string, number> = {
      playin: 0,
      first: 1,
      second: 2,
      conference: 3,
      finals: 4,
    }

    analytics.sort((a, b) => {
      const roundDiff = (roundOrder[a.round] || 999) - (roundOrder[b.round] || 999)
      if (roundDiff !== 0) return roundDiff

      // Within same round, sort by conference (east first, then west, then null)
      const confOrder: Record<string, number> = { east: 0, west: 1 }
      const confA = confOrder[a.conference || ""] ?? 2
      const confB = confOrder[b.conference || ""] ?? 2
      if (confA !== confB) return confA - confB

      return 0
    })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
