"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Bell, Menu, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, parseISO } from "date-fns"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"
import { Badge } from "@/components/ui/badge"

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

const ESCALATION_COLORS: Record<string, string> = {
  goal_not_submitted: "bg-red-100 text-red-700",
  goal_not_approved: "bg-amber-100 text-amber-700",
  checkin_missed: "bg-orange-100 text-orange-700",
}

interface NotifItem {
  id: string
  type: string
  label: string
  employeeName: string
  department: string | null
  quarter: string | null
  triggeredAt: string
}

interface HeaderProps {
  userName: string
  userRole: string
}

export function Header({ userName, userRole }: HeaderProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, currentCycle, escalationCount } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(pathname)
  const cycleBadgeLabel = getCycleBadgeLabel(currentCycle)
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()

  const { data: notifData, isLoading } = useQuery<{ items: NotifItem[] }>({
    queryKey: ["notifications-list"],
    queryFn: () => fetch("/api/notifications/list").then((r) => r.json()),
    enabled: notifOpen,
    staleTime: 30 * 1000,
  })

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [notifOpen])

  const items = notifData?.items ?? []

  return (
    <header className="flex items-center gap-3 h-16 border-b border-border bg-background px-4 md:px-6 flex-shrink-0">
      {/* Mobile hamburger */}
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
        <Badge variant="secondary" className="hidden sm:inline-flex text-xs font-medium">
          {cycleBadgeLabel}
        </Badge>
      )}

      {/* Notification bell */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className={cn(
            "relative flex items-center justify-center rounded-md p-1.5 transition-colors",
            notifOpen
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {escalationCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-orange-500 text-white",
                escalationCount > 9 ? "min-w-4 h-4 px-1 text-[10px]" : "size-4 text-[10px]"
              )}
            >
              {escalationCount > 99 ? "99+" : escalationCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-destructive" />
                <span className="text-sm font-semibold">Open Alerts</span>
                {escalationCount > 0 && (
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {escalationCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setNotifOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle2 className="size-6 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">No open alerts — all clear!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 whitespace-nowrap",
                          ESCALATION_COLORS[item.type] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.employeeName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.department && `${item.department}${item.quarter ? ` · ${item.quarter}` : ""}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(parseISO(item.triggeredAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t px-4 py-2.5 text-center">
                <a
                  href="/admin/audit"
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  onClick={() => setNotifOpen(false)}
                >
                  View audit log →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User info */}
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-medium">{userName}</span>
        <span className="text-xs text-muted-foreground">{roleLabel}</span>
      </div>
    </header>
  )
}
