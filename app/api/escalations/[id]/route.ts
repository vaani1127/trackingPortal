import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const escalation = await prisma.escalation.findUnique({ where: { id } })
  if (!escalation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.escalation.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date() },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
}
