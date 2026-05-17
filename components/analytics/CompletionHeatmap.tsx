"use client"

import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Types ────────────────────────────────────────────────────────────────────

type CellStatus = "done" | "partial" | "missing" | "na"

interface CompletionHeatmapProps {
  employees: { id: string; name: string; department: string | null }[]
  data: Record<string, CellStatus>
  isLoading: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES = [
  { key: "goal_setting", label: "Goal Setting" },
  { key: "Q1", label: "Q1" },
  { key: "Q2", label: "Q2" },
  { key: "Q3", label: "Q3" },
  { key: "Q4", label: "Q4" },
]

const STATUS_COLOR: Record<CellStatus, string> = {
  done: "bg-green-500",
  partial: "bg-amber-400",
  missing: "bg-red-400",
  na: "bg-slate-100",
}

const STATUS_LABEL: Record<CellStatus, string> = {
  done: "Completed",
  partial: "Partial",
  missing: "Missing",
  na: "N/A",
}

const LEGEND_ITEMS: { status: CellStatus; label: string }[] = [
  { status: "done", label: "Completed" },
  { status: "partial", label: "Partial" },
  { status: "missing", label: "Missing" },
  { status: "na", label: "N/A" },
]

// When more than this many employees are shown, cap height and enable vertical scroll.
const MAX_VISIBLE_ROWS = 20
const ROW_HEIGHT_PX = 30   // 28px cell + 2px gap
const MAX_HEIGHT_PX = MAX_VISIBLE_ROWS * ROW_HEIGHT_PX

// ─── Cell ─────────────────────────────────────────────────────────────────────

function HeatCell({
  status,
  label,
  onEnter,
  onLeave,
}: {
  status: CellStatus
  label: string
  onEnter: (label: string, e: React.MouseEvent) => void
  onLeave: () => void
}) {
  return (
    <div
      className={`w-7 h-7 rounded-sm cursor-default flex-shrink-0 ${STATUS_COLOR[status]}`}
      onMouseEnter={(e) => onEnter(label, e)}
      onMouseLeave={onLeave}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompletionHeatmap({
  employees,
  data,
  isLoading,
}: CompletionHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)

  function handleEnter(text: string, e: React.MouseEvent) {
    setTooltip({ text, x: e.clientX + 12, y: e.clientY - 40 })
  }

  function handleLeave() {
    setTooltip(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {/* Header skeleton */}
        <div className="flex gap-0.5 items-center">
          <div className="w-40 flex-shrink-0" />
          {PHASES.map((p) => (
            <Skeleton key={p.key} className="w-7 h-4" />
          ))}
        </div>
        {/* Row skeletons */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-0.5 items-center">
            <Skeleton className="w-40 h-7 flex-shrink-0" />
            {PHASES.map((p) => (
              <Skeleton key={p.key} className="w-7 h-7 rounded-sm" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No employees found for the selected filters.
      </div>
    )
  }

  const needsVerticalScroll = employees.length > MAX_VISIBLE_ROWS

  return (
    // overflow-x-auto handles wide viewports / narrow cards — the inner
    // inline-block div expands with content so header + rows scroll together.
    <div className="overflow-x-auto">
      {/* Tooltip rendered at pointer position via fixed positioning */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs px-2 py-1.5 rounded-md pointer-events-none shadow"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="inline-block min-w-full">
        {/* Phase header — stays outside the scroll container so it never
            disappears when the employee list is scrolled vertically. */}
        <div className="flex gap-0.5 items-center mb-1">
          <div className="w-40 flex-shrink-0" />
          {PHASES.map((p) => (
            <div
              key={p.key}
              className="w-7 flex-shrink-0 text-center text-[10px] font-medium text-muted-foreground leading-none"
            >
              {p.label}
            </div>
          ))}
        </div>

        {/* Employee rows — capped at MAX_VISIBLE_ROWS, scrolls vertically
            when the org has more employees than the cap. */}
        <div
          className="space-y-0.5"
          style={
            needsVerticalScroll
              ? { maxHeight: MAX_HEIGHT_PX, overflowY: "auto" }
              : undefined
          }
        >
          {employees.map((emp) => (
            <div key={emp.id} className="flex gap-0.5 items-center">
              {/* Name column — truncates long names with a native tooltip */}
              <div
                className="w-40 flex-shrink-0 truncate text-xs pr-2"
                title={emp.name}
              >
                {emp.name}
              </div>

              {/* Phase cells */}
              {PHASES.map((p) => {
                const status: CellStatus = data[`${emp.id}|${p.key}`] ?? "na"
                const tooltipText = `${emp.name} — ${p.label} — ${STATUS_LABEL[status]}`
                return (
                  <HeatCell
                    key={p.key}
                    status={status}
                    label={tooltipText}
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Row count badge — shown when vertical scroll is active */}
        {needsVerticalScroll && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Showing {employees.length} employees — scroll to see all
          </p>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.status} className="flex items-center gap-1.5">
              <div
                className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 ${STATUS_COLOR[item.status]}`}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
