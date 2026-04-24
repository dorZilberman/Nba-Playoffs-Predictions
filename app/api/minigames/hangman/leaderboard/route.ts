import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"

export async function GET(request: Request) {
  return runApiRoute("GET /api/minigames/hangman/leaderboard", request, async () => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await dbConnect()
    if (!(await userExistsInDb(session.user.id))) {
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    const docs = await HangmanStreakStats.find({
      bestStreak: { $gte: 1 },
    })
      .lean()
      .exec()

    docs.sort((a, b) => {
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak
      const ha = a.minHintsForBestTie
      const hb = b.minHintsForBestTie
      const va = ha == null ? 1e15 : ha
      const vb = hb == null ? 1e15 : hb
      if (va !== vb) return va - vb
      const ta = new Date(a.updatedAt).getTime()
      const tb = new Date(b.updatedAt).getTime()
      return tb - ta
    })

    const top = docs.slice(0, 200)
    const userIds = top.map((d) => d.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select("name")
      .lean()

    const nameById = new Map(
      users.map((u) => [String(u._id), u.name as string])
    )

    const rows: BestStreakLeaderboardRow[] = top.map((d, i) => ({
      rank: i + 1,
      userId: String(d.userId),
      userName: nameById.get(String(d.userId)) ?? "Unknown",
      bestStreak: d.bestStreak,
      hintsUsedTotal: d.minHintsForBestTie ?? 0,
    }))

    return NextResponse.json({ rows })
  })
}
