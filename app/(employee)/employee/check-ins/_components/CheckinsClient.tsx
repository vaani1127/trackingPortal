"use client"

import { CheckCircle2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AchievementForm } from "@/components/achievements/AchievementForm"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Achievement {
  quarter: string
  actualValue: number | null
  actualDate: string | null
  progressStatus: string
  computedScore: number | null
}

interface GoalData {
  id: string
  title: string
  thrustArea: string
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  achievements: Achievement[]
}

interface CheckinsClientProps {
  goals: GoalData[]
  openQuarter: "Q1" | "Q2" | "Q3" | "Q4" | null
  quarterOpens: Record<string, string> // ISO strings
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const

// ─── Quarter helpers ──────────────────────────────────────────────────────────

function quarterState(
  q: string,
  openQuarter: string | null,
  quarterOpens: Record<string, string>
): "future" | "open" | "past" {
  const now = new Date()
  const opens = new Date(quarterOpens[q])
  if (now < opens) return "future"
  if (q === openQuarter) return "open"
  return "past"
}

function isQuarterFullyUpdated(q: string, goals: GoalData[]): boolean {
  if (goals.length === 0) return false
  return goals.every((g) => {
    const a = g.achievements.find((a) => a.quarter === q)
    return a && a.progressStatus !== "not_started"
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckinsClient({
  goals,
  openQuarter,
  quarterOpens,
}: CheckinsClientProps) {
  const defaultTab = openQuarter ?? "Q1"

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList variant="line" className="mb-6">
        {QUARTERS.map((q) => {
          const state = quarterState(q, openQuarter, quarterOpens)
          const completed = state !== "future" && isQuarterFullyUpdated(q, goals)

          return (
            <TabsTrigger
              key={q}
              value={q}
              disabled={state === "future"}
              className={cn(state === "future" && "opacity-40 cursor-not-allowed")}
            >
              <span className="flex items-center gap-1.5">
                {state === "open" && (
                  <span className="inline-flex size-1.5 rounded-full bg-orange-500 animate-pulse" />
                )}
                {completed && state !== "open" && (
                  <CheckCircle2 className="size-3 text-green-500" />
                )}
                {state === "future" && <Lock className="size-3" />}
                {q}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {QUARTERS.map((quarter) => {
        const state = quarterState(quarter, openQuarter, quarterOpens)
        const isOpen = state === "open"

        if (state === "future") {
          return (
            <TabsContent key={quarter} value={quarter}>
              <div className="rounded-lg border bg-muted/30 p-12 text-center">
                <Lock className="size-6 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {quarter} check-in window opens{" "}
                  {new Intl.DateTimeFormat("en-IN", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(quarterOpens[quarter]))}
                </p>
              </div>
            </TabsContent>
          )
        }

        return (
          <TabsContent key={quarter} value={quarter}>
            {!isOpen && (
              <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                {quarter} window has closed — data is read-only.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {goals.map((goal) => {
                const existing =
                  goal.achievements.find((a) => a.quarter === quarter) ?? null
                return (
                  <AchievementForm
                    key={`${goal.id}-${quarter}`}
                    goal={goal}
                    quarter={quarter}
                    initialAchievement={existing}
                    isWindowOpen={isOpen}
                  />
                )
              })}
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
