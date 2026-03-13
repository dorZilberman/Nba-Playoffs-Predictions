import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"
import Prediction from "@/app/lib/models/Prediction"
import Series from "@/app/lib/models/Series"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Season from "@/app/lib/models/Season"
import {
  calculateSeriesScore,
  calculatePlayInScore,
} from "@/app/lib/scoring/calculator"

export interface UserStanding {
  userId: string
  userName: string
  totalScore: number
  playInScore: number
  firstRoundScore: number
  secondRoundScore: number
  conferenceFinalsScore: number
  finalsScore: number
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    await dbConnect()

    const season = await Season.findOne({ isActive: true })
    if (!season) {
      return NextResponse.json([])
    }

    const users = await User.find({})
    const allSeries = await Series.find({ seasonId: season._id })
    const allPlayInGames = await PlayInGame.find({ seasonId: season._id })
    const allPredictions = await Prediction.find({})

    const standings: UserStanding[] = users.map((user) => {
      const userPredictions = allPredictions.filter(
        (p) => p.userId.toString() === user._id.toString()
      )

      let playInScore = 0
      let firstRoundScore = 0
      let secondRoundScore = 0
      let conferenceFinalsScore = 0
      let finalsScore = 0

      userPredictions.forEach((prediction) => {
        if (prediction.playInGameId) {
          const gameId = prediction.playInGameId.toString()
          const game = allPlayInGames.find(
            (g) => g._id.toString() === gameId
          )
          if (game) {
            const score = calculatePlayInScore(prediction, game)
            playInScore += score
          }
        } else if (prediction.seriesId) {
          const seriesId = prediction.seriesId.toString()
          const series = allSeries.find(
            (s) => s._id.toString() === seriesId
          )
          if (series) {
            const result = calculateSeriesScore(
              prediction,
              series,
              series.round
            )
            const score = result.points

            switch (series.round) {
              case "first":
                firstRoundScore += score
                break
              case "second":
                secondRoundScore += score
                break
              case "conference":
                conferenceFinalsScore += score
                break
              case "finals":
                finalsScore += score
                break
            }
          }
        }
      })

      const totalScore =
        playInScore +
        firstRoundScore +
        secondRoundScore +
        conferenceFinalsScore +
        finalsScore

      return {
        userId: user._id.toString(),
        userName: user.name,
        totalScore,
        playInScore,
        firstRoundScore,
        secondRoundScore,
        conferenceFinalsScore,
        finalsScore,
      }
    })

    // Sort by total score (descending)
    standings.sort((a, b) => b.totalScore - a.totalScore)

    return NextResponse.json(standings)
  } catch (error) {
    console.error("Error calculating standings:", error)
    return NextResponse.json(
      { error: "Failed to calculate standings" },
      { status: 500 }
    )
  }
}
