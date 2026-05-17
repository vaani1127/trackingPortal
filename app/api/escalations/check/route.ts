import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { sendEmail, EmailTemplates } from "@/lib/notifications"

const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS)
}

function getOpenQuarter(
  cycle: { q1Opens: Date; q2Opens: Date; q3Opens: Date; q4Opens: Date },
  now: Date
): { quarter: string; opens: Date } | null {
  if (now >= cycle.q4Opens) return { quarter: "Q4", opens: cycle.q4Opens }
  if (now >= cycle.q3Opens) return { quarter: "Q3", opens: cycle.q3Opens }
  if (now >= cycle.q2Opens) return { quarter: "Q2", opens: cycle.q2Opens }
  if (now >= cycle.q1Opens) return { quarter: "Q1", opens: cycle.q1Opens }
  return null
}

export async function POST(request: NextRequest) {
  // Allow admin session OR cron secret header
  const reqHeaders = await headers()
  const authHeader = reqHeaders.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const isInternalCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isInternalCron) {
    const session = await getSession()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const now = new Date()
  const results: { rule: string; employee: string; action: string }[] = []

  // ── Resolve active cycle ─────────────────────────────────────────────────────
  const cycle = await prisma.cycle.findFirst({
    where: { status: "active" },
    select: {
      id: true, name: true,
      phase1Opens: true,
      q1Opens: true, q2Opens: true, q3Opens: true, q4Opens: true,
    },
  })
  if (!cycle) {
    return NextResponse.json({ triggered: 0, results: [], message: "No active cycle" })
  }

  // Pre-load all open escalations for this cycle to avoid per-employee queries
  const [allOpenEscalations, admins] = await Promise.all([
    prisma.escalation.findMany({
      where: { cycleId: cycle.id, status: "open" },
      select: { id: true, type: true, employeeId: true, notificationCount: true, triggeredAt: true },
    }),
    prisma.user.findMany({
      where: { role: "admin" },
      select: { name: true, email: true },
    }),
  ])

  // Build lookup: type → employeeId → escalation
  const escMap = new Map<string, Map<string, (typeof allOpenEscalations)[number]>>()
  for (const e of allOpenEscalations) {
    if (!escMap.has(e.type)) escMap.set(e.type, new Map())
    escMap.get(e.type)!.set(e.employeeId, e)
  }

  // ── Rule 1: GOAL_NOT_SUBMITTED ───────────────────────────────────────────────
  // Trigger when: now > phase1Opens + 7 days AND employee has no submitted/approved/locked goals
  const submitDeadline = new Date(cycle.phase1Opens.getTime() + 7 * DAY_MS)
  if (now > submitDeadline) {
    const unsubmitted = await prisma.user.findMany({
      where: {
        role: "employee",
        managerId: { not: null },
        goals: { none: { cycleId: cycle.id, status: { in: ["submitted", "approved", "locked", "returned"] } } },
      },
      select: {
        id: true, name: true, email: true, managerId: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    })

    const ruleMap = escMap.get("goal_not_submitted") ?? new Map()

    for (const emp of unsubmitted) {
      if (!emp.managerId || !emp.manager) continue
      const existing = ruleMap.get(emp.id)

      if (!existing) {
        // First notification: email employee, create escalation
        await prisma.escalation.create({
          data: {
            type: "goal_not_submitted",
            employeeId: emp.id,
            managerId: emp.managerId,
            cycleId: cycle.id,
            notificationCount: 1,
          },
        })
        void sendEmail(emp.email, EmailTemplates.escalationEmployee(emp.name, "goal_not_submitted", daysSince(submitDeadline, now)))
        results.push({ rule: "goal_not_submitted", employee: emp.name, action: "1st notice → employee" })
      } else if (existing.notificationCount === 1 && daysSince(existing.triggeredAt, now) >= 3) {
        // Second notification: email manager
        await prisma.escalation.update({ where: { id: existing.id }, data: { notificationCount: 2 } })
        if (emp.manager.email) {
          void sendEmail(emp.manager.email, EmailTemplates.escalationManager(emp.manager.name, emp.name, "goal_not_submitted"))
        }
        results.push({ rule: "goal_not_submitted", employee: emp.name, action: "2nd notice → manager" })
      } else if (existing.notificationCount === 2 && daysSince(existing.triggeredAt, now) >= 6) {
        // Third notification: email all admins
        await prisma.escalation.update({ where: { id: existing.id }, data: { notificationCount: 3 } })
        for (const admin of admins) {
          void sendEmail(admin.email, EmailTemplates.escalationManager(admin.name, emp.name, "goal_not_submitted"))
        }
        results.push({ rule: "goal_not_submitted", employee: emp.name, action: "3rd notice → admin" })
      }
    }
  }

  // ── Rule 2: GOAL_NOT_APPROVED ────────────────────────────────────────────────
  // Trigger when: goal has been in "submitted" status for > 5 days (updatedAt proxy)
  const approvalDeadline = new Date(now.getTime() - 5 * DAY_MS)
  const pendingApproval = await prisma.goal.findMany({
    where: {
      cycleId: cycle.id,
      status: "submitted",
      updatedAt: { lt: approvalDeadline },
      isShared: false,
    },
    select: {
      id: true,
      employeeId: true,
      updatedAt: true,
      employee: {
        select: {
          id: true, name: true, email: true, managerId: true,
          manager: { select: { id: true, name: true, email: true } },
        },
      },
    },
    distinct: ["employeeId"],
  })

  const approvalRuleMap = escMap.get("goal_not_approved") ?? new Map()

  for (const goal of pendingApproval) {
    const emp = goal.employee
    if (!emp.managerId || !emp.manager) continue
    const existing = approvalRuleMap.get(emp.id)

    if (!existing) {
      await prisma.escalation.create({
        data: {
          type: "goal_not_approved",
          employeeId: emp.id,
          managerId: emp.managerId,
          cycleId: cycle.id,
          notificationCount: 1,
        },
      })
      if (emp.manager.email) {
        void sendEmail(emp.manager.email, EmailTemplates.escalationManager(emp.manager.name, emp.name, "goal_not_approved"))
      }
      results.push({ rule: "goal_not_approved", employee: emp.name, action: "1st notice → manager" })
    } else if (existing.notificationCount === 1 && daysSince(existing.triggeredAt, now) >= 3) {
      await prisma.escalation.update({ where: { id: existing.id }, data: { notificationCount: 2 } })
      for (const admin of admins) {
        void sendEmail(admin.email, EmailTemplates.escalationManager(admin.name, emp.name, "goal_not_approved"))
      }
      results.push({ rule: "goal_not_approved", employee: emp.name, action: "2nd notice → admin" })
    }
  }

  // ── Rule 3: CHECKIN_MISSED ────────────────────────────────────────────────────
  // Trigger when: quarter open for 14+ days AND employee has approved goals but no check-in
  const openQ = getOpenQuarter(cycle, now)
  if (openQ && daysSince(openQ.opens, now) >= 14) {
    const checkinRuleMap = escMap.get("checkin_missed") ?? new Map()

    const employeesWithApprovedGoals = await prisma.user.findMany({
      where: {
        role: "employee",
        managerId: { not: null },
        goals: {
          some: {
            cycleId: cycle.id,
            status: { in: ["approved", "locked"] },
            checkins: { none: { quarter: openQ.quarter as "Q1" | "Q2" | "Q3" | "Q4" } },
          },
        },
      },
      select: {
        id: true, name: true, email: true, managerId: true,
        manager: { select: { id: true } },
      },
    })

    for (const emp of employeesWithApprovedGoals) {
      if (!emp.managerId) continue
      const existing = checkinRuleMap.get(emp.id)

      // Only escalate once per quarter window (check quarter field on escalation)
      const alreadyThisQ = allOpenEscalations.find(
        (e) => e.type === "checkin_missed" && e.employeeId === emp.id
      )

      if (!alreadyThisQ) {
        await prisma.escalation.create({
          data: {
            type: "checkin_missed",
            employeeId: emp.id,
            managerId: emp.managerId,
            cycleId: cycle.id,
            quarter: openQ.quarter,
            notificationCount: 1,
          },
        })
        void sendEmail(
          emp.email,
          EmailTemplates.checkinReminder(emp.name, openQ.quarter, daysSince(openQ.opens, now))
        )
        results.push({ rule: "checkin_missed", employee: emp.name, action: `1st reminder → ${openQ.quarter}` })
      } else if (existing && existing.notificationCount === 1 && daysSince(existing.triggeredAt, now) >= 7) {
        await prisma.escalation.update({ where: { id: existing.id }, data: { notificationCount: 2 } })
        void sendEmail(
          emp.email,
          EmailTemplates.checkinReminder(emp.name, openQ.quarter, daysSince(openQ.opens, now))
        )
        results.push({ rule: "checkin_missed", employee: emp.name, action: "2nd reminder → employee" })
      }
    }
  }

  // Auto-resolve escalations for employees who have now completed the required action
  const resolvedIds: string[] = []

  // Resolve GOAL_NOT_SUBMITTED for employees who have since submitted
  const submittedEmployeeIds = new Set(
    (
      await prisma.goal.findMany({
        where: { cycleId: cycle.id, status: { in: ["submitted", "approved", "locked"] } },
        select: { employeeId: true },
        distinct: ["employeeId"],
      })
    ).map((g) => g.employeeId)
  )

  for (const [empId, esc] of (escMap.get("goal_not_submitted") ?? new Map()).entries()) {
    if (submittedEmployeeIds.has(empId)) resolvedIds.push(esc.id)
  }

  // Resolve GOAL_NOT_APPROVED for employees whose goals are now approved
  const approvedEmployeeIds = new Set(
    (
      await prisma.user.findMany({
        where: {
          role: "employee",
          goals: {
            some: { cycleId: cycle.id },
            none: { cycleId: cycle.id, status: { in: ["submitted", "draft", "returned"] } },
          },
        },
        select: { id: true },
      })
    ).map((u) => u.id)
  )

  for (const [empId, esc] of (escMap.get("goal_not_approved") ?? new Map()).entries()) {
    if (approvedEmployeeIds.has(empId)) resolvedIds.push(esc.id)
  }

  if (resolvedIds.length > 0) {
    await prisma.escalation.updateMany({
      where: { id: { in: resolvedIds } },
      data: { status: "resolved", resolvedAt: now },
    })
  }

  return NextResponse.json({
    triggered: results.length,
    autoResolved: resolvedIds.length,
    results,
  })
}
