"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type {
  EarlyFinalsPickRow,
  GameAnalytics,
} from "@/app/api/analytics/route"
import {
  teamPrimaryColorOrFallback,
  type TeamColorLookup,
} from "@/app/lib/teamPrimaryColor"
import { useTeams } from "@/components/teams-provider"

const SERIES_SCORE_KEYS = ["4-0", "4-1", "4-2", "4-3"] as const
type SeriesScoreKey = (typeof SERIES_SCORE_KEYS)[number]

/** Score-grouped “Selected by” for playoff series once locked (deadline passed) or a winner exists — not only after final box score. */
function seriesShowScoreGroupedSelectedBy(game: GameAnalytics) {
  return (
    game.gameType === "series" &&
    (Boolean(game.locked) || Boolean(game.winner))
  )
}

function scoreKeysWithPicks(
  breakdown: NonNullable<GameAnalytics["team1ScoreBreakdown"]>
): SeriesScoreKey[] {
  return SERIES_SCORE_KEYS.filter((k) => (breakdown[k] ?? 0) > 0)
}

/** Tooltip "Selected by" for locked/finished series: grouped by predicted line; legacy picks without line listed separately. */
function seriesPickedByTooltipContent(
  row: AnalyticsChartRow,
  game: GameAnalytics
) {
  const details =
    row.fullName === game.team1
      ? game.team1ScoreDetails
      : row.fullName === game.team2
        ? game.team2ScoreDetails
        : undefined
  if (!details) {
    return row.users.length > 0
      ? row.users.map((u) => u.name).join(", ")
      : "—"
  }

  const lines: { key: string; label: string; names: string }[] = []
  for (const k of SERIES_SCORE_KEYS) {
    const u = details[k]
    if (u?.length) {
      lines.push({
        key: k,
        label: k,
        names: u.map((x) => x.userName).join(", "),
      })
    }
  }

  const accounted = new Set<string>()
  for (const k of SERIES_SCORE_KEYS) {
    for (const u of details[k] || []) accounted.add(u.userId)
  }
  const orphans = row.users.filter((u) => !accounted.has(u.id))
  if (orphans.length) {
    lines.push({
      key: "no-line",
      label: "No line",
      names: orphans.map((u) => u.name).join(", "),
    })
  }

  if (lines.length === 0) {
    return row.users.length > 0
      ? row.users.map((u) => u.name).join(", ")
      : "—"
  }

  return (
    <div className="mt-1 space-y-1 text-left">
      {lines.map(({ key, label, names }) => (
        <div key={key}>
          <span className="font-medium text-card-foreground">{label}:</span>{" "}
          <span>{names}</span>
        </div>
      ))}
    </div>
  )
}

export type AnalyticsViewMode = "list" | "pie" | "columns"

/**
 * Recharts keeps tooltip/active slice in internal state. Remount the chart when the user
 * presses outside this container so the tooltip closes (incl. mobile tap outside).
 */
function useRechartsDismissOnOutsidePress() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const root = containerRef.current
      if (!root) return
      const t = e.target
      if (!(t instanceof Node)) return
      if (!root.contains(t)) {
        setResetKey((k) => k + 1)
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [])

  return { containerRef, resetKey }
}

/**
 * Stops the browser from focusing SVG slice paths on desktop click (avoids a focus ring).
 * Do not call preventDefault() for touch/pen: canceled pointerdown suppresses follow-up events
 * and breaks Recharts slice interaction on mobile.
 */
function suppressPieSectorFocus(e: ReactPointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse") return
  const t = e.target
  if (t instanceof Element && t.closest(".recharts-pie-sector")) {
    e.preventDefault()
  }
}

/** Highlight active slice along the wedge (Recharts default active wrapper reads as a boxy ring). */
function analyticsPieActiveSector(props: unknown) {
  const p = props as Record<string, unknown>
  const outer =
    typeof p.outerRadius === "number" && Number.isFinite(p.outerRadius)
      ? p.outerRadius
      : 0
  return (
    <Sector
      {...(p as ComponentProps<typeof Sector>)}
      outerRadius={outer + 8}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  )
}

function truncateLabel(s: string, max = 22) {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

type PickUser = { id: string; name: string }

type AnalyticsChartRow = {
  name: string
  fullName: string
  value: number
  users: PickUser[]
}

function gameToRows(game: GameAnalytics): AnalyticsChartRow[] {
  return [
    {
      name: truncateLabel(game.team1),
      fullName: game.team1,
      value: game.team1Count,
      users: game.team1Users,
    },
    {
      name: truncateLabel(game.team2),
      fullName: game.team2,
      value: game.team2Count,
      users: game.team2Users,
    },
  ]
}

function earlyFinalsToRows(picks: EarlyFinalsPickRow[]): AnalyticsChartRow[] {
  return picks.map((p) => ({
    name: truncateLabel(p.teamName),
    fullName: p.teamName,
    value: p.count,
    users: p.users,
  }))
}

function AnalyticsPickTooltip({
  active,
  payload,
  total,
  pickedByLabel,
  game,
}: {
  active?: boolean
  /** Recharts marks nested `payload` optional; we narrow at runtime. */
  payload?: ReadonlyArray<{ payload?: AnalyticsChartRow }>
  total: number
  pickedByLabel: string
  /** When set and the series is locked or has a winner, "Selected by" is grouped by predicted score line. */
  game?: GameAnalytics
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
  const useScoreGroups = Boolean(game && seriesShowScoreGroupedSelectedBy(game))

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-md max-w-[min(100vw-2rem,320px)]">
      <p className="font-semibold leading-snug">{row.fullName}</p>
      <p className="text-muted-foreground text-xs mt-1">
        {row.value} ({pct}%)
      </p>
      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
        <div className="font-medium text-card-foreground">{pickedByLabel}</div>
        {useScoreGroups && game ? (
          seriesPickedByTooltipContent(row, game)
        ) : row.users.length > 0 ? (
          <span className="mt-1 block">{row.users.map((u) => u.name).join(", ")}</span>
        ) : (
          <span className="mt-1 block">—</span>
        )}
      </div>
    </div>
  )
}

function ChartEmpty() {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      No predictions yet.
    </p>
  )
}

/** HTML legend under the pie — wraps on narrow screens (SVG slice labels clip on mobile). */
function AnalyticsPieLegendRows({
  rows,
  getTeamByName,
}: {
  rows: AnalyticsChartRow[]
  getTeamByName: TeamColorLookup
}) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <ul className="flex w-full min-w-0 flex-wrap justify-center gap-x-3 gap-y-2 px-1 pb-0.5 pt-2 text-xs">
      {rows.map((row, i) => {
        const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
        const color = teamPrimaryColorOrFallback(
          row.fullName,
          getTeamByName,
          i
        )
        return (
          <li
            key={`${row.fullName}-${i}`}
            className="flex max-w-[min(100%,12rem)] items-start gap-1.5 sm:max-w-[15rem]"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="min-w-0 break-words text-left leading-snug text-foreground">
              {row.fullName} ({pct}%)
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function GameAnalyticsWinnerPie({ game }: { game: GameAnalytics }) {
  const { getTeamByName } = useTeams()
  const { containerRef, resetKey } = useRechartsDismissOnOutsidePress()
  if (game.totalPredictions === 0) return <ChartEmpty />
  const data = gameToRows(game)
  return (
    <div ref={containerRef} className="flex w-full min-w-0 flex-col">
      <div
        className="h-[200px] min-h-[200px] w-full shrink-0 [&_*]:outline-none"
        onPointerDownCapture={suppressPieSectorFocus}
      >
        <ResponsiveContainer key={resetKey} width="100%" height="100%">
          <PieChart
            accessibilityLayer={false}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            tabIndex={-1}
          >
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="78%"
              paddingAngle={1}
              label={false}
              isAnimationActive={false}
              activeShape={analyticsPieActiveSector}
            >
              {data.map((row, i) => (
                <Cell
                  key={i}
                  fill={teamPrimaryColorOrFallback(row.fullName, getTeamByName, i)}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => (
                <AnalyticsPickTooltip
                  active={active}
                  payload={payload}
                  total={game.totalPredictions}
                  pickedByLabel="Selected by"
                  game={game}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <AnalyticsPieLegendRows rows={data} getTeamByName={getTeamByName} />
    </div>
  )
}

export function GameAnalyticsWinnerColumns({ game }: { game: GameAnalytics }) {
  const { getTeamByName } = useTeams()
  const { containerRef, resetKey } = useRechartsDismissOnOutsidePress()
  if (game.totalPredictions === 0) return <ChartEmpty />
  const data = gameToRows(game)
  return (
    <div ref={containerRef} className="w-full h-[280px] min-h-[280px]">
      <ResponsiveContainer key={resetKey} width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={56}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={({ active, payload }) => (
              <AnalyticsPickTooltip
                active={active}
                payload={payload}
                total={game.totalPredictions}
                pickedByLabel="Selected by"
                game={game}
              />
            )}
          />
          <Bar dataKey="value" name="Picks" radius={[4, 4, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={teamPrimaryColorOrFallback(row.fullName, getTeamByName, i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EarlyFinalsPie({ picks }: { picks: EarlyFinalsPickRow[] }) {
  const { getTeamByName } = useTeams()
  const { containerRef, resetKey } = useRechartsDismissOnOutsidePress()
  const total = picks.reduce((s, p) => s + p.count, 0)
  if (total === 0) return <ChartEmpty />
  const data = earlyFinalsToRows(picks)
  return (
    <div ref={containerRef} className="flex w-full min-w-0 flex-col">
      <div
        className="h-[220px] min-h-[220px] w-full shrink-0 [&_*]:outline-none"
        onPointerDownCapture={suppressPieSectorFocus}
      >
        <ResponsiveContainer key={resetKey} width="100%" height="100%">
          <PieChart
            accessibilityLayer={false}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            tabIndex={-1}
          >
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="78%"
              paddingAngle={0.5}
              label={false}
              isAnimationActive={false}
              activeShape={analyticsPieActiveSector}
            >
              {data.map((row, i) => (
                <Cell
                  key={i}
                  fill={teamPrimaryColorOrFallback(row.fullName, getTeamByName, i)}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => (
                <AnalyticsPickTooltip
                  active={active}
                  payload={payload}
                  total={total}
                  pickedByLabel="Selected by"
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <AnalyticsPieLegendRows rows={data} getTeamByName={getTeamByName} />
    </div>
  )
}

export function EarlyFinalsColumns({ picks }: { picks: EarlyFinalsPickRow[] }) {
  const { getTeamByName } = useTeams()
  const { containerRef, resetKey } = useRechartsDismissOnOutsidePress()
  const total = picks.reduce((s, p) => s + p.count, 0)
  if (total === 0) return <ChartEmpty />
  const data = earlyFinalsToRows(picks)
  return (
    <div ref={containerRef} className="w-full h-[300px] min-h-[300px]">
      <ResponsiveContainer key={resetKey} width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 64 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={72}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={({ active, payload }) => (
              <AnalyticsPickTooltip
                active={active}
                payload={payload}
                total={total}
                pickedByLabel="Selected by"
              />
            )}
          />
          <Bar dataKey="value" name="Picks" radius={[4, 4, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={teamPrimaryColorOrFallback(row.fullName, getTeamByName, i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
