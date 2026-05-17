"use client"

import { cn } from "@/lib/utils"
import { computeScore, scoreTier } from "@/lib/scoring"
import { CheckCircle2, XCircle } from "lucide-react"

interface ProgressBarProps {
  uomType: string
  target: number | null
  actual: number | null
  targetDate?: string | Date | null
  actualDate?: string | Date | null
  showLabel?: boolean
  className?: string
}

const TIER_BAR: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  none: "bg-muted-foreground/30",
}

const TIER_TEXT: Record<string, string> = {
  green: "text-green-600",
  yellow: "text-amber-600",
  red: "text-red-600",
  none: "text-muted-foreground",
}

export function ProgressBar({
  uomType,
  target,
  actual,
  targetDate,
  actualDate,
  showLabel = true,
  className,
}: ProgressBarProps) {
  // Zero-based: show icon only
  if (uomType === "zero") {
    const isZero = actual === 0
    const notStarted = actual === null
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {notStarted ? (
          <span className="text-xs text-muted-foreground">Not recorded</span>
        ) : isZero ? (
          <>
            <CheckCircle2 className="size-4 text-green-500" />
            {showLabel && <span className="text-xs text-green-600 font-medium">Zero — 100%</span>}
          </>
        ) : (
          <>
            <XCircle className="size-4 text-red-500" />
            {showLabel && (
              <span className="text-xs text-red-600 font-medium">
                {actual} incidents
              </span>
            )}
          </>
        )}
      </div>
    )
  }

  // Timeline: simple date comparison badge
  if (uomType === "timeline") {
    const score = computeScore(uomType, target, actual, targetDate, actualDate)
    const tier = scoreTier(score)
    if (!targetDate) {
      return <span className="text-xs text-muted-foreground">No target date</span>
    }
    const td = new Date(targetDate)
    const today = new Date()
    const daysLeft = Math.round((td.getTime() - today.getTime()) / 86_400_000)

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", TIER_BAR[tier])}
            style={{ width: `${Math.min(100, Math.max(0, score ?? 0))}%` }}
          />
        </div>
        {showLabel && (
          <span className={cn("text-xs tabular-nums", TIER_TEXT[tier])}>
            {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : `${Math.abs(daysLeft)}d late`}
          </span>
        )}
      </div>
    )
  }

  // Numeric / percent
  const score = computeScore(uomType, target, actual, targetDate, actualDate)
  const tier = scoreTier(score)
  const barPct = score !== null ? Math.min(100, Math.max(0, score)) : 0

  // For "lower is better" types, invert the visual fill color logic
  const isMaxType = uomType === "max_numeric" || uomType === "max_percent"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        {score !== null ? (
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isMaxType && tier === "green" ? "bg-green-500" : TIER_BAR[tier]
            )}
            style={{ width: `${barPct}%` }}
          />
        ) : (
          <div className="h-full w-0" />
        )}
      </div>
      {showLabel && (
        <span className={cn("text-xs tabular-nums w-8 text-right", TIER_TEXT[tier])}>
          {score !== null ? `${Math.round(score)}%` : "—"}
        </span>
      )}
    </div>
  )
}
