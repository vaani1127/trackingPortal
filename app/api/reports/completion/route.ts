import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const department = searchParams.get("department")
  const managerId = searchParams.get("managerId")

  let cycleId = searchParams.get("cycleId")
  if (!cycleId) {
    const active = await prisma.cycle.findFirst({
      where: { status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    cycleId = active?.id ?? null
  }
  if (!cycleId) return NextResponse.json({ employees: [], managerSummaries: [] })

  const empWhere: Record<string, unknown> = { role: "employee" }
  if (department) empWhere.department = department
  if (managerId) empWhere.managerId = managerId

  const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const

  const employees = await prisma.user.findMany({
    where: empWhere,
    select: {
      id: true,
      name: true,
      department: true,
      manager: { select: { id: true, name: true } },
      goals: {
        where: { cycleId, isShared: false },
        select: {
          id: true,
          status: true,
          achievements: { select: { quarter: true, actualValue: true } },
          checkins: { select: { quarter: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  type PhaseStatus = "done" | "partial" | "missing" | "na"

  function goalSettingStatus(goals: typeof employees[number]["goals"]): PhaseStatus {
    if (goals.length === 0) return "missing"
    const approved = goals.filter((g) => g.status === "approved" || g.status === "locked")
    if (approved.length === goals.length) return "done"
    if (approved.length > 0) return "partial"
    return "missing"
  }

  function quarterStatus(
    goals: typeof employees[number]["goals"],
    q: (typeof QUARTERS)[number]
  ): PhaseStatus {
    const approved = goals.filter((g) => g.status === "approved" || g.status === "locked")
    if (approved.length === 0) return "na"
    let hasAch = 0
    let hasCheckin = 0
    for (const g of approved) {
      if (g.achievements.some((a) => a.quarter === q && a.actualValue !== null)) hasAch++
      if (g.checkins.some((c) => c.quarter === q)) hasCheckin++
    }
    if (hasAch === approved.length && hasCheckin > 0) return "done"
    if (hasAch > 0 || hasCheckin > 0) return "partial"
    return "missing"
  }

  const rows = employees.map((emp) => ({
    employeeId: emp.id,
    employeeName: emp.name,
    department: emp.department,
    managerName: emp.manager?.name ?? null,
    managerId: emp.manager?.id ?? null,
    goalSetting: goalSettingStatus(emp.goals),
    Q1: quarterStatus(emp.goals, "Q1"),
    Q2: quarterStatus(emp.goals, "Q2"),
    Q3: quarterStatus(emp.goals, "Q3"),
    Q4: quarterStatus(emp.goals, "Q4"),
  }))

  // Manager-level aggregates
  const managerMap = new Map<string, { name: string; total: number; gs: number; q1: number; q2: number; q3: number; q4: number }>()
  for (const row of rows) {
    if (!row.managerId || !row.managerName) continue
    const entry = managerMap.get(row.managerId) ?? { name: row.managerName, total: 0, gs: 0, q1: 0, q2: 0, q3: 0, q4: 0 }
    entry.total++
    if (row.goalSetting === "done") entry.gs++
    if (row.Q1 === "done") entry.q1++
    if (row.Q2 === "done") entry.q2++
    if (row.Q3 === "done") entry.q3++
    if (row.Q4 === "done") entry.q4++
    managerMap.set(row.managerId, entry)
  }

  const managerSummaries = Array.from(managerMap.entries()).map(([id, m]) => ({
    managerId: id,
    managerName: m.name,
    teamSize: m.total,
    goalSettingPct: m.total > 0 ? Math.round((m.gs / m.total) * 100) : 0,
    q1Pct: m.total > 0 ? Math.round((m.q1 / m.total) * 100) : 0,
    q2Pct: m.total > 0 ? Math.round((m.q2 / m.total) * 100) : 0,
    q3Pct: m.total > 0 ? Math.round((m.q3 / m.total) * 100) : 0,
    q4Pct: m.total > 0 ? Math.round((m.q4 / m.total) * 100) : 0,
  }))

  return NextResponse.json({ employees: rows, managerSummaries })
}
