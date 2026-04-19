import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Series from "@/app/lib/models/Series"
import {
  isEarlyFinalsLocked,
  seasonRawToPlayoffsInput,
} from "@/app/lib/locking/earlyFinalsLock"
import { isPlayInGameLocked, isSeriesLocked } from "@/app/lib/locking/lockChecker"
import mongoose from "mongoose"

type AnalyticsRound =
  | "early-finals"
  | "playin"
  | "first"
  | "second"
  | "conference"
  | "finals"

/** When two lock times tie, prefer a later playoff stage for UX. */
const ROUND_PRIORITY: Record<AnalyticsRound, number> = {
  "early-finals": 0,
  playin: 1,
  first: 2,
  second: 3,
  conference: 4,
  finals: 5,
}

/**
 * Round that contains the game/series whose lock time (start time) is latest among
 * all currently locked items — i.e. what became locked most recently.
 */
export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/analytics/default-round", request, async () => {
    try {
      await requireAuth()
      await dbConnect()

      const raw = await Season.collection.findOne({ isActive: true })
      if (!raw?._id) {
        return NextResponse.json({
          defaultRound: "early-finals" satisfies AnalyticsRound,
        })
      }

      const seasonId = raw._id as mongoose.Types.ObjectId
      const playoffsInput = seasonRawToPlayoffsInput(
        raw as unknown as Record<string, unknown>
      )

      const candidates: { round: AnalyticsRound; at: number }[] = []

      if (isEarlyFinalsLocked(playoffsInput)) {
        const rawPt = (raw as { playoffsStartTime?: Date }).playoffsStartTime
        if (rawPt != null) {
          const t = new Date(rawPt).getTime()
          if (!Number.isNaN(t)) {
            candidates.push({ round: "early-finals", at: t })
          }
        }
      }

      const [playInGames, seriesList] = await Promise.all([
        PlayInGame.find({ seasonId }).lean(),
        Series.find({ seasonId }).lean(),
      ])

      for (const g of playInGames) {
        if (isPlayInGameLocked(g as Parameters<typeof isPlayInGameLocked>[0])) {
          const t = new Date(g.startTime).getTime()
          if (!Number.isNaN(t)) {
            candidates.push({ round: "playin", at: t })
          }
        }
      }

      for (const s of seriesList) {
        if (isSeriesLocked(s as Parameters<typeof isSeriesLocked>[0])) {
          const t = new Date(s.startTime).getTime()
          if (!Number.isNaN(t)) {
            candidates.push({ round: s.round as AnalyticsRound, at: t })
          }
        }
      }

      if (candidates.length === 0) {
        return NextResponse.json({
          defaultRound: "early-finals" satisfies AnalyticsRound,
        })
      }

      const maxAt = Math.max(...candidates.map((c) => c.at))
      const tied = candidates.filter((c) => c.at === maxAt)
      tied.sort((a, b) => ROUND_PRIORITY[b.round] - ROUND_PRIORITY[a.round])

      return NextResponse.json({ defaultRound: tied[0].round })
    } catch (e) {
      console.error("GET /api/analytics/default-round:", e)
      return NextResponse.json({ defaultRound: "early-finals" })
    }
  })
}
