"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/app/lib/utils/cn"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { UserStanding } from "@/app/api/standings/route"
import { rankByTotalScoreMap } from "@/app/lib/standings/rankByTotalScore"

type SortField =
  | "totalScore"
  | "earlyFinalsScore"
  | "playInScore"
  | "firstRoundScore"
  | "secondRoundScore"
  | "conferenceFinalsScore"
  | "finalsScore"
  | "userName"

type SortDirection = "asc" | "desc"

export function StandingsTable() {
  const router = useRouter()
  const { data: session } = useSession()
  const [standings, setStandings] = useState<UserStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("totalScore")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [onlyPaidUsers, setOnlyPaidUsers] = useState(false)

  useEffect(() => {
    fetchStandings()
  }, [])

  const fetchStandings = async () => {
    try {
      const res = await fetch("/api/standings")
      const data = (await res.json()) as UserStanding[]
      setStandings(
        Array.isArray(data)
          ? data.map((s) => ({ ...s, hasPayed: Boolean(s.hasPayed) }))
          : []
      )
    } catch (error) {
      console.error("Error fetching standings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const filteredStandings = onlyPaidUsers
    ? standings.filter((s) => s.hasPayed)
    : standings

  const sortedStandings = [...filteredStandings].sort((a, b) => {
    let aVal: any = a[sortField]
    let bVal: any = b[sortField]

    if (sortField === "userName") {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const totalScoreRanks = useMemo(
    () => rankByTotalScoreMap(filteredStandings),
    [filteredStandings]
  )

  const SortButton = ({ field }: { field: SortField }) => {
    const isActive = sortField === field
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => handleSort(field)}
      >
        {isActive && sortDirection === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : isActive && sortDirection === "desc" ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4" />
        )}
      </Button>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Loading standings...</div>
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Standings</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Users:</span>
          <SegmentedControl
            aria-label="Which users to include in standings"
            value={onlyPaidUsers ? "paid" : "all"}
            onChange={(v) => setOnlyPaidUsers(v === "paid")}
            options={[
              { value: "all", label: "All" },
              { value: "paid", label: "Paid only" },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Rank
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    User
                    <SortButton field="userName" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Total
                    <SortButton field="totalScore" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Early finals
                    <SortButton field="earlyFinalsScore" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Play-In
                    <SortButton field="playInScore" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    First Round
                    <SortButton field="firstRoundScore" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Second Round
                    <SortButton field="secondRoundScore" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Conference Finals
                    <SortButton field="conferenceFinalsScore" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Finals
                    <SortButton field="finalsScore" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStandings.map((standing, index) => {
                const isYou =
                  !!session?.user?.id && standing.userId === session.user.id
                return (
                <TableRow
                  key={standing.userId}
                  className={cn(
                    "cursor-pointer",
                    isYou
                      ? "bg-primary/10 hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20 border-l-2 border-l-primary font-semibold"
                      : "hover:bg-muted/50"
                  )}
                  data-current-user={isYou || undefined}
                  onClick={() => {
                    router.push(`/bracket?userId=${standing.userId}`)
                  }}
                >
                  <TableCell>
                    {totalScoreRanks.get(standing.userId) ?? index + 1}
                  </TableCell>
                  <TableCell className={cn("font-medium", isYou && "font-semibold")}>
                    {standing.userName}
                    {isYou && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold">
                    {standing.totalScore}
                  </TableCell>
                  <TableCell>{standing.earlyFinalsScore}</TableCell>
                  <TableCell>{standing.playInScore}</TableCell>
                  <TableCell>{standing.firstRoundScore}</TableCell>
                  <TableCell>{standing.secondRoundScore}</TableCell>
                  <TableCell>{standing.conferenceFinalsScore}</TableCell>
                  <TableCell>{standing.finalsScore}</TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
