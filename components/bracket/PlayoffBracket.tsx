"use client"

import { PlayoffBracketVisual } from "./PlayoffBracketVisual"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface Series {
  _id: string
  round: "first" | "second" | "conference" | "finals"
  conference: "east" | "west" | null
  team1: string
  team2: string
  startTime: Date | string
  winner?: string
  currentScore?: {
    team1Wins: number
    team2Wins: number
  }
  status?: string
}

interface PlayoffBracketProps {
  series: Series[]
  predictions?: IPrediction[]
  onPredictionSave?: (prediction: {
    seriesId: string
    predictedWinner: string
    predictedScore: {
      team1Wins: number
      team2Wins: number
    }
  }) => Promise<void>
  isViewingOtherUser?: boolean
}

export function PlayoffBracket({
  series,
  predictions,
  onPredictionSave,
  isViewingOtherUser = false,
}: PlayoffBracketProps) {
  return (
    <PlayoffBracketVisual
      series={series}
      predictions={predictions}
      onPredictionSave={onPredictionSave}
      isViewingOtherUser={isViewingOtherUser}
    />
  )
}

