"use client"

import { useState, useMemo, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { AlertTriangle, Play, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EscalationRow {
  id: string
  type: string
  status: string
  quarter: string | null
  notificationCount: number
  triggeredAt: string
  resolvedAt: string | null
  employeeName: string
  employeeDept: string | null
  managerName: string
  cycleName: string
}

interface EscalationsClientProps {
  escalations: EscalationRow[]
  openCount: number
  resolvedCount: number
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  goal_not_submitted: "Goal Not Submitted",
  goal_not_approved: "Goal Not Approved",
  checkin_missed: "Check-in Missed",
}

const TYPE_COLORS: Record<string, string> = {
  goal_not_submitted: "bg-red-100 text-red-700",
  goal_not_approved: "bg-amber-100 text-amber-700",
  checkin_missed: "bg-blue-100 text-blue-700",
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
      <div className={cn("rounded-lg p-2.5", color)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EscalationsClient({
  escalations: initial,
  openCount,
  resolvedCount,
}: EscalationsClientProps) {
  const [escalations, setEscalations] = useState(initial)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isRunning, startRunning] = useTransition()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<{ triggered: number; autoResolved: number } | null>(null)

  const currentOpenCount = escalations.filter((e) => e.status === "open").length
  const currentResolvedCount = escalations.filter((e) => e.status === "resolved").length

  const filtered = useMemo(() => {
    return escalations.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false
      if (typeFilter !== "all" && e.type !== typeFilter) return false
      return true
    })
  }, [escalations, statusFilter, typeFilter])

  function handleRunCheck() {
    startRunning(async () => {
      const res = await fetch("/api/escalations/check", { method: "POST" })
      if (!res.ok) {
        toast.error("Escalation check failed")
        return
      }
      const data = await res.json() as { triggered: number; autoResolved: number; results: unknown[] }
      setCheckResult({ triggered: data.triggered, autoResolved: data.autoResolved })
      toast.success(
        `Check complete: ${data.triggered} triggered, ${data.autoResolved} auto-resolved`
      )
      // Reload page data
      window.location.reload()
    })
  }

  async function handleResolve(id: string, employeeName: string) {
    setResolvingId(id)
    try {
      const res = await fetch(`/api/escalations/${id}`, { method: "PATCH" })
      if (!res.ok) {
        toast.error("Failed to resolve escalation")
        return
      }
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: "resolved", resolvedAt: new Date().toISOString() }
            : e
        )
      )
      toast.success(`Resolved escalation for ${employeeName}`)
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={AlertTriangle} label="Open escalations" value={currentOpenCount} color="bg-red-50 text-red-600" />
        <StatCard icon={CheckCircle2} label="Resolved" value={currentResolvedCount} color="bg-green-50 text-green-600" />
        <StatCard icon={Clock} label="Total logged" value={escalations.length} color="bg-slate-100 text-slate-600" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="goal_not_submitted">Goal Not Submitted</SelectItem>
            <SelectItem value="goal_not_approved">Goal Not Approved</SelectItem>
            <SelectItem value="checkin_missed">Check-in Missed</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {checkResult && (
            <span className="text-xs text-muted-foreground">
              Last run: {checkResult.triggered} triggered · {checkResult.autoResolved} resolved
            </span>
          )}
          <Button
            size="sm"
            onClick={handleRunCheck}
            disabled={isRunning}
            className="h-8 gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            {isRunning ? "Running…" : "Run Escalation Check"}
          </Button>
        </div>
      </div>

      {/* Vercel cron note */}
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
        <RefreshCw className="size-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Automatic daily checks run at 09:00 UTC via Vercel Cron
          (<code className="font-mono">0 9 * * *</code>).
          Use the button above to trigger a manual check.
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Manager</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Triggered</th>
              <th className="text-center px-3 py-3 font-medium text-muted-foreground">Notifs</th>
              <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                  No escalations match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "hover:bg-muted/20",
                  row.status === "open" && "bg-red-50/30"
                )}
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      TYPE_COLORS[row.type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {TYPE_LABELS[row.type] ?? row.type}
                  </span>
                  {row.quarter && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">{row.quarter}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{row.employeeName}</p>
                  {row.employeeDept && (
                    <p className="text-muted-foreground">{row.employeeDept}</p>
                  )}
                </td>
                <td className="px-3 py-3 hidden sm:table-cell text-muted-foreground">{row.managerName}</td>
                <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">
                  {format(parseISO(row.triggeredAt), "d MMM yyyy, HH:mm")}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-semibold">
                    {row.notificationCount}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {row.status === "open" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold">
                      <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                      Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">
                      <CheckCircle2 className="size-2.5" />
                      Resolved
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {row.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      disabled={resolvingId === row.id}
                      onClick={() => handleResolve(row.id, row.employeeName)}
                    >
                      {resolvingId === row.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Mark Resolved"
                      )}
                    </Button>
                  )}
                  {row.status === "resolved" && row.resolvedAt && (
                    <span className="text-muted-foreground text-[10px]">
                      {format(parseISO(row.resolvedAt), "d MMM")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {escalations.length} entries
      </p>
    </div>
  )
}
