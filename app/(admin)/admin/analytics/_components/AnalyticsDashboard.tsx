"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CompletionHeatmap } from "@/components/analytics/CompletionHeatmap"
import {
  useHeatmapData,
  useTrendData,
  useDistributionData,
  useManagerEffectiveness,
  usePerformersData,
} from "@/hooks/useAnalytics"

// Local tooltip prop shape (avoids Recharts 3.x generic variance issues)
interface ChartTooltip {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | null; color?: string; payload?: Record<string, unknown> }>
  label?: string
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const PALETTE = {
  primary: "#f97316",
  green: "#22c55e",
  amber: "#fbbf24",
  red: "#f87171",
  slate: "#64748b",
}

const DEPT_COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#ef4444",
  "#06b6d4",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground"
  if (score >= 80) return "text-green-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-500"
}

function formatScore(score: number | null): string {
  if (score === null) return "—"
  return score.toFixed(1)
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label }: ChartTooltip) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: p.color ?? PALETTE.primary }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {p.value != null ? `${p.value}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  )
}

function DistPieTooltip({ active, payload }: ChartTooltip) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs">
      <span className="font-medium">{entry.name}</span>
      <span className="text-muted-foreground ml-1.5">{entry.value} goals</span>
    </div>
  )
}

function UomTooltip({ active, payload, label }: ChartTooltip) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground ml-1.5">{payload[0]?.value}</span>
    </div>
  )
}

interface ManagerTooltipEntry {
  managerName: string
  teamSize: number
  Q1: number
  Q2: number
  Q3: number
  Q4: number
  avgCompletion: number
}

function ManagerTooltip({
  active,
  payload,
}: ChartTooltip) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ManagerTooltipEntry | undefined
  if (!d) return null
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground">{d.managerName}</p>
      <p className="text-muted-foreground">Team size: {d.teamSize}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
        {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
          <span key={q} className="text-muted-foreground">
            {q}: <span className="font-medium text-foreground">{d[q]}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnalyticsDashboardProps {
  cycles: { id: string; name: string }[]
  departments: string[]
  defaultCycleId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsDashboard({
  cycles,
  departments,
  defaultCycleId,
}: AnalyticsDashboardProps) {
  const [cycleId, setCycleId] = useState(defaultCycleId)
  const [heatmapDept, setHeatmapDept] = useState("all")
  const [hiddenTrendSeries, setHiddenTrendSeries] = useState<Set<string>>(new Set())
  const [performersTab, setPerformersTab] = useState<"top" | "bottom">("top")

  const heatmap = useHeatmapData(cycleId, heatmapDept)
  const trends = useTrendData(cycleId)
  const distribution = useDistributionData(cycleId)
  const managerEffect = useManagerEffectiveness(cycleId)
  const performers = usePerformersData(cycleId)

  function toggleSeries(name: string) {
    setHiddenTrendSeries((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Build recharts format for trend chart: [{quarter: "Q1", Overall: 72, Sales: 68, ...}]
  const trendChartData = (trends.data?.quarters ?? ["Q1", "Q2", "Q3", "Q4"]).map(
    (q, qi) => {
      const point: Record<string, string | number | null> = { quarter: q }
      for (const s of trends.data?.series ?? []) {
        point[s.name] = s.data[qi] ?? null
      }
      return point
    }
  )

  // Manager effectiveness data with avgCompletion
  const managerData = (managerEffect.data ?? []).map((m) => ({
    ...m,
    avgCompletion: Math.round((m.Q1 + m.Q2 + m.Q3 + m.Q4) / 4),
  }))

  const performerRows =
    performersTab === "top"
      ? (performers.data?.top ?? [])
      : (performers.data?.bottom ?? [])

  return (
    <div className="space-y-6">
      {/* ── Top filter bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={cycleId} onValueChange={(v) => v && setCycleId(v)}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Select cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Section 1: Org Completion Heatmap ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Org Completion Heatmap</CardTitle>
          <CardDescription>
            Goal setting and quarterly check-in completion status per employee.
          </CardDescription>
          <CardAction>
            <Select value={heatmapDept} onValueChange={(v) => v && setHeatmapDept(v)}>
              <SelectTrigger className="h-7 w-44 text-xs">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          {heatmap.isError ? (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              Failed to load.{" "}
              <Button variant="outline" size="sm" onClick={() => heatmap.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <CompletionHeatmap
              employees={heatmap.data?.employees ?? []}
              data={heatmap.data?.data ?? {}}
              isLoading={heatmap.isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: QoQ Achievement Trends ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>QoQ Achievement Trends</CardTitle>
          <CardDescription>
            Average achievement scores by quarter across departments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trends.isError ? (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              Failed to load.{" "}
              <Button variant="outline" size="sm" onClick={() => trends.refetch()}>
                Retry
              </Button>
            </div>
          ) : trends.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (trends.data?.series ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
              No trend data available for this cycle.
            </div>
          ) : (
            <div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendChartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    {(trends.data?.series ?? []).map((s, idx) => {
                      const color = s.isOverall
                        ? PALETTE.primary
                        : DEPT_COLORS[idx % DEPT_COLORS.length]
                      return (
                        <Line
                          key={s.name}
                          type="monotone"
                          dataKey={s.name}
                          stroke={color}
                          strokeWidth={s.isOverall ? 3 : 1.5}
                          dot={false}
                          activeDot={{ r: 4 }}
                          hide={hiddenTrendSeries.has(s.name)}
                          connectNulls
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Clickable legend pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(trends.data?.series ?? []).map((s, idx) => {
                  const color = s.isOverall
                    ? PALETTE.primary
                    : DEPT_COLORS[idx % DEPT_COLORS.length]
                  const hidden = hiddenTrendSeries.has(s.name)
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => toggleSeries(s.name)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-opacity",
                        hidden ? "opacity-40" : "opacity-100"
                      )}
                      style={{ borderColor: color }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3: Distribution charts ────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Thrust Area Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Goals by Thrust Area</CardTitle>
            <CardDescription>Distribution across strategic focus areas.</CardDescription>
          </CardHeader>
          <CardContent>
            {distribution.isError ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                Failed to load.{" "}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => distribution.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : distribution.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (distribution.data?.thrustAreas ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No goals recorded for this cycle.
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution.data?.thrustAreas ?? []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      labelLine={false}
                    >
                      {(distribution.data?.thrustAreas ?? []).map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={DEPT_COLORS[idx % DEPT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DistPieTooltip />} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: UoM Type Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Goals by UoM Type</CardTitle>
            <CardDescription>Count of goals per unit-of-measure type.</CardDescription>
          </CardHeader>
          <CardContent>
            {distribution.isError ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                Failed to load.{" "}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => distribution.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : distribution.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (distribution.data?.uomTypes ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No goals recorded for this cycle.
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={distribution.data?.uomTypes ?? []}
                    margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<UomTooltip />} />
                    <Bar
                      dataKey="value"
                      fill={PALETTE.primary}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 4: Manager Check-in Completion ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Check-in Completion</CardTitle>
          <CardDescription>
            Average quarterly check-in completion rates by manager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managerEffect.isError ? (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              Failed to load.{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={() => managerEffect.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : managerEffect.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : managerData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
              No manager data available for this cycle.
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={managerData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="managerName"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip content={<ManagerTooltip />} />
                  <Bar dataKey="avgCompletion" radius={[4, 4, 0, 0]}>
                    {managerData.map((entry) => (
                      <Cell
                        key={entry.managerId}
                        fill={
                          entry.avgCompletion >= 80
                            ? PALETTE.green
                            : entry.avgCompletion >= 50
                            ? PALETTE.amber
                            : PALETTE.red
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Top & Bottom Performers ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Top &amp; Bottom Performers</CardTitle>
          <CardDescription>
            Employees ranked by average achievement score.
          </CardDescription>
          <CardAction>
            <div className="flex rounded-full border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPerformersTab("top")}
                className={cn(
                  "px-3 py-1 transition-colors",
                  performersTab === "top"
                    ? "bg-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Top 10
              </button>
              <button
                type="button"
                onClick={() => setPerformersTab("bottom")}
                className={cn(
                  "px-3 py-1 transition-colors",
                  performersTab === "bottom"
                    ? "bg-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Bottom 10
              </button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          {performers.isError ? (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              Failed to load.{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={() => performers.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : performers.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                      Employee
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                      Department
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                      Manager
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                      Q1 Score
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                      Q2 Score
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                      Avg Score
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {performerRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No data available.
                      </td>
                    </tr>
                  ) : (
                    performerRows.map((row) => {
                      const trend =
                        row.q1Score !== null && row.q2Score !== null
                          ? row.q2Score > row.q1Score
                            ? "up"
                            : row.q2Score < row.q1Score
                            ? "down"
                            : "flat"
                          : "flat"
                      return (
                        <tr key={row.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.department ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.managerName ?? "—"}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right tabular-nums font-medium",
                              scoreColor(row.q1Score)
                            )}
                          >
                            {formatScore(row.q1Score)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right tabular-nums font-medium",
                              scoreColor(row.q2Score)
                            )}
                          >
                            {formatScore(row.q2Score)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right tabular-nums font-semibold",
                              scoreColor(row.avgScore)
                            )}
                          >
                            {formatScore(row.avgScore)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {trend === "up" ? (
                              <span className="text-green-600 font-bold">&#8593;</span>
                            ) : trend === "down" ? (
                              <span className="text-red-500 font-bold">&#8595;</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
