"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { computeScore, scoreTier } from "@/lib/scoring"
import { ProgressBar } from "@/components/goals/ProgressBar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface GoalRow {
  id: string
  title: string
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  achievement: {
    quarter: string
    actualValue: number | null
    actualDate: string | null
    progressStatus: string
    computedScore: number | null
  } | null
  existingCheckin: { id: string; comment: string } | null
}

interface SavedCheckin {
  id: string
  employeeId: string
  goalId: string
  quarter: string
  comment: string
}

interface CheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: { id: string; name: string; department: string | null }
  quarter: string
  cycleId: string
  goals: GoalRow[]
  onSaved?: (saved: SavedCheckin[]) => void
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  on_track: "On Track",
  completed: "Completed",
}

const TIER_BADGE: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-600",
  none: "bg-muted text-muted-foreground",
}

const UOM_LABELS: Record<string, string> = {
  min_numeric: "↓ Lower better",
  max_numeric: "↑ Higher better",
  min_percent: "↓ Lower better (%)",
  max_percent: "↑ Higher better (%)",
  timeline: "📅 Timeline",
  zero: "◎ Zero-based",
}

export function CheckinModal({
  open,
  onOpenChange,
  employee,
  quarter,
  cycleId,
  goals,
  onSaved,
}: CheckinModalProps) {
  const existingComment = goals[0]?.existingCheckin?.comment ?? ""
  const [comment, setComment] = useState(existingComment)
  const [saving, setSaving] = useState(false)

  const isEditing = !!goals[0]?.existingCheckin

  // Compute weighted average score in real-time
  const avgScore = useMemo(() => {
    const scoredGoals = goals.filter((g) => g.achievement)
    if (scoredGoals.length === 0) return null
    const total = scoredGoals.reduce((sum, g) => {
      const s = computeScore(
        g.uomType,
        g.targetValue,
        g.achievement?.actualValue ?? null,
        g.targetDate,
        g.achievement?.actualDate ?? null
      )
      return sum + (s ?? 0) * (g.weightage / 100)
    }, 0)
    return Math.round(total)
  }, [goals])

  async function handleSave() {
    if (!comment.trim()) {
      toast.error("Check-in comment is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          cycleId,
          quarter,
          comment: comment.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to save check-in")
        return
      }
      const saved: SavedCheckin[] = await res.json()
      toast.success(`${quarter} check-in saved for ${employee.name}`)
      onOpenChange(false)
      onSaved?.(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quarter} Check-in — {employee.name}
          </DialogTitle>
          {employee.department && (
            <p className="text-xs text-muted-foreground">{employee.department}</p>
          )}
        </DialogHeader>

        {/* Weighted average score */}
        {avgScore !== null && (
          <div
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-medium text-center",
              avgScore >= 80
                ? "bg-green-50 text-green-700"
                : avgScore >= 50
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-600"
            )}
          >
            Weighted Average Score: {avgScore}%
          </div>
        )}

        {/* Goal rows */}
        <div className="space-y-3">
          {goals.map((g) => {
            const score = computeScore(
              g.uomType,
              g.targetValue,
              g.achievement?.actualValue ?? null,
              g.targetDate,
              g.achievement?.actualDate ?? null
            )
            const tier = scoreTier(score)

            return (
              <div key={g.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {UOM_LABELS[g.uomType] ?? g.uomType} ·{" "}
                      {g.targetValue !== null ? `Target: ${g.targetValue}` : "No target"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      TIER_BADGE[tier]
                    )}
                  >
                    {score !== null ? `${Math.round(score)}%` : "—"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-medium">
                      {g.targetValue !== null ? g.targetValue : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-medium">
                      {g.achievement?.actualValue !== null && g.achievement?.actualValue !== undefined
                        ? g.achievement.actualValue
                        : "Not entered"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {STATUS_LABEL[g.achievement?.progressStatus ?? "not_started"] ?? "—"}
                    </p>
                  </div>
                </div>

                <ProgressBar
                  uomType={g.uomType}
                  target={g.targetValue}
                  actual={g.achievement?.actualValue ?? null}
                  targetDate={g.targetDate}
                  showLabel={false}
                />
              </div>
            )
          })}
        </div>

        {/* Existing check-in notice */}
        {isEditing && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="size-4 flex-shrink-0" />
            Check-in already conducted. You can update the comment below.
          </div>
        )}

        {/* Comment */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Manager Notes <span className="text-muted-foreground">(required)</span>
          </label>
          <Textarea
            placeholder="Add your check-in notes, feedback, and guidance for the employee…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none min-h-24"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/1000
          </p>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={saving || !comment.trim()} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? "Update Check-in" : "Save Check-in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
