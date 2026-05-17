"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Target,
  CalendarCheck,
  Inbox,
  Users,
  Settings2,
  UserCog,
  Share2,
  FileBarChart,
  BarChart3,
  Shield,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Role = "employee" | "manager" | "admin"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

function getNavItems(role: Role, escalationCount: number): NavItem[] {
  if (role === "employee") {
    return [
      { label: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
      { label: "My Goals", href: "/employee/goals", icon: Target },
      { label: "Check-ins", href: "/employee/check-ins", icon: CalendarCheck },
    ]
  }
  if (role === "manager") {
    return [
      { label: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
      {
        label: "Approval Inbox",
        href: "/manager/approvals",
        icon: Inbox,
        badge: escalationCount > 0 ? escalationCount : undefined,
      },
      { label: "Check-ins", href: "/manager/check-ins", icon: CalendarCheck },
      { label: "Shared Goals", href: "/manager/shared-goals", icon: Share2 },
    ]
  }
  return [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Cycle Management", href: "/admin/cycles", icon: Settings2 },
    { label: "User Management", href: "/admin/users", icon: UserCog },
    { label: "Shared Goals", href: "/admin/shared-goals", icon: Share2 },
    { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Escalations", href: "/admin/escalations", icon: AlertTriangle },
    { label: "Audit Log", href: "/admin/audit", icon: Shield },
  ]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface SidebarProps {
  role: Role
  userName: string
  userEmail: string
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, setSidebarOpen, escalationCount } = useAppStore()

  const navItems = getNavItems(role, escalationCount)
  const initials = getInitials(userName)
  const isCollapsed = !sidebarOpen

  function closeMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-slate-900 text-slate-200 transition-all duration-300 ease-in-out flex-shrink-0",
        "fixed inset-y-0 left-0 z-40 md:sticky md:top-0 md:h-screen",
        sidebarOpen
          ? "w-64 translate-x-0"
          : "-translate-x-full md:translate-x-0 md:w-16"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-slate-800 flex-shrink-0 overflow-hidden",
          isCollapsed ? "md:justify-center px-4 md:px-0" : "px-4"
        )}
      >
        <span className="flex-1 text-orange-500 font-extrabold tracking-[0.2em] select-none whitespace-nowrap">
          {isCollapsed ? (
            <>
              <span className="hidden md:flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white text-sm font-bold">A</span>
              <span className="md:hidden text-lg">ATOMBERG</span>
            </>
          ) : (
            <span className="text-lg">ATOMBERG</span>
          )}
        </span>
        {/* Close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          aria-label="Close menu"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")

          const linkClass = cn(
            "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-orange-500/10 text-orange-400"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
            isCollapsed && "md:justify-center md:px-0"
          )

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      className={cn(linkClass, "relative")}
                      onClick={closeMobile}
                    />
                  }
                >
                  <Icon className="size-5 flex-shrink-0" />
                  {item.badge !== undefined && (
                    <span className="absolute top-0.5 right-0.5 hidden md:flex size-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                  {/* Full label on mobile (sidebar never icon-only on mobile) */}
                  <span className="md:hidden flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="md:hidden ml-auto flex size-5 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden md:block">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link key={item.href} href={item.href} className={linkClass} onClick={closeMobile}>
              <Icon className="size-5 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + logout + collapse toggle */}
      <div className="flex-shrink-0 border-t border-slate-800">
        {/* Expanded: avatar + name + logout */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 p-3">
            <Avatar className="flex-shrink-0 ring-2 ring-slate-700">
              <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 items-center gap-1 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">
                  {userName}
                </p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Collapsed (desktop only): avatar + logout icon */}
        {isCollapsed && (
          <div className="hidden md:flex flex-col items-center gap-1 p-2">
            <Tooltip>
              <TooltipTrigger
                render={<button className="rounded-full" />}
                aria-label={userName}
              >
                <Avatar className="ring-2 ring-slate-700">
                  <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">{userName}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    aria-label="Sign out"
                  />
                }
              >
                <LogOut className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "hidden md:flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors border-t border-slate-800",
            isCollapsed && "justify-center"
          )}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="size-3.5" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
      </div>
    </aside>
  )
}
