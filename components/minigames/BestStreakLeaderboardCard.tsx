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

type BestStreakLeaderboardCardProps = {
  title?: string
  description: string
  rows: BestStreakLeaderboardRow[]
  loading: boolean
  myUserId?: string
  emptyMessage?: string
}

export function BestStreakLeaderboardCard({
  title = "Leaderboard",
  description,
  rows,
  loading,
  myUserId,
  emptyMessage = "No streaks yet — be the first to play.",
}: BestStreakLeaderboardCardProps) {
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.userId}
                    className={cn(
                      myUserId && row.userId === myUserId && "bg-muted/60"
                    )}
                  >
                    <TableCell className="tabular-nums text-muted-foreground">
                      {row.rank}
                    </TableCell>
                    <TableCell className="font-medium">{row.userName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.bestStreak}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
