import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoAmIStreakStats from "@/app/lib/models/WhoAmIStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import mongoose from "mongoose"
import { z } from "zod"

const bodySchema = z.object({
  outcome: z.enum(["won", "lost"]),
})

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-am-i/round-result",
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

      let doc = await WhoAmIStreakStats.findOneAndUpdate(
        { userId },
        {
          $setOnInsert: {
            userId,
            currentStreak: 0,
            bestStreak: 0,
          },
        },
        { upsert: true, new: true }
      )

      if (!doc) {
        return NextResponse.json({ error: "Could not save streak" }, { status: 500 })
      }

      if (outcome === "won") {
        doc.currentStreak += 1
        if (doc.currentStreak > doc.bestStreak) {
          doc.bestStreak = doc.currentStreak
        }
      } else {
        doc.currentStreak = 0
      }

      await doc.save()

      return NextResponse.json({
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
      })
    }
  )
}
