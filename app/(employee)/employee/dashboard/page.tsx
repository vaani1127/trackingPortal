import Link from "next/link"
import { redirect } from "next/navigation"
import { Target, CheckCircle2, Clock, TrendingUp, ArrowRight, AlertTriangle } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeScore } from "@/lib/scoring"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/goals/ProgressBar"
import { cn } from "@/lib/utils"

export const metadata = { title: "Dashboard — Atomberg Portal" }

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

function StatCard({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
  bg: string
}) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className={cn("inline-flex rounded-lg p-2", bg)}>{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default async function EmployeeDashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycleId = await getSelectedCycleId()
  const cycle = cycleId
    ? await prisma.cycle.findUnique({
        where: { id: cycleId },
        select: {
          id: true,
          name: true,
          q1Opens: true,
          q2Opens: true,
          q3Opens: true,
          q4Opens: true,
        },
      })
    : null

  const goals = cycle
    ? await prisma.goal.findMany({
        where: { employeeId: session.user.id, cycleId: cycle.id },
        select: {
          id: true,
          title: true,
          thrustArea: true,
          uomType: true,
          targetValue: true,
          targetDate: true,
          weightage: true,
          status: true,
          achievements: {
            select: {
              quarter: true,
              actualValue: true,
              actualDate: true,
              progressStatus: true,
              computedScore: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : []

  // Current quarter
  const now = new Date()
  let openQuarter: "Q1" | "Q2" | "Q3" | "Q4" | null = null
  if (cycle) {
    if (now >= cycle.q4Opens) openQuarter = "Q4"
    else if (now >= cycle.q3Opens) openQuarter = "Q3"
    else if (now >= cycle.q2Opens) openQuarter = "Q2"
    else if (now >= cycle.q1Opens) openQuarter = "Q1"
  }

  // Compute stats
  const totalGoals = goals.length
  const approvedGoals = goals.filter(
    (g) => g.status === "approved" || g.status === "locked"
  ).length
  const draftGoals = goals.filter((g) => g.status === "draft")
  const submittedGoals = goals.filter((g) => g.status === "submitted")

  // Current-quarter achievements: how many approved goals have been updated
  const approvedGoalsList = goals.filter(
    (g) => g.status === "approved" || g.status === "locked"
  )
  const updatedThisQuarter = openQuarter
    ? approvedGoalsList.filter((g) => {
        const a = g.achievements.find((a) => a.quarter === openQuarter)
        return a && a.progressStatus !== "not_started"
      }).length
    : 0

  // Overall weighted score across all quarters, using best achievement per goal
  const scoredValues: number[] = []
  for (const goal of approvedGoalsList) {
    // Use the most recent quarter's achievement that has a score
    const scored = goal.achievements
      .filter((a) => a.computedScore !== null)
      .sort((a, b) => {
        const order = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }
        return (
          (order[b.quarter as keyof typeof order] ?? 0) -
          (order[a.quarter as keyof typeof order] ?? 0)
        )
      })
    if (scored.length > 0) {
      const latestScore = Number(scored[0].computedScore)
      const weight = Number(goal.weightage) / 100
      scoredValues.push(latestScore * weight)
    }
  }
  const overallScore =
    scoredValues.length > 0 ? Math.round(scoredValues.reduce((a, b) => a + b, 0)) : null

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {cycle ? cycle.name : "No active cycle"}
        </p>
      </div>

      {/* Action banners */}
      <div className="space-y-3">
        {submittedGoals.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Clock className="size-4 flex-shrink-0" />
            <span>
              <strong>{submittedGoals.length}</strong> goal
              {submittedGoals.length !== 1 ? "s" : ""} pending manager
              approval.
            </span>
          </div>
        )}

        {draftGoals.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 flex-shrink-0" />
              <span>
                <strong>{draftGoals.length}</strong> goal
                {draftGoals.length !== 1 ? "s" : ""} still in draft — submit
                for manager review.
              </span>
            </span>
            <Button
              render={<Link href="/employee/goals" />}
              size="sm"
              variant="outline"
              className="gap-1 border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0"
            >
              View Goals
              <ArrowRight className="size-3" />
            </Button>
          </div>
        )}

        {openQuarter && approvedGoalsList.length > 0 && updatedThisQuarter < approvedGoalsList.length && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
            <span className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-green-500 animate-pulse" />
              <span>
                <strong>{openQuarter}</strong> check-in window is open —{" "}
                {approvedGoalsList.length - updatedThisQuarter} goal
                {approvedGoalsList.length - updatedThisQuarter !== 1 ? "s" : ""}{" "}
                need an update.
              </span>
            </span>
            <Button
              render={<Link href="/employee/check-ins" />}
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
            >
              Update {openQuarter}
              <ArrowRight className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Target className="size-5 text-blue-500" />}
          label="Total Goals"
          value={totalGoals}
          sub={cycle?.name}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-green-500" />}
          label="Approved Goals"
          value={approvedGoals}
          sub={
            totalGoals > 0
              ? `${Math.round((approvedGoals / totalGoals) * 100)}% of total`
              : undefined
          }
          bg="bg-green-50"
        />
        <StatCard
          icon={<Clock className="size-5 text-orange-500" />}
          label={openQuarter ? `${openQuarter} Progress` : "Check-ins"}
          value={
            openQuarter && approvedGoalsList.length > 0
              ? `${updatedThisQuarter}/${approvedGoalsList.length}`
              : "—"
          }
          sub={
            openQuarter && approvedGoalsList.length > 0
              ? updatedThisQuarter === approvedGoalsList.length
                ? "All updated ✓"
                : `${approvedGoalsList.length - updatedThisQuarter} remaining`
              : openQuarter
              ? "No approved goals"
              : "No open window"
          }
          bg="bg-orange-50"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-purple-500" />}
          label="Weighted Score"
          value={overallScore !== null ? `${overallScore}%` : "—"}
          sub={overallScore !== null ? "Across all quarters" : "No data yet"}
          bg="bg-purple-50"
        />
      </div>

      {/* Goal progress overview */}
      {approvedGoalsList.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Goal Progress</h2>
            <Button
              render={<Link href="/employee/check-ins" />}
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
            >
              Update check-ins
              <ArrowRight className="size-3" />
            </Button>
          </div>

          <div className="divide-y">
            {approvedGoalsList.map((goal) => {
              // Best achievement score (latest quarter that has data)
              const latestAch = goal.achievements
                .filter((a) => a.actualValue !== null || a.actualDate !== null)
                .sort((a, b) => {
                  const order = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }
                  return (
                    (order[b.quarter as keyof typeof order] ?? 0) -
                    (order[a.quarter as keyof typeof order] ?? 0)
                  )
                })[0]

              const currentAch = openQuarter
                ? goal.achievements.find((a) => a.quarter === openQuarter)
                : null

              const displayAch = currentAch?.actualValue !== null ? currentAch : latestAch

              return (
                <Link
                  key={goal.id}
                  href={`/employee/goals/${goal.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          THRUST_COLORS[goal.thrustArea] ??
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {goal.thrustArea}
                      </span>
                      <p className="text-sm font-medium truncate">{goal.title}</p>
                    </div>
                    <ProgressBar
                      uomType={goal.uomType}
                      target={
                        goal.targetValue !== null ? Number(goal.targetValue) : null
                      }
                      actual={
                        displayAch?.actualValue !== null && displayAch?.actualValue !== undefined
                          ? Number(displayAch.actualValue)
                          : null
                      }
                      targetDate={goal.targetDate}
                      actualDate={displayAch?.actualDate ?? undefined}
                      showLabel
                    />
                  </div>
                  <span className="text-sm font-bold text-orange-600 tabular-nums flex-shrink-0">
                    {Number(goal.weightage)}%
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Weighted overall bar */}
          {overallScore !== null && (
            <div className="px-5 py-3 border-t bg-muted/20 flex items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground w-32 flex-shrink-0">
                Weighted Overall
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overallScore >= 80
                      ? "bg-green-500"
                      : overallScore >= 50
                      ? "bg-amber-400"
                      : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, overallScore)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums w-12 text-right",
                  overallScore >= 80
                    ? "text-green-600"
                    : overallScore >= 50
                    ? "text-amber-600"
                    : "text-red-600"
                )}
              >
                {overallScore}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Button render={<Link href="/employee/goals" />} variant="outline" className="gap-2">
          <Target className="size-4" />
          My Goals
        </Button>
        {openQuarter && (
          <Button
            render={<Link href="/employee/check-ins" />}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <CheckCircle2 className="size-4" />
            Update {openQuarter} Check-in
          </Button>
        )}
      </div>
    </div>
  )
}
