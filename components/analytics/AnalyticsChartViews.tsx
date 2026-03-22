"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type {
  EarlyFinalsPickRow,
  GameAnalytics,
} from "@/app/api/analytics/route"
import { useTeams } from "@/components/teams-provider"

export type AnalyticsViewMode = "list" | "pie" | "columns"

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(221.2 83.2% 53.3%)",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
  "hsl(199 89% 48%)",
  "hsl(24 95% 53%)",
]

const HEX_PRIMARY = /^#[0-9A-Fa-f]{6}$/

function fillForTeamName(
  teamName: string,
  getTeamByName: (name: string) => { primaryColor?: string } | null,
  fallbackIndex: number
): string {
  const hex = getTeamByName(teamName)?.primaryColor
  if (hex && HEX_PRIMARY.test(hex)) return hex
  return CHART_COLORS[fallbackIndex % CHART_COLORS.length]
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
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload: AnalyticsChartRow }>
  total: number
  pickedByLabel: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-md max-w-[min(100vw-2rem,320px)]">
      <p className="font-semibold leading-snug">{row.fullName}</p>
      <p className="text-muted-foreground text-xs mt-1">
        {row.value} ({pct}%)
      </p>
      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
        <span className="font-medium text-card-foreground">
          {pickedByLabel}:{" "}
        </span>
        {row.users.length > 0
          ? row.users.map((u) => u.name).join(", ")
          : "—"}
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

export function GameAnalyticsWinnerPie({ game }: { game: GameAnalytics }) {
  const { getTeamByName } = useTeams()
  if (game.totalPredictions === 0) return <ChartEmpty />
  const data = gameToRows(game)
  return (
    <div className="w-full h-[260px] min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            paddingAngle={1}
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={fillForTeamName(row.fullName, getTeamByName, i)}
              />
            ))}
          </Pie>
          <Tooltip
            content={(props) => (
              <AnalyticsPickTooltip
                {...props}
                total={game.totalPredictions}
                pickedByLabel="Selected by"
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GameAnalyticsWinnerColumns({ game }: { game: GameAnalytics }) {
  const { getTeamByName } = useTeams()
  if (game.totalPredictions === 0) return <ChartEmpty />
  const data = gameToRows(game)
  return (
    <div className="w-full h-[280px] min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
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
            content={(props) => (
              <AnalyticsPickTooltip
                {...props}
                total={game.totalPredictions}
                pickedByLabel="Selected by"
              />
            )}
          />
          <Bar dataKey="value" name="Picks" radius={[4, 4, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={fillForTeamName(row.fullName, getTeamByName, i)}
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
  const total = picks.reduce((s, p) => s + p.count, 0)
  if (total === 0) return <ChartEmpty />
  const data = earlyFinalsToRows(picks)
  return (
    <div className="w-full h-[280px] min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            paddingAngle={0.5}
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={fillForTeamName(row.fullName, getTeamByName, i)}
              />
            ))}
          </Pie>
          <Tooltip
            content={(props) => (
              <AnalyticsPickTooltip
                {...props}
                total={total}
                pickedByLabel="Picked by"
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EarlyFinalsColumns({ picks }: { picks: EarlyFinalsPickRow[] }) {
  const { getTeamByName } = useTeams()
  const total = picks.reduce((s, p) => s + p.count, 0)
  if (total === 0) return <ChartEmpty />
  const data = earlyFinalsToRows(picks)
  return (
    <div className="w-full h-[300px] min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
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
            content={(props) => (
              <AnalyticsPickTooltip
                {...props}
                total={total}
                pickedByLabel="Picked by"
              />
            )}
          />
          <Bar dataKey="value" name="Picks" radius={[4, 4, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={fillForTeamName(row.fullName, getTeamByName, i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
