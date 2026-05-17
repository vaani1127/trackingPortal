import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const goalId = searchParams.get("goalId")
  const userId = searchParams.get("userId")
  const action = searchParams.get("action")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const pageStr = searchParams.get("page")
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1
  const PAGE_SIZE = 50

  const where: Record<string, unknown> = {}
  if (goalId) where.goalId = goalId
  if (userId) where.changedById = userId
  if (action) where.action = action
  if (dateFrom || dateTo) {
    where.changedAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
    }
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { changedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        goalId: true,
        action: true,
        fieldName: true,
        oldValue: true,
        newValue: true,
        changedAt: true,
        changedBy: { select: { id: true, name: true, role: true } },
        goal: { select: { title: true, thrustArea: true } },
      },
    }),
  ])

  return NextResponse.json({
    logs: logs.map((l) => ({ ...l, changedAt: l.changedAt.toISOString() })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  })
}
