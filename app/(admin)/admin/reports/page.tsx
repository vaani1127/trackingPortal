import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { ReportsClient } from "./_components/ReportsClient"

export const metadata = { title: "Reports — Atomberg Portal" }

export default async function ReportsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const [cycles, employees] = await Promise.all([
    prisma.cycle.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "employee" },
      select: {
        department: true,
        manager: { select: { id: true, name: true } },
      },
    }),
  ])

  const departments = [
    ...new Set(employees.map((e) => e.department).filter(Boolean) as string[]),
  ].sort()

  const managersMap = new Map<string, string>()
  employees.forEach((e) => {
    if (e.manager) managersMap.set(e.manager.id, e.manager.name)
  })
  const managers = [...managersMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedCycleId = await getSelectedCycleId()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Achievement data and completion tracking across your organisation.
        </p>
      </div>
      <ReportsClient
        cycles={cycles}
        departments={departments}
        managers={managers}
        defaultCycleId={selectedCycleId ?? cycles[0]?.id ?? ""}
      />
    </div>
  )
}
