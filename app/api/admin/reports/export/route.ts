import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { generateAchievementReport, generateCSV, type ReportRow } from "@/lib/export"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "xlsx"
  const department = searchParams.get("department")

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
  if (!cycleId) {
    return new Response("No active cycle", { status: 404 })
  }

  const empWhere: Record<string, unknown> = { role: "employee" }
  if (department) empWhere.department = department

  const employees = await prisma.user.findMany({
    where: empWhere,
    select: {
      name: true,
      department: true,
      goals: {
        where: { cycleId, status: { in: ["approved", "locked"] }, isShared: false },
        select: {
          thrustArea: true,
          title: true,
          uomType: true,
          targetValue: true,
          achievements: {
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

  const rows: ReportRow[] = employees.flatMap((emp) =>
    emp.goals.map((goal) => {
      const byQ = (q: string) => goal.achievements.find((a) => a.quarter === q)
      const q1 = byQ("Q1")
      const q2 = byQ("Q2")
      const q3 = byQ("Q3")
      const q4 = byQ("Q4")
      return {
        employeeName: emp.name,
        department: emp.department ?? "—",
        thrustArea: goal.thrustArea,
        title: goal.title,
        uomType: goal.uomType,
        targetValue: goal.targetValue !== null ? Number(goal.targetValue) : null,
        q1Actual: q1?.actualValue !== null && q1?.actualValue !== undefined ? Number(q1.actualValue) : null,
        q1Score: q1?.computedScore !== null && q1?.computedScore !== undefined ? Number(q1.computedScore) : null,
        q2Actual: q2?.actualValue !== null && q2?.actualValue !== undefined ? Number(q2.actualValue) : null,
        q2Score: q2?.computedScore !== null && q2?.computedScore !== undefined ? Number(q2.computedScore) : null,
        q3Actual: q3?.actualValue !== null && q3?.actualValue !== undefined ? Number(q3.actualValue) : null,
        q3Score: q3?.computedScore !== null && q3?.computedScore !== undefined ? Number(q3.computedScore) : null,
        q4Actual: q4?.actualValue !== null && q4?.actualValue !== undefined ? Number(q4.actualValue) : null,
        q4Score: q4?.computedScore !== null && q4?.computedScore !== undefined ? Number(q4.computedScore) : null,
        progressStatus:
          q4?.progressStatus ?? q3?.progressStatus ?? q2?.progressStatus ?? q1?.progressStatus ?? "not_started",
      }
    })
  )

  if (format === "csv") {
    const csv = generateCSV(rows)
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=achievement-report.csv",
      },
    })
  }

  const buffer = generateAchievementReport(rows)
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=achievement-report.xlsx",
    },
  })
}
