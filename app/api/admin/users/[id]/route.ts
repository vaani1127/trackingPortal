import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["employee", "manager", "admin"] as const).optional(),
  department: z.string().max(100).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
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

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { managerId, ...rest } = parsed.data

  if (managerId !== undefined && managerId !== null) {
    const mgr = await prisma.user.findUnique({ where: { id: managerId } })
    if (!mgr || mgr.role === "employee") {
      return NextResponse.json({ error: "Invalid manager" }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(managerId !== undefined && { managerId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      managerId: true,
      createdAt: true,
      manager: { select: { id: true, name: true } },
    },
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

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { goals: true } } },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
