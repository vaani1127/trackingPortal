import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AppShell } from "@/components/layout/AppShell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "admin") {
    redirect(session.user.role === "manager" ? "/manager/dashboard" : "/employee/dashboard")
  }

  return (
    <AppShell
      role="admin"
      userName={session.user.name ?? "Admin"}
      userEmail={session.user.email ?? ""}
    >
      {children}
    </AppShell>
  )
}
