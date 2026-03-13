"use client"

import { Card, CardContent } from "@/components/ui/card"

interface BracketMatchup {
  seed1?: number
  seed2?: number
  team1?: string
  team2?: string
  winner?: string
}

export function BracketStructure() {
  return (
    <div className="w-full space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">2026 NBA Playoffs Bracket</h1>
        <p className="text-muted-foreground">Play-In start: TBD | Playoffs start: TBD</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Western Conference */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-center">WESTERN CONFERENCE</h2>
          <WesternConferenceBracket />
        </div>

        {/* Eastern Conference */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-center">EASTERN CONFERENCE</h2>
          <EasternConferenceBracket />
        </div>
      </div>
    </div>
  )
}

function WesternConferenceBracket() {
  return (
    <div className="relative">
      {/* Play-In Tournament */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-center">Play-In Tournament</h3>
        <div className="space-y-4">
          {/* 9 vs 10 */}
          <div className="flex items-center justify-center gap-4">
            <BracketSlot seed={9} />
            <span className="text-muted-foreground">vs</span>
            <BracketSlot seed={10} />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Winner plays loser of 7/8
          </div>

          {/* 7 vs 8 */}
          <div className="flex items-center justify-center gap-4">
            <BracketSlot seed={7} />
            <span className="text-muted-foreground">vs</span>
            <BracketSlot seed={8} />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Winner = 7th seed
          </div>

          {/* Final for 8th seed */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <BracketSlot seed={null} label="Loser 7/8" />
            <span className="text-muted-foreground">vs</span>
            <BracketSlot seed={null} label="Winner 9/10" />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Winner = 8th seed
          </div>
        </div>
      </div>

      {/* Playoffs Round 1 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">Playoffs Round 1</h3>
        <div className="space-y-6">
          {/* 1 vs 8 */}
          <BracketMatchup seed1={1} seed2={8} />

          {/* 4 vs 5 */}
          <BracketMatchup seed1={4} seed2={5} />

          {/* 3 vs 6 */}
          <BracketMatchup seed1={3} seed2={6} />

          {/* 2 vs 7 */}
          <BracketMatchup seed1={2} seed2={7} />
        </div>
      </div>
    </div>
  )
}

function EasternConferenceBracket() {
  return (
    <div className="relative">
      {/* Play-In Tournament */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-center">Play-In Tournament</h3>
        <div className="space-y-4">
          {/* 9 vs 10 */}
          <div className="flex items-center justify-center gap-4">
            <BracketSlot seed={9} />
            <span className="text-muted-foreground">vs</span>
            <BracketSlot seed={10} />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Winner plays loser of 7/8
          </div>

          {/* 7 vs 8 */}
          <div className="flex items-center justify-center gap-4">
            <BracketSlot seed={7} />
            <span className="text-muted-foreground">vs</span>
            <BracketSlot seed={8} />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Winner = 7th seed
          </div>

          {/* Final for 8th seed */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <BracketSlot seed={null} label="Loser 7/8" />
            <span className="text-muted-foreground">vs</span>
            <BracketSlot seed={null} label="Winner 9/10" />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Winner = 8th seed
          </div>
        </div>
      </div>

      {/* Playoffs Round 1 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">Playoffs Round 1</h3>
        <div className="space-y-6">
          {/* 1 vs 8 */}
          <BracketMatchup seed1={1} seed2={8} />

          {/* 4 vs 5 */}
          <BracketMatchup seed1={4} seed2={5} />

          {/* 3 vs 6 */}
          <BracketMatchup seed1={3} seed2={6} />

          {/* 2 vs 7 */}
          <BracketMatchup seed1={2} seed2={7} />
        </div>
      </div>
    </div>
  )
}

function BracketSlot({ seed, label }: { seed?: number | null; label?: string }) {
  return (
    <Card className="w-24 h-16 flex items-center justify-center">
      <CardContent className="p-2 text-center">
        {seed !== null && seed !== undefined ? (
          <div className="font-bold text-lg">{seed}</div>
        ) : (
          <div className="text-xs text-muted-foreground">{label || "TBD"}</div>
        )}
      </CardContent>
    </Card>
  )
}

function BracketMatchup({ seed1, seed2 }: { seed1: number; seed2: number }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <BracketSlot seed={seed1} />
      <span className="text-muted-foreground">vs</span>
      <BracketSlot seed={seed2} />
    </div>
  )
}
