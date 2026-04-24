"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tooltip } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import type {
  WhoAmIClientRound,
  WhoAmICellFeedback,
  WhoAmIColumnKey,
  WhoAmIGuessRowPayload,
} from "@/app/lib/minigames/whoAmIFeedback"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"
import { BestStreakLeaderboardCard } from "@/components/minigames/BestStreakLeaderboardCard"
import { WhoAmIPlayerPicker } from "@/components/minigames/WhoAmIPlayerPicker"
import {
  NbaConferenceDivisionMapDialog,
  NbaMapInfoButton,
  useConferenceDivisionTree,
} from "@/components/minigames/NbaConferenceDivisionMapDialog"
import { cn } from "@/app/lib/utils/cn"

type WhoAmISessionPayload = {
  inLobby: boolean
  currentStreak: number
  bestStreak: number
  runHintsUsed?: number
  round: WhoAmIClientRound | null
}

const COLUMNS: { key: WhoAmIColumnKey; label: string }[] = [
  { key: "team", label: "Team" },
  { key: "conference", label: "Conference" },
  { key: "division", label: "Division" },
  { key: "position", label: "Position" },
  { key: "height", label: "Height" },
  { key: "age", label: "Age" },
  { key: "jerseyNumber", label: "Jersey #" },
  { key: "nationality", label: "Nationality" },
]

function cellSurface(fb: WhoAmICellFeedback): string {
  switch (fb.state) {
    case "correct":
      return cn(
        "bg-emerald-500 text-white shadow-sm",
        "dark:bg-emerald-600 dark:text-white"
      )
    case "close":
      return cn(
        "bg-amber-400 text-amber-950 shadow-sm",
        "dark:bg-amber-500 dark:text-neutral-950"
      )
    default:
      return cn(
        "bg-zinc-300/95 text-zinc-950 shadow-sm",
        "dark:bg-zinc-700 dark:text-zinc-50"
      )
  }
}

function FeedbackArrow({ fb }: { fb: WhoAmICellFeedback }) {
  const arrow =
    fb.dir === "higher" ? "↑" : fb.dir === "lower" ? "↓" : null
  if (!arrow) return null
  return (
    <span
      className={cn(
        "text-base font-black leading-none tracking-tight",
        fb.state === "wrong" && "text-zinc-800 dark:text-white drop-shadow-sm",
        fb.state === "close" &&
          "text-amber-950 dark:text-neutral-950 drop-shadow-sm",
        fb.state === "correct" && "text-white/90 drop-shadow-sm"
      )}
      title={
        fb.dir === "higher"
          ? "Answer is higher"
          : fb.dir === "lower"
            ? "Answer is lower"
            : undefined
      }
    >
      {arrow}
    </span>
  )
}

/** One colored stat tile — used in the mobile card grid. */
function GuessAttributeTile({
  text,
  fb,
  winRow,
}: {
  text: string
  fb: WhoAmICellFeedback
  winRow?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-center text-xs font-semibold tabular-nums leading-snug sm:text-sm",
        cellSurface(fb),
        winRow &&
          "shadow-[0_0_0_2px_rgba(16,185,129,0.55),0_6px_20px_-10px_rgba(16,185,129,0.35)] dark:shadow-[0_0_0_2px_rgba(52,211,153,0.45),0_6px_24px_-10px_rgba(16,185,129,0.3)]"
      )}
    >
      <span className="break-words [overflow-wrap:anywhere]">{text}</span>
      <FeedbackArrow fb={fb} />
    </div>
  )
}

function GuessCell({
  text,
  fb,
  winRow,
}: {
  text: string
  fb: WhoAmICellFeedback
  winRow?: boolean
}) {
  return (
    <td
      className={cn(
        "min-w-[5.75rem] max-w-[11rem] px-2.5 py-2.5 text-center align-middle transition-shadow duration-200 sm:min-w-[6.75rem] sm:px-3 sm:py-3",
        "rounded-xl border-0 font-semibold tabular-nums",
        "text-xs leading-snug sm:text-sm",
        cellSurface(fb),
        winRow &&
          "z-[1] shadow-[0_0_0_2px_rgba(16,185,129,0.65),0_8px_24px_-10px_rgba(16,185,129,0.45)] dark:shadow-[0_0_0_2px_rgba(52,211,153,0.5),0_8px_28px_-10px_rgba(16,185,129,0.35)]"
      )}
    >
      <span className="inline-flex min-h-[2.25rem] flex-col items-center justify-center gap-0.5 break-words [overflow-wrap:anywhere]">
        <span>{text}</span>
        <FeedbackArrow fb={fb} />
      </span>
    </td>
  )
}

function MobileGuessCards({
  guessRows,
  status,
  answerPlayerId,
  onOpenNbaMap,
}: {
  guessRows: WhoAmIGuessRowPayload[]
  status: WhoAmIClientRound["status"]
  answerPlayerId: string | null | undefined
  onOpenNbaMap: () => void
}) {
  if (guessRows.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 md:hidden" aria-label="Guess history (mobile layout)">
      <p className="text-center text-[11px] text-muted-foreground">
        Each card lists every clue for one guess — no sideways scrolling.
      </p>
      <ul className="space-y-3">
        {guessRows.map((gr) => {
          const isWinningRow =
            status === "won" &&
            answerPlayerId != null &&
            gr.guessedPlayerId === answerPlayerId
          return (
            <li
              key={gr.guessedPlayerId}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur-sm dark:bg-card/40",
                isWinningRow &&
                  "border-emerald-500/55 bg-emerald-500/[0.08] shadow-[0_0_0_2px_rgba(16,185,129,0.35)] dark:bg-emerald-500/[0.12]"
              )}
            >
              <p className="mb-2.5 border-b border-border/50 pb-2 text-sm font-semibold leading-snug text-foreground">
                {gr.guessedName}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                {COLUMNS.map((c) => (
                  <div key={c.key} className="flex min-w-0 flex-col gap-1">
                    <span className="min-w-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {c.key === "conference" || c.key === "division" ? (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
                          <span className="min-w-0 flex-1 truncate">{c.label}</span>
                          <NbaMapInfoButton onOpen={onOpenNbaMap} />
                        </span>
                      ) : (
                        c.label
                      )}
                    </span>
                    <GuessAttributeTile
                      text={gr.display[c.key]}
                      fb={gr.feedback[c.key]}
                      winRow={isWinningRow}
                    />
                  </div>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type WhoAmIGameProps = {
  showTitle?: boolean
}

export function WhoAmIGame({ showTitle = true }: WhoAmIGameProps) {
  const { data: session } = useSession()
  const myId = session?.user?.id

  const [bundle, setBundle] = useState<HangmanPlayerBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inLobby, setInLobby] = useState(true)
  const [round, setRound] = useState<WhoAmIClientRound | null>(null)

  const [streakCurrent, setStreakCurrent] = useState(0)
  const [streakBest, setStreakBest] = useState(0)
  const [runHintsUsed, setRunHintsUsed] = useState(0)
  const [nbaMapOpen, setNbaMapOpen] = useState(false)
  const conferenceDivisionTree = useConferenceDivisionTree(
    bundle?.players ?? null
  )
  const [lbRows, setLbRows] = useState<BestStreakLeaderboardRow[]>([])
  const [lbLoading, setLbLoading] = useState(true)

  const [autoMode, setAutoMode] = useState(false)
  const [autoSecondsLeft, setAutoSecondsLeft] = useState<number | null>(null)
  const [lobbyNote, setLobbyNote] = useState<string | null>(null)
  const [pickerPlayerId, setPickerPlayerId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)

  const roundSeqRef = useRef(0)
  const reportedSeqRef = useRef<number | null>(null)
  const autoTimerRef = useRef<number | null>(null)
  const streakRef = useRef(0)

  useEffect(() => {
    streakRef.current = streakCurrent
  }, [streakCurrent])

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/minigames/who-am-i/leaderboard", {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = (await res.json()) as { rows: BestStreakLeaderboardRow[] }
      setLbRows(data.rows ?? [])
    } finally {
      setLbLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  const hydrateFromServer = useCallback(async (payload: WhoAmISessionPayload) => {
      setStreakCurrent(payload.currentStreak)
      setStreakBest(payload.bestStreak)
      setRunHintsUsed(payload.runHintsUsed ?? 0)

      if (!payload.round) {
        setInLobby(true)
        setRound(null)
        return
      }

      setInLobby(payload.inLobby)

      if (payload.inLobby) {
        setRound(null)
        return
      }

      setRound(payload.round)
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [pres, sres] = await Promise.all([
          fetch("/api/minigames/hangman/players", { cache: "no-store" }),
          fetch("/api/minigames/who-am-i/round-state", { cache: "no-store" }),
        ])
        if (!pres.ok) {
          if (!cancelled) setLoadError("Could not load players.")
          return
        }
        const data = (await pres.json()) as HangmanPlayerBundle
        if (!sres.ok) {
          if (!cancelled) setLoadError("Could not load saved game.")
          return
        }
        const sessionJson = (await sres.json()) as WhoAmISessionPayload
        if (cancelled) return
        setBundle(data)
        await hydrateFromServer(sessionJson)
      } catch {
        if (!cancelled) setLoadError("Could not load Who Am I?.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrateFromServer])

  /** Max-guess loss: streak + lobby after a short view of the final grid. */
  useEffect(() => {
    if (round?.status !== "lost") return
    const seq = roundSeqRef.current
    if (reportedSeqRef.current === seq) return
    reportedSeqRef.current = seq

    const streakBeforeLoss = streakRef.current
    const answerName = round.answerPlayer?.displayName ?? "the player"
    void (async () => {
      try {
        const res = await fetch("/api/minigames/who-am-i/round-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome: "lost" }),
        })
        if (!res.ok) return
        const d = (await res.json()) as {
          currentStreak: number
          bestStreak: number
          runHintsUsed?: number
        }
        setStreakCurrent(d.currentStreak)
        setStreakBest(d.bestStreak)
        setRunHintsUsed(d.runHintsUsed ?? 0)
        loadLeaderboard()

        await fetch("/api/minigames/who-am-i/to-lobby", { method: "POST" })
        const sres = await fetch("/api/minigames/who-am-i/round-state", {
          cache: "no-store",
        })
        if (sres.ok && bundle) {
          const sj = (await sres.json()) as WhoAmISessionPayload
          await hydrateFromServer(sj)
        }
        setLobbyNote(
          streakBeforeLoss > 0
            ? `Out of guesses. Your streak was ${streakBeforeLoss}. Answer: ${answerName}`
            : `Out of guesses. Answer: ${answerName}`
        )
        setInLobby(true)
        setRound(null)
      } catch {
        /* ignore */
      }
    })()
  }, [round?.status, round?.answerPlayer, loadLeaderboard, bundle, hydrateFromServer])

  const advanceAfterWin = useCallback(async () => {
    const res = await fetch("/api/minigames/who-am-i/next", { method: "POST" })
    if (!res.ok) return
    const sres = await fetch("/api/minigames/who-am-i/round-state", {
      cache: "no-store",
    })
    if (!sres.ok || !bundle) return
    const sj = (await sres.json()) as WhoAmISessionPayload
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    setPickerPlayerId("")
    await hydrateFromServer(sj)
  }, [bundle, hydrateFromServer])

  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoSecondsLeft(null)

    if (!autoMode || round?.status !== "won" || inLobby || !round) return

    let left = 3
    setAutoSecondsLeft(left)
    autoTimerRef.current = window.setInterval(() => {
      left -= 1
      setAutoSecondsLeft(left)
      if (left <= 0) {
        if (autoTimerRef.current) window.clearInterval(autoTimerRef.current)
        autoTimerRef.current = null
        setAutoSecondsLeft(null)
        void advanceAfterWin()
      }
    }, 1000)

    return () => {
      if (autoTimerRef.current) window.clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }, [autoMode, round?.status, inLobby, round, advanceAfterWin])

  const startNewGame = useCallback(async () => {
    setLobbyNote(null)
    const res = await fetch("/api/minigames/who-am-i/start", { method: "POST" })
    if (!res.ok) return
    const sres = await fetch("/api/minigames/who-am-i/round-state", {
      cache: "no-store",
    })
    if (!sres.ok || !bundle) return
    const sj = (await sres.json()) as WhoAmISessionPayload
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    setPickerPlayerId("")
    await hydrateFromServer(sj)
  }, [bundle, hydrateFromServer])

  const nextPlayer = useCallback(async () => {
    if (round?.status !== "won") return
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoSecondsLeft(null)
    await advanceAfterWin()
  }, [round?.status, advanceAfterWin])

  const giveUp = useCallback(async () => {
    if (round?.status !== "playing" || inLobby || !round) return
    const res = await fetch("/api/minigames/who-am-i/give-up", { method: "POST" })
    if (!res.ok) return
    const d = (await res.json()) as {
      streakEnded: number
      currentStreak: number
      bestStreak: number
      answerPlayer: { displayName: string } | null
    }
    setStreakCurrent(d.currentStreak)
    setStreakBest(d.bestStreak)
    loadLeaderboard()
    const name = d.answerPlayer?.displayName ?? "the player"
    setLobbyNote(
      d.streakEnded > 0
        ? `You gave up. Your streak was ${d.streakEnded}. Answer: ${name}`
        : `You gave up. Answer: ${name}`
    )
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    setPickerPlayerId("")
    const sres = await fetch("/api/minigames/who-am-i/round-state", {
      cache: "no-store",
    })
    if (sres.ok && bundle) {
      const sj = (await sres.json()) as WhoAmISessionPayload
      await hydrateFromServer(sj)
    }
  }, [round?.status, inLobby, round, loadLeaderboard, bundle, hydrateFromServer])

  const onPhotoHint = useCallback(async () => {
    if (round?.status !== "playing" || inLobby || !round || round.photoHintUsed) return
    setHintLoading(true)
    try {
      const res = await fetch("/api/minigames/who-am-i/photo-hint", {
        method: "POST",
      })
      if (!res.ok) return
      const data = (await res.json()) as {
        photoHintUsed: boolean
        photoHintUrl: string | null
        runHintsUsed?: number
      }
      if (typeof data.runHintsUsed === "number") {
        setRunHintsUsed(data.runHintsUsed)
      }
      setRound((prev) =>
        prev
          ? {
              ...prev,
              photoHintUsed: data.photoHintUsed,
              photoHintUrl: data.photoHintUrl,
            }
          : prev
      )
    } finally {
      setHintLoading(false)
    }
  }, [round?.status, round?.photoHintUsed, inLobby, round])

  const onSubmitGuess = useCallback(
    async (guessedPlayerId: string) => {
      if (!round || round.status !== "playing" || submitting) return
      setSubmitting(true)
      try {
        const res = await fetch("/api/minigames/who-am-i/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guessedPlayerId }),
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          won?: boolean
          lost?: boolean
          row?: WhoAmIClientRound["guessRows"][0]
          guessRows?: WhoAmIClientRound["guessRows"]
          guessesUsed?: number
          maxGuesses?: number
          answerPlayer?: WhoAmIClientRound["answerPlayer"]
        }

        if (data.won && data.guessRows && data.answerPlayer) {
          try {
            const rr = await fetch("/api/minigames/who-am-i/round-result", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ outcome: "won" }),
            })
            if (rr.ok) {
              const streakJson = (await rr.json()) as {
                currentStreak: number
                bestStreak: number
                runHintsUsed?: number
              }
              setStreakCurrent(streakJson.currentStreak)
              setStreakBest(streakJson.bestStreak)
              if (typeof streakJson.runHintsUsed === "number") {
                setRunHintsUsed(streakJson.runHintsUsed)
              }
              loadLeaderboard()
            }
          } catch {
            /* ignore */
          }
          roundSeqRef.current += 1
          reportedSeqRef.current = null
          setRound({
            guessRows: data.guessRows,
            photoHintUsed: round.photoHintUsed,
            photoHintUrl: round.photoHintUrl,
            guessesUsed: data.guessesUsed ?? data.guessRows.length,
            maxGuesses: data.maxGuesses ?? round.maxGuesses,
            status: "won",
            answerPlayer: data.answerPlayer,
          })
          setPickerPlayerId("")
          return
        }

        if (data.lost && data.guessRows && data.answerPlayer) {
          roundSeqRef.current += 1
          reportedSeqRef.current = null
          setRound({
            guessRows: data.guessRows,
            photoHintUsed: round.photoHintUsed,
            photoHintUrl: null,
            guessesUsed: data.guessesUsed ?? data.guessRows.length,
            maxGuesses: data.maxGuesses ?? round.maxGuesses,
            status: "lost",
            answerPlayer: data.answerPlayer,
          })
          setPickerPlayerId("")
          return
        }

        if (data.row && data.guessesUsed != null) {
          setRound((prev) =>
            prev
              ? {
                  ...prev,
                  guessRows: [data.row!, ...prev.guessRows],
                  guessesUsed: data.guessesUsed!,
                }
              : prev
          )
          setPickerPlayerId("")
        }
      } finally {
        setSubmitting(false)
      }
    },
    [round, submitting, loadLeaderboard]
  )

  const guessedIds = new Set(round?.guessRows.map((r) => r.guessedPlayerId) ?? [])

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    )
  }

  if (!bundle) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">Loading Who Am I?…</p>
    )
  }

  const showPlayfield = !inLobby && round

  return (
    <div className="space-y-8">
      <Card
        className="overflow-x-clip"
        aria-label={showTitle ? undefined : "Who Am I? — guess the NBA player"}
      >
        {showTitle ? (
          <CardHeader className="space-y-1 px-3 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl">Who Am I?</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Poeltl-style clues — {bundle.seasonLabel} roster · {bundle.players.length}{" "}
              players · {round?.maxGuesses ?? 8} guesses per mystery player
            </CardDescription>
          </CardHeader>
        ) : null}
        <CardContent
          className={cn(
            "space-y-4 px-3 pb-4 sm:space-y-6 sm:px-6 sm:pb-6",
            showTitle ? "pt-0" : "pt-4 sm:pt-6"
          )}
        >
          {!showTitle && (
            <p className="text-xs text-muted-foreground sm:text-sm" aria-live="polite">
              {bundle.seasonLabel} · {bundle.players.length} players
              {round
                ? ` · Guesses left: ${round.maxGuesses - round.guessesUsed}`
                : ""}
            </p>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm sm:gap-x-8">
            <div>
              <span className="text-muted-foreground">Current streak</span>
              <p className="text-2xl font-semibold tabular-nums">{streakCurrent}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Best streak</span>
              <p className="text-2xl font-semibold tabular-nums">{streakBest}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Photo hints (this run)</span>
              <p className="text-2xl font-semibold tabular-nums">{runHintsUsed}</p>
            </div>
          </div>

          {inLobby && (
            <div className="space-y-4 rounded-lg border bg-muted/30 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Guess the mystery player using the grid clues. Wrong guesses and giving up
                reset your streak; wins build it.
              </p>
              {lobbyNote && (
                <p className="text-sm font-medium text-foreground" role="status">
                  {lobbyNote}
                </p>
              )}
              <Button
                type="button"
                className="min-h-11 w-full max-w-sm mx-auto"
                onClick={() => void startNewGame()}
              >
                Start New Game
              </Button>
            </div>
          )}

          {showPlayfield && round && (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <WhoAmIPlayerPicker
                  players={bundle.players}
                  guessedIds={guessedIds}
                  value={pickerPlayerId}
                  onChange={setPickerPlayerId}
                  onSubmitPick={(id) => void onSubmitGuess(id)}
                  disabled={
                    submitting || round.status !== "playing" || round.guessesUsed >= round.maxGuesses
                  }
                />
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      round.status !== "playing" ||
                      round.photoHintUsed ||
                      hintLoading
                    }
                    onClick={() => void onPhotoHint()}
                  >
                    {round.photoHintUsed ? "Photo hint used" : "Photo hint"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={round.status !== "playing"}
                    onClick={() => void giveUp()}
                  >
                    Give up
                  </Button>
                </div>
              </div>

              {round.photoHintUrl && round.status === "playing" && (
                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Hint — photo
                  </p>
                  <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-md">
                    <Image
                      src={round.photoHintUrl}
                      alt="Mystery player"
                      fill
                      className="object-cover object-top"
                      sizes="200px"
                    />
                  </div>
                </div>
              )}

              {round.status === "won" && round.answerPlayer && (
                <div
                  className={cn(
                    "flex flex-col items-center gap-4 rounded-2xl border px-4 py-5 sm:flex-row sm:items-center sm:justify-center sm:gap-8 sm:px-8 sm:py-6",
                    "border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.14] via-background to-background",
                    "shadow-[0_12px_40px_-20px_rgba(16,185,129,0.45)] dark:from-emerald-500/[0.12]"
                  )}
                >
                  {round.answerPlayer.photoUrl ? (
                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-emerald-500/20 bg-muted shadow-lg ring-4 ring-emerald-500/15 sm:h-36 sm:w-36">
                      <Image
                        src={round.answerPlayer.photoUrl}
                        alt={round.answerPlayer.displayName}
                        fill
                        className="object-cover object-top"
                        sizes="144px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 bg-muted/50 text-xs text-muted-foreground sm:h-36 sm:w-36">
                      No photo
                    </div>
                  )}
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                      Correct
                    </p>
                    <p className="mt-1 text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {round.answerPlayer.displayName}
                    </p>
                  </div>
                </div>
              )}

              <MobileGuessCards
                guessRows={round.guessRows}
                status={round.status}
                answerPlayerId={round.answerPlayer?.id}
                onOpenNbaMap={() => setNbaMapOpen(true)}
              />

              <div className="hidden overflow-x-auto rounded-2xl border border-border/50 bg-card/40 p-1.5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] backdrop-blur-[2px] dark:border-white/[0.06] dark:bg-card/25 dark:shadow-[0_2px_24px_-8px_rgba(0,0,0,0.4)] sm:p-2 md:block">
                <table className="w-full min-w-[720px] border-separate border-spacing-1.5 text-sm sm:border-spacing-2">
                  <caption className="sr-only">Guess feedback by category</caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={cn(
                          "sticky left-0 z-20 min-w-[7.5rem] max-w-[10rem] rounded-xl px-3 py-2.5 text-left align-middle",
                          "border border-border/40 bg-muted/90 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                          "shadow-[6px_0_16px_-8px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:bg-muted/50 sm:text-xs"
                        )}
                      >
                        Player
                      </th>
                      {COLUMNS.map((c) => (
                        <th
                          key={c.key}
                          scope="col"
                          className={cn(
                            "rounded-xl border border-border/40 px-2 py-2.5 text-center align-middle",
                            "bg-muted/90 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                            "backdrop-blur-sm dark:bg-muted/50 sm:text-[11px]"
                          )}
                        >
                          {c.key === "conference" || c.key === "division" ? (
                            <span className="inline-flex w-full items-center justify-center gap-0.5">
                              <span>{c.label}</span>
                              <NbaMapInfoButton
                                onOpen={() => setNbaMapOpen(true)}
                              />
                            </span>
                          ) : (
                            c.label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {round.guessRows.map((gr) => {
                      const isWinningRow =
                        round.status === "won" &&
                        round.answerPlayer != null &&
                        gr.guessedPlayerId === round.answerPlayer.id
                      return (
                        <tr key={gr.guessedPlayerId}>
                          <th
                            scope="row"
                            className={cn(
                              "sticky left-0 z-10 max-w-[10rem] rounded-xl border px-3 py-2.5 text-left align-middle",
                              "border-border/50 bg-background/95 text-xs font-semibold leading-snug text-foreground",
                              "shadow-sm backdrop-blur-sm dark:bg-background/80 sm:text-sm",
                              isWinningRow &&
                                "border-emerald-500/50 bg-emerald-500/[0.12] shadow-[0_0_0_2px_rgba(16,185,129,0.35),6px_0_20px_-8px_rgba(16,185,129,0.2)] dark:bg-emerald-500/[0.18]"
                            )}
                          >
                            <span className="line-clamp-2 [overflow-wrap:anywhere]">
                              {gr.guessedName}
                            </span>
                          </th>
                          {COLUMNS.map((c) => (
                            <GuessCell
                              key={c.key}
                              text={gr.display[c.key]}
                              fb={gr.feedback[c.key]}
                              winRow={isWinningRow}
                            />
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {round.status === "playing" && (
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Guesses used: {round.guessesUsed} / {round.maxGuesses}
                </p>
              )}

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                <Button
                  type="button"
                  className="min-h-10 w-full max-w-xs sm:w-auto"
                  disabled={round.status !== "won"}
                  onClick={() => void nextPlayer()}
                >
                  Next player
                </Button>
                <div className="flex w-full max-w-xs flex-row items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 sm:w-auto sm:min-w-[17rem]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <label
                      htmlFor="whoami-auto-mode"
                      className="cursor-pointer text-sm font-medium leading-none text-foreground"
                    >
                      Auto Mode
                    </label>
                    <Tooltip
                      content={
                        <p className="text-left leading-snug">
                          After a correct guess, a short countdown loads the next mystery
                          player automatically. Turn off to advance manually with{" "}
                          <span className="font-medium">Next player</span>.
                        </p>
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="What does Auto Mode do?"
                      >
                        <Info className="h-4 w-4" aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                  <Switch
                    id="whoami-auto-mode"
                    checked={autoMode}
                    onCheckedChange={setAutoMode}
                  />
                </div>
              </div>

              {round.status === "won" && autoMode && autoSecondsLeft !== null && autoSecondsLeft > 0 && (
                <p
                  className="text-center text-sm text-muted-foreground tabular-nums"
                  aria-live="polite"
                >
                  Next player in {autoSecondsLeft}…
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <NbaConferenceDivisionMapDialog
        open={nbaMapOpen}
        onOpenChange={setNbaMapOpen}
        tree={conferenceDivisionTree}
      />

      <BestStreakLeaderboardCard
        title="Who Am I? leaderboard"
        description="Ranked by best streak, then by fewest total photo hints in the run that set your best (resets when you lose or give up). No hint in a round counts as 0 for that round."
        rows={lbRows}
        loading={lbLoading}
        myUserId={myId}
        hintsColumnLabel="Hints"
      />
    </div>
  )
}
