import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ count: 0 })
  }

  const { role, id } = session.user

  if (role === "manager") {
    const count = await prisma.escalation.count({
      where: { managerId: id, status: "open" },
    })
    return NextResponse.json({ count })
  }

  if (role === "admin") {
    const count = await prisma.escalation.count({
      where: { status: "open" },
    })
    return NextResponse.json({ count })
  }

  return NextResponse.json({ count: 0 })
}
