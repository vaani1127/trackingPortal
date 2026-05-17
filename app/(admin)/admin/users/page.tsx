import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UsersTable } from "./_components/UsersTable"

export const metadata = { title: "User Management — Atomberg Portal" }

export default async function UsersPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const [users, managers] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        createdAt: true,
        manager: { select: { id: true, name: true } },
        _count: { select: { goals: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["manager", "admin"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Extract unique departments
  const departments = [
    ...new Set(users.map((u) => u.department).filter(Boolean) as string[]),
  ].sort()

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    _count: u._count,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {users.length} users ·{" "}
          {users.filter((u) => u.role === "employee").length} employees ·{" "}
          {users.filter((u) => u.role === "manager").length} managers
        </p>
      </div>
      <UsersTable users={serialized} managers={managers} departments={departments} />
    </div>
  )
}
