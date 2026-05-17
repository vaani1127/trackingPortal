import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const CycleSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    phase1Opens: z.coerce.date(),
    q1Opens: z.coerce.date(),
    q2Opens: z.coerce.date(),
    q3Opens: z.coerce.date(),
    q4Opens: z.coerce.date(),
  })
  .superRefine((d, ctx) => {
    if (d.q1Opens <= d.phase1Opens)
      ctx.addIssue({ code: "custom", message: "Q1 must open after Phase 1", path: ["q1Opens"] })
    if (d.q2Opens <= d.q1Opens)
      ctx.addIssue({ code: "custom", message: "Q2 must open after Q1", path: ["q2Opens"] })
    if (d.q3Opens <= d.q2Opens)
      ctx.addIssue({ code: "custom", message: "Q3 must open after Q2", path: ["q3Opens"] })
    if (d.q4Opens <= d.q3Opens)
      ctx.addIssue({ code: "custom", message: "Q4 must open after Q3", path: ["q4Opens"] })
  })

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const cycles = await prisma.cycle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { goals: true } } },
  })

  return NextResponse.json(cycles)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CycleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const cycle = await prisma.cycle.create({
    data: {
      ...parsed.data,
      status: "active",
      createdById: session.user.id,
    },
  })

  return NextResponse.json(cycle, { status: 201 })
}
