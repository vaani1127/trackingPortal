import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { sendEmail, EmailTemplates } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  let body: { comment?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const comment = body.comment?.trim()
  if (!comment) {
    return NextResponse.json({ error: "A return comment is required" }, { status: 400 })
  }

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { employee: { select: { id: true, name: true, email: true, managerId: true } } },
  })

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (goal.employee.managerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!["submitted", "approved"].includes(goal.status)) {
    return NextResponse.json(
      { error: `Cannot return a goal with status '${goal.status}'` },
      { status: 400 }
    )
  }

  const [updated] = await prisma.$transaction([
    prisma.goal.update({
      where: { id },
      data: { status: "returned", lockedAt: null, lockedById: null },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "Goal",
        entityId: id,
        goalId: id,
        changedById: session.user.id,
        action: "returned",
        newValue: comment,
      },
    }),
  ])

  // Fire-and-forget: notify employee
  void (async () => {
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    })
    await sendEmail(
      goal.employee.email,
      EmailTemplates.goalReturned(goal.employee.name, goal.title, comment, manager?.name ?? "Your manager")
    )
  })()

  return NextResponse.json({
    ...updated,
    weightage: Number(updated.weightage),
    targetValue: updated.targetValue !== null ? Number(updated.targetValue) : null,
  })
}
