"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LockCountdown } from "@/components/bracket/LockCountdown"
import { cn } from "@/app/lib/utils/cn"
import type { ShamingApiResponse, ShamingItem } from "@/app/lib/shaming/types"

function formatPlayInGameType(gameType: string): string {
  return gameType
    .split("-")
    .map((part) => part.replace(/^\w/, (c) => c.toUpperCase()))
    .join(" ")
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

function MissingPredictionCount({ count }: { count: number }) {
  return (
    <p className="text-sm font-medium tabular-nums text-foreground">
      {count === 1
        ? "1 user without a prediction"
        : `${count} users without a prediction`}
    </p>
  )
}

function ShamingMissingNameList({
  users,
  currentUserId,
}: {
  users: { userId: string; userName: string }[]
  currentUserId: string | undefined
}) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {users.map((u) => {
        const isYou = !!currentUserId && u.userId === currentUserId
        return (
          <li
            key={u.userId}
            className={cn(
              isYou &&
                "relative -ml-[1.125rem] list-none pl-[1.125rem] rounded-md bg-primary/10 py-0.5 pr-2 dark:bg-primary/15 border-l-2 border-l-primary font-semibold"
            )}
            data-current-user={isYou || undefined}
          >
            <span className={cn("font-medium", isYou && "font-semibold")}>
              {u.userName}
              {isYou && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (you)
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function ShamingItemCard({
  item,
  currentUserId,
}: {
  item: ShamingItem
  currentUserId: string | undefined
}) {
  if (item.kind === "earlyFinals") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{item.label}</CardTitle>
          <MissingPredictionCount count={item.missingUsers.length} />
          {item.locksAt && (
            <p className="text-sm text-muted-foreground">
              Locks {formatWhen(item.locksAt)}
            </p>
          )}
          {item.locksAt && (
            <LockCountdown lockAt={item.locksAt} className="mt-1 justify-start" />
          )}
        </CardHeader>
        <CardContent>
          <ShamingMissingNameList
            users={item.missingUsers}
            currentUserId={currentUserId}
          />
        </CardContent>
      </Card>
    )
  }

  if (item.kind === "playIn") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{item.label}</CardTitle>
          <MissingPredictionCount count={item.missingUsers.length} />
          <p className="text-sm text-muted-foreground">
            Play-In · {formatPlayInGameType(item.gameType)} · locks{" "}
            {formatWhen(item.startTime)}
          </p>
          <LockCountdown lockAt={item.startTime} className="mt-1 justify-start" />
        </CardHeader>
        <CardContent>
          <ShamingMissingNameList
            users={item.missingUsers}
            currentUserId={currentUserId}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{item.label}</CardTitle>
        <MissingPredictionCount count={item.missingUsers.length} />
        <p className="text-sm text-muted-foreground">
          {item.roundLabel} · locks {formatWhen(item.startTime)}
        </p>
        <LockCountdown lockAt={item.startTime} className="mt-1 justify-start" />
      </CardHeader>
      <CardContent>
        <ShamingMissingNameList
          users={item.missingUsers}
          currentUserId={currentUserId}
        />
      </CardContent>
    </Card>
  )
}

export function ShamingClient() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const [data, setData] = useState<ShamingApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/shaming", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) {
            setError("Could not load the list.")
            setData(null)
          }
          return
        }
        const json = (await res.json()) as ShamingApiResponse
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch {
        if (!cancelled) {
          setError("Could not load the list.")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Shaming
        </h1>
        <p className="text-sm text-muted-foreground">
          Registered users who still haven’t submitted a pick for each{" "}
          <strong>open</strong> prediction (before lock). Only matchups you can
          still predict are listed.
        </p>
        <p
          className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
          role="note"
        >
          <strong className="font-semibold">Reminder:</strong> if you don’t
          submit a prediction before it locks, you score{" "}
          <strong>0 points</strong> for that game or series (including early
          finals).
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing to show — either everyone is caught up, no predictions are
          open right now, or there’s no active season.
        </p>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((item) => (
            <ShamingItemCard
              key={itemKey(item)}
              item={item}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function itemKey(item: ShamingItem): string {
  if (item.kind === "earlyFinals") return item.id
  return `${item.kind}-${item.id}`
}
