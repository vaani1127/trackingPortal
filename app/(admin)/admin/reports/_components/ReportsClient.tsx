"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CheckCircle2,
  Clock,
  XCircle,
  Minus,
  Download,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { scoreToColor } from "@/lib/scoring"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AchievementRow {
  employeeId: string
  employeeName: string
  department: string
  thrustArea: string
  title: string
  uomType: string
  targetValue: number | null
  weightage: number
  q1Actual: number | null; q1Score: number | null
  q2Actual: number | null; q2Score: number | null
  q3Actual: number | null; q3Score: number | null
  q4Actual: number | null; q4Score: number | null
  progressStatus: string
}

type PhaseStatus = "done" | "partial" | "missing" | "na"

interface CompletionEmployee {
  employeeId: string
  employeeName: string
  department: string | null
  managerName: string | null
  managerId: string | null
  goalSetting: PhaseStatus
  Q1: PhaseStatus
  Q2: PhaseStatus
  Q3: PhaseStatus
  Q4: PhaseStatus
}

interface ManagerSummary {
  managerId: string
  managerName: string
  teamSize: number
  goalSettingPct: number
  q1Pct: number
  q2Pct: number
  q3Pct: number
  q4Pct: number
}

interface ReportsClientProps {
  cycles: { id: string; name: string }[]
  departments: string[]
  managers: { id: string; name: string }[]
  defaultCycleId: string
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const
const PAGE_SIZE = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: PhaseStatus }) {
  if (status === "done")
    return <span className="flex justify-center"><CheckCircle2 className="size-4 text-green-600" /></span>
  if (status === "partial")
    return <span className="flex justify-center"><Clock className="size-4 text-amber-500" /></span>
  if (status === "missing")
    return <span className="flex justify-center"><XCircle className="size-4 text-red-500" /></span>
  return <span className="flex justify-center"><Minus className="size-3 text-muted-foreground" /></span>
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn("tabular-nums font-medium", scoreToColor(score))}>
      {score.toFixed(0)}
    </span>
  )
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

// ─── Achievement tab ──────────────────────────────────────────────────────────

function AchievementTab({
  cycles,
  departments,
  defaultCycleId,
}: {
  cycles: { id: string; name: string }[]
  departments: string[]
  defaultCycleId: string
}) {
  const [cycleId, setCycleId] = useState(defaultCycleId)
  useEffect(() => { setCycleId(defaultCycleId) }, [defaultCycleId])
  const [selectedQuarters, setSelectedQuarters] = useState<Set<string>>(new Set())
  const [department, setDepartment] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ type: "achievement", cycleId })
  if (department !== "all") params.set("department", department)

  const { data, isFetching } = useQuery<{ rows: AchievementRow[] }>({
    queryKey: ["achievement-report", cycleId, department],
    queryFn: () => fetch(`/api/admin/reports?${params}`).then((r) => r.json()),
    enabled: !!cycleId,
    staleTime: 60_000,
  })

  const allRows = data?.rows ?? []

  const filtered = useMemo(() => {
    let rows = allRows
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.thrustArea.toLowerCase().includes(q)
      )
    }
    if (selectedQuarters.size > 0) {
      rows = rows.filter((r) => {
        for (const q of selectedQuarters) {
          const score = q === "Q1" ? r.q1Score : q === "Q2" ? r.q2Score : q === "Q3" ? r.q3Score : r.q4Score
          if (score !== null) return true
        }
        return false
      })
    }
    return rows
  }, [allRows, search, selectedQuarters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Summary row: avg of non-null scores
  const summary = useMemo(() => {
    const avg = (vals: (number | null)[]) => {
      const nums = vals.filter((v): v is number => v !== null)
      return nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : null
    }
    return {
      q1: avg(filtered.map((r) => r.q1Score)),
      q2: avg(filtered.map((r) => r.q2Score)),
      q3: avg(filtered.map((r) => r.q3Score)),
      q4: avg(filtered.map((r) => r.q4Score)),
    }
  }, [filtered])

  function handleExport(format: "xlsx" | "csv") {
    const ep = new URLSearchParams({ format, cycleId })
    if (department !== "all") ep.set("department", department)
    window.location.href = `/api/admin/reports/export?${ep}`
  }

  function toggleQuarter(q: string) {
    setSelectedQuarters((prev) => {
      const next = new Set(prev)
      next.has(q) ? next.delete(q) : next.add(q)
      return next
    })
    setPage(1)
  }

  const quarterLabel =
    selectedQuarters.size === 0
      ? "All quarters"
      : selectedQuarters.size === 4
      ? "All quarters"
      : [...selectedQuarters].join(", ")

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={cycleId} onValueChange={(v) => { if (v) { setCycleId(v); setPage(1) } }}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Select cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Multi-quarter filter */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
              selectedQuarters.size > 0
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-input bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            <Filter className="size-3" />
            {quarterLabel}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-2 space-y-1">
            {QUARTERS.map((q) => (
              <label key={q} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedQuarters.has(q)}
                  onChange={() => toggleQuarter(q)}
                  className="accent-orange-500"
                />
                {q}
              </label>
            ))}
            {selectedQuarters.size > 0 && (
              <button
                onClick={() => { setSelectedQuarters(new Set()); setPage(1) }}
                className="w-full text-left px-1 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </PopoverContent>
        </Popover>

        <Select value={department} onValueChange={(v) => { if (v) { setDepartment(v); setPage(1) } }}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee / goal…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-8 pl-7 pr-2 rounded-md border border-input bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>

        {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleExport("xlsx")}>
            <Download className="size-3" />
            Excel
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleExport("csv")}>
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Dept</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Thrust Area</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">KPI Title</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">UoM</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Target</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q1 Act</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q1 Sc</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q2 Act</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q2 Sc</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q3 Act</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q3 Sc</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q4 Act</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Q4 Sc</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center py-8 text-muted-foreground">
                  {isFetching ? "Loading…" : "No data for selected filters."}
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{row.employeeName}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.department}</td>
                <td className="px-3 py-2">{row.thrustArea}</td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={row.title}>{row.title}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.uomType}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.targetValue ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.q1Actual ?? "—"}</td>
                <td className="px-3 py-2 text-right"><ScoreCell score={row.q1Score} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{row.q2Actual ?? "—"}</td>
                <td className="px-3 py-2 text-right"><ScoreCell score={row.q2Score} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{row.q3Actual ?? "—"}</td>
                <td className="px-3 py-2 text-right"><ScoreCell score={row.q3Score} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{row.q4Actual ?? "—"}</td>
                <td className="px-3 py-2 text-right"><ScoreCell score={row.q4Score} /></td>
              </tr>
            ))}
          </tbody>
          {/* Summary row */}
          {filtered.length > 0 && (
            <tfoot className="bg-muted/60 border-t-2">
              <tr>
                <td colSpan={7} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Avg score ({filtered.length} KPIs)
                </td>
                <td className="px-3 py-2 text-right"><ScoreCell score={summary.q1} /></td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right"><ScoreCell score={summary.q2} /></td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right"><ScoreCell score={summary.q3} /></td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right"><ScoreCell score={summary.q4} /></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length} row{filtered.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Completion tab ───────────────────────────────────────────────────────────

function CompletionTab({
  cycles,
  departments,
  managers,
  defaultCycleId,
}: {
  cycles: { id: string; name: string }[]
  departments: string[]
  managers: { id: string; name: string }[]
  defaultCycleId: string
}) {
  const [cycleId, setCycleId] = useState(defaultCycleId)
  useEffect(() => { setCycleId(defaultCycleId) }, [defaultCycleId])
  const [department, setDepartment] = useState("all")
  const [managerId, setManagerId] = useState("all")

  const params = new URLSearchParams({ cycleId })
  if (department !== "all") params.set("department", department)
  if (managerId !== "all") params.set("managerId", managerId)

  const { data, isFetching, dataUpdatedAt, refetch } = useQuery<{
    employees: CompletionEmployee[]
    managerSummaries: ManagerSummary[]
  }>({
    queryKey: ["completion-dashboard", cycleId, department, managerId],
    queryFn: () => fetch(`/api/reports/completion?${params}`).then((r) => r.json()),
    enabled: !!cycleId,
    refetchInterval: 60_000,
  })

  const employees = data?.employees ?? []
  const managerSummaries = data?.managerSummaries ?? []

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  // Aggregate cards
  const total = employees.length
  const pct = (status: PhaseStatus, key: keyof CompletionEmployee) =>
    total === 0 ? 0 : Math.round((employees.filter((e) => e[key] === status).length / total) * 100)

  const gsComplete = pct("done", "goalSetting")
  const q1Complete = pct("done", "Q1")
  const q2Complete = pct("done", "Q2")
  const q3Complete = pct("done", "Q3")
  const q4Complete = pct("done", "Q4")

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={cycleId} onValueChange={(v) => v && setCycleId(v)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Select cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={department} onValueChange={(v) => v && setDepartment(v)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={managerId} onValueChange={(v) => v && setManagerId(v)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All managers</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {lastUpdated && !isFetching && (
            <span className="text-xs text-muted-foreground">Updated {lastUpdated}</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate cards */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Goal Setting", pct: gsComplete },
            { label: "Q1", pct: q1Complete },
            { label: "Q2", pct: q2Complete },
            { label: "Q3", pct: q3Complete },
            { label: "Q4", pct: q4Complete },
          ].map(({ label, pct: p }) => (
            <div key={label} className="rounded-lg border bg-card p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                p >= 80 ? "text-green-600" : p >= 50 ? "text-amber-600" : "text-red-500"
              )}>
                {p}%
              </p>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", p >= 80 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-400")}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-green-600" /> Done</span>
        <span className="flex items-center gap-1"><Clock className="size-3.5 text-amber-500" /> Partial</span>
        <span className="flex items-center gap-1"><XCircle className="size-3.5 text-red-500" /> Missing</span>
        <span className="flex items-center gap-1"><Minus className="size-3 text-muted-foreground" /> N/A</span>
        <span className="text-xs text-muted-foreground ml-auto">Auto-refreshes every 60 s</span>
      </div>

      {/* Employee grid */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground min-w-[160px]">Employee</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Department</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Manager</th>
              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Goal Setting</th>
              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Q1</th>
              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Q2</th>
              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Q3</th>
              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Q4</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  {isFetching ? "Loading…" : "No employees for selected filters."}
                </td>
              </tr>
            )}
            {employees.map((row) => (
              <tr key={row.employeeId} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{row.employeeName}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{row.department ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{row.managerName ?? "—"}</td>
                <td className="px-3 py-2"><StatusCell status={row.goalSetting} /></td>
                <td className="px-3 py-2"><StatusCell status={row.Q1} /></td>
                <td className="px-3 py-2"><StatusCell status={row.Q2} /></td>
                <td className="px-3 py-2"><StatusCell status={row.Q3} /></td>
                <td className="px-3 py-2"><StatusCell status={row.Q4} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manager summary */}
      {managerSummaries.length > 0 && managerId === "all" && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Manager Team Completion</h3>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Manager</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Team</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Goal Setting</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Q1</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Q2</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Q3</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Q4</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {managerSummaries.map((m) => (
                  <tr key={m.managerId} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{m.managerName}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{m.teamSize}</td>
                    <td className="px-3 py-2 min-w-[120px]"><PctBar pct={m.goalSettingPct} /></td>
                    <td className="px-3 py-2 min-w-[120px]"><PctBar pct={m.q1Pct} /></td>
                    <td className="px-3 py-2 min-w-[120px]"><PctBar pct={m.q2Pct} /></td>
                    <td className="px-3 py-2 min-w-[120px]"><PctBar pct={m.q3Pct} /></td>
                    <td className="px-3 py-2 min-w-[120px]"><PctBar pct={m.q4Pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {employees.length} employee{employees.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportsClient({
  cycles,
  departments,
  managers,
  defaultCycleId,
}: ReportsClientProps) {
  const [tab, setTab] = useState<"achievement" | "completion">("achievement")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {(["achievement", "completion"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "achievement" ? "Achievement Report" : "Completion Dashboard"}
          </button>
        ))}
      </div>

      {tab === "achievement" ? (
        <AchievementTab
          cycles={cycles}
          departments={departments}
          defaultCycleId={defaultCycleId}
        />
      ) : (
        <CompletionTab
          cycles={cycles}
          departments={departments}
          managers={managers}
          defaultCycleId={defaultCycleId}
        />
      )}
    </div>
  )
}
