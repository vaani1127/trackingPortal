"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

import { useAppStore } from "@/store/useAppStore"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { cn } from "@/lib/utils"

type Role = "employee" | "manager" | "admin"

interface AppShellProps {
  children: React.ReactNode
  role: Role
  userName: string
  userEmail: string
}

export function AppShell({ children, role, userName, userEmail }: AppShellProps) {
  const { sidebarOpen, setSidebarOpen, setCurrentCycle, setEscalationCount } =
    useAppStore()

  // Close sidebar on mobile (on mount and on resize down)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setSidebarOpen(false)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [setSidebarOpen])

  // Fetch active cycle
  const { data: cycleData } = useQuery({
    queryKey: ["active-cycle"],
    queryFn: () => fetch("/api/cycles/active").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch notification count
  const { data: notifData } = useQuery({
    queryKey: ["notification-count"],
    queryFn: () => fetch("/api/notifications/count").then((r) => r.json()),
    refetchInterval: 60 * 1000,
  })

  useEffect(() => {
    if (cycleData?.id) setCurrentCycle(cycleData)
  }, [cycleData, setCurrentCycle])

  useEffect(() => {
    if (typeof notifData?.count === "number") setEscalationCount(notifData.count)
  }, [notifData, setEscalationCount])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar role={role} userName={userName} userEmail={userEmail} />

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          // On desktop, account for sidebar width
          "md:ml-0"
        )}
      >
        <Header userName={userName} userRole={role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
