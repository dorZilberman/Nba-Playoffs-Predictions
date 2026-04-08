"use client"

import { PlayoffBracket } from "./PlayoffBracket"
import { PlayInBracketVisual } from "./PlayInBracketVisual"
import { EarlyFinalsPredictionsSection } from "./EarlyFinalsPredictionsSection"
import { PredictionTodoSection } from "./PredictionTodoSection"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { PlayInPredictionModal } from "./PlayInPredictionModal"
import { useSession } from "next-auth/react"
import { useState, useEffect, useCallback, useMemo } from "react"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"
import {
  USER_NOT_IN_DB_CODE,
  USER_NOT_IN_DB_MESSAGE,
} from "@/app/lib/userNotInDbConstants"
import { isPredictionSlotOpen } from "@/app/lib/admin/userRoundCompletion"
import type { UserStanding } from "@/app/api/standings/route"

function formatBracketSectionPoints(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  const sign = v >= 0 ? "+" : ""
  return `${sign}${v} points`
}

interface NBABracketViewProps {
  viewingUserId?: string
  isViewingOtherUser?: boolean
  viewingUserName?: string
}

export function NBABracketView({
  viewingUserId,
  isViewingOtherUser = false,
  viewingUserName = "User",
}: NBABracketViewProps = {}) {
  const { data: session } = useSession()
  const [series, setSeries] = useState<ISeries[]>([])
  const [playInGames, setPlayInGames] = useState<IPlayInGame[]>([])
  const [predictions, setPredictions] = useState<IPrediction[]>([])
  const [selectedPlayIn, setSelectedPlayIn] = useState<IPlayInGame | null>(null)
  const [isPlayInModalOpen, setIsPlayInModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  /** Set when GET /api/predictions returns 403 (session user missing from DB). */
  const [accountMissingMessage, setAccountMissingMessage] = useState<
    string | null
  >(null)
  const [todoEarlyFinalsRefreshKey, setTodoEarlyFinalsRefreshKey] = useState(0)
  /** `null` until GET /api/early-finals resolves — treat as expanded like before. */
  const [earlyFinalsWindowOpen, setEarlyFinalsWindowOpen] = useState<
    boolean | null
  >(null)
  /** Scores for the user whose bracket is shown (you or selected user). */
  const [viewedStanding, setViewedStanding] = useState<UserStanding | null>(
    null
  )

  const fetchData = useCallback(async () => {
    try {
      // Build predictions URL with userId and lockedOnly params
      let predictionsUrl = "/api/predictions"
      if (viewingUserId) {
        predictionsUrl = `/api/predictions?userId=${viewingUserId}`
        if (isViewingOtherUser) {
          predictionsUrl += "&lockedOnly=true"
        }
      }

      const targetUserId = viewingUserId ?? session?.user?.id

      const [seriesRes, playInRes, predictionsRes, standingsRes] =
        await Promise.all([
          fetch("/api/series"),
          fetch("/api/playin"),
          fetch(predictionsUrl),
          fetch("/api/standings"),
        ])

      if (seriesRes.ok) {
        const data = await seriesRes.json()
        setSeries(Array.isArray(data) ? data : [])
      }

      if (playInRes.ok) {
        const data = await playInRes.json()
        setPlayInGames(Array.isArray(data) ? data : [])
      }

      if (predictionsRes.ok) {
        setAccountMissingMessage(null)
        const data = await predictionsRes.json()
        setPredictions(Array.isArray(data) ? data : [])
      } else if (predictionsRes.status === 403) {
        const body = (await predictionsRes.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        if (body.code === USER_NOT_IN_DB_CODE) {
          setAccountMissingMessage(
            typeof body.error === "string" ? body.error : USER_NOT_IN_DB_MESSAGE
          )
        } else {
          setAccountMissingMessage(null)
        }
        setPredictions([])
      } else {
        setAccountMissingMessage(null)
      }

      if (standingsRes.ok && targetUserId) {
        const standingsData = (await standingsRes.json()) as UserStanding[]
        const row = Array.isArray(standingsData)
          ? standingsData.find((s) => s.userId === targetUserId) ?? null
          : null
        setViewedStanding(row)
      } else {
        setViewedStanding(null)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setViewedStanding(null)
    } finally {
      setLoading(false)
    }
  }, [viewingUserId, isViewingOtherUser, session?.user?.id])

  const bumpTodoEarlyFinalsRefresh = useCallback(() => {
    setTodoEarlyFinalsRefreshKey((k) => k + 1)
  }, [])

  const onEarlyFinalsSaved = useCallback(() => {
    bumpTodoEarlyFinalsRefresh()
    void fetchData()
  }, [bumpTodoEarlyFinalsRefresh, fetchData])

  const playoffsPointsTotal = useMemo(() => {
    if (!viewedStanding) return 0
    return (
      viewedStanding.firstRoundScore +
      viewedStanding.secondRoundScore +
      viewedStanding.conferenceFinalsScore +
      viewedStanding.finalsScore
    )
  }, [viewedStanding])

  const sectionPointsHeader = useCallback(
    (points: number) =>
      loading ? (
        <span className="text-sm text-muted-foreground">…</span>
      ) : (
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {formatBracketSectionPoints(points)}
        </span>
      ),
    [loading]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/early-finals", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const d = (await res.json()) as {
          seasonId: string | null
          locked: boolean
        }
        if (cancelled) return
        setEarlyFinalsWindowOpen(!!(d.seasonId && !d.locked))
      } catch {
        if (!cancelled) setEarlyFinalsWindowOpen(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [todoEarlyFinalsRefreshKey])

  const playInSectionHasOpenSlot = useMemo(() => {
    const now = new Date()
    return playInGames.some((g) =>
      isPredictionSlotOpen(
        g.team1,
        g.team2,
        g.winner,
        new Date(g.startTime),
        now
      )
    )
  }, [playInGames])

  const playoffsSectionHasOpenSlot = useMemo(() => {
    const now = new Date()
    return series.some((s) =>
      isPredictionSlotOpen(
        s.team1,
        s.team2,
        s.winner,
        new Date(s.startTime),
        now
      )
    )
  }, [series])

  const handlePredictionSave = async (prediction: {
    seriesId: string
    predictedWinner: string
    predictedScore: {
      team1Wins: number
      team2Wins: number
    }
  }) => {
    try {
      const existingPrediction = predictions.find(
        (p) => p.seriesId?.toString() === prediction.seriesId
      )

      const url = existingPrediction
        ? `/api/predictions/${existingPrediction._id}`
        : "/api/predictions"
      const method = existingPrediction ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prediction),
      })

      if (res.ok) {
        await fetchData() // Refresh data
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  const handlePlayInClick = (game: IPlayInGame | undefined) => {
    if (!game) return // Don't open modal for empty games (only admins can create)
    // Don't allow clicking when viewing another user's predictions
    if (isViewingOtherUser) {
      return
    }
    // Check if both teams are filled before allowing prediction
    if (game.team1 === "TBD" || game.team2 === "TBD" || !game.team1 || !game.team2) {
      alert("Both teams must be set before making a prediction")
      return
    }
    // Check if winner is already set
    if (game.winner) {
      alert("This game is locked. A winner has already been determined.")
      return
    }
    // Check if game is locked by time
    const now = new Date()
    const startTime = new Date(game.startTime)
    if (now >= startTime) {
      alert("This game is locked. Predictions cannot be made after the deadline.")
      return
    }
    setSelectedPlayIn(game)
    setIsPlayInModalOpen(true)
  }

  const handlePlayInPredictionSave = async (prediction: {
    playInGameId: string
    predictedWinner: string
  }) => {
    try {
      const existingPrediction = predictions.find(
        (p) => p.playInGameId?.toString() === prediction.playInGameId
      )

      const url = existingPrediction
        ? `/api/predictions/${existingPrediction._id}`
        : "/api/predictions"
      const method = existingPrediction ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prediction),
      })

      if (res.ok) {
        await fetchData() // Refresh data
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  return (
    <div className="w-full space-y-6">
      {accountMissingMessage ? (
        <div
          className="rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {accountMissingMessage}
        </div>
      ) : null}
      <PredictionTodoSection
        series={series}
        playInGames={playInGames}
        predictions={predictions}
        loading={loading}
        enabled={
          !isViewingOtherUser && accountMissingMessage == null
        }
        earlyFinalsRefreshKey={todoEarlyFinalsRefreshKey}
      />
      <CollapsibleSection
        key={`early-finals-${String(earlyFinalsWindowOpen)}`}
        title="Early Finals Predictions"
        headerRight={sectionPointsHeader(viewedStanding?.earlyFinalsScore ?? 0)}
        defaultOpen={earlyFinalsWindowOpen !== false}
      >
        <EarlyFinalsPredictionsSection
          series={series}
          viewingUserId={viewingUserId}
          isViewingOtherUser={isViewingOtherUser}
          viewingUserName={viewingUserName}
          onPredictionSaved={
            !isViewingOtherUser ? onEarlyFinalsSaved : undefined
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`play-in-${playInSectionHasOpenSlot}`}
        title="Play-In"
        headerRight={sectionPointsHeader(viewedStanding?.playInScore ?? 0)}
        defaultOpen={playInSectionHasOpenSlot}
      >
        <PlayInBracketVisual
          embedded
          games={playInGames}
          predictions={predictions}
          onGameClick={handlePlayInClick}
          isAdmin={false}
          isViewingOtherUser={isViewingOtherUser}
          viewingUserName={isViewingOtherUser ? viewingUserName : undefined}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`playoffs-${playoffsSectionHasOpenSlot}`}
        title="Playoffs"
        headerRight={sectionPointsHeader(playoffsPointsTotal)}
        defaultOpen={playoffsSectionHasOpenSlot}
      >
        <PlayoffBracket
          embedded
          series={series}
          predictions={predictions}
          onPredictionSave={handlePredictionSave}
          isViewingOtherUser={isViewingOtherUser}
          viewingUserName={isViewingOtherUser ? viewingUserName : undefined}
        />
      </CollapsibleSection>

      {/* Play-In Prediction Modal */}
      {selectedPlayIn && (
        <PlayInPredictionModal
          game={selectedPlayIn}
          prediction={predictions.find((p) => {
            const gameId = typeof p.playInGameId === 'object' && p.playInGameId !== null
              ? (p.playInGameId as any)._id?.toString()
              : (p.playInGameId as string | undefined)?.toString()
            return gameId === selectedPlayIn._id?.toString()
          })}
          isOpen={isPlayInModalOpen}
          onClose={() => {
            setIsPlayInModalOpen(false)
            setSelectedPlayIn(null)
          }}
          onSave={handlePlayInPredictionSave}
        />
      )}
    </div>
  )
}
