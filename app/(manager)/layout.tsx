import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AppShell } from "@/components/layout/AppShell"

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "manager") {
    if (session.user.role === "admin") redirect("/admin/dashboard")
    else redirect("/employee/dashboard")
  }

  return (
    <AppShell
      role="manager"
      userName={session.user.name ?? "Manager"}
      userEmail={session.user.email ?? ""}
    >
      {children}
    </AppShell>
  )
}
