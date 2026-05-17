import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CheckinContent } from "./_components/CheckinContent"

export const metadata = { title: "Check-ins — Atomberg Portal" }

export default async function CheckInsPage() {
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

  const directReports = await prisma.user.findMany({
    where: { managerId: session.user.id },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  })

  const reportIds = directReports.map((r) => r.id)

  const [goals, checkins] = await Promise.all([
    prisma.goal.findMany({
      where: {
        employeeId: { in: reportIds },
        cycleId: cycle?.id ?? "__none__",
        status: { in: ["approved", "locked"] },
      },
      select: {
        id: true,
        employeeId: true,
        title: true,
        uomType: true,
        targetValue: true,
        targetDate: true,
        weightage: true,
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
    }),
    prisma.checkin.findMany({
      where: {
        managerId: session.user.id,
        employeeId: { in: reportIds },
        ...(cycle && { goal: { cycleId: cycle.id } }),
      },
      select: { id: true, employeeId: true, goalId: true, quarter: true, comment: true },
    }),
  ])

  // Serialize Decimals
  const serializedGoals = goals.map((g) => ({
    ...g,
    targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
    weightage: Number(g.weightage),
    achievements: g.achievements.map((a) => ({
      ...a,
      actualValue: a.actualValue !== null ? Number(a.actualValue) : null,
      computedScore: a.computedScore !== null ? Number(a.computedScore) : null,
      actualDate: a.actualDate ? a.actualDate.toISOString() : null,
    })),
  }))

  // Compute current quarter
  const now = new Date()
  let currentQuarter: "Q1" | "Q2" | "Q3" | "Q4" | null = null
  if (cycle) {
    if (now >= cycle.q4Opens) currentQuarter = "Q4"
    else if (now >= cycle.q3Opens) currentQuarter = "Q3"
    else if (now >= cycle.q2Opens) currentQuarter = "Q2"
    else if (now >= cycle.q1Opens) currentQuarter = "Q1"
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Quarterly Check-ins</h1>
        {cycle && (
          <p className="text-sm text-muted-foreground mt-0.5">{cycle.name}</p>
        )}
      </div>

      {directReports.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No direct reports found.</p>
        </div>
      ) : (
        <CheckinContent
          employees={directReports}
          goals={serializedGoals}
          checkins={checkins}
          cycleId={cycle?.id ?? ""}
          currentQuarter={currentQuarter}
        />
      )}
    </div>
  )
}
