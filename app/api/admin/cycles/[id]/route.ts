import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const PatchSchema = z.object({
  status: z.enum(["active", "archived"] as const).optional(),
  name: z.string().min(1).max(100).optional(),
  phase1Opens: z.coerce.date().optional(),
  q1Opens: z.coerce.date().optional(),
  q2Opens: z.coerce.date().optional(),
  q3Opens: z.coerce.date().optional(),
  q4Opens: z.coerce.date().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.cycle.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updates: Record<string, unknown> = { ...parsed.data }

  // When activating a cycle, no need to deactivate others (multiple can coexist)
  // But when archiving the only active cycle, allow it

  const updated = await prisma.cycle.update({
    where: { id },
    data: updates,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const cycle = await prisma.cycle.findUnique({
    where: { id },
    include: { _count: { select: { goals: true } } },
  })
  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (cycle._count.goals > 0) {
    return NextResponse.json(
      { error: "Cannot delete a cycle that has goals. Archive it instead." },
      { status: 400 }
    )
  }

  await prisma.cycle.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
