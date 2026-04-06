import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"
import Season from "@/app/lib/models/Season"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Prediction from "@/app/lib/models/Prediction"
import EarlyFinalsPrediction from "@/app/lib/models/EarlyFinalsPrediction"
import mongoose from "mongoose"
import {
  buildOpenPredictionIds,
  completionForUser,
  type LeanPlayIn,
  type LeanSeries,
  type RoundCompletion,
} from "@/app/lib/admin/userRoundCompletion"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/admin/users", request, async () => {
    try {
      await requireAdmin()
      await dbConnect()

      const season = await Season.findOne({ isActive: true }).lean()
      const seasonId =
        season?._id != null ? String(season._id) : null
      const seasonRaw = season
        ? (season as unknown as Record<string, unknown>)
        : null

      const now = new Date()

      const [series, playInGames] = await Promise.all([
        seasonId
          ? Series.find({
              seasonId: new mongoose.Types.ObjectId(seasonId),
            })
              .select("round team1 team2 startTime winner")
              .lean()
          : [],
        seasonId
          ? PlayInGame.find({
              seasonId: new mongoose.Types.ObjectId(seasonId),
            })
              .select("team1 team2 startTime winner")
              .lean()
          : [],
      ])

      const { earlyFinalsOpen, openByRound } = buildOpenPredictionIds({
        now,
        seasonId,
        seasonRaw,
        series: series as LeanSeries[],
        playInGames: playInGames as LeanPlayIn[],
      })

      const users = await User.find({})
        .select("_id email name isAdmin hasPayed createdAt")
        .sort({ createdAt: -1 })
        .lean()

      const userIds = users.map(
        (u) => new mongoose.Types.ObjectId(String(u._id))
      )

      const [preds, earlyDocs] = await Promise.all([
        userIds.length
          ? Prediction.find({ userId: { $in: userIds } })
              .select("userId seriesId playInGameId")
              .lean()
          : [],
        seasonId
          ? EarlyFinalsPrediction.find({
              seasonId: new mongoose.Types.ObjectId(seasonId),
            })
              .select("userId")
              .lean()
          : [],
      ])

      const earlyFinalsUserIds = new Set(
        earlyDocs.map((d) => String(d.userId))
      )

      const byUser = new Map<
        string,
        { series: Set<string>; playIn: Set<string> }
      >()
      for (const u of users) {
        byUser.set(String(u._id), {
          series: new Set(),
          playIn: new Set(),
        })
      }
      for (const p of preds) {
        const uid = String(p.userId)
        const bucket = byUser.get(uid)
        if (!bucket) continue
        if (p.seriesId) bucket.series.add(p.seriesId.toString())
        if (p.playInGameId) bucket.playIn.add(p.playInGameId.toString())
      }

      const payload = users.map((u) => {
        const id = String(u._id)
        const bucket = byUser.get(id)!
        const roundCompletion: RoundCompletion = completionForUser({
          earlyFinalsOpen,
          hasEarlyFinalsDoc: earlyFinalsUserIds.has(id),
          openByRound,
          userSeriesIds: bucket.series,
          userPlayInIds: bucket.playIn,
        })

        return {
          id,
          email: u.email,
          name: u.name,
          isAdmin: Boolean(u.isAdmin),
          hasPayed: Boolean(u.hasPayed),
          createdAt:
            u.createdAt != null
              ? new Date(u.createdAt as Date).toISOString()
              : null,
          roundCompletion,
        }
      })

      return NextResponse.json(payload)
    } catch (error) {
      console.error("Error listing users:", error)
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 }
      )
    }
  })
}
