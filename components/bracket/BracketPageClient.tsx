"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { NBABracketView } from "./NBABracketView"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserStanding } from "@/app/api/standings/route"

export function BracketPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [standings, setStandings] = useState<UserStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get userId from URL params
    const userIdParam = searchParams.get("userId")
    if (userIdParam) {
      setViewingUserId(userIdParam)
    } else {
      // Default to current user
      setViewingUserId(session?.user?.id || null)
    }
  }, [searchParams, session])

  useEffect(() => {
    fetchStandings()
  }, [])

  const fetchStandings = async () => {
    try {
      const res = await fetch("/api/standings")
      if (res.ok) {
        const data = await res.json()
        setStandings(data)
      }
    } catch (error) {
      console.error("Error fetching standings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserChange = (userId: string) => {
    if (userId === session?.user?.id) {
      // Switch to own bracket - remove query param
      router.push("/bracket")
      setViewingUserId(userId)
    } else {
      // View another user's bracket
      router.push(`/bracket?userId=${userId}`)
      setViewingUserId(userId)
    }
  }

  const switchToOwnBracket = () => {
    router.push("/bracket")
    setViewingUserId(session?.user?.id || null)
  }

  const isViewingOtherUser = viewingUserId && viewingUserId !== session?.user?.id
  const viewingUserName = standings.find((s) => s.userId === viewingUserId)?.userName || "User"

  return (
    <div className="space-y-6">
      {/* User Selector Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">View Predictions:</label>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading users...</div>
              ) : (
                <Select
                  value={viewingUserId || ""}
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {standings.map((standing) => (
                      <SelectItem key={standing.userId} value={standing.userId}>
                        {standing.userName}
                        {standing.userId === session?.user?.id && " (You)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {isViewingOtherUser && (
              <Button variant="outline" onClick={switchToOwnBracket}>
                Switch to Your Bracket
              </Button>
            )}
          </div>
          {isViewingOtherUser && (
            <p className="text-sm text-muted-foreground mt-2">
              Viewing {viewingUserName}'s locked predictions only
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bracket View */}
      <NBABracketView
        viewingUserId={viewingUserId || undefined}
        isViewingOtherUser={isViewingOtherUser || false}
      />
    </div>
  )
}
