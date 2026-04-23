"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WhoHePlayForTeamPicker } from "@/components/minigames/WhoHePlayForTeamPicker"
import { BestStreakLeaderboardCard } from "@/components/minigames/BestStreakLeaderboardCard"
import { cn } from "@/app/lib/utils/cn"
import { WHO_HE_ROUND_SECONDS } from "@/app/lib/minigames/whoHePlayForGame"
import { deadlineFieldToIso } from "@/app/lib/minigames/coerceMongoDate"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"
import type { NbaTeamOption } from "@/app/lib/minigames/whoHePlayForTeams"

type LobbyPayload = {
  phase: "lobby"
  teams: NbaTeamOption[]
  currentStreak: number
  bestStreak: number
}

type PlayingPayload = {
  phase: "playing"
  player: { id: string; displayName: string }
  teams: NbaTeamOption[]
  currentStreak: number
  bestStreak: number
  roundDeadlineAt: string
}

type RoundPayload = LobbyPayload | PlayingPayload

type GuessPayload = {
  correct?: boolean
  gaveUp?: boolean
  timedOut?: boolean
  streakEnded?: number
  answerAbbr: string
  teamName: string
  currentStreak: number
  bestStreak: number
  player?: { id: string; displayName: string }
  phase?: "lobby" | "playing"
  roundDeadlineAt?: string
}

/** Single bar anchored left — fill shrinks toward the right as time runs out (fractional seconds). */
function DrainingTimeBar({
  remainingSec,
  totalSeconds,
}: {
  remainingSec: number
  totalSeconds: number
}) {
  const pct = Math.min(100, Math.max(0, (remainingSec / totalSeconds) * 100))
  const urgent = remainingSec > 0 && remainingSec <= 10
  const warn = remainingSec > 10 && remainingSec <= 20
  const ariaWhole = Math.max(0, Math.ceil(remainingSec))

  return (
    <div
      className="relative h-4 w-full max-w-xl overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={ariaWhole}
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
      aria-label={`Time remaining: ${ariaWhole} of ${totalSeconds} seconds`}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full will-change-[width]",
          urgent
            ? "bg-destructive shadow-[0_0_12px_-2px] shadow-destructive/70"
            : warn
              ? "bg-amber-500 dark:bg-amber-500"
              : "bg-primary"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function WhoHePlayForGame() {
  const { data: session } = useSession()
  const myId = session?.user?.id

  const syncGenRef = useRef(0)
  const bumpSyncGen = useCallback(() => {
    syncGenRef.current += 1
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"lobby" | "playing">("lobby")
  const [teams, setTeams] = useState<NbaTeamOption[]>([])
  const [player, setPlayer] = useState<{ id: string; displayName: string } | null>(
    null
  )
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [selectedAbbr, setSelectedAbbr] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [lobbyNote, setLobbyNote] = useState<string | null>(null)

  /** ISO string from server — survives refresh */
  const [roundDeadlineIso, setRoundDeadlineIso] = useState<string | null>(null)
  /** Fractional seconds until deadline — updated every animation frame while playing */
  const [remainingSec, setRemainingSec] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const timeUpSentRef = useRef(false)
  const deadlineRef = useRef<string | null>(null)
  const phaseRef = useRef(phase)
  const playerRef = useRef(player)
  /** After a correct guess advances to the next player, scroll timer + name into view (mobile). */
  const playingRoundAnchorRef = useRef<HTMLDivElement | null>(null)
  const scrollPlayingRoundAfterAdvanceRef = useRef(false)

  const [lastMessage, setLastMessage] = useState<{
    type: "ok" | "bad"
    text: string
  } | null>(null)

  const [leaderboard, setLeaderboard] = useState<BestStreakLeaderboardRow[]>(
    []
  )
  const [lbLoading, setLbLoading] = useState(true)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    playerRef.current = player
  }, [player])
  useEffect(() => {
    deadlineRef.current = roundDeadlineIso
  }, [roundDeadlineIso])

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/minigames/who-he-play-for/leaderboard", {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = (await res.json()) as { rows: BestStreakLeaderboardRow[] }
      setLeaderboard(data.rows ?? [])
    } finally {
      setLbLoading(false)
    }
  }, [])

  const applyRoundPayload = useCallback((data: RoundPayload) => {
    setTeams(data.teams)
    setCurrentStreak(data.currentStreak)
    setBestStreak(data.bestStreak)
    if (data.phase === "lobby") {
      setPhase("lobby")
      setPlayer(null)
      setSelectedAbbr("")
      setRoundDeadlineIso(null)
      return
    }
    setPhase("playing")
    setPlayer(data.player)
    setSelectedAbbr("")
    setRoundDeadlineIso(deadlineFieldToIso(data.roundDeadlineAt))
  }, [])

  const syncRoundFromServer = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner ?? false
      const id = syncGenRef.current
      if (showSpinner) setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/minigames/who-he-play-for/round", {
          cache: "no-store",
        })
        if (id !== syncGenRef.current) return
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(
            typeof err?.error === "string" ? err.error : "Could not load round."
          )
          return
        }
        const data = (await res.json()) as RoundPayload
        if (id !== syncGenRef.current) return
        applyRoundPayload(data)
      } catch {
        if (id !== syncGenRef.current) return
        setError("Could not load round.")
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [applyRoundPayload]
  )

  const stopTicking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startDeadlineTicker = useCallback(() => {
    stopTicking()
    const iso = deadlineRef.current
    if (!iso || phaseRef.current !== "playing") return

    const loop = () => {
      const d = deadlineRef.current
      if (!d || phaseRef.current !== "playing") {
        rafRef.current = null
        return
      }
      const ms = new Date(d).getTime() - Date.now()
      const sec = Math.max(0, ms / 1000)
      setRemainingSec(sec)
      if (sec <= 0) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [stopTicking])

  useEffect(() => {
    stopTicking()
    if (phase !== "playing" || !roundDeadlineIso) {
      setRemainingSec(null)
      return
    }
    deadlineRef.current = roundDeadlineIso
    timeUpSentRef.current = false
    startDeadlineTicker()
    return stopTicking
  }, [phase, roundDeadlineIso, startDeadlineTicker, stopTicking])

  const resumeTickerAfterFailedAction = useCallback(() => {
    if (phaseRef.current !== "playing" || !deadlineRef.current) return
    timeUpSentRef.current = false
    startDeadlineTicker()
  }, [startDeadlineTicker])

  const runTimeUp = useCallback(async () => {
    if (timeUpSentRef.current) return
    timeUpSentRef.current = true
    stopTicking()
    bumpSyncGen()
    const id = syncGenRef.current
    setSubmitting(true)
    setLastMessage(null)
    try {
      const res = await fetch("/api/minigames/who-he-play-for/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeUp: true }),
      })
      const raw = await res.json().catch(() => ({}))
      if (id !== syncGenRef.current) return
      if (!res.ok) {
        timeUpSentRef.current = false
        resumeTickerAfterFailedAction()
        setLastMessage({
          type: "bad",
          text:
            typeof raw?.error === "string"
              ? raw.error
              : "Could not end round.",
        })
        return
      }
      bumpSyncGen()
      const data = raw as GuessPayload
      setCurrentStreak(data.currentStreak)
      setBestStreak(data.bestStreak)
      setRoundDeadlineIso(null)
      setPhase("lobby")
      setPlayer(null)
      setSelectedAbbr("")
      const ended = data.streakEnded ?? 0
      setLobbyNote(
        ended > 0
          ? `Time's up — it was ${data.teamName} (${data.answerAbbr}). Your streak was ${ended}.`
          : `Time's up — it was ${data.teamName} (${data.answerAbbr}).`
      )
      loadLeaderboard()
      await syncRoundFromServer()
    } catch {
      if (id === syncGenRef.current) {
        timeUpSentRef.current = false
        resumeTickerAfterFailedAction()
        setLastMessage({ type: "bad", text: "Network error." })
      }
    } finally {
      // Success path calls bumpSyncGen(); do not gate on sync id or "Starting…" stays stuck.
      setSubmitting(false)
    }
  }, [
    bumpSyncGen,
    loadLeaderboard,
    resumeTickerAfterFailedAction,
    stopTicking,
    syncRoundFromServer,
  ])

  useEffect(() => {
    if (
      remainingSec === null ||
      remainingSec > 0 ||
      phase !== "playing" ||
      !player ||
      submitting
    ) {
      return
    }
    void runTimeUp()
  }, [remainingSec, phase, player, submitting, runTimeUp])

  useEffect(() => {
    void syncRoundFromServer({ showSpinner: true })
  }, [syncRoundFromServer])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  useEffect(() => {
    if (!scrollPlayingRoundAfterAdvanceRef.current) return
    if (phase !== "playing" || !player) return
    scrollPlayingRoundAfterAdvanceRef.current = false

    /** Same breakpoint as Tailwind `sm:` — scroll only on narrow / mobile viewports */
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches
    if (!isMobile) return

    const id = window.requestAnimationFrame(() => {
      playingRoundAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [player?.id, phase])

  const startNewGame = async () => {
    setLobbyNote(null)
    setLastMessage(null)
    bumpSyncGen()
    setSubmitting(true)
    try {
      const res = await fetch("/api/minigames/who-he-play-for/start", {
        method: "POST",
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLastMessage({
          type: "bad",
          text:
            typeof raw?.error === "string" ? raw.error : "Could not start.",
        })
        return
      }
      const data = raw as PlayingPayload
      applyRoundPayload(data)
    } catch {
      setLastMessage({ type: "bad", text: "Network error." })
    } finally {
      setSubmitting(false)
    }
  }

  const submitGuess = async () => {
    if (!selectedAbbr || phase !== "playing") return
    stopTicking()
    setSubmitting(true)
    setLastMessage(null)
    try {
      const res = await fetch("/api/minigames/who-he-play-for/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamAbbr: selectedAbbr }),
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) {
        resumeTickerAfterFailedAction()
        setLastMessage({
          type: "bad",
          text:
            typeof raw?.error === "string"
              ? raw.error
              : "Could not submit guess.",
        })
        return
      }
      bumpSyncGen()
      const data = raw as GuessPayload
      setCurrentStreak(data.currentStreak)
      setBestStreak(data.bestStreak)
      setSelectedAbbr("")

      if (data.phase === "lobby") {
        setRoundDeadlineIso(null)
        setPhase("lobby")
        setPlayer(null)
        const ended = data.streakEnded ?? 0
        setLobbyNote(
          ended > 0
            ? `Wrong — it was ${data.teamName} (${data.answerAbbr}). Your streak was ${ended}.`
            : `Wrong — it was ${data.teamName} (${data.answerAbbr}).`
        )
        loadLeaderboard()
        await syncRoundFromServer()
      } else if (data.correct && data.player) {
        scrollPlayingRoundAfterAdvanceRef.current = true
        setPhase("playing")
        setPlayer(data.player)
        const nextIso = deadlineFieldToIso(data.roundDeadlineAt)
        if (nextIso) setRoundDeadlineIso(nextIso)
        setLastMessage({
          type: "ok",
          text: `Correct — ${data.teamName}. Streak: ${data.currentStreak}`,
        })
        loadLeaderboard()
      }
    } catch {
      resumeTickerAfterFailedAction()
      setLastMessage({ type: "bad", text: "Network error." })
    } finally {
      setSubmitting(false)
    }
  }

  const giveUp = async () => {
    if (phase !== "playing") return
    stopTicking()
    setSubmitting(true)
    setLastMessage(null)
    try {
      const res = await fetch("/api/minigames/who-he-play-for/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giveUp: true }),
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) {
        resumeTickerAfterFailedAction()
        setLastMessage({
          type: "bad",
          text:
            typeof raw?.error === "string"
              ? raw.error
              : "Could not give up.",
        })
        return
      }
      bumpSyncGen()
      const data = raw as GuessPayload & { streakEnded?: number }
      setCurrentStreak(data.currentStreak)
      setBestStreak(data.bestStreak)
      setRoundDeadlineIso(null)
      setPhase("lobby")
      setPlayer(null)
      setSelectedAbbr("")
      const ended = data.streakEnded ?? 0
      setLobbyNote(
        ended > 0
          ? `You gave up — ${data.teamName} (${data.answerAbbr}). Your streak was ${ended}.`
          : `You gave up — ${data.teamName} (${data.answerAbbr}).`
      )
      loadLeaderboard()
      await syncRoundFromServer()
    } catch {
      resumeTickerAfterFailedAction()
      setLastMessage({ type: "bad", text: "Network error." })
    } finally {
      setSubmitting(false)
    }
  }

  const remainingForUi =
    roundDeadlineIso && phase === "playing"
      ? remainingSec ??
        Math.max(
          0,
          (new Date(roundDeadlineIso).getTime() - Date.now()) / 1000
        )
      : null

  /** Whole seconds for the label; bar still uses fractional `remainingForUi` for smooth drain */
  const timerDisplayText =
    remainingForUi !== null
      ? String(Math.max(0, Math.ceil(remainingForUi)))
      : null

  const urgent =
    remainingForUi !== null && remainingForUi > 0 && remainingForUi <= 10

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Who He Play For?</CardTitle>
          <CardDescription>
            Pick the team each player is on. You have {WHO_HE_ROUND_SECONDS}{" "}
            seconds per player; running out of time counts as a wrong guess. After
            a correct guess you move on automatically. Wrong picks, time-outs, and
            give-ups reset your streak and return here.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div
            ref={playingRoundAnchorRef}
            className="scroll-mt-8 space-y-6 sm:scroll-mt-10"
          >
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current streak</span>
                <p className="text-2xl font-semibold tabular-nums">{currentStreak}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Best streak</span>
                <p className="text-2xl font-semibold tabular-nums">{bestStreak}</p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {loading && phase === "lobby" && !lobbyNote && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}

            {phase === "lobby" && (
              <div className="space-y-4 rounded-lg border bg-muted/30 px-4 py-6 text-center">
                {lobbyNote && (
                  <p className="text-sm font-medium text-foreground text-balance">
                    {lobbyNote}
                  </p>
                )}
                <Button
                  type="button"
                  className="min-h-11 w-full max-w-sm mx-auto"
                  disabled={submitting}
                  onClick={() => void startNewGame()}
                >
                  {submitting ? "Starting…" : "Start New Game"}
                </Button>
              </div>
            )}

            {phase === "playing" && player && remainingForUi !== null && (
              <div className="space-y-4">
              <div className="rounded-lg border-2 border-primary/25 bg-muted/30 px-4 py-3 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    Time left
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
                      urgent
                        ? "text-destructive animate-pulse"
                        : "text-foreground"
                    )}
                    aria-live="off"
                  >
                    {timerDisplayText}
                    <span className="text-lg font-semibold text-muted-foreground sm:text-xl">
                      s
                    </span>
                  </p>
                </div>
                <DrainingTimeBar
                  remainingSec={remainingForUi}
                  totalSeconds={WHO_HE_ROUND_SECONDS}
                />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Player
                  </p>
                  <p className="text-balance text-xl font-semibold leading-snug sm:text-2xl">
                    {player.displayName}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="whpf-team">
                  Team
                </label>
                <WhoHePlayForTeamPicker
                  id="whpf-team"
                  teams={teams}
                  value={selectedAbbr}
                  onChange={setSelectedAbbr}
                  disabled={submitting}
                />
              </div>

              {lastMessage && (
                <p
                  role="status"
                  className={cn(
                    "text-sm",
                    lastMessage.type === "ok"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                >
                  {lastMessage.text}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="min-h-10 w-full max-w-md sm:w-auto"
                  disabled={!selectedAbbr || submitting}
                  onClick={() => void submitGuess()}
                >
                  {submitting ? "Submitting…" : "Submit guess"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 w-full max-w-md sm:w-auto"
                  disabled={submitting}
                  onClick={() => void giveUp()}
                >
                  Give up
                </Button>
              </div>
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      <BestStreakLeaderboardCard
        description="One row per player, ranked by best win streak. Everyone signed in can see this list."
        rows={leaderboard}
        loading={lbLoading}
        myUserId={myId}
      />
    </div>
  )
}
