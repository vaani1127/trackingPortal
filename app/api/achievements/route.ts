import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { computeScore } from "@/lib/scoring"

const AchievementSchema = z.object({
  goalId: z.string().uuid(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"] as const),
  progressStatus: z.enum(["not_started", "on_track", "completed"] as const),
  actualValue: z.number().nullable().optional(),
  actualDate: z.coerce.date().nullable().optional(),
})

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

  const parsed = AchievementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { goalId, quarter, progressStatus, actualValue = null, actualDate = null } = parsed.data

  // Goal must belong to current user and be approved/locked
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      employeeId: session.user.id,
      status: { in: ["approved", "locked"] },
    },
    select: {
      id: true,
      cycleId: true,
      uomType: true,
      targetValue: true,
      targetDate: true,
      sharedFromId: true,
    },
  })
  if (!goal) {
    return NextResponse.json(
      { error: "Goal not found or not approved" },
      { status: 404 }
    )
  }

  // Validate check-in window is open for this quarter
  const cycle = await prisma.cycle.findUnique({
    where: { id: goal.cycleId },
    select: { q1Opens: true, q2Opens: true, q3Opens: true, q4Opens: true },
  })
  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  }

  const now = new Date()
  const qOpens: Record<string, Date> = {
    Q1: cycle.q1Opens,
    Q2: cycle.q2Opens,
    Q3: cycle.q3Opens,
    Q4: cycle.q4Opens,
  }
  const qClose: Record<string, Date | null> = {
    Q1: cycle.q2Opens,
    Q2: cycle.q3Opens,
    Q3: cycle.q4Opens,
    Q4: null,
  }

  if (now < qOpens[quarter]) {
    return NextResponse.json(
      { error: `${quarter} check-in window is not yet open` },
      { status: 400 }
    )
  }
  const closeAt = qClose[quarter]
  if (closeAt && now >= closeAt) {
    return NextResponse.json(
      { error: `${quarter} check-in window has closed` },
      { status: 400 }
    )
  }

  // Compute score
  const computedScore = computeScore(
    goal.uomType,
    goal.targetValue !== null ? Number(goal.targetValue) : null,
    actualValue ?? null,
    goal.targetDate?.toISOString(),
    actualDate?.toISOString()
  )

  type Q = "Q1" | "Q2" | "Q3" | "Q4"
  type PS = "not_started" | "on_track" | "completed"

  const upsertData = {
    progressStatus: progressStatus as PS,
    actualValue: actualValue !== null && actualValue !== undefined ? actualValue : null,
    actualDate: actualDate !== null && actualDate !== undefined ? actualDate : null,
    computedScore: computedScore !== null ? computedScore : null,
    submittedAt: new Date(),
  }

  // Upsert achievement — Achievement has @@unique([goalId, quarter])
  const achievement = await prisma.achievement.upsert({
    where: { goalId_quarter: { goalId, quarter: quarter as Q } },
    create: { goalId, quarter: quarter as Q, ...upsertData },
    update: upsertData,
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      entityType: "Achievement",
      entityId: achievement.id,
      goalId,
      changedById: session.user.id,
      action: "updated",
      fieldName: quarter,
      newValue: JSON.stringify({ progressStatus, actualValue, computedScore }),
    },
  })

  // Shared goal sync: propagate actuals to all related goals in the share group
  const rootId = goal.sharedFromId ?? goal.id
  if (goal.sharedFromId || (await prisma.goal.count({ where: { sharedFromId: goal.id } })) > 0) {
    const related = await prisma.goal.findMany({
      where: {
        OR: [{ id: rootId }, { sharedFromId: rootId }],
        NOT: { id: goalId },
      },
      select: { id: true },
    })
    if (related.length > 0) {
      await prisma.$transaction(
        related.map((r) =>
          prisma.achievement.upsert({
            where: { goalId_quarter: { goalId: r.id, quarter: quarter as Q } },
            create: { goalId: r.id, quarter: quarter as Q, ...upsertData },
            update: upsertData,
          })
        )
      )
    }
  }

  return NextResponse.json({
    ...achievement,
    actualValue: achievement.actualValue !== null ? Number(achievement.actualValue) : null,
    computedScore: achievement.computedScore !== null ? Number(achievement.computedScore) : null,
  })
}

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cycle = await prisma.cycle.findFirst({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })

  if (!cycle) {
    return NextResponse.json({ Q1: [], Q2: [], Q3: [], Q4: [] })
  }

  const goals = await prisma.goal.findMany({
    where: { employeeId: session.user.id, cycleId: cycle.id },
    select: { id: true },
  })

  const goalIds = goals.map((g) => g.id)

  const achievements = await prisma.achievement.findMany({
    where: { goalId: { in: goalIds } },
    include: {
      goal: {
        select: {
          title: true,
          uomType: true,
          targetValue: true,
          targetDate: true,
          weightage: true,
        },
      },
    },
  })

  const grouped: Record<string, unknown[]> = { Q1: [], Q2: [], Q3: [], Q4: [] }
  for (const a of achievements) {
    const q = a.quarter as string
    if (grouped[q]) {
      grouped[q].push({
        ...a,
        actualValue: a.actualValue !== null ? Number(a.actualValue) : null,
        computedScore: a.computedScore !== null ? Number(a.computedScore) : null,
        goal: {
          ...a.goal,
          targetValue: a.goal.targetValue !== null ? Number(a.goal.targetValue) : null,
          weightage: Number(a.goal.weightage),
        },
      })
    }
  }

  return NextResponse.json(grouped)
}
