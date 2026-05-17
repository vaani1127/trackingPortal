import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const quarters = searchParams.getAll("quarter")  // multi-value: ?quarter=Q1&quarter=Q2
  const department = searchParams.get("department")
  const search = searchParams.get("search")?.toLowerCase()

  let cycleId = searchParams.get("cycleId")
  if (!cycleId) {
    const active = await prisma.cycle.findFirst({
      where: { status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    cycleId = active?.id ?? null
  }
  if (!cycleId) return NextResponse.json({ employees: [], orgAvg: null })

  const empWhere: Record<string, unknown> = { role: "employee" }
  if (department) empWhere.department = department

  const employees = await prisma.user.findMany({
    where: empWhere,
    select: {
      id: true,
      name: true,
      department: true,
      manager: { select: { name: true } },
      goals: {
        where: {
          cycleId,
          status: { in: ["approved", "locked"] },
          isShared: false,
        },
        select: {
          id: true,
          title: true,
          thrustArea: true,
          uomType: true,
          targetValue: true,
          weightage: true,
          achievements: {
            where: quarters.length > 0 ? { quarter: { in: quarters as ("Q1" | "Q2" | "Q3" | "Q4")[] } } : undefined,
            select: { quarter: true, actualValue: true, computedScore: true, progressStatus: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // Compute weighted Q-score for a set of goals for a specific quarter
  function weightedQScore(
    goals: typeof employees[number]["goals"],
    q: string
  ): number | null {
    let weightSum = 0
    let scoreSum = 0
    for (const goal of goals) {
      const ach = goal.achievements.find((a) => a.quarter === q)
      if (!ach || ach.computedScore === null) continue
      const w = Number(goal.weightage)
      weightSum += w
      scoreSum += Number(ach.computedScore) * w
    }
    return weightSum > 0 ? scoreSum / weightSum : null
  }

  const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const

  const rows = employees
    .filter((emp) => !search || emp.name.toLowerCase().includes(search))
    .map((emp) => {
      const q1 = weightedQScore(emp.goals, "Q1")
      const q2 = weightedQScore(emp.goals, "Q2")
      const q3 = weightedQScore(emp.goals, "Q3")
      const q4 = weightedQScore(emp.goals, "Q4")
      const nonNull = [q1, q2, q3, q4].filter((s): s is number => s !== null)
      const avgScore = nonNull.length > 0 ? nonNull.reduce((s, v) => s + v, 0) / nonNull.length : null

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        managerName: emp.manager?.name ?? null,
        goalCount: emp.goals.length,
        q1Score: q1,
        q2Score: q2,
        q3Score: q3,
        q4Score: q4,
        avgScore,
      }
    })

  // Org-level averages
  function orgAvgQ(q: keyof typeof QUARTERS) {
    const scores = rows.map((r) => [r.q1Score, r.q2Score, r.q3Score, r.q4Score][q]).filter((s): s is number => s !== null)
    return scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null
  }

  const allAvg = rows.map((r) => r.avgScore).filter((s): s is number => s !== null)

  return NextResponse.json({
    employees: rows,
    orgAvg: {
      q1: orgAvgQ(0),
      q2: orgAvgQ(1),
      q3: orgAvgQ(2),
      q4: orgAvgQ(3),
      avg: allAvg.length > 0 ? allAvg.reduce((s, v) => s + v, 0) / allAvg.length : null,
    },
  })
}
