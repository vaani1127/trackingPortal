import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AnalyticsDashboard } from "./_components/AnalyticsDashboard"

export const metadata = { title: "Analytics — Atomberg Portal" }

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const [cycles, employees] = await Promise.all([
    prisma.cycle.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "employee", department: { not: null } },
      select: { department: true },
    }),
  ])

  const departments = [
    ...new Set(employees.map((e) => e.department).filter(Boolean) as string[]),
  ].sort()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visual insights into team performance and engagement.
        </p>
      </div>

      <AnalyticsDashboard
        cycles={cycles}
        departments={departments}
        defaultCycleId={cycles[0]?.id ?? ""}
      />
    </div>
  )
}
