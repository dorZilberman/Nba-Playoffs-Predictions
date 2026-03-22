"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import { X } from "lucide-react"

export function BracketTeamBox({
  team,
  seed,
  isWinner,
  wins,
  hasScore,
  hasPrediction,
  actualWinner,
}: {
  team: string
  seed?: number
  isWinner?: boolean
  wins: number
  hasScore: boolean
  hasPrediction?: boolean
  actualWinner?: string
}) {
  const correctPrediction = hasPrediction && isWinner
  const wrongPrediction = hasPrediction && !isWinner && actualWinner

  const getLastWord = (teamName: string): string => {
    const words = teamName.trim().split(/\s+/)
    return words.length > 0 ? words[words.length - 1] : teamName
  }

  const lastWord = getLastWord(team)

  return (
    <Card
      className={`h-10 md:h-12 flex items-center border-2 ${
        isWinner
          ? "bg-yellow-400/40 dark:bg-yellow-500/30 border-yellow-500 dark:border-yellow-400 font-semibold"
          : hasPrediction
            ? "bg-primary/20 border-2 border-primary"
            : "bg-card border-border"
      }`}
    >
      <CardContent className="p-0 flex items-center gap-1 w-full min-w-0 overflow-hidden px-2">
        <div className="shrink-0 w-4 h-4 flex items-center justify-center">
          <TeamDisplay teamName={team} size="sm" showName={false} />
        </div>
        <div
          className="flex-1 font-medium text-[9px] md:text-[10px] truncate min-w-0 overflow-hidden"
          title={team}
        >
          <span className="max-[400px]:hidden">{team}</span>
          <span className="hidden max-[400px]:inline">{lastWord}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {seed !== undefined && (
            <span className="text-[8px] md:text-[9px] text-muted-foreground whitespace-nowrap">
              ({seed})
            </span>
          )}
          {hasScore && (
            <span className="text-[9px] md:text-[10px] font-semibold whitespace-nowrap">
              {wins}
            </span>
          )}
          {correctPrediction && (
            <span className="text-[9px] md:text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
              ✓
            </span>
          )}
          {wrongPrediction && (
            <X className="h-2.5 w-2.5 md:h-3 md:w-3 text-red-600 dark:text-red-400 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
