import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import { isSeriesLocked, isPlayInGameLocked } from "@/app/lib/locking/lockChecker"
import { z } from "zod"

const updatePredictionSchema = z.object({
  predictedWinner: z.string().min(1).optional(),
  predictedScore: z
    .object({
      team1Wins: z.number().min(0).max(4),
      team2Wins: z.number().min(0).max(4),
    })
    .optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return runApiRoute("PUT /api/predictions/[id]", request, async () => {
  try {
    const user = await requireAuth()
    await dbConnect()

    const prediction = await Prediction.findById(params.id)
    if (!prediction) {
      return NextResponse.json(
        { error: "Prediction not found" },
        { status: 404 }
      )
    }

    // Check ownership
    if (prediction.userId.toString() !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if locked
    if (prediction.seriesId) {
      const series = await Series.findById(prediction.seriesId)
      if (series && isSeriesLocked(series)) {
        return NextResponse.json(
          { error: "Series is locked" },
          { status: 400 }
        )
      }
    } else if (prediction.playInGameId) {
      const game = await PlayInGame.findById(prediction.playInGameId)
      if (game && isPlayInGameLocked(game)) {
        return NextResponse.json(
          { error: "Play-In game is locked" },
          { status: 400 }
        )
      }
    }

    const body = await request.json()
    const validated = updatePredictionSchema.parse(body)

    Object.assign(prediction, validated)
    await prediction.save()

    return NextResponse.json(prediction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating prediction:", error)
    return NextResponse.json(
      { error: "Failed to update prediction" },
      { status: 500 }
    )
  }
  })
}
