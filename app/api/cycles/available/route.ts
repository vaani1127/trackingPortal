import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ cycles: [], selectedCycleId: null })

  const cycles = await prisma.cycle.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  })

  const cookieStore = await cookies()
  const stored = cookieStore.get("selectedCycleId")?.value
  const selectedCycleId = cycles.find((c) => c.id === stored)?.id ?? cycles[0]?.id ?? null

  return NextResponse.json({ cycles, selectedCycleId })
}
