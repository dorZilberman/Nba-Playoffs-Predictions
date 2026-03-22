"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import { Tooltip } from "@/components/ui/tooltip"
import type {
  AnalyticsItem,
  EarlyFinalsAnalyticsApiResponse,
  EarlyFinalsAnalyticsBlock,
  GameAnalytics,
} from "@/app/api/analytics/route"
import { Check } from "lucide-react"

type RoundType =
  | "early-finals"
  | "playin"
  | "first"
  | "second"
  | "conference"
  | "finals"

const ROUND_LABELS: Record<RoundType, string> = {
  "early-finals": "Early Finals",
  playin: "Play-In",
  first: "First Round",
  second: "Second Round",
  conference: "Conference Finals",
  finals: "Finals",
}

function isEarlyFinalsBlock(
  item: AnalyticsItem
): item is EarlyFinalsAnalyticsBlock {
  return item.gameType === "earlyFinals"
}

export function AnalyticsClient() {
  const [selectedRound, setSelectedRound] =
    useState<RoundType>("early-finals")
  const [items, setItems] = useState<AnalyticsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [earlyFinalsNoSeason, setEarlyFinalsNoSeason] = useState(false)

  const fetchAnalytics = useCallback(async (round: RoundType) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/analytics?round=${encodeURIComponent(round)}`,
        { cache: "no-store" }
      )
      if (!res.ok) return

      if (round === "early-finals") {
        const data = (await res.json()) as EarlyFinalsAnalyticsApiResponse
        if (data.state === "hidden") {
          setEarlyFinalsNoSeason(data.reason === "no_season")
          setItems([])
          return
        }
        setEarlyFinalsNoSeason(false)
        setItems(data.blocks)
        return
      }

      setEarlyFinalsNoSeason(false)
      const data = (await res.json()) as AnalyticsItem[]
      setItems(data)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics(selectedRound)
  }, [selectedRound, fetchAnalytics])

  const rounds: RoundType[] = [
    "early-finals",
    "playin",
    "first",
    "second",
    "conference",
    "finals",
  ]

  const emptyMessage = "No games found for this round."

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
      ) : selectedRound === "early-finals" && earlyFinalsNoSeason ? (
        <div className="text-center py-8 text-muted-foreground max-w-lg mx-auto text-sm">
          <p>No active season.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : selectedRound === "early-finals" ? (
        <div className="grid gap-4 lg:grid-cols-1">
          {items.filter(isEarlyFinalsBlock).map((block) => (
            <EarlyFinalsBlockCard key={block.gameId} block={block} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((game) =>
            isEarlyFinalsBlock(game) ? null : (
              <GameAnalyticsCard key={game.gameId} game={game} />
            )
          )}
        </div>
      )}
    </div>
  )
}

function EarlyFinalsBlockCard({ block }: { block: EarlyFinalsAnalyticsBlock }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex flex-wrap items-center justify-between gap-2">
          <span>{block.title}</span>
          {block.actualWinner && (
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" />
              Actual: {block.actualWinner}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {block.picks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No picks submitted yet.
          </p>
        ) : (
          <div className="space-y-4">
            {block.picks.map((row) => (
              <div key={row.teamName} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <TeamDisplay teamName={row.teamName} size="sm" showName />
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.count}{" "}
                    <span className="text-xs">
                      ({row.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
                {row.users.length > 0 && (
                  <div className="text-xs text-muted-foreground pl-0.5">
                    <span className="font-medium">Picked by: </span>
                    {row.users.map((u) => u.name).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="pt-2 border-t text-center text-sm text-muted-foreground">
          Submissions: {block.totalPredictions}
        </div>
      </CardContent>
    </Card>
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
                {game.gameType === "series" && game.actualResult && (
                  <span className="ml-1">({game.actualResult})</span>
                )}
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
            {/* Score breakdown (for playoff series only) */}
            {game.gameType === "series" && game.team1ScoreBreakdown && (
              <div className="text-xs text-muted-foreground pl-2 space-y-1">
                <div className="font-medium">Score predictions:</div>
                <div className="flex justify-between w-full">
                  {(["4-0", "4-1", "4-2", "4-3"] as const).map((score) => {
                    const count = game.team1ScoreBreakdown![score] || 0
                    const details = game.team1ScoreDetails?.[score] || []
                    const points = game.team1ScorePoints?.[score]
                    
                    const tooltipContent = (
                      <div className="space-y-2">
                        {points !== null && points !== undefined && (
                          <div className="whitespace-nowrap">
                            <span className="font-semibold">Worth: </span>
                            <span className="text-xs">
                              {points} point{points !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {details.length > 0 && (
                          <div>
                            <div className="font-semibold mb-1">Selected by:</div>
                            {details.map((detail) => (
                              <div key={detail.userId} className="text-xs">
                                {detail.userName}
                              </div>
                            ))}
                          </div>
                        )}
                        {details.length === 0 && (
                          <div className="text-xs">No predictions</div>
                        )}
                      </div>
                    )
                    
                    return (
                      <Tooltip key={score} content={tooltipContent}>
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-muted cursor-help">
                          <span className="font-medium">{score}</span>
                          <span className="text-muted-foreground">({count})</span>
                        </div>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )}
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
            {/* Score breakdown (for playoff series only) */}
            {game.gameType === "series" && game.team2ScoreBreakdown && (
              <div className="text-xs text-muted-foreground pl-2 space-y-1">
                <div className="font-medium">Score predictions:</div>
                <div className="flex justify-between w-full">
                  {(["4-0", "4-1", "4-2", "4-3"] as const).map((score) => {
                    const count = game.team2ScoreBreakdown![score] || 0
                    const details = game.team2ScoreDetails?.[score] || []
                    const points = game.team2ScorePoints?.[score]
                    
                    const tooltipContent = (
                      <div className="space-y-2">
                        {points !== null && points !== undefined && (
                          <div className="whitespace-nowrap">
                            <span className="font-semibold">Worth: </span>
                            <span className="text-xs">
                              {points} point{points !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {details.length > 0 && (
                          <div>
                            <div className="font-semibold mb-1">Selected by:</div>
                            {details.map((detail) => (
                              <div key={detail.userId} className="text-xs">
                                {detail.userName}
                              </div>
                            ))}
                          </div>
                        )}
                        {details.length === 0 && (
                          <div className="text-xs">No predictions</div>
                        )}
                      </div>
                    )
                    
                    return (
                      <Tooltip key={score} content={tooltipContent}>
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-muted cursor-help">
                          <span className="font-medium">{score}</span>
                          <span className="text-muted-foreground">({count})</span>
                        </div>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )}
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
