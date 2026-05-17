import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { sendEmail, EmailTemplates, sendTeamsCard, TeamsTemplates } from "@/lib/notifications"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { employee: { select: { id: true, name: true, email: true, managerId: true } } },
  })

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!["approved", "locked"].includes(goal.status)) {
    return NextResponse.json(
      { error: `Cannot unlock a goal with status '${goal.status}'` },
      { status: 400 }
    )
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: { status: "draft", lockedAt: null, lockedById: null },
  })

  await prisma.auditLog.create({
    data: { entityType: "Goal", entityId: id, goalId: id, changedById: session.user.id, action: "unlocked" },
  })

  // Fire-and-forget: notify employee and manager
  void (async () => {
    const sends: Promise<unknown>[] = [
      sendEmail(goal.employee.email, EmailTemplates.goalUnlocked(goal.employee.name, goal.title)),
      sendTeamsCard(TeamsTemplates.goalUnlocked(goal.employee.name, goal.title)),
    ]
    if (goal.employee.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: goal.employee.managerId },
        select: { email: true, name: true },
      })
      if (manager?.email) {
        sends.push(sendEmail(manager.email, EmailTemplates.goalUnlocked(`${goal.employee.name}'s`, goal.title)))
      }
    }
    await Promise.all(sends)
  })()

  return NextResponse.json({
    ...updated,
    weightage: Number(updated.weightage),
    targetValue: updated.targetValue !== null ? Number(updated.targetValue) : null,
  })
}
