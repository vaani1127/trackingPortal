import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { ApprovalInbox } from "./_components/ApprovalInbox"

export const metadata = { title: "Approval Inbox — Atomberg Portal" }

export default async function ApprovalsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycleId = await getSelectedCycleId()
  const cycle = cycleId
    ? await prisma.cycle.findUnique({
        where: { id: cycleId },
        select: { id: true, name: true },
      })
    : null

  const directReports = await prisma.user.findMany({
    where: { managerId: session.user.id },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  })

  const reportIds = directReports.map((r) => r.id)

  const goals = await prisma.goal.findMany({
    where: {
      employeeId: { in: reportIds },
      ...(cycle && { cycleId: cycle.id }),
      status: "submitted",
    },
    select: {
      id: true,
      employeeId: true,
      thrustArea: true,
      title: true,
      description: true,
      uomType: true,
      targetValue: true,
      targetDate: true,
      weightage: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  })

  // Serialize Decimals
  const serializedGoals = goals.map((g) => ({
    ...g,
    weightage: Number(g.weightage),
    targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
  }))

  // Group by employee, keep only employees who have submitted goals
  const employeesWithGoals = directReports
    .map((r) => ({
      ...r,
      goals: serializedGoals.filter((g) => g.employeeId === r.id),
    }))
    .filter((r) => r.goals.length > 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Approval Inbox</h1>
        {cycle && (
          <p className="text-sm text-muted-foreground mt-0.5">{cycle.name}</p>
        )}
      </div>

      {employeesWithGoals.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No pending goal submissions to review.
          </p>
        </div>
      ) : (
        <ApprovalInbox
          employees={employeesWithGoals}
          cycleId={cycle?.id ?? ""}
        />
      )}
    </div>
  )
}
