import Link from "next/link"
import { redirect } from "next/navigation"
import { Users, ClipboardCheck, AlertCircle, TrendingUp } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeScore } from "@/lib/scoring"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = { title: "Manager Dashboard — Atomberg Portal" }

const CHECKIN_STATUS_STYLE = {
  done: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  missing: "bg-red-100 text-red-600",
  pending: "bg-muted text-muted-foreground",
}

function checkinStatusFor(
  checkins: { quarter: string }[],
  goals: { id: string }[],
  quarter: string
): "done" | "partial" | "missing" | "pending" {
  if (goals.length === 0) return "pending"
  const count = checkins.filter((c) => c.quarter === quarter).length
  if (count === 0) return "missing"
  if (count >= goals.length) return "done"
  return "partial"
}

export default async function ManagerDashboardPage() {
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

  const directReports = await prisma.user.findMany({
    where: { managerId: session.user.id },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  })

  const reportIds = directReports.map((r) => r.id)

  const [pendingGoals, allGoals, allCheckins, allAchievements] =
    await Promise.all([
      prisma.goal.count({
        where: {
          employeeId: { in: reportIds },
          cycleId: cycle?.id ?? "__none__",
          status: "submitted",
        },
      }),
      prisma.goal.findMany({
        where: {
          employeeId: { in: reportIds },
          cycleId: cycle?.id ?? "__none__",
          status: { in: ["approved", "locked"] },
        },
        select: {
          id: true,
          employeeId: true,
          uomType: true,
          targetValue: true,
          targetDate: true,
          weightage: true,
          achievements: {
            select: { quarter: true, actualValue: true, actualDate: true, computedScore: true },
          },
        },
      }),
      prisma.checkin.findMany({
        where: {
          managerId: session.user.id,
          employeeId: { in: reportIds },
          ...(cycle && { goal: { cycleId: cycle.id } }),
        },
        select: { employeeId: true, quarter: true, goalId: true },
      }),
      prisma.achievement.findMany({
        where: {
          goal: {
            employeeId: { in: reportIds },
            cycleId: cycle?.id ?? "__none__",
          },
        },
        select: {
          goalId: true,
          quarter: true,
          actualValue: true,
          actualDate: true,
          computedScore: true,
        },
      }),
    ])

  // Compute current quarter
  const now = new Date()
  let currentQuarter: "Q1" | "Q2" | "Q3" | "Q4" | null = null
  if (cycle) {
    if (now >= cycle.q4Opens) currentQuarter = "Q4"
    else if (now >= cycle.q3Opens) currentQuarter = "Q3"
    else if (now >= cycle.q2Opens) currentQuarter = "Q2"
    else if (now >= cycle.q1Opens) currentQuarter = "Q1"
  }

  // Check-ins due this quarter
  let checkInsDue = 0
  if (currentQuarter) {
    for (const report of directReports) {
      const empGoals = allGoals.filter((g) => g.employeeId === report.id)
      const empCheckins = allCheckins.filter((c) => c.employeeId === report.id)
      const done = empCheckins.filter((c) => c.quarter === currentQuarter).length
      if (empGoals.length > 0 && done < empGoals.length) checkInsDue++
    }
  }

  // Team average score — current quarter only
  const scoredValues: number[] = []
  if (currentQuarter) {
    for (const goal of allGoals) {
      const ach = allAchievements.find(
        (a) => a.goalId === goal.id && a.quarter === currentQuarter && a.actualValue !== null
      )
      if (ach) {
        const s = computeScore(
          goal.uomType,
          goal.targetValue !== null ? Number(goal.targetValue) : null,
          Number(ach.actualValue),
          goal.targetDate?.toISOString(),
          ach.actualDate?.toISOString()
        )
        if (s !== null) scoredValues.push(s)
      }
    }
  }
  const avgScore =
    scoredValues.length > 0
      ? Math.round(scoredValues.reduce((a, b) => a + b, 0) / scoredValues.length)
      : null

  // Build table rows
  const tableRows = directReports.map((report) => {
    const empGoals = allGoals.filter((g) => g.employeeId === report.id)
    const allEmpGoals = empGoals // approved/locked
    const empCheckins = allCheckins.filter((c) => c.employeeId === report.id)

    const quarters: Array<"Q1" | "Q2" | "Q3" | "Q4"> = ["Q1", "Q2", "Q3", "Q4"]

    return {
      ...report,
      goalsSet: allEmpGoals.length,
      approved: allEmpGoals.length,
      qStatus: quarters.reduce(
        (acc, q) => ({ ...acc, [q]: checkinStatusFor(empCheckins, allEmpGoals, q) }),
        {} as Record<string, "done" | "partial" | "missing" | "pending">
      ),
    }
  })

  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-5 text-blue-500" />}
          label="Team Members"
          value={directReports.length}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<ClipboardCheck className="size-5 text-orange-500" />}
          label="Pending Approval"
          value={pendingGoals}
          bg="bg-orange-50"
          link="/manager/approvals"
          linkLabel="Review →"
        />
        <StatCard
          icon={<AlertCircle className="size-5 text-amber-500" />}
          label="Check-ins Due"
          value={checkInsDue}
          bg="bg-amber-50"
          sub={currentQuarter ? `${currentQuarter} · ${cycle?.name ?? ""}` : "No active quarter"}
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-green-500" />}
          label="Avg Team Score"
          value={avgScore !== null ? `${avgScore}%` : "—"}
          bg="bg-green-50"
        />
      </div>

      {/* Team progress table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Team Progress</h2>
          {cycle && (
            <p className="text-xs text-muted-foreground mt-0.5">{cycle.name}</p>
          )}
        </div>
        {tableRows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No direct reports found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                    Goals
                  </th>
                  {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                    <th
                      key={q}
                      className="text-center px-3 py-2.5 font-medium text-muted-foreground"
                    >
                      {q}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {tableRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      {row.department && (
                        <p className="text-xs text-muted-foreground">{row.department}</p>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="tabular-nums">{row.goalsSet}</span>
                    </td>
                    {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                      <td key={q} className="text-center px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full w-16 text-[10px] font-semibold py-0.5",
                            CHECKIN_STATUS_STYLE[row.qStatus[q]]
                          )}
                        >
                          {row.qStatus[q] === "done"
                            ? "✓ Done"
                            : row.qStatus[q] === "partial"
                            ? "Partial"
                            : row.qStatus[q] === "missing"
                            ? "Missing"
                            : "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button render={<Link href="/manager/approvals" />} className="gap-2">
          <ClipboardCheck className="size-4" />
          Go to Approval Inbox
        </Button>
        <Button render={<Link href="/manager/check-ins" />} variant="outline" className="gap-2">
          Go to Check-ins
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  bg,
  sub,
  link,
  linkLabel,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  bg: string
  sub?: string
  link?: string
  linkLabel?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className={cn("inline-flex rounded-lg p-2", bg)}>{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        {link && linkLabel && (
          <Link
            href={link}
            className="text-xs text-orange-600 hover:underline mt-1 inline-block"
          >
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
