"use client"

import { usePathname } from "next/navigation"
import { Bell, Menu, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_TITLES: Record<string, string> = {
  "/employee/dashboard": "Dashboard",
  "/employee/goals": "My Goals",
  "/employee/checkins": "Check-ins",
  "/manager/dashboard": "Dashboard",
  "/manager/approvals": "Approval Inbox",
  "/manager/team": "My Team",
  "/manager/checkins": "Check-ins",
  "/admin/dashboard": "Dashboard",
  "/admin/cycles": "Cycle Management",
  "/admin/users": "User Management",
  "/admin/shared-goals": "Shared Goals",
  "/admin/reports": "Reports",
  "/admin/analytics": "Analytics",
  "/admin/audit": "Audit Log",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? ""
  // Don't mangle UUID segments — use a readable label instead
  if (UUID_RE.test(last)) {
    const parent = segments[segments.length - 2] ?? ""
    const parentLabel = parent.charAt(0).toUpperCase() + parent.slice(1)
    return `${parentLabel} Detail`
  }
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function getCycleBadgeLabel(cycle: { name: string; status: string } | null): string | null {
  if (!cycle) return null
  const statusLabels: Record<string, string> = {
    active: "Active",
    checkin_open: "Check-in Open",
    review: "Under Review",
    draft: "Draft",
  }
  const statusLabel = statusLabels[cycle.status]
  if (!statusLabel) return null
  return `${cycle.name} · ${statusLabel}`
}

interface HeaderProps {
  userName: string
  userRole: string
}

export function Header({ userName, userRole }: HeaderProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, currentCycle, escalationCount } =
    useAppStore()

  const pageTitle = getPageTitle(pathname)
  const cycleBadgeLabel = getCycleBadgeLabel(currentCycle)
  const roleLabel =
    userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()

  return (
    <header className="flex items-center gap-3 h-16 border-b border-border bg-background px-4 md:px-6 flex-shrink-0">
      {/* Mobile hamburger / sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="flex md:hidden items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold truncate flex-1">{pageTitle}</h1>

      {/* Cycle badge */}
      {cycleBadgeLabel && (
        <Badge
          variant="secondary"
          className="hidden sm:inline-flex text-xs font-medium"
        >
          {cycleBadgeLabel}
        </Badge>
      )}

      {/* Notification bell */}
      <div className="relative">
        <button
          className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {escalationCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-orange-500 text-white",
                escalationCount > 9
                  ? "min-w-4 h-4 px-1 text-[10px]"
                  : "size-4 text-[10px]"
              )}
            >
              {escalationCount > 99 ? "99+" : escalationCount}
            </span>
          )}
        </button>
      </div>

      {/* User info */}
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-medium">{userName}</span>
        <span className="text-xs text-muted-foreground">{roleLabel}</span>
      </div>
    </header>
  )
}
