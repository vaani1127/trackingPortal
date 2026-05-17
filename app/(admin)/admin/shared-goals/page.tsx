import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { SharedGoalsManager } from "./_components/SharedGoalsManager"

export const metadata = { title: "Shared Goals — Atomberg Portal" }

export default async function SharedGoalsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycleId = await getSelectedCycleId()
  const cycle = cycleId
    ? await prisma.cycle.findUnique({ where: { id: cycleId }, select: { id: true, name: true } })
    : null

  const [employees, templates, cycles] = await Promise.all([
    prisma.user.findMany({
      where: { role: "employee" },
      select: { id: true, name: true, department: true },
      orderBy: { name: "asc" },
    }),
    cycle
      ? prisma.goal.findMany({
          where: { isShared: true, sharedFromId: null, cycleId: cycle.id },
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

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean) as string[])].sort()

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
        <h1 className="text-xl font-bold">Shared Goals / Departmental KPIs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Push a common KPI to multiple employees. Achievement sync is automatic.
        </p>
      </div>
      <SharedGoalsManager
        templates={serializedTemplates}
        employees={employees}
        departments={departments}
        cycles={cycles}
        defaultCycleId={cycle?.id ?? ""}
      />
    </div>
  )
}
