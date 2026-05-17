import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const UserCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  role: z.enum(["employee", "manager", "admin"] as const),
  department: z.string().max(100).optional(),
  managerId: z.string().uuid().optional().nullable(),
  password: z.string().min(6).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")
  const department = searchParams.get("department")
  const search = searchParams.get("search")

  const users = await prisma.user.findMany({
    where: {
      ...(role && { role: role as "employee" | "manager" | "admin" }),
      ...(department && { department }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      managerId: true,
      createdAt: true,
      manager: { select: { id: true, name: true } },
      _count: { select: { goals: true, reports: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = UserCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, email, role, department, managerId, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  if (managerId) {
    const mgr = await prisma.user.findUnique({ where: { id: managerId } })
    if (!mgr || mgr.role === "employee") {
      return NextResponse.json({ error: "Invalid manager" }, { status: 400 })
    }
  }

  const passwordHash = password
    ? await bcrypt.hash(password, 10)
    : await bcrypt.hash(Math.random().toString(36).slice(2) + "Temp!1", 10)

  const user = await prisma.user.create({
    data: { name, email, role, department, managerId, passwordHash },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      managerId: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
