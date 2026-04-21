"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WhoHePlayForTeamPicker } from "@/components/minigames/WhoHePlayForTeamPicker"
import { BestStreakLeaderboardCard } from "@/components/minigames/BestStreakLeaderboardCard"
import { cn } from "@/app/lib/utils/cn"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"
import type { NbaTeamOption } from "@/app/lib/minigames/whoHePlayForTeams"

type RoundPayload = {
  player: { id: string; displayName: string }
  teams: NbaTeamOption[]
  currentStreak: number
  bestStreak: number
}

type GuessPayload = {
  correct: boolean
  answerAbbr: string
  teamName: string
  currentStreak: number
  bestStreak: number
  player: { id: string; displayName: string }
}

export function WhoHePlayForGame() {
  const { data: session } = useSession()
  const myId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<NbaTeamOption[]>([])
  const [player, setPlayer] = useState<{ id: string; displayName: string } | null>(
    null
  )
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [selectedAbbr, setSelectedAbbr] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [lastMessage, setLastMessage] = useState<{
    type: "ok" | "bad"
    text: string
  } | null>(null)

  const [leaderboard, setLeaderboard] = useState<BestStreakLeaderboardRow[]>(
    []
  )
  const [lbLoading, setLbLoading] = useState(true)

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

  const loadRound = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/minigames/who-he-play-for/round", {
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(
          typeof err?.error === "string" ? err.error : "Could not load round."
        )
        return
      }
      const data = (await res.json()) as RoundPayload
      setTeams(data.teams)
      setPlayer(data.player)
      setCurrentStreak(data.currentStreak)
      setBestStreak(data.bestStreak)
      setSelectedAbbr("")
    } catch {
      setError("Could not load round.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRound()
  }, [loadRound])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  const submitGuess = async () => {
    if (!selectedAbbr) return
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
        setLastMessage({
          type: "bad",
          text:
            typeof raw?.error === "string"
              ? raw.error
              : "Could not submit guess.",
        })
        return
      }
      const data = raw as GuessPayload
      setCurrentStreak(data.currentStreak)
      setBestStreak(data.bestStreak)
      setPlayer(data.player)
      setSelectedAbbr("")
      setLastMessage({
        type: data.correct ? "ok" : "bad",
        text: data.correct
          ? `Correct — ${data.teamName}. Streak: ${data.currentStreak}`
          : `Wrong — it was ${data.teamName} (${data.answerAbbr}). Streak reset.`,
      })
      loadLeaderboard()
    } catch {
      setLastMessage({ type: "bad", text: "Network error." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Who He Play For?</CardTitle>
          <CardDescription>
            Pick the team this player is on. One guess per player — a wrong pick
            resets your streak. Leaderboard ranks by best streak.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
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

          {loading && !player && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {player && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Player
                </p>
                <p className="text-balance text-xl font-semibold leading-snug sm:text-2xl">
                  {player.displayName}
                </p>
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

              <Button
                type="button"
                className="w-full max-w-md sm:w-auto"
                disabled={!selectedAbbr || submitting}
                onClick={() => void submitGuess()}
              >
                {submitting ? "Submitting…" : "Submit guess"}
              </Button>
            </div>
          )}
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
