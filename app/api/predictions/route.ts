import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import { isSeriesLocked, isPlayInGameLocked } from "@/app/lib/locking/lockChecker"
import { z } from "zod"
import mongoose from "mongoose"

const predictionSchema = z.object({
  seriesId: z.string().optional(),
  playInGameId: z.string().optional(),
  predictedWinner: z.string().min(1),
  predictedScore: z
    .object({
      team1Wins: z.number().min(0).max(4),
      team2Wins: z.number().min(0).max(4),
    })
    .optional(),
})

/**
 * Check if a series is locked (by time OR by winner)
 */
function isSeriesFullyLocked(series: any): boolean {
  return isSeriesLocked(series) || !!series.winner
}

/**
 * Check if a Play-In game is locked (by time OR by winner)
 */
function isPlayInGameFullyLocked(game: any): boolean {
  return isPlayInGameLocked(game) || !!game.winner
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    await dbConnect()

    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get("userId") || user.id
    const isViewingOtherUser = userIdParam !== user.id

    // Security: When viewing another user's predictions, ALWAYS enforce locked-only
    // regardless of what the client sends
    const showLockedOnly = isViewingOtherUser || searchParams.get("lockedOnly") === "true"

    const query: any = { userId: new mongoose.Types.ObjectId(userIdParam) }
    const predictions = await Prediction.find(query).populate([
      "seriesId",
      "playInGameId",
    ])

    // Filter based on visibility rules
    const filtered = predictions.filter((pred) => {
      // User's own predictions are always visible
      if (pred.userId.toString() === user.id) {
        return true
      }

      // Other users' predictions only if locked (by time OR winner)
      if (pred.seriesId) {
        const series = pred.seriesId as any
        return isSeriesFullyLocked(series)
      } else if (pred.playInGameId) {
        const game = pred.playInGameId as any
        return isPlayInGameFullyLocked(game)
      }

      return false
    })

    // If lockedOnly is true, filter to only locked predictions (by time OR winner)
    const result = showLockedOnly
      ? filtered.filter((pred) => {
          if (pred.seriesId) {
            return isSeriesFullyLocked(pred.seriesId as any)
          } else if (pred.playInGameId) {
            return isPlayInGameFullyLocked(pred.playInGameId as any)
          }
          return false
        })
      : filtered

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching predictions:", error)
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    await dbConnect()

    const body = await request.json()
    const validated = predictionSchema.parse(body)

    // Check if series/game exists and is not locked
    if (validated.seriesId) {
      const series = await Series.findById(validated.seriesId)
      if (!series) {
        return NextResponse.json(
          { error: "Series not found" },
          { status: 404 }
        )
      }

      // Check if both teams are filled
      if (series.team1 === "TBD" || series.team2 === "TBD" || !series.team1 || !series.team2) {
        return NextResponse.json(
          { error: "Both teams must be set before making a prediction" },
          { status: 400 }
        )
      }

      // Check if winner is already set
      if (series.winner) {
        return NextResponse.json(
          { error: "Series is locked. A winner has already been determined." },
          { status: 400 }
        )
      }

      if (isSeriesLocked(series)) {
        return NextResponse.json(
          { error: "Series is locked" },
          { status: 400 }
        )
      }
    } else if (validated.playInGameId) {
      const game = await PlayInGame.findById(validated.playInGameId)
      if (!game) {
        return NextResponse.json(
          { error: "Play-In game not found" },
          { status: 404 }
        )
      }

      // Check if both teams are filled
      if (game.team1 === "TBD" || game.team2 === "TBD" || !game.team1 || !game.team2) {
        return NextResponse.json(
          { error: "Both teams must be set before making a prediction" },
          { status: 400 }
        )
      }

      // Check if winner is already set
      if (game.winner) {
        return NextResponse.json(
          { error: "Play-In game is locked. A winner has already been determined." },
          { status: 400 }
        )
      }

      if (isPlayInGameLocked(game)) {
        return NextResponse.json(
          { error: "Play-In game is locked" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Must provide seriesId or playInGameId" },
        { status: 400 }
      )
    }

    // Check if prediction already exists
    const existing = await Prediction.findOne({
      userId: new mongoose.Types.ObjectId(user.id),
      ...(validated.seriesId
        ? { seriesId: new mongoose.Types.ObjectId(validated.seriesId) }
        : { playInGameId: new mongoose.Types.ObjectId(validated.playInGameId!) }),
    })

    if (existing) {
      // Update existing prediction
      existing.predictedWinner = validated.predictedWinner
      if (validated.predictedScore) {
        existing.predictedScore = validated.predictedScore
      }
      await existing.save()
      return NextResponse.json(existing)
    } else {
      // Create new prediction
      // Only include seriesId or playInGameId, not both, and don't set to null
      const predictionData: any = {
        userId: new mongoose.Types.ObjectId(user.id),
        predictedWinner: validated.predictedWinner,
      }
      
      if (validated.seriesId) {
        predictionData.seriesId = new mongoose.Types.ObjectId(validated.seriesId)
      } else if (validated.playInGameId) {
        predictionData.playInGameId = new mongoose.Types.ObjectId(validated.playInGameId)
      }
      
      if (validated.predictedScore) {
        predictionData.predictedScore = validated.predictedScore
      }
      
      const prediction = await Prediction.create(predictionData)
      return NextResponse.json(prediction, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating prediction:", error)
    return NextResponse.json(
      { error: "Failed to create prediction" },
      { status: 500 }
    )
  }
}
