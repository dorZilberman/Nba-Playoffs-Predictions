"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tooltip } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import type { HangmanPlayer, HangmanPlayerBundle } from "@/app/lib/minigames/types"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"
import { BestStreakLeaderboardCard } from "@/components/minigames/BestStreakLeaderboardCard"
import { cn } from "@/app/lib/utils/cn"
import { getHangmanHintMask } from "@/app/lib/minigames/hangmanHintMask"

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const MAX_WRONG = 7

type PersistedRound = {
  playerId: string
  guessedLetters: string[]
  wrong: number
  /** Bit i: conference(0), team(1), position(2), photo(3) */
  hintMask?: number
  /** @deprecated from older API; migrated via getHangmanHintMask */
  hintsUsed?: number
  status: "playing" | "won" | "lost"
}

function requiredLetters(name: string): Set<string> {
  const s = new Set<string>()
  for (const ch of name.toUpperCase()) {
    if (ch >= "A" && ch <= "Z") s.add(ch)
  }
  return s
}

function HangmanFigure({ stage }: { stage: number }) {
  const s = Math.min(Math.max(stage, 0), MAX_WRONG)
  return (
    <svg
      viewBox="0 0 120 140"
      className="mx-auto h-auto max-h-[min(160px,28vh)] w-full max-w-[min(200px,45vw)] text-foreground sm:max-h-none sm:max-w-[200px]"
      aria-hidden
    >
      <line x1="10" y1="130" x2="90" y2="130" stroke="currentColor" strokeWidth="3" />
      <line x1="50" y1="130" x2="50" y2="20" stroke="currentColor" strokeWidth="3" />
      <line x1="50" y1="20" x2="95" y2="20" stroke="currentColor" strokeWidth="3" />
      <line x1="95" y1="20" x2="95" y2="35" stroke="currentColor" strokeWidth="3" />
      {s >= 1 && <circle cx="95" cy="45" r="10" fill="none" stroke="currentColor" strokeWidth="3" />}
      {s >= 2 && <line x1="95" y1="55" x2="95" y2="85" stroke="currentColor" strokeWidth="3" />}
      {s >= 3 && <line x1="95" y1="65" x2="75" y2="78" stroke="currentColor" strokeWidth="3" />}
      {s >= 4 && <line x1="95" y1="65" x2="115" y2="78" stroke="currentColor" strokeWidth="3" />}
      {s >= 5 && <line x1="95" y1="85" x2="78" y2="110" stroke="currentColor" strokeWidth="3" />}
      {s >= 6 && <line x1="95" y1="85" x2="112" y2="110" stroke="currentColor" strokeWidth="3" />}
      {s >= 7 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="90" y1="42" x2="94" y2="46" />
          <line x1="94" y1="42" x2="90" y2="46" />
          <line x1="96" y1="42" x2="100" y2="46" />
          <line x1="100" y1="42" x2="96" y2="46" />
        </g>
      )}
    </svg>
  )
}

type HangmanGameProps = {
  showTitle?: boolean
}

export function HangmanGame({ showTitle = true }: HangmanGameProps) {
  const { data: session } = useSession()
  const myId = session?.user?.id

  const [bundle, setBundle] = useState<HangmanPlayerBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inLobby, setInLobby] = useState(true)
  const [current, setCurrent] = useState<HangmanPlayer | null>(null)
  const [guessed, setGuessed] = useState<Set<string>>(() => new Set())
  const [wrong, setWrong] = useState(0)
  const [hintMask, setHintMask] = useState(0)
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing")

  const [streakCurrent, setStreakCurrent] = useState(0)
  const [streakBest, setStreakBest] = useState(0)
  const [runHintsUsed, setRunHintsUsed] = useState(0)
  const [lbRows, setLbRows] = useState<BestStreakLeaderboardRow[]>([])
  const [lbLoading, setLbLoading] = useState(true)

  const [autoMode, setAutoMode] = useState(false)
  const [autoSecondsLeft, setAutoSecondsLeft] = useState<number | null>(null)
  const [lobbyNote, setLobbyNote] = useState<string | null>(null)

  const roundSeqRef = useRef(0)
  const reportedSeqRef = useRef<number | null>(null)
  const saveDebounceRef = useRef<number | null>(null)
  const lastSavedSigRef = useRef<string>("")
  const autoTimerRef = useRef<number | null>(null)
  const streakRef = useRef(0)
  const lossHandledRef = useRef(false)
  /** Tracks last flushed `hintMask` so we only PATCH when hints advance (not on every letter). */
  const lastFlushedHintMaskRef = useRef<number | null>(null)

  useEffect(() => {
    streakRef.current = streakCurrent
  }, [streakCurrent])

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/minigames/hangman/leaderboard", {
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

  const applyPersistedRound = useCallback(
    (
      playerId: string,
      r: Omit<PersistedRound, "playerId">,
      players: HangmanPlayer[]
    ) => {
      const p = players.find((x) => x.id === playerId)
      if (!p) return false
      setCurrent(p)
      setGuessed(new Set(r.guessedLetters))
      setWrong(r.wrong)
      setHintMask(
        getHangmanHintMask({
          hintMask: r.hintMask,
          hintsUsed: r.hintsUsed,
        })
      )
      setStatus(r.status)
      return true
    },
    []
  )

  const hydrateFromServer = useCallback(
    async (
      players: HangmanPlayer[],
      payload: {
        inLobby: boolean
        currentStreak: number
        bestStreak: number
        runHintsUsed?: number
        round: PersistedRound | null
      }
    ) => {
      setStreakCurrent(payload.currentStreak)
      setStreakBest(payload.bestStreak)
      if (typeof payload.runHintsUsed === "number") {
        setRunHintsUsed(payload.runHintsUsed)
      }

      if (payload.round?.status === "lost") {
        const p = players.find((x) => x.id === payload.round!.playerId)
        const answer = p?.displayName ?? "the player"
        setLobbyNote(`Round lost. Answer: ${answer}`)
        setInLobby(true)
        setCurrent(null)
        setGuessed(new Set())
        setWrong(0)
        setHintMask(0)
        setStatus("playing")
        void fetch("/api/minigames/hangman/to-lobby", { method: "POST" })
        return
      }

      /** No round payload ⇒ lobby. Don’t trust `inLobby` alone (DB can be inconsistent). */
      if (!payload.round) {
        setInLobby(true)
        setCurrent(null)
        setGuessed(new Set())
        setWrong(0)
        setHintMask(0)
        setStatus("playing")
        return
      }

      setInLobby(payload.inLobby)

      if (payload.inLobby) {
        setCurrent(null)
        setGuessed(new Set())
        setWrong(0)
        setHintMask(0)
        setStatus("playing")
        return
      }

      const ok = applyPersistedRound(
        payload.round.playerId,
        payload.round,
        players
      )
      if (!ok) {
        setInLobby(true)
        setCurrent(null)
        setGuessed(new Set())
        setWrong(0)
        setHintMask(0)
        setStatus("playing")
        setLobbyNote(
          "Could not restore the last round (player list may have changed). Start New Game."
        )
      }
    },
    [applyPersistedRound]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [pres, sres] = await Promise.all([
          fetch("/api/minigames/hangman/players", { cache: "no-store" }),
          fetch("/api/minigames/hangman/round-state", { cache: "no-store" }),
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
        const sessionJson = (await sres.json()) as {
          inLobby: boolean
          currentStreak: number
          bestStreak: number
          runHintsUsed?: number
          round: PersistedRound | null
        }
        if (cancelled) return
        setBundle(data)
        await hydrateFromServer(data.players, sessionJson)
      } catch {
        if (!cancelled) setLoadError("Could not load Hangman.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrateFromServer])

  const persistState = useCallback(async () => {
    if (inLobby || !current) return
    const sig = JSON.stringify({
      playerId: current.id,
      guessed: Array.from(guessed).sort(),
      wrong,
      status,
    })
    if (sig === lastSavedSigRef.current) return
    lastSavedSigRef.current = sig

    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = window.setTimeout(() => {
      void fetch("/api/minigames/hangman/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: current.id,
          guessedLetters: Array.from(guessed),
          wrong,
          status,
        }),
      })
    }, 250)
  }, [inLobby, current, guessed, wrong, status])

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current)
    }
  }, [])

  useEffect(() => {
    void persistState()
  }, [persistState])

  useEffect(() => {
    if (wrong < MAX_WRONG || status !== "playing" || inLobby || !current) return
    setStatus("lost")
  }, [wrong, status, inLobby, current])

  const flushSave = useCallback(() => {
    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }
    if (inLobby || !current) return
    lastSavedSigRef.current = ""
    void fetch("/api/minigames/hangman/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: current.id,
        guessedLetters: Array.from(guessed),
        wrong,
        status,
      }),
    })
  }, [inLobby, current, guessed, wrong, status])

  /**
   * Hints are persisted by POST /hangman/hint. Flush letter state when the mask
   * advances so guesses aren’t left only in a lagging debounce.
   */
  useEffect(() => {
    if (inLobby || !current) {
      lastFlushedHintMaskRef.current = hintMask
      return
    }
    if (hintMask < 1) {
      lastFlushedHintMaskRef.current = hintMask
      return
    }
    if (lastFlushedHintMaskRef.current === hintMask) return
    lastFlushedHintMaskRef.current = hintMask
    flushSave()
  }, [hintMask, inLobby, current, flushSave])

  /** Move to lobby immediately after a loss so “Start New Game” is visible without waiting on network. */
  useEffect(() => {
    if (status !== "lost") {
      lossHandledRef.current = false
      return
    }
    if (lossHandledRef.current) return

    lossHandledRef.current = true

    if (!current) {
      setLobbyNote((prev) => prev ?? "Round lost.")
      setInLobby(true)
      setGuessed(new Set())
      setWrong(0)
      setHintMask(0)
      setStatus("playing")
      void fetch("/api/minigames/hangman/to-lobby", { method: "POST" })
      return
    }

    flushSave()

    const ended = streakRef.current
    const answer = current.displayName
    setLobbyNote(
      ended > 0
        ? `Round lost. Your streak was ${ended}. Answer: ${answer}`
        : `Round lost. Answer: ${answer}`
    )
    setInLobby(true)
    setCurrent(null)
    setGuessed(new Set())
    setWrong(0)
    setHintMask(0)
    setStatus("playing")
  }, [status, current, flushSave])

  useEffect(() => {
    if (status !== "won" && status !== "lost") return
    const seq = roundSeqRef.current
    if (reportedSeqRef.current === seq) return
    reportedSeqRef.current = seq

    const outcome = status === "won" ? "won" : "lost"
    void (async () => {
      try {
        const res = await fetch("/api/minigames/hangman/round-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome }),
        })
        if (!res.ok) return
        const d = (await res.json()) as {
          currentStreak: number
          bestStreak: number
          runHintsUsed?: number
        }
        setStreakCurrent(d.currentStreak)
        setStreakBest(d.bestStreak)
        if (typeof d.runHintsUsed === "number") setRunHintsUsed(d.runHintsUsed)
        loadLeaderboard()

        if (outcome === "lost") {
          await fetch("/api/minigames/hangman/to-lobby", { method: "POST" })
          const sres = await fetch("/api/minigames/hangman/round-state", {
            cache: "no-store",
          })
          if (sres.ok) {
            const sj = (await sres.json()) as {
              inLobby: boolean
              currentStreak: number
              bestStreak: number
              runHintsUsed?: number
              round: PersistedRound | null
            }
            if (bundle) {
              await hydrateFromServer(bundle.players, sj)
            }
          }
        }
      } catch {
        /* ignore */
      }
    })()
  }, [status, loadLeaderboard, bundle, hydrateFromServer])

  const advanceAfterWin = useCallback(async () => {
    const res = await fetch("/api/minigames/hangman/next", { method: "POST" })
    if (!res.ok) return
    const row = (await res.json()) as PersistedRound
    if (!bundle) return
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    applyPersistedRound(row.playerId, row, bundle.players)
  }, [bundle, applyPersistedRound])

  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoSecondsLeft(null)

    if (!autoMode || status !== "won" || inLobby || !current) return

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
  }, [autoMode, status, inLobby, current, advanceAfterWin])

  const startNewGame = useCallback(async () => {
    setLobbyNote(null)
    const res = await fetch("/api/minigames/hangman/start", { method: "POST" })
    if (!res.ok) return
    const row = (await res.json()) as PersistedRound
    if (!bundle) return
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    setInLobby(false)
    applyPersistedRound(row.playerId, row, bundle.players)
  }, [bundle, applyPersistedRound])

  const nextPlayer = useCallback(async () => {
    if (status !== "won") return
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoSecondsLeft(null)
    await advanceAfterWin()
  }, [status, advanceAfterWin])

  const giveUp = useCallback(async () => {
    if (status !== "playing" || inLobby || !current) return
    const res = await fetch("/api/minigames/hangman/give-up", { method: "POST" })
    if (!res.ok) return
    const d = (await res.json()) as {
      streakEnded: number
      currentStreak: number
      bestStreak: number
      runHintsUsed?: number
    }
    setStreakCurrent(d.currentStreak)
    setStreakBest(d.bestStreak)
    if (typeof d.runHintsUsed === "number") setRunHintsUsed(d.runHintsUsed)
    loadLeaderboard()
    setLobbyNote(
      d.streakEnded > 0
        ? `You gave up. Your streak was ${d.streakEnded}.`
        : "You gave up."
    )
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    const sres = await fetch("/api/minigames/hangman/round-state", {
      cache: "no-store",
    })
    if (sres.ok && bundle) {
      const sj = (await sres.json()) as {
        inLobby: boolean
        currentStreak: number
        bestStreak: number
        runHintsUsed?: number
        round: PersistedRound | null
      }
      await hydrateFromServer(bundle.players, sj)
    }
  }, [status, inLobby, current, loadLeaderboard, bundle, hydrateFromServer])

  const needed = useMemo(
    () => (current ? requiredLetters(current.displayName) : new Set<string>()),
    [current]
  )

  useEffect(() => {
    if (!current || status !== "playing") return
    if (needed.size === 0) return
    let all = true
    for (const L of needed) {
      if (!guessed.has(L)) {
        all = false
        break
      }
    }
    if (all) setStatus("won")
  }, [current, guessed, needed, status])

  const onLetter = useCallback(
    (letter: string) => {
      if (status !== "playing" || !current || inLobby) return
      const L = letter.toUpperCase()
      if (guessed.has(L)) return
      const next = new Set(guessed)
      next.add(L)
      setGuessed(next)
      if (!needed.has(L)) {
        setWrong((w) => w + 1)
      }
    },
    [current, guessed, needed, status, inLobby]
  )

  const requestHint = useCallback(
    async (bit: 0 | 1 | 2 | 3) => {
      if (status !== "playing" || !current || inLobby) return
      if (hintMask & (1 << bit)) return
      const res = await fetch("/api/minigames/hangman/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bit }),
      })
      if (!res.ok) return
      const d = (await res.json()) as { hintMask: number; runHintsUsed: number }
      setHintMask(d.hintMask)
      if (typeof d.runHintsUsed === "number") setRunHintsUsed(d.runHintsUsed)
    },
    [status, current, inLobby]
  )

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    )
  }

  if (!bundle) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">Loading Hangman…</p>
    )
  }

  const showHintsPanel = Boolean(
    current && !inLobby && (hintMask & 0b1111) !== 0
  )

  const showPlayfield = !inLobby && current

  return (
    <div className="space-y-8">
      <Card
        className="overflow-x-clip"
        aria-label={showTitle ? undefined : "Hangman — guess the NBA player"}
      >
        {showTitle ? (
          <CardHeader className="space-y-1 px-3 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl">
              Hangman — guess the NBA player
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {bundle.seasonLabel} season roster · {bundle.players.length} players ·
              Wrong guesses: {wrong} / {MAX_WRONG}
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
              {bundle.seasonLabel} · {bundle.players.length} players · Wrong: {wrong} /{" "}
              {MAX_WRONG}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current streak</span>
              <p className="text-2xl font-semibold tabular-nums">{streakCurrent}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Best streak</span>
              <p className="text-2xl font-semibold tabular-nums">{streakBest}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hints (this run)</span>
              <p className="text-2xl font-semibold tabular-nums">
                {runHintsUsed}
              </p>
            </div>
          </div>

          {inLobby && (
            <div className="space-y-4 rounded-lg border bg-muted/30 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Win rounds without running out of wrong guesses. Wrong picks and losses reset
                your streak.
              </p>
              {lobbyNote && (
                <p className="text-sm font-medium text-foreground" role="status">
                  {lobbyNote}
                </p>
              )}
              <Button type="button" className="min-h-11 w-full max-w-sm mx-auto" onClick={() => void startNewGame()}>
                Start New Game
              </Button>
            </div>
          )}

          {showPlayfield && (
            <>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 md:items-start">
                <div className="flex shrink-0 justify-center md:justify-start">
                  <HangmanFigure stage={wrong} />
                </div>
                <div className="min-w-0 space-y-2 sm:space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Name
                  </p>
                  <div
                    className="-mx-1 flex min-h-[2rem] max-w-full flex-wrap gap-x-4 gap-y-2 px-1 text-base font-semibold tracking-wide [overflow-wrap:anywhere] sm:min-h-[2.5rem] sm:gap-x-8 sm:gap-y-3 sm:text-xl md:gap-x-12 md:text-2xl"
                    aria-live="polite"
                  >
                    {current.displayName.split(" ").map((word, wi) => (
                      <span key={wi} className="flex gap-1 shrink-0">
                        {[...word].map((ch, ci) => {
                          const u = ch.toUpperCase()
                          const isLetter =
                            (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")
                          if (!isLetter) {
                            return (
                              <span key={ci} className="text-muted-foreground">
                                {ch}
                              </span>
                            )
                          }
                          const show =
                            guessed.has(u) || status === "lost" || status === "won"
                          return (
                            <span
                              key={ci}
                              className={cn(
                                "inline-flex min-w-[0.75em] justify-center border-b-2 border-muted-foreground/40 pb-0.5",
                                show && "border-transparent"
                              )}
                            >
                              {show ? ch : "—"}
                            </span>
                          )
                        })}
                      </span>
                    ))}
                  </div>
                  {status === "lost" && (
                    <p className="text-sm text-muted-foreground">
                      Answer:{" "}
                      <span className="font-medium text-foreground">{current.displayName}</span>
                    </p>
                  )}
                  {status === "won" && (
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      You got it!
                    </p>
                  )}
                </div>
              </div>

              {status === "won" && (
                <div className="flex flex-col items-center gap-1.5">
                  {autoMode &&
                    autoSecondsLeft !== null &&
                    autoSecondsLeft > 0 && (
                      <p
                        className="text-center text-sm text-muted-foreground tabular-nums"
                        aria-live="polite"
                      >
                        Next player in {autoSecondsLeft}…
                      </p>
                    )}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      className="min-h-10 w-full max-w-xs sm:w-auto"
                      onClick={() => void nextPlayer()}
                    >
                      Next player
                    </Button>
                  </div>
                </div>
              )}

              {showHintsPanel && current && (
                <div className="rounded-md border bg-muted/40 px-2.5 py-2 text-xs sm:px-3 sm:text-sm space-y-2">
                  {(hintMask & 1) !== 0 && (
                    <p className="break-words">
                      Conference: {current.conference}
                    </p>
                  )}
                  {(hintMask & 2) !== 0 && (
                    <p className="break-words">Team: {current.team}</p>
                  )}
                  {(hintMask & 4) !== 0 && (
                    <p className="break-words">Position: {current.position}</p>
                  )}
                  {(hintMask & 8) !== 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Photo
                      </p>
                      {current.photoUrl ? (
                        <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg border bg-muted shadow-inner">
                          <Image
                            src={current.photoUrl}
                            alt=""
                            fill
                            className="object-cover object-top"
                            sizes="220px"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No photo available for this player.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-[2.75rem] min-w-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
                  disabled={Boolean(hintMask & 1) || status !== "playing"}
                  onClick={() => void requestHint(0)}
                >
                  Hint 1 — conference
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-[2.75rem] min-w-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
                  disabled={Boolean(hintMask & 2) || status !== "playing"}
                  onClick={() => void requestHint(1)}
                >
                  Hint 2 — team
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-[2.75rem] min-w-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
                  disabled={Boolean(hintMask & 4) || status !== "playing"}
                  onClick={() => void requestHint(2)}
                >
                  Hint 3 — position
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-[2.75rem] min-w-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
                  disabled={Boolean(hintMask & 8) || status !== "playing"}
                  onClick={() => void requestHint(3)}
                >
                  Hint 4 — photo
                </Button>
              </div>

              <div className="mx-auto grid w-full max-w-xl grid-cols-9 gap-1 sm:gap-1.5 md:gap-2">
                {LETTERS.map((L) => {
                  const used = guessed.has(L)
                  return (
                    <Button
                      key={L}
                      type="button"
                      variant={used ? "secondary" : "outline"}
                      size="sm"
                      className="aspect-square h-auto min-h-8 w-full touch-manipulation p-0 font-mono text-[11px] sm:min-h-9 sm:text-xs md:min-h-10 md:text-sm"
                      disabled={used || status !== "playing"}
                      onClick={() => onLetter(L)}
                    >
                      {L}
                    </Button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {status === "playing" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => void giveUp()}
                  >
                    Give up
                  </Button>
                )}
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1">
                  <div className="flex items-center gap-1">
                    <label
                      htmlFor="hangman-auto-mode"
                      className="cursor-pointer whitespace-nowrap text-[11px] font-medium leading-none text-foreground sm:text-xs"
                    >
                      Auto
                    </label>
                    <Tooltip
                      content={
                        <p className="text-left leading-snug">
                          When Auto Mode is on, winning a round starts a short
                          countdown and then loads the next player for you—you
                          don&apos;t need to press{" "}
                          <span className="font-medium">Next player</span>.
                          Turn it off if you prefer to advance manually after
                          each win.
                        </p>
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="What does Auto Mode do?"
                      >
                        <Info className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                  <span className="inline-flex origin-center scale-90">
                    <Switch
                      id="hangman-auto-mode"
                      checked={autoMode}
                      onCheckedChange={setAutoMode}
                    />
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <BestStreakLeaderboardCard
        description="Win consecutive rounds without losing. Ties on best streak: fewer total hints in the run that set your best rank higher. Hints reset when you lose or give up."
        rows={lbRows}
        loading={lbLoading}
        myUserId={myId}
        hintsColumnLabel="Hints"
      />
    </div>
  )
}
