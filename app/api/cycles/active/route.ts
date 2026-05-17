import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cycle = await prisma.cycle.findFirst({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
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

  if (!cycle) {
    return NextResponse.json(null)
  }

  return NextResponse.json(cycle)
}
