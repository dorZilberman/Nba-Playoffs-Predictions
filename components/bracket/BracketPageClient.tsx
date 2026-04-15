"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import type { UserStanding } from "@/app/api/standings/route"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"
import {
  USER_NOT_IN_DB_CODE,
  USER_NOT_IN_DB_MESSAGE,
} from "@/app/lib/userNotInDbConstants"
import { useBracketStandings } from "@/components/context/BracketStandingsContext"
import type { EarlyFinalsApiResponse } from "./EarlyFinalsPredictionsSection"

function normalizeStandings(data: unknown): UserStanding[] {
  if (!Array.isArray(data)) return []
  return data.map((s) => ({
    ...s,
    hasPayed: Boolean((s as UserStanding).hasPayed),
  })) as UserStanding[]
}

export function BracketPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { setStandings: setStandingsForNav } = useBracketStandings()

  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [standings, setStandings] = useState<UserStanding[]>([])
  const [series, setSeries] = useState<ISeries[]>([])
  const [playInGames, setPlayInGames] = useState<IPlayInGame[]>([])
  const [predictions, setPredictions] = useState<IPrediction[]>([])
  const [earlyFinals, setEarlyFinals] = useState<EarlyFinalsApiResponse | null>(
    null
  )
  const [accountMissingMessage, setAccountMissingMessage] = useState<
    string | null
  >(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userIdParam = searchParams.get("userId")
    if (userIdParam) {
      setViewingUserId(userIdParam)
    } else {
      setViewingUserId(session?.user?.id ?? null)
    }
  }, [searchParams, session?.user?.id])

  const isViewingOtherUser = Boolean(
    viewingUserId && viewingUserId !== session?.user?.id
  )

  const fetchBracketBundle = useCallback(async () => {
    const uid = viewingUserId ?? session?.user?.id ?? undefined
    let predictionsUrl = "/api/predictions"
    if (viewingUserId) {
      predictionsUrl = `/api/predictions?userId=${viewingUserId}`
      if (isViewingOtherUser) {
        predictionsUrl += "&lockedOnly=true"
      }
    }

    const earlyQ =
      viewingUserId && isViewingOtherUser
        ? `?userId=${encodeURIComponent(viewingUserId)}`
        : ""

    setLoading(true)
    try {
      const [seriesRes, playInRes, predRes, standRes, earlyRes] =
        await Promise.all([
          fetch("/api/series"),
          fetch("/api/playin"),
          fetch(predictionsUrl),
          fetch("/api/standings"),
          fetch(`/api/early-finals${earlyQ}`, { cache: "no-store" }),
        ])

      if (seriesRes.ok) {
        const data = await seriesRes.json()
        setSeries(Array.isArray(data) ? data : [])
      } else {
        setSeries([])
      }

      if (playInRes.ok) {
        const data = await playInRes.json()
        setPlayInGames(Array.isArray(data) ? data : [])
      } else {
        setPlayInGames([])
      }

      if (predRes.ok) {
        setAccountMissingMessage(null)
        const data = await predRes.json()
        setPredictions(Array.isArray(data) ? data : [])
      } else if (predRes.status === 403) {
        const body = (await predRes.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        if (body.code === USER_NOT_IN_DB_CODE) {
          setAccountMissingMessage(
            typeof body.error === "string" ? body.error : USER_NOT_IN_DB_MESSAGE
          )
        } else {
          setAccountMissingMessage(null)
        }
        setPredictions([])
      } else {
        setAccountMissingMessage(null)
        setPredictions([])
      }

      if (standRes.ok) {
        const raw = await standRes.json()
        const rows = normalizeStandings(raw)
        setStandings(rows)
        setStandingsForNav(rows)
      } else {
        setStandings([])
        setStandingsForNav([])
      }

      if (earlyRes.ok) {
        const json = (await earlyRes.json()) as EarlyFinalsApiResponse
        setEarlyFinals(json)
      } else {
        setEarlyFinals(null)
      }
    } catch (e) {
      console.error("Bracket bundle fetch failed:", e)
      setStandings([])
      setStandingsForNav([])
    } finally {
      setLoading(false)
    }
  }, [
    viewingUserId,
    isViewingOtherUser,
    session?.user?.id,
    setStandingsForNav,
  ])

  useEffect(() => {
    void fetchBracketBundle()
  }, [fetchBracketBundle])

  useEffect(() => {
    return () => {
      setStandingsForNav(null)
    }
  }, [setStandingsForNav])

  const handleUserChange = (userId: string) => {
    if (userId === session?.user?.id) {
      router.push("/bracket")
      setViewingUserId(userId)
    } else {
      router.push(`/bracket?userId=${userId}`)
      setViewingUserId(userId)
    }
  }

  const switchToOwnBracket = () => {
    router.push("/bracket")
    setViewingUserId(session?.user?.id ?? null)
  }

  const viewingUserName = useMemo(() => {
    return (
      standings.find((s) => s.userId === viewingUserId)?.userName ?? "User"
    )
  }, [standings, viewingUserId])

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">View Predictions:</label>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading users…</div>
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
              Viewing {viewingUserName}&apos;s locked predictions only
            </p>
          )}
        </CardContent>
      </Card>

      <NBABracketView
        viewingUserId={viewingUserId || undefined}
        isViewingOtherUser={isViewingOtherUser}
        viewingUserName={viewingUserName}
        series={series}
        playInGames={playInGames}
        predictions={predictions}
        standingsRows={standings}
        earlyFinalsResponse={earlyFinals}
        loading={loading}
        accountMissingMessage={accountMissingMessage}
        refreshBracketData={fetchBracketBundle}
      />
    </div>
  )
}
