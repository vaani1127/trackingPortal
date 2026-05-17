import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { GoalCreateSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cycleId = searchParams.get("cycleId")

  let resolvedCycleId = cycleId
  if (!resolvedCycleId) {
    const cycle = await prisma.cycle.findFirst({
      where: { status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    resolvedCycleId = cycle?.id ?? null
  }

  if (!resolvedCycleId) {
    return NextResponse.json([])
  }

  const goals = await prisma.goal.findMany({
    where: { employeeId: session.user.id, cycleId: resolvedCycleId },
    include: {
      achievements: { orderBy: { quarter: "asc" } },
      auditLogs: {
        orderBy: { changedAt: "desc" },
        take: 10,
        include: { changedBy: { select: { name: true, role: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Convert Decimal fields to numbers for JSON serialization
  const serialized = goals.map((g) => ({
    ...g,
    weightage: Number(g.weightage),
    targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
    achievements: g.achievements.map((a) => ({
      ...a,
      actualValue: a.actualValue !== null ? Number(a.actualValue) : null,
      computedScore: a.computedScore !== null ? Number(a.computedScore) : null,
    })),
  }))

  return NextResponse.json(serialized)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = GoalCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Check cycle exists and employee has access
  const cycle = await prisma.cycle.findUnique({
    where: { id: data.cycleId },
    select: { id: true, status: true, phase1Opens: true, q2Opens: true },
  })

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  }

  // Check goal setting window (phase1Opens to q2Opens)
  const now = new Date()
  if (now < cycle.phase1Opens) {
    return NextResponse.json(
      { error: "Goal setting window has not opened yet" },
      { status: 400 }
    )
  }
  if (now >= cycle.q2Opens) {
    return NextResponse.json(
      { error: "Goal setting window is closed" },
      { status: 400 }
    )
  }

  // Check max 8 goals limit
  const existingCount = await prisma.goal.count({
    where: { employeeId: session.user.id, cycleId: data.cycleId },
  })

  if (existingCount >= 8) {
    return NextResponse.json(
      { error: "Maximum of 8 goals per cycle reached" },
      { status: 400 }
    )
  }

  const goal = await prisma.goal.create({
    data: {
      employeeId: session.user.id,
      cycleId: data.cycleId,
      thrustArea: data.thrustArea,
      title: data.title,
      description: data.description,
      uomType: data.uomType,
      targetValue: data.targetValue,
      targetDate: data.targetDate,
      weightage: data.weightage,
      status: "draft",
    },
  })

  await prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goal.id,
      goalId: goal.id,
      changedById: session.user.id,
      action: "created",
    },
  })

  return NextResponse.json(
    {
      ...goal,
      weightage: Number(goal.weightage),
      targetValue: goal.targetValue !== null ? Number(goal.targetValue) : null,
    },
    { status: 201 }
  )
}
