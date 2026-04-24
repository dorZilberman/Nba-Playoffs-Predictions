"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/app/lib/utils/cn"
import type { BestStreakLeaderboardRow } from "@/app/lib/minigames/bestStreakLeaderboard"

function podiumRowClasses(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-amber-400/28 via-amber-300/12 to-transparent dark:from-amber-500/22 dark:via-amber-600/10 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.28)] hover:from-amber-400/38 dark:hover:from-amber-500/28"
    case 2:
      return "bg-gradient-to-r from-slate-300/38 via-slate-200/12 to-transparent dark:from-slate-400/26 dark:via-slate-500/10 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.38)] hover:from-slate-300/48 dark:hover:from-slate-400/32"
    case 3:
      return "bg-gradient-to-r from-orange-300/32 via-amber-800/10 to-transparent dark:from-orange-600/22 dark:via-amber-900/10 shadow-[inset_0_0_0_1px_rgba(234,88,12,0.32)] hover:from-orange-300/42 dark:hover:from-orange-600/28"
    default:
      return ""
  }
}

function rankColumnClasses(rank: number): string {
  switch (rank) {
    case 1:
      return "font-semibold text-amber-700 dark:text-amber-400"
    case 2:
      return "font-semibold text-slate-600 dark:text-slate-300"
    case 3:
      return "font-semibold text-orange-800 dark:text-orange-400"
    default:
      return "text-muted-foreground"
  }
}

type BestStreakLeaderboardCardProps = {
  title?: string
  description: string
  rows: BestStreakLeaderboardRow[]
  loading: boolean
  myUserId?: string
  emptyMessage?: string
  /** When set, show a third column for hint tie-break scores (`hintsUsedTotal` on each row). */
  hintsColumnLabel?: string
}

export function BestStreakLeaderboardCard({
  title = "Leaderboard",
  description,
  rows,
  loading,
  myUserId,
  emptyMessage = "No streaks yet — be the first to play.",
  hintsColumnLabel,
}: BestStreakLeaderboardCardProps) {
  const showHints = Boolean(hintsColumnLabel)
  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        {loading ? (
          <p className="px-2 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Best</TableHead>
                  {showHints ? (
                    <TableHead className="text-right tabular-nums">
                      {hintsColumnLabel}
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isYou = !!myUserId && row.userId === myUserId
                  const top3 = row.rank >= 1 && row.rank <= 3
                  return (
                    <TableRow
                      key={row.userId}
                      data-current-user={isYou || undefined}
                      className={cn(
                        "transition-colors",
                        top3 && podiumRowClasses(row.rank),
                        !top3 && !isYou && "hover:bg-muted/50",
                        !top3 &&
                          isYou &&
                          "bg-primary/10 hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20",
                        isYou &&
                          "border-l-2 border-l-primary font-semibold"
                      )}
                    >
                      <TableCell
                        className={cn("tabular-nums", rankColumnClasses(row.rank))}
                      >
                        {row.rank}
                      </TableCell>
                      <TableCell
                        className={cn("font-medium", isYou && "font-semibold")}
                      >
                        {row.userName}
                        {isYou && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {row.bestStreak}
                      </TableCell>
                      {showHints ? (
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.hintsUsedTotal ?? 0}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
