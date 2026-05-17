"use client"

import { cn } from "@/lib/utils"

interface AuditEntry {
  id: string
  action: string
  fieldName: string | null
  oldValue: string | null
  newValue: string | null
  changedAt: string
  changedBy: { name: string; role: string }
  goal?: { title: string; thrustArea: string } | null
}

const ACTION_STYLES: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  updated: "bg-slate-100 text-slate-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  returned: "bg-amber-100 text-amber-700",
  locked: "bg-orange-100 text-orange-700",
  unlocked: "bg-rose-100 text-rose-700",
  shared: "bg-teal-100 text-teal-700",
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return (
    <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold uppercase text-slate-700">
      {initials}
    </span>
  )
}

function formatValue(v: string | null) {
  if (v === null || v === "") return <span className="italic text-muted-foreground">empty</span>
  return <span className="font-mono text-xs">{v}</span>
}

interface AuditDiffProps {
  entries: AuditEntry[]
  className?: string
}

export function AuditDiff({ entries, className }: AuditDiffProps) {
  if (entries.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground py-4 text-center", className)}>
        No audit history found.
      </p>
    )
  }

  return (
    <ol className={cn("relative space-y-0", className)}>
      {/* vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" aria-hidden />

      {entries.map((entry) => {
        const isLocked = entry.action === "locked"
        const ts = new Date(entry.changedAt)
        const dateStr = ts.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        const timeStr = ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })

        return (
          <li
            key={entry.id}
            className={cn(
              "relative flex gap-3 pl-8 py-3 rounded-md transition-colors",
              isLocked && "bg-amber-50 border border-amber-200"
            )}
          >
            {/* Avatar */}
            <div className="absolute left-0 top-3">
              <Initials name={entry.changedBy.name} />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{entry.changedBy.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{entry.changedBy.role}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    ACTION_STYLES[entry.action] ?? "bg-slate-100 text-slate-700"
                  )}
                >
                  {entry.action}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
                  {dateStr} · {timeStr}
                </span>
              </div>

              {/* Goal context */}
              {entry.goal && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground">{entry.goal.thrustArea}</span>
                  {" / "}
                  {entry.goal.title}
                </p>
              )}

              {/* Field diff */}
              {entry.fieldName && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs mt-1">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {entry.fieldName}
                  </span>
                  {formatValue(entry.oldValue)}
                  <span className="text-muted-foreground">→</span>
                  {formatValue(entry.newValue)}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
