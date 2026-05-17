import { redirect } from "next/navigation"
import { format } from "date-fns"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CheckinsClient } from "./_components/CheckinsClient"

export const metadata = { title: "Quarterly Check-ins — Atomberg Portal" }

export default async function EmployeeCheckInsPage() {
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

  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Quarterly Check-ins</h1>
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No active performance cycle found.
          </p>
        </div>
      </div>
    )
  }

  const goals = await prisma.goal.findMany({
    where: {
      employeeId: session.user.id,
      cycleId: cycle.id,
      status: { in: ["approved", "locked"] },
    },
    select: {
      id: true,
      title: true,
      thrustArea: true,
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
    orderBy: { createdAt: "asc" },
  })

  // Determine current (open) quarter
  const now = new Date()
  let openQuarter: "Q1" | "Q2" | "Q3" | "Q4" | null = null
  if (now >= cycle.q4Opens) openQuarter = "Q4"
  else if (now >= cycle.q3Opens) openQuarter = "Q3"
  else if (now >= cycle.q2Opens) openQuarter = "Q2"
  else if (now >= cycle.q1Opens) openQuarter = "Q1"

  // Next quarter info for banner
  type QLabel = "Q1" | "Q2" | "Q3" | "Q4"
  const nextMap: Record<QLabel, { label: string; opens: Date } | null> = {
    Q1: { label: "Q2", opens: cycle.q2Opens },
    Q2: { label: "Q3", opens: cycle.q3Opens },
    Q3: { label: "Q4", opens: cycle.q4Opens },
    Q4: null,
  }
  const nextQuarter = openQuarter ? nextMap[openQuarter] : { label: "Q1", opens: cycle.q1Opens }

  const quarterOpens: Record<string, string> = {
    Q1: cycle.q1Opens.toISOString(),
    Q2: cycle.q2Opens.toISOString(),
    Q3: cycle.q3Opens.toISOString(),
    Q4: cycle.q4Opens.toISOString(),
  }

  // Serialize goals
  const serializedGoals = goals.map((g) => ({
    id: g.id,
    title: g.title,
    thrustArea: g.thrustArea,
    uomType: g.uomType,
    targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
    weightage: Number(g.weightage),
    achievements: g.achievements.map((a) => ({
      quarter: a.quarter,
      actualValue: a.actualValue !== null ? Number(a.actualValue) : null,
      actualDate: a.actualDate ? a.actualDate.toISOString() : null,
      progressStatus: a.progressStatus,
      computedScore: a.computedScore !== null ? Number(a.computedScore) : null,
    })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Quarterly Check-ins — {cycle.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Record your actual progress for each goal each quarter.
        </p>
      </div>

      {/* Active quarter banner */}
      {openQuarter ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="inline-flex size-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <span>
            <strong>{openQuarter}</strong> check-in window is{" "}
            <strong>OPEN</strong>
            {nextQuarter && (
              <span className="text-green-700 font-normal">
                {" "}
                · Next: {nextQuarter.label} opens{" "}
                {format(nextQuarter.opens, "MMMM d")}
              </span>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span>No check-in window currently active.</span>
          {nextQuarter && (
            <span>
              Next: {nextQuarter.label} opens{" "}
              {format(nextQuarter.opens, "MMMM d, yyyy")}
            </span>
          )}
        </div>
      )}

      {/* No approved goals */}
      {serializedGoals.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No approved goals found for this cycle. Goals must be approved by
            your manager before you can record achievements.
          </p>
        </div>
      ) : (
        <CheckinsClient
          goals={serializedGoals}
          openQuarter={openQuarter}
          quarterOpens={quarterOpens}
        />
      )}
    </div>
  )
}
