"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import type { GameAnalytics } from "@/app/api/analytics/route"
import { Check } from "lucide-react"

type RoundType = "playin" | "first" | "second" | "conference" | "finals"

const ROUND_LABELS: Record<RoundType, string> = {
  playin: "Play-In",
  first: "First Round",
  second: "Second Round",
  conference: "Conference Finals",
  finals: "Finals",
}

export function AnalyticsClient() {
  const [selectedRound, setSelectedRound] = useState<RoundType>("playin")
  const [analytics, setAnalytics] = useState<GameAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async (round: RoundType) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?round=${round}`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics(selectedRound)
  }, [selectedRound, fetchAnalytics])

  const rounds: RoundType[] = ["playin", "first", "second", "conference", "finals"]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {rounds.map((round) => (
          <Button
            key={round}
            variant={selectedRound === round ? "default" : "ghost"}
            onClick={() => setSelectedRound(round)}
            className="whitespace-nowrap"
          >
            {ROUND_LABELS[round]}
          </Button>
        ))}
      </div>

      {/* Analytics Content */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading analytics...
        </div>
      ) : analytics.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No games found for this round.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {analytics.map((game) => (
            <GameAnalyticsCard key={game.gameId} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}

function GameAnalyticsCard({ game }: { game: GameAnalytics }) {
  const getRoundLabel = () => {
    if (game.gameType === "playin") {
      if (game.conference === "east") return "East Play-In"
      if (game.conference === "west") return "West Play-In"
      return "Play-In"
    }
    const roundLabels: Record<string, string> = {
      first: "First Round",
      second: "Second Round",
      conference: "Conference Finals",
      finals: "Finals",
    }
    const confLabel = game.conference
      ? game.conference.charAt(0).toUpperCase() + game.conference.slice(1)
      : ""
    return `${confLabel} ${roundLabels[game.round] || game.round}`.trim()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          <div className="flex items-center justify-between">
            <span>{getRoundLabel()}</span>
            {game.winner && (
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3" />
                Winner: {game.winner}
              </span>
            )}
          </div>
        </CardTitle>
        {game.description && (
          <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Teams */}
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TeamDisplay teamName={game.team1} size="sm" showName={true} />
                {game.team1Seed && (
                  <span className="text-xs text-muted-foreground">
                    (#{game.team1Seed})
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">{game.team1Count}</div>
                <div className="text-xs text-muted-foreground">
                  {game.team1Percentage}%
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${game.team1Percentage}%` }}
              />
            </div>
            {/* Users list */}
            {game.team1Users.length > 0 && (
              <div className="text-xs text-muted-foreground pl-2">
                <div className="font-medium mb-1">Selected by:</div>
                <div className="flex flex-wrap gap-1">
                  {game.team1Users.map((user, idx) => (
                    <span key={user.id}>
                      {user.name}
                      {idx < game.team1Users.length - 1 && ","}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground py-1">vs</div>

          {/* Team 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TeamDisplay teamName={game.team2} size="sm" showName={true} />
                {game.team2Seed && (
                  <span className="text-xs text-muted-foreground">
                    (#{game.team2Seed})
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">{game.team2Count}</div>
                <div className="text-xs text-muted-foreground">
                  {game.team2Percentage}%
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${game.team2Percentage}%` }}
              />
            </div>
            {/* Users list */}
            {game.team2Users.length > 0 && (
              <div className="text-xs text-muted-foreground pl-2">
                <div className="font-medium mb-1">Selected by:</div>
                <div className="flex flex-wrap gap-1">
                  {game.team2Users.map((user, idx) => (
                    <span key={user.id}>
                      {user.name}
                      {idx < game.team2Users.length - 1 && ","}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total predictions */}
        <div className="pt-2 border-t text-center text-sm text-muted-foreground">
          Total: {game.totalPredictions} prediction{game.totalPredictions !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  )
}
