"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { CalendarIcon, Loader2, Save, CheckCircle2, XCircle } from "lucide-react"

import { computeScore, scoreTier, scoreToColor } from "@/lib/scoring"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProgressBar } from "@/components/goals/ProgressBar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoalData {
  id: string
  title: string
  thrustArea: string
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
}

export interface InitialAchievement {
  progressStatus: string
  actualValue: number | null
  actualDate: string | null
  computedScore: number | null
}

interface AchievementFormProps {
  goal: GoalData
  quarter: string
  initialAchievement: InitialAchievement | null
  isWindowOpen: boolean
  onSaved?: () => void
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function makeSchema(uomType: string) {
  return z
    .object({
      progressStatus: z.enum(["not_started", "on_track", "completed"] as const),
      actualValue: z.number().nullable().optional(),
      actualDate: z.date().nullable().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.progressStatus === "not_started") return
      if (uomType === "timeline") {
        if (!data.actualDate) {
          ctx.addIssue({
            code: "custom",
            message: "Actual completion date is required",
            path: ["actualDate"],
          })
        }
      } else if (uomType !== "zero") {
        if (data.actualValue === null || data.actualValue === undefined) {
          ctx.addIssue({
            code: "custom",
            message: "Actual value is required",
            path: ["actualValue"],
          })
        }
      }
    })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRESS_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "completed", label: "Completed" },
] as const

const THRUST_COLORS: Record<string, string> = {
  Sales: "bg-blue-100 text-blue-700",
  Operations: "bg-purple-100 text-purple-700",
  Quality: "bg-teal-100 text-teal-700",
  Safety: "bg-red-100 text-red-700",
  People: "bg-pink-100 text-pink-700",
  Finance: "bg-amber-100 text-amber-700",
  Technology: "bg-indigo-100 text-indigo-700",
  Customer: "bg-orange-100 text-orange-700",
}

const UOM_LABELS: Record<string, string> = {
  min_numeric: "↓ Lower better",
  max_numeric: "↑ Higher better",
  min_percent: "↓ Lower better (%)",
  max_percent: "↑ Higher better (%)",
  timeline: "📅 Timeline",
  zero: "◎ Zero-based",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AchievementForm({
  goal,
  quarter,
  initialAchievement,
  isWindowOpen,
  onSaved,
}: AchievementFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const schema = useMemo(() => makeSchema(goal.uomType), [goal.uomType])

  const defaultActualDate =
    initialAchievement?.actualDate ? new Date(initialAchievement.actualDate) : null
  const defaultActualValue =
    initialAchievement?.actualValue !== null && initialAchievement?.actualValue !== undefined
      ? initialAchievement.actualValue
      : null
  const defaultProgressStatus =
    (initialAchievement?.progressStatus as "not_started" | "on_track" | "completed") ??
    "not_started"

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      progressStatus: defaultProgressStatus,
      actualValue: defaultActualValue ?? undefined,
      actualDate: defaultActualDate ?? undefined,
    },
  })

  // Live score computation from watched form values
  const watchedActualValue = form.watch("actualValue")
  const watchedActualDate = form.watch("actualDate")
  const watchedStatus = form.watch("progressStatus")

  const liveScore = useMemo(() => {
    const av = watchedActualValue ?? null
    const ad = watchedActualDate ?? null
    return computeScore(
      goal.uomType,
      goal.targetValue,
      av,
      goal.targetDate,
      ad?.toISOString()
    )
  }, [goal.uomType, goal.targetValue, goal.targetDate, watchedActualValue, watchedActualDate])

  const liveTier = scoreTier(liveScore)

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        goalId: goal.id,
        quarter,
        progressStatus: values.progressStatus,
        actualValue: values.actualValue ?? null,
        actualDate: values.actualDate ? values.actualDate.toISOString() : null,
      }

      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to save achievement")
        return
      }

      toast.success(`${quarter} progress saved`)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const isPercent = goal.uomType === "min_percent" || goal.uomType === "max_percent"
  const isTimeline = goal.uomType === "timeline"
  const isZero = goal.uomType === "zero"
  const needsValue = !isTimeline && !isZero

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        !isWindowOpen && "opacity-75"
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                THRUST_COLORS[goal.thrustArea] ?? "bg-muted text-muted-foreground"
              )}
            >
              {goal.thrustArea}
            </span>
            <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
              {UOM_LABELS[goal.uomType] ?? goal.uomType}
            </span>
            <span className="text-xs font-semibold text-orange-600 ml-auto">
              {goal.weightage}% weight
            </span>
          </div>
          <p className="text-sm font-semibold">{goal.title}</p>
          {goal.targetValue !== null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Target: {goal.targetValue}
              {isPercent ? "%" : ""}
            </p>
          )}
          {isTimeline && goal.targetDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Target date:{" "}
              {format(new Date(goal.targetDate), "d MMM yyyy")}
            </p>
          )}
        </div>

        {/* Live score badge */}
        {liveScore !== null && (
          <div
            className={cn(
              "flex-shrink-0 rounded-lg px-3 py-1.5 text-center min-w-[64px]",
              liveTier === "green"
                ? "bg-green-50"
                : liveTier === "yellow"
                ? "bg-amber-50"
                : "bg-red-50"
            )}
          >
            <p className={cn("text-lg font-bold tabular-nums", scoreToColor(liveScore))}>
              {Math.round(liveScore)}%
            </p>
            <p className="text-[9px] text-muted-foreground">score</p>
          </div>
        )}
      </div>

      {/* Form body */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Progress status segmented control */}
          <FormField
            control={form.control}
            name="progressStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Progress Status
                </FormLabel>
                <FormControl>
                  <div className="flex rounded-lg border overflow-hidden">
                    {PROGRESS_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!isWindowOpen}
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "flex-1 px-3 py-2 text-xs font-medium transition-colors border-r last:border-r-0",
                          field.value === opt.value
                            ? opt.value === "completed"
                              ? "bg-green-500 text-white"
                              : opt.value === "on_track"
                              ? "bg-blue-500 text-white"
                              : "bg-muted text-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted/50",
                          !isWindowOpen && "cursor-not-allowed"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actual value input — numeric/percent */}
          {needsValue && (
            <FormField
              control={form.control}
              name="actualValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actual {isPercent ? "(%)" : "Value"}
                  </FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        step={isPercent ? "0.1" : "any"}
                        min={0}
                        max={isPercent ? 200 : undefined}
                        placeholder={isPercent ? "0 – 200" : "Enter actual value"}
                        disabled={!isWindowOpen || watchedStatus === "not_started"}
                        value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v === "" ? undefined : parseFloat(v))
                        }}
                        className={cn(
                          "h-10",
                          isPercent && "pr-8",
                          (!isWindowOpen || watchedStatus === "not_started") &&
                            "bg-muted/40 cursor-not-allowed"
                        )}
                      />
                      {isPercent && (
                        <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none">
                          %
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Actual date picker — timeline */}
          {isTimeline && (
            <FormField
              control={form.control}
              name="actualDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actual Completion Date
                  </FormLabel>
                  <FormControl>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            disabled={!isWindowOpen || watchedStatus === "not_started"}
                            className={cn(
                              "w-full justify-start text-left font-normal h-10",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                        }
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value
                          ? format(field.value, "PPP")
                          : "Pick completion date"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(date) => {
                            field.onChange(date ?? null)
                            setCalendarOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Zero-based toggle */}
          {isZero && (
            <FormField
              control={form.control}
              name="actualValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Achievement
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={!isWindowOpen || watchedStatus === "not_started"}
                        onClick={() => field.onChange(0)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition-all",
                          field.value === 0
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-border text-muted-foreground hover:border-green-300",
                          (!isWindowOpen || watchedStatus === "not_started") &&
                            "cursor-not-allowed opacity-60"
                        )}
                      >
                        <CheckCircle2 className="size-4" />
                        Zero — Achieved
                      </button>
                      <button
                        type="button"
                        disabled={!isWindowOpen || watchedStatus === "not_started"}
                        onClick={() => field.onChange(1)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition-all",
                          field.value !== null && field.value !== undefined && field.value > 0
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-border text-muted-foreground hover:border-red-300",
                          (!isWindowOpen || watchedStatus === "not_started") &&
                            "cursor-not-allowed opacity-60"
                        )}
                      >
                        <XCircle className="size-4" />
                        Not Achieved
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Live progress bar */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Score Preview
            </p>
            <ProgressBar
              uomType={goal.uomType}
              target={goal.targetValue}
              actual={
                isTimeline
                  ? null
                  : (watchedActualValue ?? (initialAchievement?.actualValue ?? null))
              }
              targetDate={goal.targetDate}
              actualDate={
                isTimeline
                  ? watchedActualDate?.toISOString() ?? initialAchievement?.actualDate
                  : undefined
              }
              showLabel
            />
          </div>

          {/* Window closed notice */}
          {!isWindowOpen && (
            <p className="text-xs text-muted-foreground italic text-center py-1">
              {quarter} check-in window is closed — updates are disabled.
            </p>
          )}

          {/* Save button */}
          <Button
            type="submit"
            disabled={saving || !isWindowOpen}
            className={cn(
              "w-full gap-2",
              isWindowOpen
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Progress
          </Button>
        </form>
      </Form>
    </div>
  )
}
