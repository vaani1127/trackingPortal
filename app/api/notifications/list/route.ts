import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const TYPE_LABELS: Record<string, string> = {
  goal_not_submitted: "Goals not submitted",
  goal_not_approved: "Goals awaiting approval",
  checkin_missed: "Check-in missed",
}

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ items: [] })

  const { role, id } = session.user

  const where =
    role === "manager"
      ? { managerId: id, status: "open" as const }
      : role === "admin"
      ? { status: "open" as const }
      : null

  if (!where) return NextResponse.json({ items: [] })

  const escalations = await prisma.escalation.findMany({
    where,
    include: {
      employee: { select: { name: true, department: true } },
    },
    orderBy: { triggeredAt: "desc" },
    take: 20,
  })

  return NextResponse.json({
    items: escalations.map((e) => ({
      id: e.id,
      type: e.type,
      label: TYPE_LABELS[e.type] ?? e.type,
      employeeName: e.employee.name,
      department: e.employee.department,
      quarter: e.quarter,
      triggeredAt: e.triggeredAt.toISOString(),
    })),
  })
}
