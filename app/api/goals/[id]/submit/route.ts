import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { sendEmail, EmailTemplates } from "@/lib/notifications"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const goal = await prisma.goal.findFirst({
    where: { id, employeeId: session.user.id },
    select: { id: true, cycleId: true, employeeId: true },
  })

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  // Rule 4: must be within the goal-setting phase window
  const cycle = await prisma.cycle.findUnique({
    where: { id: goal.cycleId },
    select: { phase1Opens: true, q1Opens: true, q2Opens: true },
  })
  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  }
  const now = new Date()
  if (now < cycle.phase1Opens) {
    return NextResponse.json({ error: "Goal setting window has not opened yet" }, { status: 400 })
  }
  if (now >= cycle.q2Opens) {
    return NextResponse.json({ error: "Goal setting window is closed" }, { status: 400 })
  }

  const allGoals = await prisma.goal.findMany({
    where: { employeeId: session.user.id, cycleId: goal.cycleId },
    select: { id: true, title: true, weightage: true, status: true },
  })

  const totalWeightage = allGoals.reduce((sum, g) => sum + Number(g.weightage), 0)
  if (Math.abs(totalWeightage - 100) > 0.01) {
    return NextResponse.json(
      { error: `Total weightage must equal 100%. Current total: ${totalWeightage}%`, totalWeightage },
      { status: 400 }
    )
  }

  const draftGoals = allGoals.filter((g) => g.status === "draft")
  if (draftGoals.length === 0) {
    return NextResponse.json({ error: "No draft goals to submit" }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.goal.updateMany({
      where: { employeeId: session.user.id, cycleId: goal.cycleId, status: "draft" },
      data: { status: "submitted" },
    })
    await tx.auditLog.createMany({
      data: draftGoals.map((g) => ({
        entityType: "Goal",
        entityId: g.id,
        goalId: g.id,
        changedById: session.user.id,
        action: "submitted" as const,
      })),
    })
  })

  // Fire-and-forget: notify manager
  if (session.user.managerId) {
    void (async () => {
      const [employee, manager] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: session.user.managerId! }, select: { name: true, email: true } }),
      ])
      if (employee?.name && manager?.email) {
        await sendEmail(
          manager.email,
          EmailTemplates.goalSubmitted(employee.name, manager.name, draftGoals.length)
        )
      }
    })()
  }

  const updatedGoals = await prisma.goal.findMany({
    where: { employeeId: session.user.id, cycleId: goal.cycleId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(
    updatedGoals.map((g) => ({
      ...g,
      weightage: Number(g.weightage),
      targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
    }))
  )
}
