import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import mongoose from "mongoose"

export async function GET(request: Request) {
  return runApiRoute("GET /api/minigames/hangman/streak", request, async () => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await dbConnect()
    if (!(await userExistsInDb(session.user.id))) {
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const doc = await HangmanStreakStats.findOne({ userId }).lean()

    return NextResponse.json({
      currentStreak: doc?.currentStreak ?? 0,
      bestStreak: doc?.bestStreak ?? 0,
      runHintsUsed: doc?.runHintsUsed ?? 0,
    })
  })
}
