import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AuditLogClient } from "./_components/AuditLogClient"

export const metadata = { title: "Audit Trail — Atomberg Portal" }

export default async function AuditPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({
      take: 500,
      orderBy: { changedAt: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        goalId: true,
        goal: { select: { title: true, status: true } },
        changedBy: { select: { id: true, name: true } },
        action: true,
        fieldName: true,
        oldValue: true,
        newValue: true,
        changedAt: true,
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const serialized = logs.map((l) => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    goalId: l.goalId,
    goalTitle: l.goal?.title ?? null,
    goalStatus: l.goal?.status ?? null,
    changedById: l.changedBy.id,
    changedByName: l.changedBy.name,
    action: l.action,
    fieldName: l.fieldName,
    oldValue: l.oldValue,
    newValue: l.newValue,
    changedAt: l.changedAt.toISOString(),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Full change history — last 500 entries.
        </p>
      </div>
      <AuditLogClient logs={serialized} users={users} />
    </div>
  )
}
