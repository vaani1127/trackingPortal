import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") ?? "achievement"
  const department = searchParams.get("department")
  const managerId = searchParams.get("managerId")

  // Resolve cycle
  const cycleIdParam = searchParams.get("cycleId")
  let cycleId = cycleIdParam
  if (!cycleId) {
    const cycle = await prisma.cycle.findFirst({
      where: { status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    cycleId = cycle?.id ?? null
  }
  if (!cycleId) return NextResponse.json({ rows: [] })

  // Common employee filter
  const empWhere: Record<string, unknown> = { role: "employee" }
  if (department) empWhere.department = department
  if (managerId) empWhere.managerId = managerId

  if (type === "completion") {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      select: { q1Opens: true, q2Opens: true, q3Opens: true, q4Opens: true },
    })
    if (!cycle) return NextResponse.json({ rows: [] })

    const employees = await prisma.user.findMany({
      where: empWhere,
      select: {
        id: true,
        name: true,
        department: true,
        managerId: true,
        manager: { select: { name: true } },
        goals: {
          where: { cycleId },
          select: {
            id: true,
            status: true,
            checkins: {
              select: { quarter: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const now = new Date()
    const qOpen = (q: Date, next: Date | null) =>
      now >= q && (next === null || now < next)

    const rows = employees.map((emp) => {
      const goals = emp.goals
      const hasGoals = goals.length > 0
      const allApproved =
        hasGoals && goals.every((g) => ["approved", "locked"].includes(g.status))
      const someSubmitted = goals.some((g) =>
        ["submitted", "approved", "locked"].includes(g.status)
      )

      const goalSetting: "done" | "partial" | "missing" | "na" = !hasGoals
        ? "na"
        : allApproved
        ? "done"
        : someSubmitted
        ? "partial"
        : "missing"

      function checkinStatus(
        q: string,
        opens: Date,
        next: Date | null
      ): "done" | "partial" | "missing" | "na" {
        if (!hasGoals || !allApproved) return "na"
        if (now < opens) return "na"
        const approvedGoals = goals.filter((g) => ["approved", "locked"].includes(g.status))
        const done = approvedGoals.filter((g) =>
          g.checkins.some((c) => c.quarter === q)
        ).length
        if (done === 0) return qOpen(opens, next) ? "missing" : "missing"
        if (done >= approvedGoals.length) return "done"
        return "partial"
      }

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        managerId: emp.managerId,
        managerName: emp.manager?.name ?? null,
        goalSetting,
        Q1: checkinStatus("Q1", cycle.q1Opens, cycle.q2Opens),
        Q2: checkinStatus("Q2", cycle.q2Opens, cycle.q3Opens),
        Q3: checkinStatus("Q3", cycle.q3Opens, cycle.q4Opens),
        Q4: checkinStatus("Q4", cycle.q4Opens, null),
      }
    })

    return NextResponse.json({ rows })
  }

  // Achievement report
  const quarterFilter = searchParams.get("quarter")

  const employees = await prisma.user.findMany({
    where: empWhere,
    select: {
      id: true,
      name: true,
      department: true,
      goals: {
        where: {
          cycleId,
          status: { in: ["approved", "locked"] },
          isShared: false, // exclude copies of shared goals to avoid duplicates
        },
        select: {
          id: true,
          title: true,
          thrustArea: true,
          uomType: true,
          targetValue: true,
          weightage: true,
          achievements: {
            where: quarterFilter ? { quarter: quarterFilter as "Q1" | "Q2" | "Q3" | "Q4" } : undefined,
            select: {
              quarter: true,
              actualValue: true,
              computedScore: true,
              progressStatus: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const rows = employees.flatMap((emp) =>
    emp.goals.map((goal) => {
      const byQ = (q: string) => goal.achievements.find((a) => a.quarter === q)
      const q1 = byQ("Q1")
      const q2 = byQ("Q2")
      const q3 = byQ("Q3")
      const q4 = byQ("Q4")
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department ?? "—",
        thrustArea: goal.thrustArea,
        title: goal.title,
        uomType: goal.uomType,
        targetValue: goal.targetValue !== null ? Number(goal.targetValue) : null,
        weightage: Number(goal.weightage),
        q1Actual: q1?.actualValue !== null && q1?.actualValue !== undefined ? Number(q1.actualValue) : null,
        q1Score: q1?.computedScore !== null && q1?.computedScore !== undefined ? Number(q1.computedScore) : null,
        q2Actual: q2?.actualValue !== null && q2?.actualValue !== undefined ? Number(q2.actualValue) : null,
        q2Score: q2?.computedScore !== null && q2?.computedScore !== undefined ? Number(q2.computedScore) : null,
        q3Actual: q3?.actualValue !== null && q3?.actualValue !== undefined ? Number(q3.actualValue) : null,
        q3Score: q3?.computedScore !== null && q3?.computedScore !== undefined ? Number(q3.computedScore) : null,
        q4Actual: q4?.actualValue !== null && q4?.actualValue !== undefined ? Number(q4.actualValue) : null,
        q4Score: q4?.computedScore !== null && q4?.computedScore !== undefined ? Number(q4.computedScore) : null,
        progressStatus: q4?.progressStatus ?? q3?.progressStatus ?? q2?.progressStatus ?? q1?.progressStatus ?? "not_started",
      }
    })
  )

  return NextResponse.json({ rows })
}
