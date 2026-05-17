import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CycleManager } from "./_components/CycleManager"

export const metadata = { title: "Cycle Management — Atomberg Portal" }

export default async function CyclesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycles = await prisma.cycle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { goals: true } } },
  })

  const serialized = cycles.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    phase1Opens: c.phase1Opens.toISOString(),
    q1Opens: c.q1Opens.toISOString(),
    q2Opens: c.q2Opens.toISOString(),
    q3Opens: c.q3Opens.toISOString(),
    q4Opens: c.q4Opens.toISOString(),
    createdAt: c.createdAt.toISOString(),
    goalCount: c._count.goals,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Cycle Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create and manage performance cycles. Only one cycle should be active at a time.
        </p>
      </div>
      <CycleManager cycles={serialized} />
    </div>
  )
}
