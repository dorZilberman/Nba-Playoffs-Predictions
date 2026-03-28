import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Season from "@/app/lib/models/Season"
import EarlyFinalsPrediction from "@/app/lib/models/EarlyFinalsPrediction"
import User from "@/app/lib/models/User"
import { calculateSeriesScore } from "@/app/lib/scoring/calculator"
import { resolveFinalsOutcomesFromSeries } from "@/app/lib/scoring/earlyFinals"
import {
  isEarlyFinalsLocked,
  isAnalyticsAvailable,
  seasonRawToPlayoffsInput,
  seasonRawToAnalyticsInput,
} from "@/app/lib/locking/earlyFinalsLock"
import {
  isPlayInGameLocked,
  isSeriesLocked,
} from "@/app/lib/locking/lockChecker"
import { ROUND_BASE_VALUES } from "@/app/lib/scoring/types"
import { filterPredictionsByPaid } from "@/app/lib/analytics/predictionUserFilter"

export interface GameAnalytics {
  gameId: string
  gameType: "series" | "playin"
  round: string
  conference?: string | null
  team1: string
  team2: string
  team1Seed?: number
  team2Seed?: number
  winner?: string
  description?: string // For Play-In games
  team1Count: number
  team2Count: number
  team1Percentage: number
  team2Percentage: number
  team1Users: Array<{ id: string; name: string }>
  team2Users: Array<{ id: string; name: string }>
  totalPredictions: number
  /** Playoff series: true once start time has passed (predictions locked), even if no winner yet */
  locked?: boolean
  // Score breakdowns for playoff series only
  team1ScoreBreakdown?: {
    "4-0": number
    "4-1": number
    "4-2": number
    "4-3": number
  }
  team2ScoreBreakdown?: {
    "4-0": number
    "4-1": number
    "4-2": number
    "4-3": number
  }
  // Detailed score info with users
  team1ScoreDetails?: {
    "4-0": Array<{ userId: string; userName: string }>
    "4-1": Array<{ userId: string; userName: string }>
    "4-2": Array<{ userId: string; userName: string }>
    "4-3": Array<{ userId: string; userName: string }>
  }
  team2ScoreDetails?: {
    "4-0": Array<{ userId: string; userName: string }>
    "4-1": Array<{ userId: string; userName: string }>
    "4-2": Array<{ userId: string; userName: string }>
    "4-3": Array<{ userId: string; userName: string }>
  }
  // Points each score would give (if series is completed)
  team1ScorePoints?: {
    "4-0": number | null
    "4-1": number | null
    "4-2": number | null
    "4-3": number | null
  }
  team2ScorePoints?: {
    "4-0": number | null
    "4-1": number | null
    "4-2": number | null
    "4-3": number | null
  }
  // Actual result for playoff series (e.g., "4-2")
  actualResult?: string
}

export interface EarlyFinalsPickRow {
  teamName: string
  count: number
  percentage: number
  users: Array<{ id: string; name: string }>
}

/** One panel: East picks, West picks, or NBA champion picks */
export interface EarlyFinalsAnalyticsBlock {
  gameType: "earlyFinals"
  gameId: "east-finalists" | "west-finalists" | "nba-champion"
  round: "early-finals"
  title: string
  /** Set once that outcome is decided in the bracket */
  actualWinner?: string
  picks: EarlyFinalsPickRow[]
  totalPredictions: number
}

export type AnalyticsItem = GameAnalytics | EarlyFinalsAnalyticsBlock

/** Response shape when ?round=early-finals (pick names hidden until pool lock, like the bracket). */
export type EarlyFinalsAnalyticsApiResponse =
  | { state: "hidden"; reason: "no_season" | "not_locked" }
  | { state: "visible"; blocks: EarlyFinalsAnalyticsBlock[] }

export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/analytics", request, async () => {
  try {
    await requireAuth()
    await dbConnect()

    const searchParams = request.nextUrl.searchParams
    const round = searchParams.get("round") // "early-finals" | "playin" | "first" | ...

    const paidOnly =
      searchParams.get("paidOnly") === "true" ||
      searchParams.get("paidOnly") === "1"

    let paidUserIds: Set<string> | null = null
    if (paidOnly) {
      const paid = await User.find({ hasPayed: true }).select("_id").lean()
      paidUserIds = new Set(paid.map((u) => String(u._id)))
    }

    const analytics: AnalyticsItem[] = []

    if (round === "early-finals") {
      const rawSeason = await Season.collection.findOne({ isActive: true })
      if (!rawSeason) {
        return NextResponse.json({
          state: "hidden",
          reason: "no_season",
        } satisfies EarlyFinalsAnalyticsApiResponse)
      }

      if (!isEarlyFinalsLocked(seasonRawToPlayoffsInput(rawSeason))) {
        return NextResponse.json({
          state: "hidden",
          reason: "not_locked",
        } satisfies EarlyFinalsAnalyticsApiResponse)
      }

      const [predsRaw, seriesList] = await Promise.all([
        EarlyFinalsPrediction.find({
          seasonId: rawSeason._id,
        }).populate("userId", "name"),
        Series.find({ seasonId: rawSeason._id }).lean(),
      ])

      const preds = filterPredictionsByPaid(predsRaw, paidUserIds)

      const outcomes = resolveFinalsOutcomesFromSeries(
        seriesList.map((s) => ({
          round: s.round,
          conference: s.conference,
          winner: s.winner,
        }))
      )

      const total = preds.length

      function aggregate(
        getTeam: (p: (typeof preds)[0]) => string
      ): EarlyFinalsPickRow[] {
        const map = new Map<string, { count: number; users: { id: string; name: string }[] }>()
        for (const p of preds) {
          const team = getTeam(p)
          if (!team) continue
          if (!map.has(team)) {
            map.set(team, { count: 0, users: [] })
          }
          const entry = map.get(team)!
          entry.count++
          const u = p.userId as unknown as {
            _id?: { toString: () => string }
            name?: string
          }
          entry.users.push({
            id: u._id?.toString() || String(p.userId),
            name: u.name || "Unknown",
          })
        }
        return [...map.entries()]
          .map(([teamName, v]) => ({
            teamName,
            count: v.count,
            percentage:
              total > 0 ? Math.round((v.count / total) * 100) : 0,
            users: v.users,
          }))
          .sort((a, b) => b.count - a.count)
      }

      const blocks: EarlyFinalsAnalyticsBlock[] = [
        {
          gameType: "earlyFinals",
          gameId: "east-finalists",
          round: "early-finals",
          title: "Eastern Conference champion",
          actualWinner: outcomes.eastConferenceWinner ?? undefined,
          picks: aggregate((p) => p.eastFinalist),
          totalPredictions: total,
        },
        {
          gameType: "earlyFinals",
          gameId: "west-finalists",
          round: "early-finals",
          title: "Western Conference champion",
          actualWinner: outcomes.westConferenceWinner ?? undefined,
          picks: aggregate((p) => p.westFinalist),
          totalPredictions: total,
        },
        {
          gameType: "earlyFinals",
          gameId: "nba-champion",
          round: "early-finals",
          title: "NBA champion",
          actualWinner: outcomes.nbaChampion ?? undefined,
          picks: aggregate((p) => p.nbaChampion),
          totalPredictions: total,
        },
      ]

      return NextResponse.json({
        state: "visible",
        blocks,
      } satisfies EarlyFinalsAnalyticsApiResponse)
    }

    if (!round || round === "playin") {
      // Get all Play-In games
      const playInGames = await PlayInGame.find({}).sort({ gameType: 1 })

      for (const game of playInGames) {
        if (!game.winner && !isPlayInGameLocked(game)) {
          continue
        }

        // Get all predictions for this game
        const predictions = filterPredictionsByPaid(
          await Prediction.find({
            playInGameId: game._id,
          }).populate("userId", "name"),
          paidUserIds
        )

        const team1Predictions = predictions.filter(
          (p) => p.predictedWinner === game.team1
        )
        const team2Predictions = predictions.filter(
          (p) => p.predictedWinner === game.team2
        )

        const total = predictions.length
        const team1Count = team1Predictions.length
        const team2Count = team2Predictions.length

        // Generate description based on gameType
        let description: string | undefined
        if (game.gameType === "east-7-8" || game.gameType === "west-7-8") {
          description = "Game 1: 7th vs 8th Seed"
        } else if (game.gameType === "east-9-10" || game.gameType === "west-9-10") {
          description = "Game 2: 9th vs 10th Seed"
        } else if (game.gameType === "east-final" || game.gameType === "west-final") {
          description = "Game 3: Final (Loser 7-8 vs Winner 9-10)"
        }

        analytics.push({
          gameId: game._id.toString(),
          gameType: "playin",
          round: "playin",
          conference: game.gameType.startsWith("east") ? "east" : "west",
          team1: game.team1,
          team2: game.team2,
          winner: game.winner,
          description,
          team1Count,
          team2Count,
          team1Percentage: total > 0 ? Math.round((team1Count / total) * 100) : 0,
          team2Percentage: total > 0 ? Math.round((team2Count / total) * 100) : 0,
          team1Users: team1Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          team2Users: team2Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          totalPredictions: total,
        })
      }
    }

    if (!round || ["first", "second", "conference", "finals"].includes(round)) {
      // Get all series for the requested round(s)
      // If no round specified, get all rounds
      const roundFilter = round
        ? { round }
        : { round: { $in: ["first", "second", "conference", "finals"] } }

      const series = await Series.find(roundFilter).sort({
        round: 1,
        conference: 1,
      })

      for (const s of series) {
        if (!s.winner && !isSeriesLocked(s)) {
          continue
        }

        // Get all predictions for this series
        const predictions = filterPredictionsByPaid(
          await Prediction.find({
            seriesId: s._id,
          }).populate("userId", "name"),
          paidUserIds
        )

        const team1Predictions = predictions.filter(
          (p) => p.predictedWinner === s.team1
        )
        const team2Predictions = predictions.filter(
          (p) => p.predictedWinner === s.team2
        )

        const total = predictions.length
        const team1Count = team1Predictions.length
        const team2Count = team2Predictions.length

        // Calculate actual result if winner is set
        let actualResult: string | undefined
        if (s.winner && s.currentScore) {
          if (s.winner === s.team1) {
            actualResult = `${s.currentScore.team1Wins}-${s.currentScore.team2Wins}`
          } else if (s.winner === s.team2) {
            actualResult = `${s.currentScore.team2Wins}-${s.currentScore.team1Wins}`
          }
        }

        // Calculate score breakdowns for each team
        const team1ScoreBreakdown = {
          "4-0": 0,
          "4-1": 0,
          "4-2": 0,
          "4-3": 0,
        }
        const team2ScoreBreakdown = {
          "4-0": 0,
          "4-1": 0,
          "4-2": 0,
          "4-3": 0,
        }

        // Detailed score info with users
        const team1ScoreDetails: {
          "4-0": Array<{ userId: string; userName: string }>
          "4-1": Array<{ userId: string; userName: string }>
          "4-2": Array<{ userId: string; userName: string }>
          "4-3": Array<{ userId: string; userName: string }>
        } = {
          "4-0": [],
          "4-1": [],
          "4-2": [],
          "4-3": [],
        }
        const team2ScoreDetails: {
          "4-0": Array<{ userId: string; userName: string }>
          "4-1": Array<{ userId: string; userName: string }>
          "4-2": Array<{ userId: string; userName: string }>
          "4-3": Array<{ userId: string; userName: string }>
        } = {
          "4-0": [],
          "4-1": [],
          "4-2": [],
          "4-3": [],
        }

        // Calculate points for each score (if series is completed)
        const team1ScorePoints: {
          "4-0": number | null
          "4-1": number | null
          "4-2": number | null
          "4-3": number | null
        } = {
          "4-0": null,
          "4-1": null,
          "4-2": null,
          "4-3": null,
        }
        const team2ScorePoints: {
          "4-0": number | null
          "4-1": number | null
          "4-2": number | null
          "4-3": number | null
        } = {
          "4-0": null,
          "4-1": null,
          "4-2": null,
          "4-3": null,
        }

        if (s.winner && s.currentScore) {
          const baseX = ROUND_BASE_VALUES[s.round]
          const actual = s.currentScore
          const actualWinner = s.winner

          // Calculate points for each team1 score
          for (const loserWins of [0, 1, 2, 3] as const) {
            const scoreKey = `4-${loserWins}` as "4-0" | "4-1" | "4-2" | "4-3"
            const predictedScore = { team1Wins: 4, team2Wins: loserWins }
            
            // Create a mock prediction for calculation
            const mockPred: any = {
              predictedWinner: s.team1,
              predictedScore,
            }
            
            const scoreResult = calculateSeriesScore(mockPred, s, s.round)
            team1ScorePoints[scoreKey] = scoreResult.points
          }

          // Calculate points for each team2 score
          for (const loserWins of [0, 1, 2, 3] as const) {
            const scoreKey = `4-${loserWins}` as "4-0" | "4-1" | "4-2" | "4-3"
            const predictedScore = { team1Wins: loserWins, team2Wins: 4 }
            
            // Create a mock prediction for calculation
            const mockPred: any = {
              predictedWinner: s.team2,
              predictedScore,
            }
            
            const scoreResult = calculateSeriesScore(mockPred, s, s.round)
            team2ScorePoints[scoreKey] = scoreResult.points
          }
        }

        // Process score predictions for team1 wins
        for (const pred of team1Predictions) {
          if (pred.predictedScore) {
            const { team1Wins, team2Wins } = pred.predictedScore
            if (team1Wins === 4) {
              const scoreKey = `4-${team2Wins}` as "4-0" | "4-1" | "4-2" | "4-3"
              if (scoreKey in team1ScoreBreakdown) {
                team1ScoreBreakdown[scoreKey]++
                
                const userId = (pred.userId as any)._id?.toString() || (pred.userId as any).toString()
                const userName = (pred.userId as any).name || "Unknown"
                
                team1ScoreDetails[scoreKey].push({
                  userId,
                  userName,
                })
              }
            }
          }
        }

        // Process score predictions for team2 wins
        for (const pred of team2Predictions) {
          if (pred.predictedScore) {
            const { team1Wins, team2Wins } = pred.predictedScore
            if (team2Wins === 4) {
              const scoreKey = `4-${team1Wins}` as "4-0" | "4-1" | "4-2" | "4-3"
              if (scoreKey in team2ScoreBreakdown) {
                team2ScoreBreakdown[scoreKey]++
                
                const userId = (pred.userId as any)._id?.toString() || (pred.userId as any).toString()
                const userName = (pred.userId as any).name || "Unknown"
                
                team2ScoreDetails[scoreKey].push({
                  userId,
                  userName,
                })
              }
            }
          }
        }

        analytics.push({
          gameId: s._id.toString(),
          gameType: "series",
          round: s.round,
          conference: s.conference,
          team1: s.team1,
          team2: s.team2,
          team1Seed: s.team1Seed,
          team2Seed: s.team2Seed,
          winner: s.winner,
          locked: isSeriesLocked(s),
          team1Count,
          team2Count,
          team1Percentage: total > 0 ? Math.round((team1Count / total) * 100) : 0,
          team2Percentage: total > 0 ? Math.round((team2Count / total) * 100) : 0,
          team1Users: team1Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          team2Users: team2Predictions.map((p) => ({
            id: (p.userId as any)._id?.toString() || (p.userId as any).toString(),
            name: (p.userId as any).name || "Unknown",
          })),
          totalPredictions: total,
          team1ScoreBreakdown,
          team2ScoreBreakdown,
          team1ScoreDetails,
          team2ScoreDetails,
          team1ScorePoints,
          team2ScorePoints,
          actualResult,
        })
      }
    }

    // Sort analytics by round order (series + play-in only in this branch)
    const roundOrder: Record<string, number> = {
      playin: 0,
      first: 1,
      second: 2,
      conference: 3,
      finals: 4,
    }

    analytics.sort((a, b) => {
      const ga = a as GameAnalytics
      const gb = b as GameAnalytics
      const roundDiff =
        (roundOrder[ga.round] || 999) - (roundOrder[gb.round] || 999)
      if (roundDiff !== 0) return roundDiff

      const confOrder: Record<string, number> = { east: 0, west: 1 }
      const confA = confOrder[ga.conference || ""] ?? 2
      const confB = confOrder[gb.conference || ""] ?? 2
      if (confA !== confB) return confA - confB

      return 0
    })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
  })
}
