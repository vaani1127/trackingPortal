import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SharedGoalsManager } from "@/app/(admin)/admin/shared-goals/_components/SharedGoalsManager"

export const metadata = { title: "Shared Goals — Atomberg Portal" }

export default async function ManagerSharedGoalsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycle = await prisma.cycle.findFirst({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })

  // Managers only see their direct reports as recipients
  const [employees, templates, cycles] = await Promise.all([
    prisma.user.findMany({
      where: { role: "employee", managerId: session.user.id },
      select: { id: true, name: true, department: true },
      orderBy: { name: "asc" },
    }),
    cycle
      ? prisma.goal.findMany({
          where: {
            isShared: true,
            sharedFromId: null,
            cycleId: cycle.id,
            // Only show templates pushed by this manager
            employeeId: session.user.id,
          },
          select: {
            id: true,
            title: true,
            thrustArea: true,
            uomType: true,
            targetValue: true,
            weightage: true,
            status: true,
            cycle: { select: { name: true } },
            sharedCopies: {
              select: {
                id: true,
                weightage: true,
                status: true,
                employee: { select: { name: true, department: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.cycle.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const departments = [
    ...new Set(employees.map((e) => e.department).filter(Boolean) as string[]),
  ].sort()

  const serializedTemplates = templates.map((t) => ({
    ...t,
    weightage: Number(t.weightage),
    targetValue: t.targetValue !== null ? Number(t.targetValue) : null,
    sharedCopies: t.sharedCopies.map((c) => ({
      ...c,
      weightage: Number(c.weightage),
    })),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Shared Goals / Team KPIs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Push a common KPI to your direct reports. Achievement sync is automatic.
        </p>
      </div>
      {employees.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No direct reports found. Shared goals require employees assigned to you.
          </p>
        </div>
      ) : (
        <SharedGoalsManager
          templates={serializedTemplates}
          employees={employees}
          departments={departments}
          cycles={cycles}
          defaultCycleId={cycle?.id ?? ""}
        />
      )}
    </div>
  )
}
