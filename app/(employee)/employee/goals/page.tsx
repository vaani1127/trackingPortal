import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Target } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import { GoalsList } from "./_components/GoalsList"
import { Button } from "@/components/ui/button"

// Note: Button uses Base UI render prop, not asChild

export const metadata = { title: "My Goals — Atomberg Portal" }

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const params = await searchParams

  const cycleId = await getSelectedCycleId()
  const cycle = cycleId
    ? await prisma.cycle.findUnique({
        where: { id: cycleId },
        select: { id: true, name: true, phase1Opens: true, q1Opens: true },
      })
    : null

  const goals = cycle
    ? await prisma.goal.findMany({
        where: { employeeId: session.user.id, cycleId: cycle.id },
        orderBy: { createdAt: "asc" },
        include: {
          auditLogs: {
            where: { action: "returned" },
            orderBy: { changedAt: "desc" },
            take: 1,
            include: { changedBy: { select: { name: true } } },
          },
        },
      })
    : []

  const serializedGoals = goals.map((g) => {
    const lastReturn = g.auditLogs[0] ?? null
    return {
      id: g.id,
      title: g.title,
      thrustArea: g.thrustArea,
      description: g.description,
      uomType: g.uomType,
      targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
      targetDate: g.targetDate?.toISOString() ?? null,
      weightage: Number(g.weightage),
      status: g.status,
      isShared: g.isShared,
      sharedFromId: g.sharedFromId,
      returnComment: lastReturn?.newValue ?? null,
      returnedBy: lastReturn?.changedBy.name ?? null,
      createdAt: g.createdAt.toISOString(),
    }
  })

  const totalWeightage = serializedGoals.reduce((s, g) => s + g.weightage, 0)
  const canAddGoal = goals.length < 8

  const now = new Date()
  const windowOpen = cycle
    ? now >= cycle.phase1Opens && now < cycle.q1Opens
    : false

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            My Goals{cycle ? ` — ${cycle.name}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {goals.length} of 8 goals · {totalWeightage}% allocated
          </p>
        </div>

        {canAddGoal && windowOpen ? (
          <Button render={<Link href="/employee/goals/new" />} className="gap-2">
            <Plus className="size-4" />
            Add Goal
          </Button>
        ) : (
          <Button disabled className="gap-2" title={
            !canAddGoal
              ? "Maximum 8 goals per cycle reached"
              : "Goal setting window is closed"
          }>
            <Plus className="size-4" />
            Add Goal
          </Button>
        )}
      </div>

      {/* Max goals warning */}
      {params?.error === "max_goals" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You&apos;ve reached the maximum of 8 goals for this cycle.
        </div>
      )}

      {/* Goals list or empty state */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/20">
          <Target className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No goals yet</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            Start by creating your first goal for this cycle. Goals help track
            your performance and achievements.
          </p>
          {windowOpen && (
            <Button render={<Link href="/employee/goals/new" />} className="mt-4 gap-2">
              <Plus className="size-4" />
              Create First Goal
            </Button>
          )}
        </div>
      ) : (
        <GoalsList
          goals={serializedGoals}
          totalWeightage={totalWeightage}
          goalCount={goals.length}
        />
      )}
    </div>
  )
}
