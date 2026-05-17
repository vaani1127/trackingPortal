import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { EscalationsClient } from "./_components/EscalationsClient"

export const metadata = { title: "Escalations — Atomberg Portal" }

export default async function EscalationsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycleId = await getSelectedCycleId()
  const [escalations, cycle] = await Promise.all([
    prisma.escalation.findMany({
      orderBy: { triggeredAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        status: true,
        quarter: true,
        notificationCount: true,
        triggeredAt: true,
        resolvedAt: true,
        employee: { select: { id: true, name: true, department: true } },
        manager: { select: { id: true, name: true } },
        cycle: { select: { name: true } },
      },
    }),
    cycleId
      ? prisma.cycle.findUnique({ where: { id: cycleId }, select: { id: true, name: true } })
      : Promise.resolve(null),
  ])

  const serialized = escalations.map((e) => ({
    id: e.id,
    type: e.type,
    status: e.status,
    quarter: e.quarter,
    notificationCount: e.notificationCount,
    triggeredAt: e.triggeredAt.toISOString(),
    resolvedAt: e.resolvedAt?.toISOString() ?? null,
    employeeName: e.employee.name,
    employeeDept: e.employee.department,
    managerName: e.manager.name,
    cycleName: e.cycle.name,
  }))

  const openCount = escalations.filter((e) => e.status === "open").length
  const resolvedCount = escalations.filter((e) => e.status === "resolved").length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Escalations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {openCount} open · {resolvedCount} resolved
          {cycle && ` · Active cycle: ${cycle.name}`}
        </p>
      </div>
      <EscalationsClient escalations={serialized} openCount={openCount} resolvedCount={resolvedCount} />
    </div>
  )
}
