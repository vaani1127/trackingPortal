import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ChevronLeft, Lock, CheckCircle2, Clock, Circle, Share2 } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeScore } from "@/lib/scoring"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export const metadata = { title: "Goal Detail — Atomberg Portal" }

const UOM_LABELS: Record<string, string> = {
  min_numeric: "Lower is Better (Numeric)",
  max_numeric: "Higher is Better (Numeric)",
  min_percent: "Lower is Better (%)",
  max_percent: "Higher is Better (%)",
  timeline: "Timeline",
  zero: "Zero-based",
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  returned: "bg-amber-100 text-amber-700",
  locked: "bg-slate-100 text-slate-600",
}

const ACHIEVEMENT_ICONS = {
  not_started: Circle,
  on_track: Clock,
  completed: CheckCircle2,
}

const ACHIEVEMENT_STYLES: Record<string, string> = {
  not_started: "text-muted-foreground",
  on_track: "text-blue-600",
  completed: "text-green-600",
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "Goal created",
  updated: "Goal updated",
  submitted: "Submitted for approval",
  approved: "Approved",
  returned: "Returned for revision",
  locked: "Locked",
  unlocked: "Unlocked",
  shared: "Shared",
}

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

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const { id } = await params

  const goal = await prisma.goal.findFirst({
    where: { id, employeeId: session.user.id },
    include: {
      achievements: { orderBy: { quarter: "asc" } },
      auditLogs: {
        orderBy: { changedAt: "desc" },
        take: 20,
        include: {
          changedBy: { select: { name: true, role: true } },
        },
      },
      cycle: { select: { name: true, q1Opens: true, q2Opens: true, q3Opens: true, q4Opens: true } },
    },
  })

  if (!goal) notFound()

  const isLocked = goal.status === "locked" || goal.status === "approved"
  const isReturned = goal.status === "returned"
  const isSharedCopy = goal.isShared && goal.sharedFromId !== null

  // Determine current quarter for check-in
  const now = new Date()
  let currentQuarter: string | null = null
  if (now >= goal.cycle.q4Opens) currentQuarter = "Q4"
  else if (now >= goal.cycle.q3Opens) currentQuarter = "Q3"
  else if (now >= goal.cycle.q2Opens) currentQuarter = "Q2"
  else if (now >= goal.cycle.q1Opens) currentQuarter = "Q1"

  const quarters: ("Q1" | "Q2" | "Q3" | "Q4")[] = ["Q1", "Q2", "Q3", "Q4"]
  const quarterDates: Record<string, Date> = {
    Q1: goal.cycle.q1Opens,
    Q2: goal.cycle.q2Opens,
    Q3: goal.cycle.q3Opens,
    Q4: goal.cycle.q4Opens,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <Button render={<Link href="/employee/goals" />} variant="ghost" className="gap-2 -ml-2">
        <ChevronLeft className="size-4" />
        Back to My Goals
      </Button>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <Lock className="size-4 flex-shrink-0" />
          <span>
            This goal is{" "}
            <strong>
              {goal.status === "approved" ? "approved and locked" : "locked"}
            </strong>{" "}
            — it cannot be edited.
          </span>
        </div>
      )}

      {/* Returned banner */}
      {isReturned && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            This goal was returned for revision by your manager.
          </p>
          <p className="mt-1 text-amber-700">
            Review the audit log below for manager feedback, update the goal,
            and resubmit.
          </p>
        </div>
      )}

      {/* Shared goal banner */}
      {isSharedCopy && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Share2 className="size-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Shared Goal</p>
            <p className="mt-0.5 text-blue-700">
              Title, target, and measurement type are set by your manager and cannot be changed.
              Only your weightage allocation can be adjusted from the goals list.
            </p>
          </div>
        </div>
      )}

      {/* Goal summary card */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                THRUST_COLORS[goal.thrustArea] ?? "bg-muted text-muted-foreground"
              )}
            >
              {goal.thrustArea}
            </span>
            <h1 className="text-xl font-bold flex-1">{goal.title}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                STATUS_STYLES[goal.status] ?? "bg-muted text-muted-foreground"
              )}
            >
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </span>
          </div>

          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          <Separator />

          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                Cycle
              </dt>
              <dd>{goal.cycle.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                Weightage
              </dt>
              <dd className="font-bold text-orange-600">
                {Number(goal.weightage)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                Unit of Measurement
              </dt>
              <dd>{UOM_LABELS[goal.uomType] ?? goal.uomType}</dd>
            </div>
            {goal.targetValue !== null && (
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                  Target Value
                </dt>
                <dd>{Number(goal.targetValue)}</dd>
              </div>
            )}
            {goal.targetDate && (
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                  Target Date
                </dt>
                <dd>{format(goal.targetDate, "PPP")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Quarterly Achievements */}
      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <h2 className="text-base font-semibold mb-4">Quarterly Progress</h2>
          <div className="space-y-3">
            {quarters.map((q) => {
              const achievement = goal.achievements.find((a) => a.quarter === q)
              const isCurrentQ = currentQuarter === q
              const qDate = quarterDates[q]
              const qOpen = now >= qDate

              // Never show achievement status/data for quarters that haven't opened
              const displayStatus = qOpen ? (achievement?.progressStatus ?? "not_started") : "not_started"
              const Icon = ACHIEVEMENT_ICONS[displayStatus as keyof typeof ACHIEVEMENT_ICONS]

              return (
                <div
                  key={q}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border px-4 py-3",
                    isCurrentQ && qOpen ? "border-orange-300 bg-orange-500/5" : "border-border"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 flex-shrink-0",
                      ACHIEVEMENT_STYLES[displayStatus]
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{q}</span>
                      {isCurrentQ && qOpen && (
                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 rounded-full px-1.5 py-0.5">
                          Current
                        </span>
                      )}
                      {!qOpen && (
                        <span className="text-xs text-muted-foreground">
                          Opens {format(qDate, "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    {qOpen && achievement && achievement.progressStatus !== "not_started" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(() => {
                          const liveScore = computeScore(
                            goal.uomType,
                            goal.targetValue !== null ? Number(goal.targetValue) : null,
                            achievement.actualValue !== null ? Number(achievement.actualValue) : null,
                            goal.targetDate?.toISOString() ?? null,
                            achievement.actualDate?.toISOString() ?? null
                          )
                          return (
                            <>
                              Status: {achievement.progressStatus.replace("_", " ")}
                              {achievement.actualValue !== null
                                ? ` · Actual: ${Number(achievement.actualValue)}`
                                : ""}
                              {liveScore !== null
                                ? ` · Score: ${Math.round(liveScore)}%`
                                : ""}
                            </>
                          )
                        })()}
                      </p>
                    )}
                    {isCurrentQ && qOpen && !achievement && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">No entry yet</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Audit log */}
      {goal.auditLogs.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-5">
            <h2 className="text-base font-semibold mb-4">History</h2>
            <div className="space-y-0 relative">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {goal.auditLogs.map((log, i) => (
                <div key={log.id} className="flex gap-4 pb-4 last:pb-0">
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="size-4 rounded-full bg-background border-2 border-orange-400 z-10 relative" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {log.changedBy.name} ·{" "}
                      {format(log.changedAt, "MMM d, yyyy HH:mm")}
                    </p>
                    {log.oldValue && log.newValue && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.fieldName}: &ldquo;{log.oldValue}&rdquo; →{" "}
                        &ldquo;{log.newValue}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
