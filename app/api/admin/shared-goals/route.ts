import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const PushSchema = z.object({
  thrustArea: z.string().min(1),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  uomType: z.enum(
    ["min_numeric", "max_numeric", "min_percent", "max_percent", "timeline", "zero"] as const
  ),
  targetValue: z.number().positive().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  defaultWeightage: z
    .number()
    .min(5)
    .max(90)
    .refine((n) => n % 5 === 0, "Must be a multiple of 5%"),
  cycleId: z.string().uuid(),
  recipientIds: z.array(z.string().uuid()).min(1, "Select at least one recipient"),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const cycleId = searchParams.get("cycleId")

  const templates = await prisma.goal.findMany({
    where: {
      isShared: true,
      sharedFromId: null, // templates only
      ...(cycleId && { cycleId }),
    },
    include: {
      employee: { select: { name: true } },
      sharedCopies: {
        select: {
          id: true,
          employeeId: true,
          weightage: true,
          status: true,
          employee: { select: { name: true, department: true } },
        },
      },
      cycle: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    templates.map((t) => ({
      ...t,
      weightage: Number(t.weightage),
      targetValue: t.targetValue !== null ? Number(t.targetValue) : null,
      sharedCopies: t.sharedCopies.map((c) => ({
        ...c,
        weightage: Number(c.weightage),
      })),
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = PushSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { recipientIds, defaultWeightage, cycleId, ...goalData } = parsed.data

  // Verify cycle
  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  // Verify all recipients are employees in this system
  // Managers can only push to their direct reports
  const recipientWhere =
    session.user.role === "manager"
      ? { id: { in: recipientIds }, role: "employee" as const, managerId: session.user.id }
      : { id: { in: recipientIds }, role: "employee" as const }

  const recipients = await prisma.user.findMany({
    where: recipientWhere,
    select: { id: true },
  })
  if (recipients.length !== recipientIds.length) {
    return NextResponse.json(
      { error: session.user.role === "manager"
          ? "One or more recipients are not your direct reports"
          : "One or more recipients are invalid" },
      { status: 400 }
    )
  }

  // Create template goal (using admin's userId as placeholder employee)
  const template = await prisma.goal.create({
    data: {
      ...goalData,
      targetValue: goalData.targetValue ?? undefined,
      targetDate: goalData.targetDate ?? undefined,
      weightage: defaultWeightage,
      cycleId,
      employeeId: session.user.id,
      isShared: true,
      status: "approved",
    },
  })

  // Create copies for each recipient
  const copies = await prisma.$transaction(
    recipients.map((r) =>
      prisma.goal.create({
        data: {
          ...goalData,
          targetValue: goalData.targetValue ?? undefined,
          targetDate: goalData.targetDate ?? undefined,
          weightage: defaultWeightage,
          cycleId,
          employeeId: r.id,
          isShared: true,
          sharedFromId: template.id,
          status: "approved",
        },
      })
    )
  )

  return NextResponse.json(
    {
      template: {
        ...template,
        weightage: Number(template.weightage),
        targetValue: template.targetValue !== null ? Number(template.targetValue) : null,
      },
      copies: copies.length,
    },
    { status: 201 }
  )
}
