import { getServerSession, type NextAuthOptions, type Session } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// NextAuth configuration — export for use in route handler and getServerSession
// ---------------------------------------------------------------------------

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            department: true,
            managerId: true,
          },
        })

        if (!user?.passwordHash) return null

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        )
        if (!passwordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          managerId: user.managerId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.department = user.department ?? null
        token.managerId = user.managerId ?? null
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.department = token.department
      session.user.managerId = token.managerId
      return session
    },
  },
}

// ---------------------------------------------------------------------------
// Server-side helpers
// ---------------------------------------------------------------------------

/** Thin wrapper so server components import one function instead of two. */
export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

/**
 * Returns the full User row from the database for the currently signed-in user.
 * Returns null when unauthenticated.
 */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      managerId: true,
      createdAt: true,
    },
  })
}

/**
 * Returns true when the session's role is one of the allowed roles.
 * Safe to call with a null session — returns false.
 */
export function hasRole(session: Session | null, ...allowed: string[]): boolean {
  return allowed.includes(session?.user?.role ?? "")
}

/**
 * Asserts that the session role matches one of the allowed roles.
 * Throws with `status: 401` when unauthenticated.
 * Throws with `status: 403` when authenticated but insufficiently privileged.
 * Use this at the top of every API Route handler or Server Action.
 */
export function requireRole(session: Session | null, ...allowed: string[]): void {
  if (!session?.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 })
  }
  if (!allowed.includes(session.user.role)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}
