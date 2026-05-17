import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AppShell } from "@/components/layout/AppShell"

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "employee") {
    redirect(session.user.role === "admin" ? "/admin/dashboard" : "/manager/dashboard")
  }

  return (
    <AppShell
      role="employee"
      userName={session.user.name ?? "Employee"}
      userEmail={session.user.email ?? ""}
    >
      {children}
    </AppShell>
  )
}
