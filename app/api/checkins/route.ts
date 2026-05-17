import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const CheckinSchema = z.object({
  employeeId: z.string().uuid(),
  cycleId: z.string().uuid(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"] as const),
  comment: z.string().min(1, "Check-in comment is required").max(1000),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CheckinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { employeeId, cycleId, quarter, comment } = parsed.data

  // Verify manager owns this employee
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, managerId: session.user.id },
    select: { id: true },
  })
  if (!employee) {
    return NextResponse.json({ error: "Employee not found or not in your team" }, { status: 403 })
  }

  // Verify check-in window is open for the quarter
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { q1Opens: true, q2Opens: true, q3Opens: true, q4Opens: true },
  })
  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  }

  const now = new Date()
  const quarterOpens: Record<string, Date> = {
    Q1: cycle.q1Opens,
    Q2: cycle.q2Opens,
    Q3: cycle.q3Opens,
    Q4: cycle.q4Opens,
  }
  if (now < quarterOpens[quarter]) {
    return NextResponse.json(
      { error: `Check-in window for ${quarter} is not yet open` },
      { status: 400 }
    )
  }

  // Get all approved/locked goals for this employee+cycle
  const goals = await prisma.goal.findMany({
    where: { employeeId, cycleId, status: { in: ["approved", "locked"] } },
    select: { id: true },
  })
  if (goals.length === 0) {
    return NextResponse.json({ error: "No approved goals found for this employee" }, { status: 400 })
  }

  // Get existing checkins for these goals + quarter
  const existingCheckins = await prisma.checkin.findMany({
    where: {
      goalId: { in: goals.map((g) => g.id) },
      quarter,
      managerId: session.user.id,
    },
    select: { id: true, goalId: true },
  })

  const existingMap = new Map(existingCheckins.map((c) => [c.goalId, c.id]))

  // Upsert per goal using findFirst + update/create
  const results = await prisma.$transaction([
    ...goals.flatMap((g) => {
      const existingId = existingMap.get(g.id)
      if (existingId) {
        return [prisma.checkin.update({ where: { id: existingId }, data: { comment } })]
      }
      return [
        prisma.checkin.create({
          data: {
            goalId: g.id,
            managerId: session.user.id,
            employeeId,
            quarter,
            comment,
          },
        }),
      ]
    }),
  ])

  return NextResponse.json(results, { status: 201 })
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get("employeeId")
  const quarter = searchParams.get("quarter")

  const checkins = await prisma.checkin.findMany({
    where: {
      managerId: session.user.id,
      ...(employeeId && { employeeId }),
      ...(quarter && { quarter: quarter as "Q1" | "Q2" | "Q3" | "Q4" }),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(checkins)
}
