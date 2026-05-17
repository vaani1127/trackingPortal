import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSelectedCycleId } from "@/lib/selected-cycle"
import GoalCreateForm from "./_components/GoalCreateForm"

export const metadata = { title: "New Goal — Atomberg Portal" }

export default async function NewGoalPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycleId = await getSelectedCycleId()
  const cycle = cycleId
    ? await prisma.cycle.findUnique({
        where: { id: cycleId },
        select: {
          id: true,
          name: true,
          phase1Opens: true,
          q1Opens: true,
        },
      })
    : null

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold">No active cycle found</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Contact your administrator to set up a performance cycle.
        </p>
      </div>
    )
  }

  const now = new Date()
  const windowOpen = now >= cycle.phase1Opens && now < cycle.q1Opens

  const existingGoals = await prisma.goal.findMany({
    where: { employeeId: session.user.id, cycleId: cycle.id },
    select: {
      id: true,
      title: true,
      thrustArea: true,
      weightage: true,
      status: true,
      uomType: true,
    },
    orderBy: { createdAt: "asc" },
  })

  if (existingGoals.length >= 8) {
    redirect("/employee/goals?error=max_goals")
  }

  const serializedGoals = existingGoals.map((g) => ({
    id: g.id,
    title: g.title,
    thrustArea: g.thrustArea,
    weightage: Number(g.weightage),
    status: g.status,
    uomType: g.uomType,
  }))

  return (
    <div className="max-w-2xl mx-auto">
      <GoalCreateForm
        cycleId={cycle.id}
        cycleName={cycle.name}
        existingGoals={serializedGoals}
        windowOpen={windowOpen}
      />
    </div>
  )
}
