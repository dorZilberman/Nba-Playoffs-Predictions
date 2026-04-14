"use client"

import {
  PlayoffBracketVisual,
  type WhatIfBracketMode,
} from "./PlayoffBracketVisual"
import type { IPrediction } from "@/app/lib/models/Prediction"
import type { ISeries } from "@/app/lib/models/Series"

interface PlayoffBracketProps {
  series: ISeries[] | Array<{
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
    team1Seed?: number
    team2Seed?: number
  }>
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
  viewingUserName?: string
  readOnly?: boolean
  whatIfMode?: WhatIfBracketMode
  embedded?: boolean
  /** Open Predictions: open prediction modal for this series (token changes each request). */
  openSeriesRequest?: { seriesId: string; token: number } | null
  onOpenSeriesRequestHandled?: () => void
}

export function PlayoffBracket({
  series,
  predictions,
  onPredictionSave,
  isViewingOtherUser = false,
  viewingUserName,
  readOnly = false,
  whatIfMode,
  embedded = false,
  openSeriesRequest,
  onOpenSeriesRequestHandled,
}: PlayoffBracketProps) {
  return (
    <PlayoffBracketVisual
      series={series}
      predictions={predictions}
      onPredictionSave={onPredictionSave}
      isViewingOtherUser={isViewingOtherUser}
      viewingUserName={viewingUserName}
      readOnly={readOnly}
      whatIfMode={whatIfMode}
      embedded={embedded}
      openSeriesRequest={openSeriesRequest}
      onOpenSeriesRequestHandled={onOpenSeriesRequestHandled}
    />
  )
}

