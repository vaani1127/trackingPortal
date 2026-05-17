import Link from "next/link"
import { redirect } from "next/navigation"
import { Users, ClipboardCheck, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = { title: "Admin Dashboard — Atomberg Portal" }

const ESCALATION_LABELS: Record<string, string> = {
  goal_not_submitted: "Goals not submitted",
  goal_not_approved: "Goals awaiting approval",
  checkin_missed: "Check-in missed",
}

const ESCALATION_COLORS: Record<string, string> = {
  goal_not_submitted: "bg-red-100 text-red-700",
  goal_not_approved: "bg-amber-100 text-amber-700",
  checkin_missed: "bg-orange-100 text-orange-700",
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
  value: string | number
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

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycle = await prisma.cycle.findFirst({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      q1Opens: true,
      q2Opens: true,
      q3Opens: true,
      q4Opens: true,
    },
  })

  const [
    totalEmployees,
    totalManagers,
    goalStats,
    escalations,
    departments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "employee" } }),
    prisma.user.count({ where: { role: "manager" } }),
    cycle
      ? prisma.goal.groupBy({
          by: ["status"],
          where: { cycleId: cycle.id },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    cycle
      ? prisma.escalation.findMany({
          where: { status: "open", cycleId: cycle.id },
          include: {
            employee: { select: { name: true, department: true } },
            manager: { select: { name: true } },
          },
          orderBy: { triggeredAt: "desc" },
          take: 15,
        })
      : Promise.resolve([]),
    prisma.user.groupBy({
      by: ["department"],
      where: { role: "employee", department: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { department: "desc" } },
    }),
  ])

  // Check-in stats
  let checkinStats = { done: 0, total: 0 }
  if (cycle) {
    const now = new Date()
    let currentQ: "Q1" | "Q2" | "Q3" | "Q4" | null = null
    if (now >= cycle.q4Opens) currentQ = "Q4"
    else if (now >= cycle.q3Opens) currentQ = "Q3"
    else if (now >= cycle.q2Opens) currentQ = "Q2"
    else if (now >= cycle.q1Opens) currentQ = "Q1"

    if (currentQ) {
      const [empWithApprovedGoals, empWithCheckins] = await Promise.all([
        prisma.user.count({
          where: {
            role: "employee",
            goals: { some: { cycleId: cycle.id, status: { in: ["approved", "locked"] } } },
          },
        }),
        prisma.checkin
          .findMany({
            where: {
              quarter: currentQ,
              goal: { cycleId: cycle.id },
            },
            select: { employeeId: true },
            distinct: ["employeeId"],
          })
          .then((r) => r.length),
      ])
      checkinStats = { done: empWithCheckins, total: empWithApprovedGoals }
    }
  }

  // Goal stat totals
  const byStatus = Object.fromEntries(goalStats.map((s) => [s.status, s._count._all]))
  const submitted = (byStatus.submitted ?? 0) + (byStatus.approved ?? 0) + (byStatus.locked ?? 0)
  const approved = (byStatus.approved ?? 0) + (byStatus.locked ?? 0)
  const totalGoals = Object.values(byStatus).reduce((a, b) => a + b, 0)

  // Per-department breakdown
  const deptNames = departments.map((d) => d.department).filter(Boolean) as string[]
  const deptGoals = cycle && deptNames.length > 0
    ? await prisma.goal.groupBy({
        by: ["status"],
        where: {
          cycleId: cycle.id,
          employee: { department: { in: deptNames } },
        },
        _count: { _all: true },
      })
    : []

  // Get per-dept submission rate (goals with approved/locked / all employees in dept)
  const deptBreakdown = await Promise.all(
    deptNames.slice(0, 8).map(async (dept) => {
      const [empCount, goalCount, approvedCount] = await Promise.all([
        prisma.user.count({ where: { role: "employee", department: dept } }),
        cycle
          ? prisma.goal.count({
              where: {
                cycleId: cycle.id,
                employee: { department: dept },
                status: { in: ["submitted", "approved", "locked"] },
              },
            })
          : 0,
        cycle
          ? prisma.goal.count({
              where: {
                cycleId: cycle.id,
                employee: { department: dept },
                status: { in: ["approved", "locked"] },
              },
            })
          : 0,
      ])
      return { dept, empCount, goalCount, approvedCount }
    })
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        {cycle && <p className="text-sm text-muted-foreground mt-0.5">{cycle.name}</p>}
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-5 text-blue-500" />}
          label="Employees"
          value={totalEmployees}
          sub={`${totalManagers} managers`}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<ClipboardCheck className="size-5 text-orange-500" />}
          label="Goal Submission Rate"
          value={
            totalEmployees > 0
              ? `${Math.round((submitted / Math.max(totalGoals, 1)) * 100)}%`
              : "—"
          }
          sub={cycle ? `${submitted}/${totalGoals} goals submitted` : "No active cycle"}
          bg="bg-orange-50"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-green-500" />}
          label="Approval Rate"
          value={
            submitted > 0 ? `${Math.round((approved / submitted) * 100)}%` : "—"
          }
          sub={`${approved} approved`}
          bg="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-purple-500" />}
          label="Check-in Rate"
          value={
            checkinStats.total > 0
              ? `${Math.round((checkinStats.done / checkinStats.total) * 100)}%`
              : "—"
          }
          sub={
            checkinStats.total > 0
              ? `${checkinStats.done}/${checkinStats.total} employees`
              : "No open window"
          }
          bg="bg-purple-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department breakdown */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Department Breakdown</h2>
            <Button
              render={<Link href="/admin/users" />}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
            >
              Manage users →
            </Button>
          </div>
          {deptBreakdown.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No department data available.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Department</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Employees</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Submitted</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deptBreakdown.map(({ dept, empCount, goalCount, approvedCount }) => (
                  <tr key={dept} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{dept}</td>
                    <td className="text-center px-3 py-2.5 tabular-nums">{empCount}</td>
                    <td className="text-center px-3 py-2.5 tabular-nums">{goalCount}</td>
                    <td className="text-center px-3 py-2.5 tabular-nums text-green-600 font-medium">
                      {approvedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top alerts */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-destructive" />
              <h2 className="font-semibold">Open Alerts</h2>
              {escalations.length > 0 && (
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {escalations.length}
                </span>
              )}
            </div>
          </div>
          {escalations.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="size-6 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">No open alerts — all clear!</p>
            </div>
          ) : (
            <div className="divide-y max-h-72 overflow-y-auto">
              {escalations.map((esc) => (
                <div key={esc.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0",
                      ESCALATION_COLORS[esc.type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {ESCALATION_LABELS[esc.type] ?? esc.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{esc.employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {esc.employee.department && `${esc.employee.department} · `}
                      Manager: {esc.manager.name}
                      {esc.quarter && ` · ${esc.quarter}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Button render={<Link href="/admin/cycles" />} variant="outline" className="gap-2">
          <Clock className="size-4" />
          Cycle Management
        </Button>
        <Button render={<Link href="/admin/reports" />} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
          <TrendingUp className="size-4" />
          View Reports
        </Button>
        <Button render={<Link href="/admin/audit" />} variant="outline" className="gap-2">
          Audit Log
        </Button>
      </div>
    </div>
  )
}
