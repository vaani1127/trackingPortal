import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  employee: "/employee/dashboard",
}

function roleDashboard(role: string): string {
  return ROLE_DASHBOARDS[role] ?? "/employee/dashboard"
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isAuthenticated = !!token
  const role = (token?.role as string) ?? ""

  // ── Authenticated users at root or login → role-based dashboard ──────────
  if (isAuthenticated && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(
      new URL(roleDashboard(role), request.url),
    )
  }

  // ── Unauthenticated users on protected routes → /login ───────────────────
  if (
    !isAuthenticated &&
    (pathname.startsWith("/employee") ||
      pathname.startsWith("/manager") ||
      pathname.startsWith("/admin"))
  ) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Role-based access control ─────────────────────────────────────────────
  if (isAuthenticated) {
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(roleDashboard(role), request.url))
    }

    if (
      pathname.startsWith("/manager") &&
      role !== "manager" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL(roleDashboard(role), request.url))
    }

    // employees cannot access manager or admin routes (already guarded above)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico
     *   - public assets (png, jpg, svg, …)
     * This lets the auth API route through without running the guard.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
