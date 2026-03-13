"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import type { UserStanding } from "@/app/api/standings/route"

type SortField =
  | "totalScore"
  | "playInScore"
  | "firstRoundScore"
  | "secondRoundScore"
  | "conferenceFinalsScore"
  | "finalsScore"
  | "userName"

type SortDirection = "asc" | "desc"

export function StandingsTable() {
  const router = useRouter()
  const [standings, setStandings] = useState<UserStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("totalScore")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchStandings()
  }, [])

  const fetchStandings = async () => {
    try {
      const res = await fetch("/api/standings")
      const data = await res.json()
      setStandings(data)
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

  const sortedStandings = [...standings].sort((a, b) => {
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
      <CardHeader>
        <CardTitle>Standings</CardTitle>
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
              {sortedStandings.map((standing, index) => (
                <TableRow
                  key={standing.userId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    router.push(`/bracket?userId=${standing.userId}`)
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {standing.userName}
                  </TableCell>
                  <TableCell className="font-bold">
                    {standing.totalScore}
                  </TableCell>
                  <TableCell>{standing.playInScore}</TableCell>
                  <TableCell>{standing.firstRoundScore}</TableCell>
                  <TableCell>{standing.secondRoundScore}</TableCell>
                  <TableCell>{standing.conferenceFinalsScore}</TableCell>
                  <TableCell>{standing.finalsScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
