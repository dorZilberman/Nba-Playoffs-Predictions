import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"
import NowYouSeeMeStats from "@/app/lib/models/NowYouSeeMeStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"

export async function GET(request: Request) {
  return runApiRoute(
    "GET /api/minigames/now-you-see-me/leaderboard",
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

      const docs = await NowYouSeeMeStats.find({
        bestStreak: { $gte: 1 },
      })
        .sort({ bestStreak: -1, updatedAt: -1 })
        .limit(200)
        .lean()

      const userIds = docs.map((d) => d.userId)
      const users = await User.find({ _id: { $in: userIds } })
        .select("name")
        .lean()

      const nameById = new Map(
        users.map((u) => [String(u._id), u.name as string])
      )

      const rows: BestStreakLeaderboardRow[] = docs.map((d, i) => ({
        rank: i + 1,
        userId: String(d.userId),
        userName: nameById.get(String(d.userId)) ?? "Unknown",
        bestStreak: d.bestStreak,
      }))

      return NextResponse.json({ rows })
    }
  )
}
