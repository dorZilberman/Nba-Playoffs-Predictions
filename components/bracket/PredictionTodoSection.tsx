"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { LockCountdown } from "@/components/bracket/LockCountdown"
import { isPredictionSlotOpen } from "@/app/lib/admin/userRoundCompletion"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"
import type { RoundType } from "@/app/lib/models/Series"
import { cn } from "@/app/lib/utils/cn"

const ROUND_LABEL: Record<RoundType, string> = {
  first: "First round",
  second: "Second round",
  conference: "Conference finals",
  finals: "NBA Finals",
}

const ROUND_ORDER: RoundType[] = [
  "first",
  "second",
  "conference",
  "finals",
]

type EarlyFinalsTodoPayload = {
  seasonId: string | null
  playoffsStartTime: string | null
  locked: boolean
  prediction: {
    eastFinalist: string
    westFinalist: string
    nbaChampion: string
  } | null
}

function refId(
  ref: unknown
): string | null {
  if (ref == null) return null
  if (typeof ref === "string") return ref
  if (typeof ref === "object" && "_id" in ref && (ref as { _id: unknown })._id != null) {
    return String((ref as { _id: unknown })._id)
  }
  return String(ref)
}

function formatPlayInGameType(gameType: string): string {
  return gameType
    .split("-")
    .map((part) => part.replace(/^\w/, (c) => c.toUpperCase()))
    .join(" ")
}

function formatSeriesPrediction(p: IPrediction): string {
  const w = p.predictedWinner
  const sc = p.predictedScore
  if (sc && typeof sc.team1Wins === "number" && typeof sc.team2Wins === "number") {
    return `${w} (${sc.team1Wins}-${sc.team2Wins})`
  }
  return w
}

type TodoRow = {
  key: string
  kind: "earlyFinals" | "playIn" | "series"
  title: string
  subtitle?: string
  lockAt: string | null
  done: boolean
  detail: string | null
}

/** Classic todo list marker: empty ring, or filled circle with check. */
function TodoListCircle({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm ring-2 ring-green-600/30 dark:bg-green-600 dark:ring-green-500/40">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  return (
    <span
      className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-muted-foreground/40 bg-background"
      aria-hidden
    />
  )
}

export interface PredictionTodoSectionProps {
  series: ISeries[]
  playInGames: IPlayInGame[]
  predictions: IPrediction[]
  loading: boolean
  enabled: boolean
  /** Bump after early-finals save so this section refetches `/api/early-finals`. */
  earlyFinalsRefreshKey: number
}

export function PredictionTodoSection({
  series,
  playInGames,
  predictions,
  loading: parentLoading,
  enabled,
  earlyFinalsRefreshKey,
}: PredictionTodoSectionProps) {
  const [now, setNow] = useState(() => new Date())
  const [earlyData, setEarlyData] = useState<EarlyFinalsTodoPayload | null>(null)
  const [earlyLoading, setEarlyLoading] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const fetchEarlyFinals = useCallback(async () => {
    if (!enabled) {
      setEarlyData(null)
      setEarlyLoading(false)
      return
    }
    setEarlyLoading(true)
    try {
      const res = await fetch("/api/early-finals", { cache: "no-store" })
      if (!res.ok) {
        setEarlyData(null)
        return
      }
      const json = (await res.json()) as EarlyFinalsTodoPayload
      setEarlyData(json)
    } catch {
      setEarlyData(null)
    } finally {
      setEarlyLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetchEarlyFinals()
  }, [fetchEarlyFinals, earlyFinalsRefreshKey])

  const rows = useMemo((): TodoRow[] => {
    const out: TodoRow[] = []

    if (earlyData?.seasonId && !earlyData.locked) {
      const pred = earlyData.prediction
      out.push({
        key: "early-finals",
        kind: "earlyFinals",
        title: "Early finals (conference finalists + champion)",
        lockAt: earlyData.playoffsStartTime,
        done: pred != null,
        detail: pred
          ? `East: ${pred.eastFinalist} · West: ${pred.westFinalist} · Champion: ${pred.nbaChampion}`
          : null,
      })
    }

    const openPlayIn = [...playInGames]
      .filter((g) =>
        isPredictionSlotOpen(
          g.team1,
          g.team2,
          g.winner,
          new Date(g.startTime),
          now
        )
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )

    for (const g of openPlayIn) {
      const gid = String(g._id)
      const pred = predictions.find(
        (p) => refId(p.playInGameId) === gid
      )
      out.push({
        key: `playin-${gid}`,
        kind: "playIn",
        title: `${g.team1} vs ${g.team2}`,
        subtitle: `Play-In · ${formatPlayInGameType(g.gameType)}`,
        lockAt: new Date(g.startTime).toISOString(),
        done: pred != null,
        detail: pred != null ? `Winner: ${pred.predictedWinner}` : null,
      })
    }

    for (const round of ROUND_ORDER) {
      const openInRound = series
        .filter((s) => s.round === round)
        .filter((s) =>
          isPredictionSlotOpen(
            s.team1,
            s.team2,
            s.winner,
            new Date(s.startTime),
            now
          )
        )
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )

      for (const s of openInRound) {
        const sid = String(s._id)
        const pred = predictions.find((p) => refId(p.seriesId) === sid)
        out.push({
          key: `series-${sid}`,
          kind: "series",
          title: `${s.team1} vs ${s.team2}`,
          subtitle: ROUND_LABEL[s.round],
          lockAt: new Date(s.startTime).toISOString(),
          done: pred != null,
          detail: pred != null ? formatSeriesPrediction(pred) : null,
        })
      }
    }

    return out
  }, [earlyData, playInGames, predictions, series, now])

  const loading = parentLoading || earlyLoading

  if (!enabled) {
    return null
  }

  return (
    <CollapsibleSection title="To Do" defaultOpen>
      {loading ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          No open predictions right now — you&apos;re all caught up for available
          slots, or nothing is open yet.
        </p>
      ) : (
        <div className="px-4 pb-4 md:px-6">
          {rows.some((r) => !r.done) ? (
            <p className="mb-3 text-xs text-muted-foreground">
              An empty circle means you haven&apos;t saved a pick yet, fill it before
              the deadline.
            </p>
          ) : null}
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex gap-3 py-3 first:pt-0"
                aria-label={
                  row.done
                    ? `${row.title}, prediction saved`
                    : `${row.title}, pick not saved yet`
                }
              >
                <TodoListCircle done={row.done} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-medium leading-snug text-foreground">
                    {row.title}
                  </p>
                  {row.subtitle ? (
                    <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                  ) : null}
                  {row.lockAt ? (
                    <LockCountdown
                      lockAt={row.lockAt}
                      className="justify-start"
                    />
                  ) : null}
                  {row.detail ? (
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        row.done ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {row.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CollapsibleSection>
  )
}
