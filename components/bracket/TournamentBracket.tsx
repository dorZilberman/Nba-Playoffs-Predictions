"use client"

import { Card, CardContent } from "@/components/ui/card"

interface Series {
  _id: string
  round: "first" | "second" | "conference" | "finals"
  conference: "east" | "west" | null
  team1: string
  team2: string
  winner?: string
  currentScore?: {
    team1Wins: number
    team2Wins: number
  }
}

interface TournamentBracketProps {
  series: Series[]
}

export function TournamentBracket({ series }: TournamentBracketProps) {
  // Organize series by round and conference
  const firstRoundWest = series
    .filter((s) => s.round === "first" && s.conference === "west")
    .sort((a, b) => {
      // Sort by typical bracket order: 1v8, 4v5, 3v6, 2v7
      const order = ["1", "4", "3", "2"]
      return 0 // Will be sorted by admin when creating
    })

  const firstRoundEast = series
    .filter((s) => s.round === "first" && s.conference === "east")
    .sort((a, b) => {
      const order = ["1", "4", "3", "2"]
      return 0
    })

  const secondRoundWest = series.filter(
    (s) => s.round === "second" && s.conference === "west"
  )
  const secondRoundEast = series.filter(
    (s) => s.round === "second" && s.conference === "east"
  )
  const conferenceWest = series.find(
    (s) => s.round === "conference" && s.conference === "west"
  )
  const conferenceEast = series.find(
    (s) => s.round === "conference" && s.conference === "east"
  )
  const finals = series.find((s) => s.round === "finals")

  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="min-w-[1400px] relative">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">PLAYOFFS</h2>
        </div>

        {/* Bracket Grid - 5 columns: West First, West Second, Finals, East Second, East First */}
        <div className="grid grid-cols-5 gap-8 relative">
          {/* Column 1: Western First Round */}
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">WESTERN CONFERENCE</h3>
            </div>
            {firstRoundWest.map((s, idx) => (
              <div key={s._id} className="relative">
                <MatchupBox series={s} />
                {/* Line to second round */}
                {idx % 2 === 0 && (
                  <div className="absolute right-0 top-1/2 w-8 h-0.5 bg-border transform -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>

          {/* Column 2: Western Second Round */}
          <div className="space-y-24 flex flex-col justify-center">
            {secondRoundWest.map((s, idx) => (
              <div key={s._id} className="relative">
                <MatchupBox series={s} />
                {/* Line to conference finals */}
                {idx === 0 && (
                  <div className="absolute right-0 top-1/2 w-8 h-0.5 bg-border transform -translate-y-1/2" />
                )}
              </div>
            ))}
            {secondRoundWest.length === 0 && (
              <div className="h-48 flex items-center">
                <EmptyMatchup />
              </div>
            )}
          </div>

          {/* Column 3: Conference Finals & NBA Finals */}
          <div className="space-y-32 flex flex-col justify-center">
            {/* Western Conference Finals */}
            <div className="relative">
              {conferenceWest ? (
                <MatchupBox series={conferenceWest} />
              ) : (
                <EmptyMatchup />
              )}
              {/* Line to NBA Finals */}
              <div className="absolute right-0 top-1/2 w-8 h-0.5 bg-border transform -translate-y-1/2" />
            </div>

            {/* NBA Finals */}
            <div className="text-center">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                NBA FINALS
              </div>
              {finals ? <MatchupBox series={finals} /> : <EmptyMatchup />}
            </div>

            {/* Eastern Conference Finals */}
            <div className="relative">
              {conferenceEast ? (
                <MatchupBox series={conferenceEast} />
              ) : (
                <EmptyMatchup />
              )}
              {/* Line to NBA Finals */}
              <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-border transform -translate-y-1/2" />
            </div>
          </div>

          {/* Column 4: Eastern Second Round */}
          <div className="space-y-24 flex flex-col justify-center">
            {secondRoundEast.map((s, idx) => (
              <div key={s._id} className="relative">
                <MatchupBox series={s} />
                {/* Line to conference finals */}
                {idx === 0 && (
                  <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-border transform -translate-y-1/2" />
                )}
              </div>
            ))}
            {secondRoundEast.length === 0 && (
              <div className="h-48 flex items-center">
                <EmptyMatchup />
              </div>
            )}
          </div>

          {/* Column 5: Eastern First Round */}
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">EASTERN CONFERENCE</h3>
            </div>
            {firstRoundEast.map((s, idx) => (
              <div key={s._id} className="relative">
                <MatchupBox series={s} />
                {/* Line to second round */}
                {idx % 2 === 0 && (
                  <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-border transform -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Vertical connecting lines */}
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {/* Lines connecting first to second round */}
          {firstRoundWest.map((_, idx) => {
            if (idx % 2 === 0) {
              const y1 = 60 + idx * 120 // Approximate position
              const y2 = 120 + Math.floor(idx / 2) * 240
              return (
                <line
                  key={`west-${idx}`}
                  x1="200"
                  y1={y1}
                  x2="400"
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-border"
                />
              )
            }
            return null
          })}
          {/* Similar for east */}
        </svg>
      </div>
    </div>
  )
}

function MatchupBox({ series }: { series: Series }) {
  const team1Wins = series.currentScore?.team1Wins || 0
  const team2Wins = series.currentScore?.team2Wins || 0
  const hasScore = team1Wins + team2Wins > 0

  return (
    <div className="flex flex-col gap-1 w-56">
      {/* Team 1 */}
      <TeamBox
        team={series.team1}
        isWinner={series.winner === series.team1}
        wins={team1Wins}
        hasScore={hasScore}
      />
      {/* Team 2 */}
      <TeamBox
        team={series.team2}
        isWinner={series.winner === series.team2}
        wins={team2Wins}
        hasScore={hasScore}
      />
    </div>
  )
}

function TeamBox({
  team,
  isWinner,
  wins,
  hasScore,
}: {
  team: string
  isWinner?: boolean
  wins: number
  hasScore: boolean
}) {
  return (
    <Card
      className={`h-14 flex items-center justify-between px-3 ${
        isWinner
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card"
      }`}
    >
      <CardContent className="p-0 flex items-center gap-3 w-full">
        {/* Logo placeholder */}
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
          {team
            .split(" ")
            .map((w) => w[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()}
        </div>

        {/* Team name */}
        <div className="flex-1 font-medium text-sm truncate">{team}</div>

        {/* Score */}
        {hasScore && (
          <div className="text-sm font-semibold shrink-0">{wins}</div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyMatchup() {
  return (
    <div className="w-56 h-28 border-2 border-dashed border-muted rounded flex items-center justify-center">
      <span className="text-xs text-muted-foreground">TBD</span>
    </div>
  )
}
