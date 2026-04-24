import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import {
  applyStreakOnRoundLoss,
  applyStreakOnRoundWin,
} from "@/app/lib/minigames/streakRunHints"
import mongoose from "mongoose"
import { z } from "zod"

const bodySchema = z.object({
  outcome: z.enum(["won", "lost"]),
})

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/hangman/round-result",
    request,
    async () => {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      await dbConnect()
      if (!(await userExistsInDb(session.user.id))) {
        return NextResponse.json({ error: "User not found" }, { status: 403 })
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
      }

      const parsed = bodySchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
      }

      const { outcome } = parsed.data
      const userId = new mongoose.Types.ObjectId(session.user.id)

      let doc = await HangmanStreakStats.findOneAndUpdate(
        { userId },
        {
          $setOnInsert: {
            userId,
            currentStreak: 0,
            bestStreak: 0,
            runHintsUsed: 0,
          },
        },
        { upsert: true, new: true }
      )

      if (!doc) {
        return NextResponse.json({ error: "Could not save streak" }, { status: 500 })
      }

      if (doc.runHintsUsed == null) {
        doc.runHintsUsed = 0
      }

      if (outcome === "won") {
        applyStreakOnRoundWin(doc)
      } else {
        applyStreakOnRoundLoss(doc)
      }

      await doc.save()

      return NextResponse.json({
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        runHintsUsed: doc.runHintsUsed ?? 0,
      })
    }
  )
}
