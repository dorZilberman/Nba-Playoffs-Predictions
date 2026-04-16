import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
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
  type LeanPlayIn,
  type LeanSeries,
} from "@/app/lib/admin/userRoundCompletion"
import { seasonRawToPlayoffsInput } from "@/app/lib/locking/earlyFinalsLock"
import type { RoundType } from "@/app/lib/models/Series"
import type {
  ShamingApiResponse,
  ShamingItem,
} from "@/app/lib/shaming/types"

export const dynamic = "force-dynamic"

const ROUND_LABEL: Record<RoundType, string> = {
  first: "First round",
  second: "Second round",
  conference: "Conference finals",
  finals: "NBA Finals",
}

export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/shaming", request, async () => {
    try {
      await requireAuth()
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
              .select("gameType team1 team2 startTime winner")
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

      const poolUsers = await User.find({})
        .select("_id name")
        .sort({ name: 1 })
        .lean()

      if (poolUsers.length === 0) {
        const empty: ShamingApiResponse = { items: [] }
        return NextResponse.json(empty)
      }

      const poolIds = poolUsers.map((u) => new mongoose.Types.ObjectId(String(u._id)))
      const idToName = new Map(
        poolUsers.map((u) => [String(u._id), u.name as string])
      )

      const [preds, earlyDocs] = await Promise.all([
        Prediction.find({ userId: { $in: poolIds } })
          .select("userId seriesId playInGameId")
          .lean(),
        seasonId && earlyFinalsOpen
          ? EarlyFinalsPrediction.find({
              seasonId: new mongoose.Types.ObjectId(seasonId),
              userId: { $in: poolIds },
            })
              .select("userId")
              .lean()
          : [],
      ])

      const earlySubmitted = new Set(
        (earlyDocs ?? []).map((d) => String(d.userId))
      )

      const seriesPredByUser = new Map<string, Set<string>>()
      const playInPredByUser = new Map<string, Set<string>>()

      for (const u of poolUsers) {
        const id = String(u._id)
        seriesPredByUser.set(id, new Set())
        playInPredByUser.set(id, new Set())
      }

      for (const p of preds) {
        const uid = String(p.userId)
        if (!seriesPredByUser.has(uid)) continue
        if (p.seriesId) {
          seriesPredByUser.get(uid)!.add(p.seriesId.toString())
        }
        if (p.playInGameId) {
          playInPredByUser.get(uid)!.add(p.playInGameId.toString())
        }
      }

      const poolIdStrings = poolUsers.map((u) => String(u._id))

      function usersMissingForSeries(openSeriesId: string) {
        const missing: { userId: string; userName: string }[] = []
        for (const uid of poolIdStrings) {
          if (!seriesPredByUser.get(uid)!.has(openSeriesId)) {
            missing.push({ userId: uid, userName: idToName.get(uid)! })
          }
        }
        return missing
      }

      function usersMissingForPlayIn(openGameId: string) {
        const missing: { userId: string; userName: string }[] = []
        for (const uid of poolIdStrings) {
          if (!playInPredByUser.get(uid)!.has(openGameId)) {
            missing.push({ userId: uid, userName: idToName.get(uid)! })
          }
        }
        return missing
      }

      function usersMissingEarlyFinals() {
        const missing: { userId: string; userName: string }[] = []
        for (const uid of poolIdStrings) {
          if (!earlySubmitted.has(uid)) {
            missing.push({ userId: uid, userName: idToName.get(uid)! })
          }
        }
        return missing
      }

      const items: ShamingItem[] = []

      const playoffsInput = seasonRawToPlayoffsInput(seasonRaw)
      const locksAtIso =
        playoffsInput.playoffsStartTime != null
          ? new Date(playoffsInput.playoffsStartTime as Date).toISOString()
          : null

      if (earlyFinalsOpen) {
        const missingUsers = usersMissingEarlyFinals()
        if (missingUsers.length > 0) {
          items.push({
            kind: "earlyFinals",
            id: "early-finals",
            label: "Early finals (conference finalists + champion)",
            locksAt: locksAtIso,
            missingUsers,
          })
        }
      }

      const playInById = new Map(
        playInGames.map((g) => [String(g._id), g])
      )
      const openPlayInSorted = [...openByRound.playIn]
        .map((id) => playInById.get(id))
        .filter((g): g is (typeof playInGames)[number] => g != null)
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )

      for (const g of openPlayInSorted) {
        const id = String(g._id)
        const missingUsers = usersMissingForPlayIn(id)
        if (missingUsers.length === 0) continue
        items.push({
          kind: "playIn",
          id,
          gameType: g.gameType,
          label: `${g.team1} vs ${g.team2}`,
          startTime: new Date(g.startTime).toISOString(),
          missingUsers,
        })
      }

      const roundOrder: Exclude<keyof typeof openByRound, symbol>[] = [
        "first",
        "second",
        "conference",
        "finals",
      ]

      const seriesById = new Map(series.map((s) => [String(s._id), s]))

      for (const round of roundOrder) {
        const ids = openByRound[round]
        const openSeries = ids
          .map((id) => seriesById.get(id))
          .filter((s): s is (typeof series)[number] => s != null)
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() -
              new Date(b.startTime).getTime()
          )

        for (const s of openSeries) {
          const id = String(s._id)
          const missingUsers = usersMissingForSeries(id)
          if (missingUsers.length === 0) continue
          const r = s.round as RoundType
          items.push({
            kind: "series",
            id,
            round: r,
            roundLabel: ROUND_LABEL[r],
            label: `${s.team1} vs ${s.team2}`,
            startTime: new Date(s.startTime).toISOString(),
            missingUsers,
          })
        }
      }

      const payload: ShamingApiResponse = { items }
      return NextResponse.json(payload)
    } catch (error) {
      console.error("Error in GET /api/shaming:", error)
      return NextResponse.json(
        { error: "Failed to load shaming data" },
        { status: 500 }
      )
    }
  })
}
