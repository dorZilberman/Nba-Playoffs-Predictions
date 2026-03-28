import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import { isSeriesLocked, isPlayInGameLocked } from "@/app/lib/locking/lockChecker"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  return runApiRoute("GET /api/predictions/user/[userId]", request, async () => {
  try {
    const user = await requireAuth()
    await dbConnect()

    // Only return locked predictions for other users
    const predictions = await Prediction.find({
      userId: new mongoose.Types.ObjectId(params.userId),
    }).populate(["seriesId", "playInGameId"])

    // Filter to only show locked predictions (unless it's the current user)
    const filtered = predictions.filter((pred) => {
      // Always show current user's predictions
      if (pred.userId.toString() === user.id) {
        return true
      }

      // For other users, only show locked predictions (by time or winner)
      if (pred.seriesId) {
        const series = pred.seriesId as any
        return isSeriesLocked(series) || !!series.winner
      } else if (pred.playInGameId) {
        const game = pred.playInGameId as any
        return isPlayInGameLocked(game) || !!game.winner
      }

      return false
    })

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Error fetching user predictions:", error)
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    )
  }
  })
}
