import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { getSelectedCycleId } from "@/lib/selected-cycle"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cycleId = await getSelectedCycleId()
  if (!cycleId) return NextResponse.json(null)

  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      name: true,
      status: true,
      phase1Opens: true,
      q1Opens: true,
      q2Opens: true,
      q3Opens: true,
      q4Opens: true,
    },
  })

  return NextResponse.json(cycle ?? null)
}
