"use client"

import { useState, useMemo } from "react"
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns"
import { ChevronDown, ChevronRight, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string
  entityType: string
  entityId: string
  goalId: string | null
  goalTitle: string | null
  goalStatus: string | null
  changedById: string
  changedByName: string
  action: string
  fieldName: string | null
  oldValue: string | null
  newValue: string | null
  changedAt: string
}

interface AuditLogClientProps {
  logs: AuditRow[]
  users: { id: string; name: string }[]
}

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  submitted: "Submitted",
  approved: "Approved",
  returned: "Returned",
  locked: "Locked",
  unlocked: "Unlocked",
  shared: "Shared",
}

const ACTION_COLORS: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  updated: "bg-muted text-muted-foreground",
  submitted: "bg-violet-100 text-violet-700",
  approved: "bg-green-100 text-green-700",
  returned: "bg-orange-100 text-orange-700",
  locked: "bg-amber-100 text-amber-700",
  unlocked: "bg-sky-100 text-sky-700",
  shared: "bg-pink-100 text-pink-700",
}

// ─── Expandable row ───────────────────────────────────────────────────────────

function LogRow({ row }: { row: AuditRow }) {
  const [expanded, setExpanded] = useState(false)
  const isLocked = row.action === "locked"

  return (
    <>
      <tr
        className={cn(
          "hover:bg-muted/20 cursor-pointer",
          isLocked && "bg-amber-50 hover:bg-amber-100/60"
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5">
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
          {format(parseISO(row.changedAt), "d MMM yyyy, HH:mm")}
        </td>
        <td className="px-3 py-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            {isLocked && <Lock className="size-3 text-amber-600 flex-shrink-0" />}
            <span className="font-medium">{row.entityType}</span>
          </div>
          {row.goalTitle && (
            <p className="text-muted-foreground truncate max-w-[220px]" title={row.goalTitle}>
              {row.goalTitle}
            </p>
          )}
        </td>
        <td className="px-3 py-2.5 text-xs font-medium">{row.changedByName}</td>
        <td className="px-3 py-2.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
              ACTION_COLORS[row.action] ?? "bg-muted text-muted-foreground"
            )}
          >
            {ACTION_LABELS[row.action] ?? row.action}
          </span>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
          {row.fieldName ?? "—"}
        </td>
        <td className="px-3 py-2.5 text-xs hidden lg:table-cell">
          {row.oldValue !== null || row.newValue !== null ? (
            <span className="flex items-center gap-1">
              <span className="text-red-600 line-through truncate max-w-[80px]" title={row.oldValue ?? ""}>
                {row.oldValue ?? "—"}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-green-700 truncate max-w-[80px]" title={row.newValue ?? ""}>
                {row.newValue ?? "—"}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className={cn(isLocked && "bg-amber-50")}>
          <td />
          <td colSpan={6} className="px-3 pb-3">
            <div className="rounded-md border bg-card p-3 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div>
                  <span className="text-muted-foreground">Entity ID: </span>
                  <span className="font-mono">{row.entityId}</span>
                </div>
                {row.goalId && (
                  <div>
                    <span className="text-muted-foreground">Goal ID: </span>
                    <span className="font-mono">{row.goalId}</span>
                  </div>
                )}
                {row.goalStatus && (
                  <div>
                    <span className="text-muted-foreground">Goal Status: </span>
                    <span>{row.goalStatus}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Changed at: </span>
                  <span>{format(parseISO(row.changedAt), "d MMM yyyy, HH:mm:ss")}</span>
                </div>
              </div>
              {(row.fieldName || row.oldValue !== null || row.newValue !== null) && (
                <div className="border-t pt-2 space-y-1">
                  {row.fieldName && (
                    <div>
                      <span className="text-muted-foreground">Field: </span>
                      <span className="font-medium">{row.fieldName}</span>
                    </div>
                  )}
                  {(row.oldValue !== null || row.newValue !== null) && (
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-muted-foreground mb-0.5">Before</p>
                        <p className="rounded bg-red-50 border border-red-100 px-2 py-1 font-mono text-red-700 whitespace-pre-wrap break-all">
                          {row.oldValue ?? "(empty)"}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-muted-foreground mb-0.5">After</p>
                        <p className="rounded bg-green-50 border border-green-100 px-2 py-1 font-mono text-green-700 whitespace-pre-wrap break-all">
                          {row.newValue ?? "(empty)"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditLogClient({ logs, users }: AuditLogClientProps) {
  const [userId, setUserId] = useState("all")
  const [actionType, setActionType] = useState("all")
  const [goalSearch, setGoalSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (userId !== "all" && l.changedById !== userId) return false
      if (actionType !== "all" && l.action !== actionType) return false
      if (goalSearch && !l.goalTitle?.toLowerCase().includes(goalSearch.toLowerCase())) return false
      if (dateFrom) {
        const from = startOfDay(new Date(dateFrom))
        if (isBefore(parseISO(l.changedAt), from)) return false
      }
      if (dateTo) {
        const to = endOfDay(new Date(dateTo))
        if (isAfter(parseISO(l.changedAt), to)) return false
      }
      return true
    })
  }, [logs, userId, actionType, goalSearch, dateFrom, dateTo])

  const lockedCount = filtered.filter((l) => l.action === "locked").length

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={userId} onValueChange={(v) => v && setUserId(v)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionType} onValueChange={(v) => v && setActionType(v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search goal title…"
          value={goalSearch}
          onChange={(e) => setGoalSearch(e.target.value)}
          className="h-8 w-48 text-xs"
        />

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-36 text-xs"
          />
        </div>
      </div>

      {lockedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <Lock className="size-3.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{lockedCount} locked goal change{lockedCount !== 1 ? "s" : ""}</span>
            {" "}in this view — highlighted below.
          </span>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-8 px-3 py-2.5" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Entity / Goal</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">User</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Field</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Old → New</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <LogRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {logs.length} entries
      </p>
    </div>
  )
}
