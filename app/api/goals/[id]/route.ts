import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

/** PATCH — manager inline-edit of targetValue/weightage before approval */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { employee: { select: { managerId: true } } },
  })

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = goal.employeeId === session.user.id
  const isManager =
    session.user.role === "manager" &&
    goal.employee.managerId === session.user.id
  const isAdmin = session.user.role === "admin"

  if (!isOwner && !isManager && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (goal.status === "locked" || (goal.lockedAt && !isAdmin)) {
    return NextResponse.json({ error: "Goal is locked" }, { status: 403 })
  }

  // Shared goal recipients (employees) may only update weightage
  const isSharedCopy = goal.isShared && goal.sharedFromId !== null
  if (isOwner && !isManager && !isAdmin) {
    if (isSharedCopy) {
      // Shared goals are approved immediately — allow weightage-only update
    } else if (!["draft", "returned"].includes(goal.status)) {
      return NextResponse.json(
        { error: "Goal cannot be edited in its current state" },
        { status: 403 }
      )
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Shared copy: employees may only change weightage
  if (isSharedCopy && isOwner && !isManager && !isAdmin) {
    if (Object.keys(body).some((k) => k !== "weightage")) {
      return NextResponse.json(
        { error: "Shared goals only allow weightage to be updated" },
        { status: 403 }
      )
    }
  }

  // Rule 2: validate weightage on update
  if (typeof body.weightage === "number") {
    if (body.weightage < 10) {
      return NextResponse.json({ error: "Minimum weightage is 10%" }, { status: 400 })
    }
    if (body.weightage > 90) {
      return NextResponse.json({ error: "Maximum weightage is 90%" }, { status: 400 })
    }
    if (body.weightage % 5 !== 0) {
      return NextResponse.json({ error: "Weightage must be a multiple of 5%" }, { status: 400 })
    }
  }

  const allowedFields = ["targetValue", "weightage", "title", "description"]
  const updates: Record<string, unknown> = {}
  const auditEntries: { fieldName: string; oldValue: string; newValue: string }[] = []

  for (const field of allowedFields) {
    if (body[field] !== undefined && body[field] !== goal[field as keyof typeof goal]) {
      auditEntries.push({
        fieldName: field,
        oldValue: String(goal[field as keyof typeof goal] ?? ""),
        newValue: String(body[field]),
      })
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(goal)
  }

  const [updated] = await prisma.$transaction([
    prisma.goal.update({ where: { id }, data: updates }),
    ...auditEntries.map((e) =>
      prisma.auditLog.create({
        data: {
          entityType: "Goal",
          entityId: id,
          goalId: id,
          changedById: session.user.id,
          action: "updated",
          fieldName: e.fieldName,
          oldValue: e.oldValue,
          newValue: e.newValue,
        },
      })
    ),
  ])

  return NextResponse.json({
    ...updated,
    weightage: Number(updated.weightage),
    targetValue: updated.targetValue !== null ? Number(updated.targetValue) : null,
  })
}
