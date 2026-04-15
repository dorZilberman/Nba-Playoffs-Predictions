"use client"

import { PlayoffBracket } from "./PlayoffBracket"
import { PlayInBracketVisual } from "./PlayInBracketVisual"
import {
  EarlyFinalsPredictionsSection,
  type EarlyFinalsApiResponse,
} from "./EarlyFinalsPredictionsSection"
import {
  PredictionTodoSection,
  type OpenPredictionNavigatePayload,
  type EarlyFinalsTodoPayload,
} from "./PredictionTodoSection"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { PlayInPredictionModal } from "./PlayInPredictionModal"
import { useState, useCallback, useMemo } from "react"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"
import { isPredictionSlotOpen } from "@/app/lib/admin/userRoundCompletion"
import type { UserStanding } from "@/app/api/standings/route"

function formatBracketSectionPoints(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  const sign = v >= 0 ? "+" : ""
  return `${sign}${v} points`
}

const BRACKET_SECTION_DOM_IDS: Record<
  OpenPredictionNavigatePayload["kind"],
  string
> = {
  earlyFinals: "bracket-section-early-finals",
  playIn: "bracket-section-play-in",
  series: "bracket-section-playoffs",
}

function expandBracketSectionIfCollapsed(sectionRootId: string) {
  const root = document.getElementById(sectionRootId)
  if (!root) return
  const btn = root.querySelector(":scope > button[type='button']")
  if (
    btn instanceof HTMLButtonElement &&
    btn.getAttribute("aria-expanded") === "false"
  ) {
    btn.click()
  }
}

function scrollToBracketAnchor(scrollTargetId: string) {
  const el = document.getElementById(scrollTargetId)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    return true
  }
  return false
}

function toEarlyFinalsTodoPayload(
  r: EarlyFinalsApiResponse | null
): EarlyFinalsTodoPayload | null {
  if (!r) return null
  return {
    seasonId: r.seasonId,
    playoffsStartTime: r.playoffsStartTime,
    locked: r.locked,
    prediction: r.prediction,
  }
}

export interface NBABracketViewProps {
  viewingUserId?: string
  isViewingOtherUser?: boolean
  viewingUserName?: string
  series: ISeries[]
  playInGames: IPlayInGame[]
  predictions: IPrediction[]
  standingsRows: UserStanding[]
  earlyFinalsResponse: EarlyFinalsApiResponse | null
  loading: boolean
  accountMissingMessage: string | null
  refreshBracketData: () => Promise<void>
}

export function NBABracketView({
  viewingUserId,
  isViewingOtherUser = false,
  viewingUserName = "User",
  series,
  playInGames,
  predictions,
  standingsRows,
  earlyFinalsResponse,
  loading,
  accountMissingMessage,
  refreshBracketData,
}: NBABracketViewProps) {
  const [selectedPlayIn, setSelectedPlayIn] = useState<IPlayInGame | null>(null)
  const [isPlayInModalOpen, setIsPlayInModalOpen] = useState(false)
  const [playoffOpenSeriesRequest, setPlayoffOpenSeriesRequest] = useState<{
    seriesId: string
    token: number
  } | null>(null)

  const clearPlayoffOpenSeriesRequest = useCallback(() => {
    setPlayoffOpenSeriesRequest(null)
  }, [])

  const viewedStanding = useMemo(() => {
    const targetUserId = viewingUserId
    if (!targetUserId) return null
    return standingsRows.find((s) => s.userId === targetUserId) ?? null
  }, [standingsRows, viewingUserId])

  const earlyFinalsWindowOpen = useMemo(() => {
    if (!earlyFinalsResponse) return null
    return !!(earlyFinalsResponse.seasonId && !earlyFinalsResponse.locked)
  }, [earlyFinalsResponse])

  const earlyFinalsTodoPayload = useMemo(
    () => toEarlyFinalsTodoPayload(earlyFinalsResponse),
    [earlyFinalsResponse]
  )

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
        await refreshBracketData()
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  const handlePlayInClick = useCallback(
    (game: IPlayInGame | undefined) => {
      if (!game) return
      if (isViewingOtherUser) {
        return
      }
      if (game.team1 === "TBD" || game.team2 === "TBD" || !game.team1 || !game.team2) {
        alert("Both teams must be set before making a prediction")
        return
      }
      if (game.winner) {
        alert("This game is locked. A winner has already been determined.")
        return
      }
      const now = new Date()
      const startTime = new Date(game.startTime)
      if (now >= startTime) {
        alert("This game is locked. Predictions cannot be made after the deadline.")
        return
      }
      setSelectedPlayIn(game)
      setIsPlayInModalOpen(true)
    },
    [isViewingOtherUser]
  )

  const handleOpenPredictionNavigate = useCallback(
    (payload: OpenPredictionNavigatePayload) => {
      expandBracketSectionIfCollapsed(BRACKET_SECTION_DOM_IDS[payload.kind])
      const run = () => {
        if (!scrollToBracketAnchor(payload.scrollTargetId)) {
          window.setTimeout(() => scrollToBracketAnchor(payload.scrollTargetId), 250)
        }
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(run)
      })

      window.setTimeout(() => {
        if (payload.kind === "playIn" && payload.openPlayInGameId) {
          const game = playInGames.find(
            (g) => String(g._id) === payload.openPlayInGameId
          )
          if (game) handlePlayInClick(game)
        } else if (payload.kind === "series" && payload.openSeriesId) {
          setPlayoffOpenSeriesRequest({
            seriesId: payload.openSeriesId,
            token: Date.now(),
          })
        }
      }, 450)
    },
    [playInGames, handlePlayInClick]
  )

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
        await refreshBracketData()
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save prediction")
      }
    } catch (error) {
      console.error("Error saving prediction:", error)
      throw error
    }
  }

  const onEarlyFinalsSaved = useCallback(async () => {
    await refreshBracketData()
  }, [refreshBracketData])

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
        earlyFinalsTodoBundled
        earlyFinalsTodoFromParent={earlyFinalsTodoPayload}
        onRowNavigate={
          !isViewingOtherUser && accountMissingMessage == null
            ? handleOpenPredictionNavigate
            : undefined
        }
      />
      <CollapsibleSection
        id="bracket-section-early-finals"
        className="scroll-mt-20"
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
          prefetchedEarlyFinals={earlyFinalsResponse}
          refreshAfterSaveOnly={!isViewingOtherUser}
          onPredictionSaved={
            !isViewingOtherUser ? onEarlyFinalsSaved : undefined
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="bracket-section-play-in"
        className="scroll-mt-20"
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
        id="bracket-section-playoffs"
        className="scroll-mt-20"
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
          openSeriesRequest={playoffOpenSeriesRequest}
          onOpenSeriesRequestHandled={clearPlayoffOpenSeriesRequest}
        />
      </CollapsibleSection>

      {selectedPlayIn && (
        <PlayInPredictionModal
          game={selectedPlayIn}
          prediction={predictions.find((p) => {
            const gameId =
              typeof p.playInGameId === "object" && p.playInGameId !== null
                ? String(
                    (p.playInGameId as { _id?: { toString(): string } })._id
                  )
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
