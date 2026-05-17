import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// ─── Helper: resolve cycle ────────────────────────────────────────────────────

async function resolveCycleId(param: string | null): Promise<string | null> {
  if (param) return param
  const cycle = await prisma.cycle.findFirst({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  return cycle?.id ?? null
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CellStatus = "done" | "partial" | "missing" | "na"

// ─── GET /api/analytics ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") ?? "heatmap"
  const cycleIdParam = searchParams.get("cycleId")
  const department = searchParams.get("department")

  const cycleId = await resolveCycleId(cycleIdParam)
  if (!cycleId) return NextResponse.json({ error: "No active cycle" }, { status: 404 })

  // ── heatmap ──────────────────────────────────────────────────────────────────
  if (type === "heatmap") {
    const empWhere: Record<string, unknown> = { role: "employee" }
    if (department && department !== "all") empWhere.department = department

    const [employees, cycle] = await Promise.all([
      prisma.user.findMany({
        where: empWhere,
        select: {
          id: true,
          name: true,
          department: true,
          goals: {
            where: { cycleId },
            select: {
              id: true,
              status: true,
              checkins: { select: { quarter: true, employeeId: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.cycle.findUnique({
        where: { id: cycleId },
        select: {
          q1Opens: true,
          q2Opens: true,
          q3Opens: true,
          q4Opens: true,
        },
      }),
    ])

    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

    const now = new Date()
    const phases = ["goal_setting", "Q1", "Q2", "Q3", "Q4"] as const

    const qOpens: Record<string, Date> = {
      Q1: cycle.q1Opens,
      Q2: cycle.q2Opens,
      Q3: cycle.q3Opens,
      Q4: cycle.q4Opens,
    }

    const data: Record<string, CellStatus> = {}

    for (const emp of employees) {
      const goals = emp.goals
      const hasGoals = goals.length > 0
      const allApproved =
        hasGoals && goals.every((g) => g.status === "approved" || g.status === "locked")
      const someSubmitted = goals.some(
        (g) =>
          g.status === "submitted" || g.status === "approved" || g.status === "locked"
      )

      // goal_setting
      const gsStatus: CellStatus = !hasGoals
        ? "na"
        : allApproved
        ? "done"
        : someSubmitted
        ? "partial"
        : "missing"
      data[`${emp.id}|goal_setting`] = gsStatus

      // Q1-Q4
      const approvedGoals = goals.filter(
        (g) => g.status === "approved" || g.status === "locked"
      )

      for (const q of ["Q1", "Q2", "Q3", "Q4"] as const) {
        if (!hasGoals || !allApproved) {
          data[`${emp.id}|${q}`] = "na"
          continue
        }
        const opens = qOpens[q]
        if (now < opens) {
          data[`${emp.id}|${q}`] = "na"
          continue
        }
        const checkedGoals = approvedGoals.filter((g) =>
          g.checkins.some((c) => c.quarter === q)
        ).length
        if (checkedGoals === 0) {
          data[`${emp.id}|${q}`] = "missing"
        } else if (checkedGoals >= approvedGoals.length) {
          data[`${emp.id}|${q}`] = "done"
        } else {
          data[`${emp.id}|${q}`] = "partial"
        }
      }
    }

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        department: e.department,
      })),
      phases: [...phases],
      data,
    })
  }

  // ── trends ───────────────────────────────────────────────────────────────────
  if (type === "trends") {
    const achievements = await prisma.achievement.findMany({
      where: {
        computedScore: { not: null },
        goal: {
          cycleId,
          status: { in: ["approved", "locked"] },
        },
      },
      select: {
        quarter: true,
        computedScore: true,
        goal: {
          select: {
            employee: {
              select: { department: true },
            },
          },
        },
      },
    })

    // Group by dept + quarter
    type GroupKey = string // dept|quarter
    const groups = new Map<GroupKey, number[]>()
    const overallByQ = new Map<string, number[]>()

    const allDepts = new Set<string>()

    for (const a of achievements) {
      const dept = a.goal.employee.department ?? "Unknown"
      const q = a.quarter
      const score = Number(a.computedScore!)

      allDepts.add(dept)

      const key = `${dept}|${q}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(score)

      if (!overallByQ.has(q)) overallByQ.set(q, [])
      overallByQ.get(q)!.push(score)
    }

    const quarters = ["Q1", "Q2", "Q3", "Q4"]
    const departments = [...allDepts].sort()

    function avg(arr: number[]): number | null {
      if (!arr || arr.length === 0) return null
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
    }

    const series: { name: string; data: (number | null)[]; isOverall: boolean }[] = []

    // Overall series
    series.push({
      name: "Overall",
      data: quarters.map((q) => avg(overallByQ.get(q) ?? [])),
      isOverall: true,
    })

    // Per-dept series
    for (const dept of departments) {
      series.push({
        name: dept,
        data: quarters.map((q) => avg(groups.get(`${dept}|${q}`) ?? [])),
        isOverall: false,
      })
    }

    return NextResponse.json({ quarters, departments, series })
  }

  // ── distribution ─────────────────────────────────────────────────────────────
  if (type === "distribution") {
    const goals = await prisma.goal.findMany({
      where: {
        cycleId,
        isShared: false,
        status: { in: ["approved", "locked", "submitted"] },
      },
      select: { thrustArea: true, uomType: true },
    })

    const thrustMap = new Map<string, number>()
    const uomMap = new Map<string, number>()
    for (const g of goals) {
      thrustMap.set(g.thrustArea, (thrustMap.get(g.thrustArea) ?? 0) + 1)
      uomMap.set(g.uomType, (uomMap.get(g.uomType) ?? 0) + 1)
    }

    return NextResponse.json({
      thrustAreas: [...thrustMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
      uomTypes: [...uomMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
    })
  }

  // ── manager-effectiveness ─────────────────────────────────────────────────────
  if (type === "manager-effectiveness") {
    const managers = await prisma.user.findMany({
      where: { role: "manager" },
      select: {
        id: true,
        name: true,
        reports: {
          where: { role: "employee" },
          select: {
            id: true,
            goals: {
              where: {
                cycleId,
                status: { in: ["approved", "locked"] },
              },
              select: {
                id: true,
                checkins: { select: { quarter: true, employeeId: true } },
              },
            },
          },
        },
      },
    })

    const result = managers
      .filter((m) => m.reports.length > 0)
      .map((m) => {
        const teamSize = m.reports.length
        // employees with at least one approved goal
        const empsWithGoals = m.reports.filter((r) => r.goals.length > 0)

        function qRate(q: string): number {
          if (empsWithGoals.length === 0) return 0
          const done = empsWithGoals.filter((emp) =>
            emp.goals.some((g) => g.checkins.some((c) => c.quarter === q))
          ).length
          return Math.round((done / empsWithGoals.length) * 100)
        }

        const Q1 = qRate("Q1")
        const Q2 = qRate("Q2")
        const Q3 = qRate("Q3")
        const Q4 = qRate("Q4")
        const avgCompletion = Math.round((Q1 + Q2 + Q3 + Q4) / 4)

        return {
          managerId: m.id,
          managerName: m.name,
          teamSize,
          Q1,
          Q2,
          Q3,
          Q4,
          avgCompletion,
        }
      })
      .sort((a, b) => b.avgCompletion - a.avgCompletion)

    return NextResponse.json(result)
  }

  // ── performers ───────────────────────────────────────────────────────────────
  if (type === "performers") {
    const employees = await prisma.user.findMany({
      where: { role: "employee" },
      select: {
        id: true,
        name: true,
        department: true,
        manager: { select: { name: true } },
        goals: {
          where: {
            cycleId,
            status: { in: ["approved", "locked"] },
          },
          select: {
            achievements: {
              where: { computedScore: { not: null } },
              select: { quarter: true, computedScore: true },
            },
          },
        },
      },
    })

    type PerformerRow = {
      id: string
      name: string
      department: string | null
      managerName: string | null
      avgScore: number
      q1Score: number | null
      q2Score: number | null
    }

    const rows: PerformerRow[] = []

    for (const emp of employees) {
      const allAchievements = emp.goals.flatMap((g) => g.achievements)
      if (allAchievements.length === 0) continue

      const scores = allAchievements.map((a) => Number(a.computedScore!))
      const avgScore =
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10

      function qScore(q: string): number | null {
        const qAchs = allAchievements.filter((a) => a.quarter === q)
        if (qAchs.length === 0) return null
        const s = qAchs.map((a) => Number(a.computedScore!))
        return Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10
      }

      rows.push({
        id: emp.id,
        name: emp.name,
        department: emp.department,
        managerName: emp.manager?.name ?? null,
        avgScore,
        q1Score: qScore("Q1"),
        q2Score: qScore("Q2"),
      })
    }

    rows.sort((a, b) => b.avgScore - a.avgScore)

    return NextResponse.json({
      top: rows.slice(0, 10),
      bottom: rows.slice(-10).reverse(),
    })
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}
