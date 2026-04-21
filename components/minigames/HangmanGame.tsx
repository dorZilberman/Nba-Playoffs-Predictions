"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HangmanPlayer, HangmanPlayerBundle } from "@/app/lib/minigames/types"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"
import { BestStreakLeaderboardCard } from "@/components/minigames/BestStreakLeaderboardCard"
import { cn } from "@/app/lib/utils/cn"

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
/** Body parts after the gallows: head, body, arms, legs, eyes — game ends on this many wrong letters. */
const MAX_WRONG = 7

function requiredLetters(name: string): Set<string> {
  const s = new Set<string>()
  for (const ch of name.toUpperCase()) {
    if (ch >= "A" && ch <= "Z") s.add(ch)
  }
  return s
}

function pickRandom(players: HangmanPlayer[]): HangmanPlayer {
  const i = Math.floor(Math.random() * players.length)
  return players[i]
}

function HangmanFigure({ stage }: { stage: number }) {
  const s = Math.min(Math.max(stage, 0), MAX_WRONG)
  return (
    <svg
      viewBox="0 0 120 140"
      className="mx-auto h-auto max-h-[min(160px,28vh)] w-full max-w-[min(200px,45vw)] text-foreground sm:max-h-none sm:max-w-[200px]"
      aria-hidden
    >
      {/* gallows (always) */}
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
  /** When false, omit the card title (e.g. page already has an h1). */
  showTitle?: boolean
}

export function HangmanGame({ showTitle = true }: HangmanGameProps) {
  const { data: session } = useSession()
  const myId = session?.user?.id

  const [bundle, setBundle] = useState<HangmanPlayerBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [current, setCurrent] = useState<HangmanPlayer | null>(null)
  const [guessed, setGuessed] = useState<Set<string>>(() => new Set())
  const [wrong, setWrong] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing")

  const [streakCurrent, setStreakCurrent] = useState(0)
  const [streakBest, setStreakBest] = useState(0)
  const [lbRows, setLbRows] = useState<BestStreakLeaderboardRow[]>([])
  const [lbLoading, setLbLoading] = useState(true)

  /** Per-round id so we only report win/loss once (Strict Mode–safe). */
  const roundSeqRef = useRef(0)
  const reportedSeqRef = useRef<number | null>(null)

  const loadStreak = useCallback(async () => {
    try {
      const res = await fetch("/api/minigames/hangman/streak", {
        cache: "no-store",
      })
      if (!res.ok) return
      const d = (await res.json()) as {
        currentStreak?: number
        bestStreak?: number
      }
      setStreakCurrent(d.currentStreak ?? 0)
      setStreakBest(d.bestStreak ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

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
    loadStreak()
  }, [loadStreak])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

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
        }
        setStreakCurrent(d.currentStreak)
        setStreakBest(d.bestStreak)
        loadLeaderboard()
      } catch {
        /* ignore */
      }
    })()
  }, [status, loadLeaderboard])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/minigames/hangman/players", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) setLoadError("Could not load players.")
          return
        }
        const data = (await res.json()) as HangmanPlayerBundle
        if (cancelled) return
        setBundle(data)
        setCurrent(pickRandom(data.players))
      } catch {
        if (!cancelled) setLoadError("Could not load players.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const newRound = useCallback(() => {
    if (!bundle?.players.length) return
    roundSeqRef.current += 1
    reportedSeqRef.current = null
    setCurrent(pickRandom(bundle.players))
    setGuessed(new Set())
    setWrong(0)
    setHintsUsed(0)
    setStatus("playing")
  }, [bundle])

  const onLetter = useCallback(
    (letter: string) => {
      if (status !== "playing" || !current) return
      const L = letter.toUpperCase()
      if (guessed.has(L)) return
      const next = new Set(guessed)
      next.add(L)
      setGuessed(next)
      if (!needed.has(L)) {
        setWrong((w) => {
          const nw = w + 1
          if (nw >= MAX_WRONG) {
            setStatus("lost")
          }
          return nw
        })
      }
    },
    [current, guessed, needed, status]
  )

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    )
  }

  if (!bundle || !current) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">Loading Hangman…</p>
    )
  }

  const hintLines = [
    hintsUsed >= 1 ? `Conference: ${current.conference}` : null,
    hintsUsed >= 2 ? `Team: ${current.team}` : null,
    hintsUsed >= 3 ? `Position: ${current.position}` : null,
  ].filter(Boolean) as string[]

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
        </div>

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
                    const isLetter = ch >= "A" && ch <= "Z" || ch >= "a" && ch <= "z"
                    if (!isLetter) {
                      return (
                        <span key={ci} className="text-muted-foreground">
                          {ch}
                        </span>
                      )
                    }
                    const show = guessed.has(u) || status === "lost" || status === "won"
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
                Answer: <span className="font-medium text-foreground">{current.displayName}</span>
              </p>
            )}
            {status === "won" && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">You got it!</p>
            )}
          </div>
        </div>

        {hintLines.length > 0 && (
          <div className="rounded-md border bg-muted/40 px-2.5 py-2 text-xs sm:px-3 sm:text-sm space-y-1">
            {hintLines.map((line, i) => (
              <p key={i} className="break-words">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="flex min-w-0 gap-1.5 sm:flex-wrap sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-[2.75rem] min-w-0 flex-1 basis-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
            disabled={hintsUsed !== 0 || status !== "playing"}
            onClick={() => setHintsUsed(1)}
          >
            Hint 1 — conference
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-[2.75rem] min-w-0 flex-1 basis-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
            disabled={hintsUsed !== 1 || status !== "playing"}
            onClick={() => setHintsUsed(2)}
          >
            Hint 2 — team
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-[2.75rem] min-w-0 flex-1 basis-0 whitespace-normal px-1.5 py-1.5 text-center text-[10px] leading-snug sm:h-9 sm:min-h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
            disabled={hintsUsed !== 2 || status !== "playing"}
            onClick={() => setHintsUsed(3)}
          >
            Hint 3 — position
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

        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" className="min-h-10 w-full max-w-xs sm:w-auto" onClick={newRound}>
            New player
          </Button>
        </div>
      </CardContent>
    </Card>

    <BestStreakLeaderboardCard
      description="Win consecutive rounds without losing (running out of wrong guesses). One row per player, ranked by best streak."
      rows={lbRows}
      loading={lbLoading}
      myUserId={myId}
    />
    </div>
  )
}
