import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { sendEmail, EmailTemplates } from "@/lib/notifications"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { employee: { select: { id: true, name: true, email: true, managerId: true } } },
  })

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (goal.employee.managerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (goal.status !== "submitted") {
    return NextResponse.json(
      { error: `Cannot approve a goal with status '${goal.status}'` },
      { status: 400 }
    )
  }

  const now = new Date()

  // Atomically approve this goal, then lock ALL goals if no submitted goals remain.
  const { finalGoal, allLocked } = await prisma.$transaction(async (tx) => {
    // Step 1: approve this goal
    await tx.goal.update({
      where: { id },
      data: { status: "approved", lockedAt: now, lockedById: session.user.id },
    })

    await tx.auditLog.create({
      data: {
        entityType: "Goal",
        entityId: id,
        goalId: id,
        changedById: session.user.id,
        action: "approved",
      },
    })

    // Step 2: check if any other goal for this employee is still submitted
    const remainingSubmitted = await tx.goal.count({
      where: {
        employeeId: goal.employeeId,
        cycleId: goal.cycleId,
        id: { not: id },
        status: "submitted",
      },
    })

    if (remainingSubmitted > 0) {
      const finalGoal = await tx.goal.findUnique({ where: { id } })
      return { finalGoal: finalGoal!, allLocked: false }
    }

    // Step 3: no submitted goals left — lock ALL approved goals atomically
    const goalsToLock = await tx.goal.findMany({
      where: {
        employeeId: goal.employeeId,
        cycleId: goal.cycleId,
        status: { in: ["approved"] },
      },
      select: { id: true },
    })

    // Include the just-approved goal which is now "approved" in the DB
    const lockIds = goalsToLock.map((g) => g.id)

    await tx.goal.updateMany({
      where: { id: { in: lockIds } },
      data: { status: "locked" },
    })

    await tx.auditLog.createMany({
      data: lockIds.map((gid) => ({
        entityType: "Goal",
        entityId: gid,
        goalId: gid,
        changedById: session.user.id,
        action: "locked" as const,
      })),
    })

    const finalGoal = await tx.goal.findUnique({ where: { id } })
    return { finalGoal: finalGoal!, allLocked: true }
  })

  // Fire-and-forget: notify employee when all goals are locked
  if (allLocked) {
    void (async () => {
      const [manager, cycle] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
        prisma.cycle.findUnique({ where: { id: goal.cycleId }, select: { name: true } }),
      ])
      await sendEmail(
        goal.employee.email,
        EmailTemplates.goalApproved(
          goal.employee.name,
          manager?.name ?? "Your manager",
          cycle?.name ?? "this cycle"
        )
      )
    })()
  }

  return NextResponse.json({
    ...finalGoal,
    weightage: Number(finalGoal.weightage),
    targetValue: finalGoal.targetValue !== null ? Number(finalGoal.targetValue) : null,
  })
}
