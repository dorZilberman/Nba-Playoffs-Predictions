import { NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Season from "@/app/lib/models/Season"
import EarlyFinalsPrediction from "@/app/lib/models/EarlyFinalsPrediction"
import { isSeriesLocked, isPlayInGameLocked } from "@/app/lib/locking/lockChecker"
import { isEarlyFinalsLocked } from "@/app/lib/locking/earlyFinalsLock"

export interface WhatIfUser {
  userId: string
  userName: string
}

export interface WhatIfPredictionRow {
  userId: string
  seriesId?: string
  playInGameId?: string
  predictedWinner: string
  predictedScore?: {
    team1Wins: number
    team2Wins: number
  }
}

export interface WhatIfEarlyFinalsRow {
  userId: string
  eastFinalist: string
  westFinalist: string
  nbaChampion: string
}

function serializeSeries(doc: any) {
  return {
    _id: doc._id.toString(),
    seasonId: doc.seasonId?.toString?.() ?? String(doc.seasonId),
    round: doc.round,
    conference: doc.conference,
    team1: doc.team1,
    team2: doc.team2,
    team1Seed: doc.team1Seed,
    team2Seed: doc.team2Seed,
    startTime: doc.startTime,
    currentScore: doc.currentScore,
    winner: doc.winner,
  }
}

function serializePlayIn(doc: any) {
  return {
    _id: doc._id.toString(),
    seasonId: doc.seasonId?.toString?.() ?? String(doc.seasonId),
    gameType: doc.gameType,
    team1: doc.team1,
    team2: doc.team2,
    startTime: doc.startTime,
    winner: doc.winner,
  }
}

export async function GET() {
  try {
    const user = await requireAuth()
    await dbConnect()

    const season = await Season.findOne({ isActive: true })
    if (!season) {
      return NextResponse.json({
        users: [] as WhatIfUser[],
        series: [] as ReturnType<typeof serializeSeries>[],
        playInGames: [] as ReturnType<typeof serializePlayIn>[],
        predictions: [] as WhatIfPredictionRow[],
        earlyFinals: [] as WhatIfEarlyFinalsRow[],
      })
    }

    const [users, allSeries, allPlayInGames, allPredictions, earlyDocs] =
      await Promise.all([
        User.find({}).lean(),
        Series.find({ seasonId: season._id }).lean(),
        PlayInGame.find({ seasonId: season._id }).lean(),
        Prediction.find({}).lean(),
        EarlyFinalsPrediction.find({ seasonId: season._id }).lean(),
      ])

    const earlyLocked = isEarlyFinalsLocked(season)
    const earlyFiltered = earlyLocked
      ? earlyDocs
      : earlyDocs.filter(
          (e: { userId: { toString: () => string } }) =>
            e.userId.toString() === user.id
        )

    const earlyFinals: WhatIfEarlyFinalsRow[] = earlyFiltered.map(
      (e: {
        userId: { toString: () => string }
        eastFinalist: string
        westFinalist: string
        nbaChampion: string
      }) => ({
        userId: e.userId.toString(),
        eastFinalist: e.eastFinalist,
        westFinalist: e.westFinalist,
        nbaChampion: e.nbaChampion,
      })
    )

    const seriesById = new Map(
      allSeries.map((s: any) => [s._id.toString(), s])
    )
    const playInById = new Map(
      allPlayInGames.map((g: any) => [g._id.toString(), g])
    )

    const predictionsOut: WhatIfPredictionRow[] = []

    for (const p of allPredictions as any[]) {
      const uid = p.userId?.toString?.() ?? String(p.userId)

      if (p.seriesId) {
        const sid =
          typeof p.seriesId === "object" && p.seriesId?._id
            ? p.seriesId._id.toString()
            : p.seriesId.toString()
        const series = seriesById.get(sid)
        if (!series) continue
        if (!isSeriesLocked(series as any) && !series.winner) continue
        predictionsOut.push({
          userId: uid,
          seriesId: sid,
          predictedWinner: p.predictedWinner,
          predictedScore: p.predictedScore
            ? {
                team1Wins: p.predictedScore.team1Wins,
                team2Wins: p.predictedScore.team2Wins,
              }
            : undefined,
        })
      } else if (p.playInGameId) {
        const gid =
          typeof p.playInGameId === "object" && p.playInGameId?._id
            ? p.playInGameId._id.toString()
            : p.playInGameId.toString()
        const game = playInById.get(gid)
        if (!game) continue
        if (!isPlayInGameLocked(game as any) && !game.winner) continue
        predictionsOut.push({
          userId: uid,
          playInGameId: gid,
          predictedWinner: p.predictedWinner,
        })
      }
    }

    const usersOut: WhatIfUser[] = users.map((u: any) => ({
      userId: u._id.toString(),
      userName: u.name,
    }))

    return NextResponse.json({
      users: usersOut,
      series: allSeries.map(serializeSeries),
      playInGames: allPlayInGames.map(serializePlayIn),
      predictions: predictionsOut,
      earlyFinals,
    })
  } catch (error) {
    console.error("Error loading what-if data:", error)
    return NextResponse.json(
      { error: "Failed to load simulation data" },
      { status: 500 }
    )
  }
}
