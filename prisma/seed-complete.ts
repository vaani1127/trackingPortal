/**
 * seed-complete.ts  –  Full data reset for both cycles.
 *
 * FY 2025-26  (COMPLETED)
 *   All 9 employees · goals LOCKED · Q1 Q2 Q3 Q4 check-ins + achievements
 *
 * FY 2026-27  (ACTIVE — today is 2026-05-17, goal window opened 2026-05-01)
 *   Goal setting in progress · mix of approved / submitted / returned / draft
 *   ZERO check-ins  (Q1 ends 2026-06-30; check-in window opens 2026-07-01)
 *
 * Does NOT delete users — looks them up by email.
 * Deletes all cycle-scoped rows before recreating.
 */

import {
  PrismaClient,
  UomType,
  GoalStatus,
  Quarter,
  AchievementStatus,
  AuditAction,
} from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) })

const d = (s: string) => new Date(s)

// ─── tiny helpers ─────────────────────────────────────────────────────────────

async function goal(data: {
  employeeId: string; cycleId: string; thrustArea: string; title: string
  description?: string; uomType: UomType; targetValue?: number
  targetDate?: Date; weightage: number; status: GoalStatus
  lockedById?: string; lockedAt?: Date; isShared?: boolean; sharedFromId?: string
}) {
  return prisma.goal.create({
    data: {
      employeeId: data.employeeId, cycleId: data.cycleId,
      thrustArea: data.thrustArea, title: data.title,
      description: data.description ?? null,
      uomType: data.uomType,
      targetValue: data.targetValue ?? null,
      targetDate: data.targetDate ?? null,
      weightage: data.weightage, status: data.status,
      isShared: data.isShared ?? false,
      sharedFromId: data.sharedFromId ?? null,
      lockedById: data.lockedById ?? null,
      lockedAt: data.lockedAt ?? null,
    },
  })
}

async function ach(goalId: string, q: Quarter, val: number | null, score: number, at: string) {
  return prisma.achievement.create({
    data: {
      goalId, quarter: q, actualValue: val,
      computedScore: score,
      progressStatus: score >= 70 ? AchievementStatus.on_track : AchievementStatus.not_started,
      submittedAt: d(at),
    },
  })
}

async function checkin(goalId: string, managerId: string, employeeId: string, q: Quarter, comment: string, at: string) {
  return prisma.checkin.create({ data: { goalId, managerId, employeeId, quarter: q, comment, createdAt: d(at) } })
}

async function auditGoal(goalId: string, userId: string, action: AuditAction, at: string, field?: string, oldVal?: string, newVal?: string) {
  return prisma.auditLog.create({
    data: {
      entityType: "Goal", entityId: goalId, goalId,
      changedById: userId, action, changedAt: d(at),
      fieldName: field ?? null, oldValue: oldVal ?? null, newValue: newVal ?? null,
    },
  })
}

// ─── seed all 4 quarters for a set of goals ───────────────────────────────────

async function seedQuarters(
  goals: { id: string }[],
  managerId: string, employeeId: string,
  quarters: {
    q: Quarter; at: string; checkAt: string
    vals: { actual: number | null; score: number; comment: string }[]
  }[]
) {
  for (const { q, at, checkAt, vals } of quarters) {
    for (let i = 0; i < goals.length; i++) {
      const v = vals[i]
      await ach(goals[i].id, q, v.actual, v.score, at)
      await checkin(goals[i].id, managerId, employeeId, q, v.comment, checkAt)
    }
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Wipe all cycle-scoped data (preserve users) ────────────────────────
  console.log("Wiping cycle-scoped data…")
  await prisma.escalation.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.checkin.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.cycle.deleteMany()

  // ── 2. Load users ──────────────────────────────────────────────────────────
  console.log("Loading users…")
  const [admin, rahul, neha, arjun, priya, amit, kavya, rohan, anita, dev, sana, raj, meera] =
    await Promise.all([
      "admin@atomberg.com",
      "manager1@atomberg.com", "manager2@atomberg.com", "manager3@atomberg.com",
      "emp1@atomberg.com", "emp2@atomberg.com", "emp3@atomberg.com",
      "emp4@atomberg.com", "emp5@atomberg.com", "emp6@atomberg.com",
      "emp7@atomberg.com", "emp8@atomberg.com", "emp9@atomberg.com",
    ].map((email) => prisma.user.findUniqueOrThrow({ where: { email } })))

  // ══════════════════════════════════════════════════════════════════════════════
  //  FY 2025-26  —  COMPLETED  (all goals locked, Q1-Q4 data)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("Creating FY 2025-26 cycle…")

  const cy26 = await prisma.cycle.create({
    data: {
      name: "FY 2025-26",
      phase1Opens: d("2025-04-01"),
      q1Opens:     d("2025-07-01"),
      q2Opens:     d("2025-10-01"),
      q3Opens:     d("2026-01-01"),
      q4Opens:     d("2026-03-01"),
      status: "completed",
      createdById: admin.id,
    },
  })
  const C26 = cy26.id

  // Lock timestamps (end of April 2025 — all goals set at FY start)
  const LOCK26 = d("2025-04-28")

  // ── PRIYA PATEL  (Sales · star performer · avg Q1=78 Q2=83 Q3=87 Q4=91) ──
  console.log("  Priya (FY 2025-26)…")
  const priya26 = await Promise.all([
    goal({ employeeId: priya.id, cycleId: C26, thrustArea: "Sales Revenue",      title: "Achieve ₹4.5 Cr Annual Revenue",         uomType: UomType.max_numeric, targetValue: 45000000, weightage: 30, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: priya.id, cycleId: C26, thrustArea: "Customer",           title: "Maintain 88% Customer Retention",        uomType: UomType.max_percent, targetValue: 88,       weightage: 25, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: priya.id, cycleId: C26, thrustArea: "New Business",       title: "Onboard 8 New Enterprise Clients",       uomType: UomType.max_numeric, targetValue: 8,        weightage: 25, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: priya.id, cycleId: C26, thrustArea: "Customer",           title: "Achieve NPS Score of 7.5+",              uomType: UomType.max_numeric, targetValue: 7.5,      weightage: 20, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
  ])
  for (const g of priya26) { await auditGoal(g.id, priya.id, AuditAction.created, "2025-04-05"); await auditGoal(g.id, priya.id, AuditAction.submitted, "2025-04-10"); await auditGoal(g.id, rahul.id, AuditAction.approved, "2025-04-15"); await auditGoal(g.id, rahul.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(priya26, rahul.id, priya.id, [
    { q: Quarter.Q1, at: "2025-07-05", checkAt: "2025-07-08", vals: [
      { actual: 9800000, score: 77, comment: "Revenue at 22% YTD — on track. Push enterprise deals in Q2." },
      { actual: 86, score: 75, comment: "Retention 86% — 2pp below target. Schedule at-risk QBRs." },
      { actual: 2, score: 75, comment: "2 clients in Q1 — solid start. Need 3 per quarter to hit 8." },
      { actual: 7.2, score: 80, comment: "NPS 7.2 — close to target. Survey cadence looks right." },
    ]},
    { q: Quarter.Q2, at: "2025-10-05", checkAt: "2025-10-08", vals: [
      { actual: 21000000, score: 83, comment: "H1 at ₹2.1 Cr — strong pace. H2 pipeline looking healthy." },
      { actual: 89, score: 85, comment: "Retention improved to 89% — above target. Great QBR follow-through." },
      { actual: 5, score: 84, comment: "5 clients at H1 — 3 more needed. Push fintech pipeline in Q3." },
      { actual: 7.6, score: 84, comment: "NPS 7.6 — improving. Document what's driving the uplift." },
    ]},
    { q: Quarter.Q3, at: "2026-01-05", checkAt: "2026-01-08", vals: [
      { actual: 33500000, score: 87, comment: "₹3.35 Cr YTD — on pace for year-end. Protect existing pipeline." },
      { actual: 91, score: 90, comment: "91% retention is excellent. Three accounts renewed early." },
      { actual: 7, score: 88, comment: "7 clients — just 1 short of target with Q4 remaining." },
      { actual: 7.8, score: 88, comment: "NPS 7.8 — above target. Formalise the feedback loop." },
    ]},
    { q: Quarter.Q4, at: "2026-03-05", checkAt: "2026-03-08", vals: [
      { actual: 46200000, score: 92, comment: "₹4.62 Cr — 3% above target. Excellent full-year performance." },
      { actual: 93, score: 93, comment: "93% retention — best in team. Renew success playbook for FY 27." },
      { actual: 9, score: 100, comment: "9 clients — target exceeded. Strong Q4 close." },
      { actual: 8.1, score: 100, comment: "NPS 8.1 — target beaten. Document drivers for wider team." },
    ]},
  ])

  // ── AMIT KUMAR  (Sales · mid-performer · Q1=65 Q2=70 Q3=73 Q4=78) ────────
  console.log("  Amit (FY 2025-26)…")
  const amit26 = await Promise.all([
    goal({ employeeId: amit.id, cycleId: C26, thrustArea: "Sales Revenue", title: "Achieve ₹3.5 Cr Annual Revenue",      uomType: UomType.max_numeric, targetValue: 35000000, weightage: 40, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: amit.id, cycleId: C26, thrustArea: "New Business",  title: "Onboard 6 New Enterprise Clients",   uomType: UomType.max_numeric, targetValue: 6,        weightage: 35, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: amit.id, cycleId: C26, thrustArea: "Customer",      title: "Maintain 85% Customer Retention",   uomType: UomType.max_percent, targetValue: 85,       weightage: 25, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
  ])
  // Amit had goals returned then resubmitted
  for (const g of amit26) { await auditGoal(g.id, amit.id, AuditAction.created, "2025-04-06"); await auditGoal(g.id, amit.id, AuditAction.submitted, "2025-04-11"); await auditGoal(g.id, rahul.id, AuditAction.returned, "2025-04-14"); await auditGoal(g.id, amit.id, AuditAction.submitted, "2025-04-18"); await auditGoal(g.id, rahul.id, AuditAction.approved, "2025-04-22"); await auditGoal(g.id, rahul.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(amit26, rahul.id, amit.id, [
    { q: Quarter.Q1, at: "2025-07-06", checkAt: "2025-07-09", vals: [
      { actual: 6800000, score: 65, comment: "Revenue behind pace. Identify stalled deals and escalate support." },
      { actual: 1, score: 50, comment: "Only 1 client — need to accelerate pipeline qualification in Q2." },
      { actual: 83, score: 75, comment: "Retention 83% — 2pp below target. Map at-risk accounts this week." },
    ]},
    { q: Quarter.Q2, at: "2025-10-06", checkAt: "2025-10-09", vals: [
      { actual: 16200000, score: 70, comment: "H1 at ₹1.62 Cr — picking up. Strong H2 pipeline needed." },
      { actual: 3, score: 75, comment: "3 clients at H1 — on track if Q3+Q4 pace holds." },
      { actual: 84, score: 72, comment: "Retention stable. One at-risk renewal resolved positively." },
    ]},
    { q: Quarter.Q3, at: "2026-01-06", checkAt: "2026-01-09", vals: [
      { actual: 24500000, score: 73, comment: "₹2.45 Cr — Q4 push needed to close gap." },
      { actual: 4, score: 75, comment: "4 clients — 2 more needed in Q4 to hit target." },
      { actual: 85, score: 78, comment: "Hit retention target in Q3. Keep the momentum." },
    ]},
    { q: Quarter.Q4, at: "2026-03-06", checkAt: "2026-03-09", vals: [
      { actual: 32800000, score: 78, comment: "₹3.28 Cr — 6% below target but solid year-over-year growth." },
      { actual: 6, score: 100, comment: "6 clients — target exactly met. Well done on the late push." },
      { actual: 86, score: 80, comment: "86% retention — above target. Strong year-end close." },
    ]},
  ])

  // ── KAVYA SHARMA  (Sales · improving · Q1=62 Q2=66 Q3=71 Q4=75) ──────────
  console.log("  Kavya (FY 2025-26)…")
  const kavya26 = await Promise.all([
    goal({ employeeId: kavya.id, cycleId: C26, thrustArea: "Sales Revenue", title: "Achieve ₹3 Cr Annual Revenue",       uomType: UomType.max_numeric, targetValue: 30000000, weightage: 40, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: kavya.id, cycleId: C26, thrustArea: "New Business",  title: "Onboard 5 New Enterprise Clients",  uomType: UomType.max_numeric, targetValue: 5,        weightage: 35, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
    goal({ employeeId: kavya.id, cycleId: C26, thrustArea: "People",        title: "Complete Advanced Sales Training",  uomType: UomType.timeline,   targetDate: d("2025-12-31"), weightage: 25, status: GoalStatus.locked, lockedById: rahul.id, lockedAt: LOCK26 }),
  ])
  for (const g of kavya26) { await auditGoal(g.id, kavya.id, AuditAction.created, "2025-04-08"); await auditGoal(g.id, kavya.id, AuditAction.submitted, "2025-04-13"); await auditGoal(g.id, rahul.id, AuditAction.approved, "2025-04-18"); await auditGoal(g.id, rahul.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(kavya26, rahul.id, kavya.id, [
    { q: Quarter.Q1, at: "2025-07-07", checkAt: "2025-07-10", vals: [
      { actual: 5200000, score: 62, comment: "Below pace — qualify more leads and reduce cycle time." },
      { actual: 1, score: 60, comment: "1 client — expand to mid-market in Q2 to fill gaps." },
      { actual: null, score: 65, comment: "Training enrolled. Stay on schedule for December completion." },
    ]},
    { q: Quarter.Q2, at: "2025-10-07", checkAt: "2025-10-10", vals: [
      { actual: 12800000, score: 66, comment: "H1 at ₹1.28 Cr — below pace but improving. Set Q3 mini-targets." },
      { actual: 2, score: 60, comment: "2 clients — pace needs to double in H2." },
      { actual: null, score: 72, comment: "Good progress on training modules — complete by November." },
    ]},
    { q: Quarter.Q3, at: "2026-01-07", checkAt: "2026-01-10", vals: [
      { actual: 21000000, score: 71, comment: "₹2.1 Cr — gap closing. Big Q4 needed to hit target." },
      { actual: 4, score: 75, comment: "4 clients — 1 more in Q4 to hit target. Strong pipeline." },
      { actual: null, score: 85, comment: "Training 90% done — finalise before year-end." },
    ]},
    { q: Quarter.Q4, at: "2026-03-07", checkAt: "2026-03-10", vals: [
      { actual: 28500000, score: 75, comment: "₹2.85 Cr — 5% below target. Good improvement from Q1." },
      { actual: 5, score: 100, comment: "5 clients — exactly on target. Great Q4 close." },
      { actual: null, score: 100, comment: "Training completed by Dec 31 — certified." },
    ]},
  ])

  // ── ROHAN MEHTA  (Operations · solid performer · Q1=70 Q2=75 Q3=80 Q4=85) ─
  console.log("  Rohan (FY 2025-26)…")
  const rohan26 = await Promise.all([
    goal({ employeeId: rohan.id, cycleId: C26, thrustArea: "Process Efficiency", title: "Reduce Operational Costs by 12%",        uomType: UomType.min_percent, targetValue: 12,  weightage: 35, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
    goal({ employeeId: rohan.id, cycleId: C26, thrustArea: "Process Efficiency", title: "Improve Process Throughput by 18%",      uomType: UomType.max_percent, targetValue: 18,  weightage: 35, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
    goal({ employeeId: rohan.id, cycleId: C26, thrustArea: "People",             title: "Obtain PMP Certification",                uomType: UomType.timeline,   targetDate: d("2026-01-31"), weightage: 30, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
  ])
  for (const g of rohan26) { await auditGoal(g.id, rohan.id, AuditAction.created, "2025-04-05"); await auditGoal(g.id, rohan.id, AuditAction.submitted, "2025-04-10"); await auditGoal(g.id, neha.id, AuditAction.approved, "2025-04-16"); await auditGoal(g.id, neha.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(rohan26, neha.id, rohan.id, [
    { q: Quarter.Q1, at: "2025-07-05", checkAt: "2025-07-09", vals: [
      { actual: 7,  score: 70, comment: "7% cost reduction at Q1 — good foundation. Document wins." },
      { actual: 12, score: 70, comment: "12% throughput gain — on pace. Maintain the process controls." },
      { actual: null, score: 68, comment: "PMP study plan on track. Book exam slot by October." },
    ]},
    { q: Quarter.Q2, at: "2025-10-05", checkAt: "2025-10-09", vals: [
      { actual: 9,  score: 75, comment: "9% reduction at H1 — strong. Target 12% by year-end." },
      { actual: 15, score: 76, comment: "15% throughput — approaching target. Great supplier alignment." },
      { actual: null, score: 75, comment: "70% through study material. Mock exams showing 72% pass rate." },
    ]},
    { q: Quarter.Q3, at: "2026-01-05", checkAt: "2026-01-09", vals: [
      { actual: 11, score: 80, comment: "11% at Q3 — 1pp from target. Final automation push in Q4." },
      { actual: 17, score: 82, comment: "17% throughput — nearly at target. Sustain the gains." },
      { actual: null, score: 100, comment: "PMP exam passed with distinction! Great achievement." },
    ]},
    { q: Quarter.Q4, at: "2026-03-05", checkAt: "2026-03-09", vals: [
      { actual: 13, score: 100, comment: "13% cost reduction — target exceeded. Formalise for FY 27." },
      { actual: 19, score: 100, comment: "19% throughput — above target. Excellent year." },
      { actual: null, score: 100, comment: "PMP certified. Begin applying frameworks to team processes." },
    ]},
  ])

  // ── ANITA DESAI  (Operations · improving arc · Q1=52 Q2=62 Q3=70 Q4=77) ──
  console.log("  Anita (FY 2025-26)…")
  const anita26 = await Promise.all([
    goal({ employeeId: anita.id, cycleId: C26, thrustArea: "Process Efficiency", title: "Reduce Supplier Lead Time by 20%",       uomType: UomType.min_percent, targetValue: 20, weightage: 35, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
    goal({ employeeId: anita.id, cycleId: C26, thrustArea: "Quality",            title: "Improve Supplier On-Time Delivery to 92%", uomType: UomType.max_percent, targetValue: 92, weightage: 35, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
    goal({ employeeId: anita.id, cycleId: C26, thrustArea: "People",             title: "Complete Lean Manufacturing Course",     uomType: UomType.timeline,   targetDate: d("2026-02-28"), weightage: 30, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
  ])
  for (const g of anita26) { await auditGoal(g.id, anita.id, AuditAction.created, "2025-04-06"); await auditGoal(g.id, anita.id, AuditAction.submitted, "2025-04-12"); await auditGoal(g.id, neha.id, AuditAction.approved, "2025-04-17"); await auditGoal(g.id, neha.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(anita26, neha.id, anita.id, [
    { q: Quarter.Q1, at: "2025-07-06", checkAt: "2025-07-10", vals: [
      { actual: 8,  score: 52, comment: "Only 8% reduction — well below target. Identify top 3 blockers." },
      { actual: 78, score: 50, comment: "OTD 78% — significantly below 92%. Escalate critical suppliers." },
      { actual: null, score: 55, comment: "Course enrolled but slow progress. Need 2 modules per week." },
    ]},
    { q: Quarter.Q2, at: "2025-10-06", checkAt: "2025-10-10", vals: [
      { actual: 13, score: 62, comment: "13% at H1 — improving. Supplier contract reviews helped." },
      { actual: 84, score: 63, comment: "OTD up to 84% — good trend. 3 supplier PIPs are working." },
      { actual: null, score: 65, comment: "50% through course — stay consistent, on track for Feb." },
    ]},
    { q: Quarter.Q3, at: "2026-01-06", checkAt: "2026-01-10", vals: [
      { actual: 17, score: 70, comment: "17% at Q3 — good progress. 3pp to go in Q4." },
      { actual: 88, score: 70, comment: "OTD 88% — 4pp from target. Push remaining 2 lagging suppliers." },
      { actual: null, score: 80, comment: "75% of course done. Schedule the final module this month." },
    ]},
    { q: Quarter.Q4, at: "2026-03-06", checkAt: "2026-03-10", vals: [
      { actual: 21, score: 100, comment: "21% reduction — target exceeded! Great year-end push." },
      { actual: 90, score: 77, comment: "OTD 90% — nearly at target. Strong improvement from Q1." },
      { actual: null, score: 100, comment: "Lean course completed by Feb 28. Certification achieved." },
    ]},
  ])

  // ── DEV GUPTA  (Operations · weaker performer · Q1=45 Q2=52 Q3=58 Q4=64) ─
  console.log("  Dev (FY 2025-26)…")
  const dev26 = await Promise.all([
    goal({ employeeId: dev.id, cycleId: C26, thrustArea: "Process Efficiency", title: "Streamline Warehouse Inventory Accuracy to 98%", uomType: UomType.max_percent, targetValue: 98, weightage: 50, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
    goal({ employeeId: dev.id, cycleId: C26, thrustArea: "Process Efficiency", title: "Reduce Equipment Downtime by 25%",              uomType: UomType.min_percent, targetValue: 25, weightage: 50, status: GoalStatus.locked, lockedById: neha.id, lockedAt: LOCK26 }),
  ])
  for (const g of dev26) { await auditGoal(g.id, dev.id, AuditAction.created, "2025-04-08"); await auditGoal(g.id, dev.id, AuditAction.submitted, "2025-04-16"); await auditGoal(g.id, neha.id, AuditAction.approved, "2025-04-21"); await auditGoal(g.id, neha.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(dev26, neha.id, dev.id, [
    { q: Quarter.Q1, at: "2025-07-07", checkAt: "2025-07-11", vals: [
      { actual: 88, score: 45, comment: "Accuracy 88% — far below 98%. Root cause the top 5 discrepancy sources." },
      { actual: 12, score: 45, comment: "12% downtime reduction — well below target. Review maintenance schedule." },
    ]},
    { q: Quarter.Q2, at: "2025-10-07", checkAt: "2025-10-11", vals: [
      { actual: 91, score: 52, comment: "91% accuracy — improving but still 7pp below target." },
      { actual: 16, score: 52, comment: "16% at H1. New maintenance protocol is showing results." },
    ]},
    { q: Quarter.Q3, at: "2026-01-07", checkAt: "2026-01-11", vals: [
      { actual: 93, score: 58, comment: "93% — continue the cycle count improvements from Q2." },
      { actual: 19, score: 58, comment: "19% reduction — steady improvement. Schedule year-end equipment audit." },
    ]},
    { q: Quarter.Q4, at: "2026-03-07", checkAt: "2026-03-11", vals: [
      { actual: 95, score: 64, comment: "95% accuracy — 3pp below target. Set concrete plan for FY 27." },
      { actual: 22, score: 64, comment: "22% reduction — 3pp short of target. Improved significantly over FY." },
    ]},
  ])

  // ── SANA KHAN  (Technology · top performer · Q1=82 Q2=88 Q3=93 Q4=96) ────
  console.log("  Sana (FY 2025-26)…")
  const sana26 = await Promise.all([
    goal({ employeeId: sana.id, cycleId: C26, thrustArea: "Technology", title: "Achieve 90% Automated Test Coverage",              uomType: UomType.max_percent, targetValue: 90,  weightage: 30, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: sana.id, cycleId: C26, thrustArea: "Technology", title: "Reduce Average API Response Time to 250ms",        uomType: UomType.min_numeric, targetValue: 250, weightage: 25, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: sana.id, cycleId: C26, thrustArea: "Technology", title: "Migrate 3 Core Services to Microservices",         uomType: UomType.max_numeric, targetValue: 3,   weightage: 25, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: sana.id, cycleId: C26, thrustArea: "People",     title: "Obtain AWS Solutions Architect Associate Cert",    uomType: UomType.timeline,   targetDate: d("2025-12-31"), weightage: 20, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
  ])
  for (const g of sana26) { await auditGoal(g.id, sana.id, AuditAction.created, "2025-04-05"); await auditGoal(g.id, sana.id, AuditAction.submitted, "2025-04-09"); await auditGoal(g.id, arjun.id, AuditAction.approved, "2025-04-14"); await auditGoal(g.id, arjun.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(sana26, arjun.id, sana.id, [
    { q: Quarter.Q1, at: "2025-07-04", checkAt: "2025-07-07", vals: [
      { actual: 82, score: 82, comment: "82% coverage — excellent start. Set up coverage gates in CI." },
      { actual: 238, score: 85, comment: "238ms — already under target. Work on p99 latency now." },
      { actual: 1,  score: 78, comment: "1 service migrated cleanly. Document the pattern for Q2." },
      { actual: null, score: 82, comment: "AWS study plan in place. Book exam slot for December." },
    ]},
    { q: Quarter.Q2, at: "2025-10-04", checkAt: "2025-10-07", vals: [
      { actual: 88, score: 88, comment: "88% coverage — nearly at target. Close the remaining gaps in Q3." },
      { actual: 218, score: 90, comment: "218ms — well under target. Cache hit rates are high." },
      { actual: 2,  score: 88, comment: "2 services migrated — on schedule. Q3 migration is the complex one." },
      { actual: null, score: 90, comment: "90% through study material — on track for December exam." },
    ]},
    { q: Quarter.Q3, at: "2026-01-04", checkAt: "2026-01-07", vals: [
      { actual: 92, score: 93, comment: "92% coverage — target exceeded! Enforce gates to maintain." },
      { actual: 205, score: 94, comment: "205ms — exceptional performance. Benchmark for other teams." },
      { actual: 3,  score: 100, comment: "All 3 services migrated — 1 quarter early! Amazing execution." },
      { actual: null, score: 100, comment: "AWS certified in Q3 — ahead of schedule. Excellent!" },
    ]},
    { q: Quarter.Q4, at: "2026-03-04", checkAt: "2026-03-07", vals: [
      { actual: 94, score: 96, comment: "94% coverage — 4pp above target. Best in engineering." },
      { actual: 198, score: 100, comment: "198ms — 20% below target. Document optimisations for others." },
      { actual: 3,  score: 100, comment: "Migration complete and stable in production for a full quarter." },
      { actual: null, score: 100, comment: "AWS certified — already applying cloud patterns across team." },
    ]},
  ])

  // ── SHARED GOAL FY 2025-26  (Raj + Meera: Zero Critical Incidents in Prod) ─
  const sharedTemplate26 = await goal({
    employeeId: raj.id, cycleId: C26,
    thrustArea: "Customer",
    title: "Zero Critical Production Incidents — FY 2025-26",
    description: "Team KPI: zero Sev-1 incidents in production for the full financial year.",
    uomType: UomType.zero, weightage: 0,
    status: GoalStatus.locked, isShared: true,
    lockedById: arjun.id, lockedAt: LOCK26,
  })

  // ── RAJ IYER  (Technology · Q1=76 Q2=80 Q3=84 Q4=89) ─────────────────────
  console.log("  Raj (FY 2025-26)…")
  const rajPersonal26 = await Promise.all([
    goal({ employeeId: raj.id, cycleId: C26, thrustArea: "Technology", title: "Migrate API Gateway to GraphQL",         uomType: UomType.max_percent, targetValue: 100, weightage: 35, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: raj.id, cycleId: C26, thrustArea: "Technology", title: "Reduce Deployment Lead Time to 2 Hours", uomType: UomType.min_numeric, targetValue: 2,   weightage: 30, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: raj.id, cycleId: C26, thrustArea: "Technology", title: "Achieve 95% System Uptime SLA",          uomType: UomType.max_percent, targetValue: 95,  weightage: 20, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
  ])
  const rajShared26 = await goal({
    employeeId: raj.id, cycleId: C26,
    thrustArea: "Customer",
    title: "Zero Critical Production Incidents — FY 2025-26",
    uomType: UomType.zero, weightage: 15,
    status: GoalStatus.locked, isShared: true,
    sharedFromId: sharedTemplate26.id,
    lockedById: arjun.id, lockedAt: LOCK26,
  })
  const rajAll26 = [...rajPersonal26, rajShared26]
  for (const g of rajAll26) { await auditGoal(g.id, raj.id, AuditAction.created, "2025-04-07"); await auditGoal(g.id, raj.id, AuditAction.submitted, "2025-04-11"); await auditGoal(g.id, arjun.id, AuditAction.approved, "2025-04-16"); await auditGoal(g.id, arjun.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(rajPersonal26, arjun.id, raj.id, [
    { q: Quarter.Q1, at: "2025-07-05", checkAt: "2025-07-08", vals: [
      { actual: 55,  score: 76, comment: "55% migrated — solid progress. Ensure backwards compat layer." },
      { actual: 2.2, score: 76, comment: "2.2h — just above target. Optimise test parallelisation." },
      { actual: 96,  score: 78, comment: "96% uptime — 1pp above SLA. Good incident response." },
    ]},
    { q: Quarter.Q2, at: "2025-10-05", checkAt: "2025-10-08", vals: [
      { actual: 78,  score: 80, comment: "78% migrated — well on track. Q3 is the complex auth service." },
      { actual: 1.9, score: 82, comment: "1.9h — under target! Document the CI changes." },
      { actual: 97,  score: 82, comment: "97% uptime — above SLA. Zero Sev-1 incidents in H1." },
    ]},
    { q: Quarter.Q3, at: "2026-01-05", checkAt: "2026-01-08", vals: [
      { actual: 90,  score: 84, comment: "90% migrated. Auth service was complex — well handled." },
      { actual: 1.7, score: 86, comment: "1.7h — 15% below target. Excellent optimisation." },
      { actual: 97,  score: 85, comment: "97% uptime — consistent reliability." },
    ]},
    { q: Quarter.Q4, at: "2026-03-05", checkAt: "2026-03-08", vals: [
      { actual: 100, score: 100, comment: "Migration complete — all APIs on GraphQL. Phenomenal." },
      { actual: 1.5, score: 100, comment: "1.5h — 25% below target. Document for wider team." },
      { actual: 98,  score: 100, comment: "98% uptime — above SLA. Best reliability year on record." },
    ]},
  ])
  // Raj shared goal Q1-Q4 (zero incidents each quarter)
  for (const [q, at, checkAt] of [
    [Quarter.Q1, "2025-07-05", "2025-07-08"],
    [Quarter.Q2, "2025-10-05", "2025-10-08"],
    [Quarter.Q3, "2026-01-05", "2026-01-08"],
    [Quarter.Q4, "2026-03-05", "2026-03-08"],
  ] as [Quarter, string, string][]) {
    await ach(rajShared26.id, q, 0, 100, at)
    await checkin(rajShared26.id, arjun.id, raj.id, q, "Zero Sev-1 incidents this quarter — excellent team discipline.", checkAt)
  }

  // ── MEERA NAIR  (Technology · Q1=74 Q2=79 Q3=85 Q4=92) ──────────────────
  console.log("  Meera (FY 2025-26)…")
  const meeraPersonal26 = await Promise.all([
    goal({ employeeId: meera.id, cycleId: C26, thrustArea: "Technology", title: "Build Real-Time Analytics Pipeline",         uomType: UomType.max_percent, targetValue: 100, weightage: 35, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: meera.id, cycleId: C26, thrustArea: "Technology", title: "Implement End-to-End CI/CD Pipeline",        uomType: UomType.zero,        weightage: 30, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
    goal({ employeeId: meera.id, cycleId: C26, thrustArea: "People",     title: "Obtain Google Cloud Data Engineer Cert",    uomType: UomType.timeline,   targetDate: d("2026-02-28"), weightage: 20, status: GoalStatus.locked, lockedById: arjun.id, lockedAt: LOCK26 }),
  ])
  const meeraShared26 = await goal({
    employeeId: meera.id, cycleId: C26,
    thrustArea: "Customer",
    title: "Zero Critical Production Incidents — FY 2025-26",
    uomType: UomType.zero, weightage: 15,
    status: GoalStatus.locked, isShared: true,
    sharedFromId: sharedTemplate26.id,
    lockedById: arjun.id, lockedAt: LOCK26,
  })
  const meeraAll26 = [...meeraPersonal26, meeraShared26]
  for (const g of meeraAll26) { await auditGoal(g.id, meera.id, AuditAction.created, "2025-04-07"); await auditGoal(g.id, meera.id, AuditAction.submitted, "2025-04-11"); await auditGoal(g.id, arjun.id, AuditAction.approved, "2025-04-16"); await auditGoal(g.id, arjun.id, AuditAction.locked, "2025-04-28") }
  await seedQuarters(meeraPersonal26, arjun.id, meera.id, [
    { q: Quarter.Q1, at: "2025-07-05", checkAt: "2025-07-08", vals: [
      { actual: 45,  score: 74, comment: "45% pipeline built — Kafka integration solid. Focus on data quality." },
      { actual: null, score: 72, comment: "CI/CD foundations in staging — production pipeline is Q2 target." },
      { actual: null, score: 70, comment: "GCP study plan in place. Aim for exam slot in February." },
    ]},
    { q: Quarter.Q2, at: "2025-10-05", checkAt: "2025-10-08", vals: [
      { actual: 72,  score: 79, comment: "72% — streaming layer complete. Focus on real-time alerting." },
      { actual: null, score: 78, comment: "Production CI/CD live! Deployment time cut by 60%. Impressive." },
      { actual: null, score: 78, comment: "50% through GCP material — on track for February." },
    ]},
    { q: Quarter.Q3, at: "2026-01-05", checkAt: "2026-01-08", vals: [
      { actual: 90,  score: 85, comment: "90% pipeline — alerting rules tuned well. Final 10% is dashboards." },
      { actual: null, score: 85, comment: "CI/CD fully automated with rollback. Gold standard for the team." },
      { actual: null, score: 90, comment: "75% through GCP — schedule mock exam this month." },
    ]},
    { q: Quarter.Q4, at: "2026-03-05", checkAt: "2026-03-08", vals: [
      { actual: 100, score: 100, comment: "Pipeline fully live in production — excellent delivery!" },
      { actual: null, score: 100, comment: "CI/CD complete and adopted by 3 other teams. Great impact." },
      { actual: null, score: 100, comment: "GCP certified by Feb 28 — ahead of schedule!" },
    ]},
  ])
  for (const [q, at, checkAt] of [
    [Quarter.Q1, "2025-07-05", "2025-07-08"],
    [Quarter.Q2, "2025-10-05", "2025-10-08"],
    [Quarter.Q3, "2026-01-05", "2026-01-08"],
    [Quarter.Q4, "2026-03-05", "2026-03-08"],
  ] as [Quarter, string, string][]) {
    await ach(meeraShared26.id, q, 0, 100, at)
    await checkin(meeraShared26.id, arjun.id, meera.id, q, "Zero Sev-1 incidents this quarter — your on-call discipline is outstanding.", checkAt)
  }

  console.log("  ✅ FY 2025-26 complete.\n")

  // ══════════════════════════════════════════════════════════════════════════════
  //  FY 2026-27  —  ACTIVE  (goal setting in progress, NO check-ins)
  //  Today: 2026-05-17  |  phase1Opens: 2026-05-01  |  q1Opens: 2026-07-01
  //  → Goal setting window is open. Q1 check-ins don't open until July 1.
  //  → NO achievements, NO check-ins for anyone.
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("Creating FY 2026-27 cycle…")

  const cy27 = await prisma.cycle.create({
    data: {
      name: "FY 2026-27",
      phase1Opens: d("2026-05-01"),  // goal setting opened May 1
      q1Opens:     d("2026-07-01"),  // Q1 check-in window opens Jul 1 (future)
      q2Opens:     d("2026-10-01"),
      q3Opens:     d("2027-01-01"),
      q4Opens:     d("2027-03-01"),
      status: "active",
      createdById: admin.id,
    },
  })
  const C27 = cy27.id

  // ── PRIYA PATEL  · goals APPROVED (submitted + approved, leading example) ──
  console.log("  Priya (FY 2026-27) — approved…")
  const priya27 = await Promise.all([
    goal({ employeeId: priya.id, cycleId: C27, thrustArea: "Sales Revenue", title: "Achieve ₹6 Cr Annual Revenue",          uomType: UomType.max_numeric, targetValue: 60000000, weightage: 30, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: d("2026-05-12") }),
    goal({ employeeId: priya.id, cycleId: C27, thrustArea: "Customer",      title: "Maintain 92% Customer Retention",       uomType: UomType.max_percent, targetValue: 92,       weightage: 25, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: d("2026-05-12") }),
    goal({ employeeId: priya.id, cycleId: C27, thrustArea: "New Business",  title: "Onboard 12 New Enterprise Clients",     uomType: UomType.max_numeric, targetValue: 12,       weightage: 25, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: d("2026-05-12") }),
    goal({ employeeId: priya.id, cycleId: C27, thrustArea: "Customer",      title: "Achieve NPS Score of 8.5+",             uomType: UomType.max_numeric, targetValue: 8.5,      weightage: 20, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: d("2026-05-12") }),
  ])
  for (const g of priya27) { await auditGoal(g.id, priya.id, AuditAction.created, "2026-05-03"); await auditGoal(g.id, priya.id, AuditAction.submitted, "2026-05-06"); await auditGoal(g.id, rahul.id, AuditAction.approved, "2026-05-12") }

  // ── AMIT KUMAR  · goals RETURNED by manager (needs revision) ──────────────
  console.log("  Amit (FY 2026-27) — returned…")
  const amit27 = await Promise.all([
    goal({ employeeId: amit.id, cycleId: C27, thrustArea: "Sales Revenue", title: "Achieve ₹9 Cr Annual Revenue",      uomType: UomType.max_numeric, targetValue: 90000000, weightage: 40, status: GoalStatus.returned }),
    goal({ employeeId: amit.id, cycleId: C27, thrustArea: "New Business",  title: "Onboard 18 New Enterprise Clients", uomType: UomType.max_numeric, targetValue: 18,       weightage: 35, status: GoalStatus.returned }),
    goal({ employeeId: amit.id, cycleId: C27, thrustArea: "Customer",      title: "Achieve 96% Customer Retention",   uomType: UomType.max_percent, targetValue: 96,       weightage: 25, status: GoalStatus.returned }),
  ])
  for (const g of amit27) { await auditGoal(g.id, amit.id, AuditAction.created, "2026-05-04"); await auditGoal(g.id, amit.id, AuditAction.submitted, "2026-05-08") }
  await auditGoal(amit27[0].id, rahul.id, AuditAction.returned, "2026-05-13", "returnComment", "", "Revenue target of ₹9 Cr is not aligned with your territory. Revise to ₹5.5 Cr with quarterly milestones.")
  await auditGoal(amit27[1].id, rahul.id, AuditAction.returned, "2026-05-13", "returnComment", "", "18 clients is unrealistic without adding headcount. Revise to 10 with a clear outreach strategy.")
  await auditGoal(amit27[2].id, rahul.id, AuditAction.returned, "2026-05-13", "returnComment", "", "96% retention needs specific initiatives documented — please add a detailed action plan.")
  await prisma.escalation.create({ data: { type: "goal_not_approved", employeeId: amit.id, managerId: rahul.id, cycleId: C27, triggeredAt: d("2026-05-14"), notificationCount: 1, status: "open" } })

  // ── KAVYA SHARMA  · goals SUBMITTED (awaiting manager approval) ───────────
  console.log("  Kavya (FY 2026-27) — submitted…")
  const kavya27 = await Promise.all([
    goal({ employeeId: kavya.id, cycleId: C27, thrustArea: "Sales Revenue", title: "Achieve ₹4.5 Cr Annual Revenue",      uomType: UomType.max_numeric, targetValue: 45000000, weightage: 40, status: GoalStatus.submitted }),
    goal({ employeeId: kavya.id, cycleId: C27, thrustArea: "New Business",  title: "Onboard 7 New Enterprise Clients",    uomType: UomType.max_numeric, targetValue: 7,        weightage: 35, status: GoalStatus.submitted }),
    goal({ employeeId: kavya.id, cycleId: C27, thrustArea: "People",        title: "Complete Sales Leadership Program",   uomType: UomType.timeline,   targetDate: d("2026-12-31"), weightage: 25, status: GoalStatus.submitted }),
  ])
  for (const g of kavya27) { await auditGoal(g.id, kavya.id, AuditAction.created, "2026-05-05"); await auditGoal(g.id, kavya.id, AuditAction.submitted, "2026-05-10") }
  await prisma.escalation.create({ data: { type: "goal_not_approved", employeeId: kavya.id, managerId: rahul.id, cycleId: C27, triggeredAt: d("2026-05-15"), notificationCount: 1, status: "open" } })

  // ── ROHAN MEHTA  · goals APPROVED ─────────────────────────────────────────
  console.log("  Rohan (FY 2026-27) — approved…")
  const rohan27 = await Promise.all([
    goal({ employeeId: rohan.id, cycleId: C27, thrustArea: "Process Efficiency", title: "Reduce Operational Costs by 18%",          uomType: UomType.min_percent, targetValue: 18,  weightage: 40, status: GoalStatus.approved, lockedById: neha.id, lockedAt: d("2026-05-14") }),
    goal({ employeeId: rohan.id, cycleId: C27, thrustArea: "Quality",            title: "Achieve ISO 9001:2015 Certification",      uomType: UomType.timeline,   targetDate: d("2026-12-31"), weightage: 35, status: GoalStatus.approved, lockedById: neha.id, lockedAt: d("2026-05-14") }),
    goal({ employeeId: rohan.id, cycleId: C27, thrustArea: "People",             title: "Lead Process Automation Initiative",       uomType: UomType.max_percent, targetValue: 60,  weightage: 25, status: GoalStatus.approved, lockedById: neha.id, lockedAt: d("2026-05-14") }),
  ])
  for (const g of rohan27) { await auditGoal(g.id, rohan.id, AuditAction.created, "2026-05-03"); await auditGoal(g.id, rohan.id, AuditAction.submitted, "2026-05-08"); await auditGoal(g.id, neha.id, AuditAction.approved, "2026-05-14") }

  // ── ANITA DESAI  · 2 goals APPROVED, 1 SUBMITTED (pending) ───────────────
  console.log("  Anita (FY 2026-27) — mixed…")
  const anita27 = await Promise.all([
    goal({ employeeId: anita.id, cycleId: C27, thrustArea: "Process Efficiency", title: "Improve Supplier OTD to 96%",              uomType: UomType.max_percent, targetValue: 96,  weightage: 40, status: GoalStatus.approved, lockedById: neha.id, lockedAt: d("2026-05-14") }),
    goal({ employeeId: anita.id, cycleId: C27, thrustArea: "Process Efficiency", title: "Reduce Supplier Lead Time by 25%",         uomType: UomType.min_percent, targetValue: 25,  weightage: 35, status: GoalStatus.approved, lockedById: neha.id, lockedAt: d("2026-05-14") }),
    goal({ employeeId: anita.id, cycleId: C27, thrustArea: "People",             title: "Complete Six Sigma Green Belt",            uomType: UomType.timeline,   targetDate: d("2027-02-28"), weightage: 25, status: GoalStatus.submitted }),
  ])
  await auditGoal(anita27[0].id, anita.id, AuditAction.created, "2026-05-04"); await auditGoal(anita27[0].id, anita.id, AuditAction.submitted, "2026-05-08"); await auditGoal(anita27[0].id, neha.id, AuditAction.approved, "2026-05-14")
  await auditGoal(anita27[1].id, anita.id, AuditAction.created, "2026-05-04"); await auditGoal(anita27[1].id, anita.id, AuditAction.submitted, "2026-05-08"); await auditGoal(anita27[1].id, neha.id, AuditAction.approved, "2026-05-14")
  await auditGoal(anita27[2].id, anita.id, AuditAction.created, "2026-05-05"); await auditGoal(anita27[2].id, anita.id, AuditAction.submitted, "2026-05-11")

  // ── DEV GUPTA  · goals in DRAFT — hasn't submitted yet → escalation ────────
  console.log("  Dev (FY 2026-27) — draft / escalation…")
  const dev27 = await Promise.all([
    goal({ employeeId: dev.id, cycleId: C27, thrustArea: "Process Efficiency", title: "Warehouse Inventory Accuracy to 99%",      uomType: UomType.max_percent, targetValue: 99, weightage: 45, status: GoalStatus.draft }),
    goal({ employeeId: dev.id, cycleId: C27, thrustArea: "Process Efficiency", title: "Reduce Equipment Downtime by 30%",         uomType: UomType.min_percent, targetValue: 30, weightage: 35, status: GoalStatus.draft }),
    goal({ employeeId: dev.id, cycleId: C27, thrustArea: "People",             title: "Complete Safety Compliance Certification", uomType: UomType.zero,       weightage: 20, status: GoalStatus.draft }),
  ])
  for (const g of dev27) { await auditGoal(g.id, dev.id, AuditAction.created, "2026-05-06") }
  await prisma.escalation.create({ data: { type: "goal_not_submitted", employeeId: dev.id, managerId: neha.id, cycleId: C27, triggeredAt: d("2026-05-15"), notificationCount: 2, status: "open" } })

  // ── SANA KHAN  · goals APPROVED ───────────────────────────────────────────
  console.log("  Sana (FY 2026-27) — approved…")
  const sana27 = await Promise.all([
    goal({ employeeId: sana.id, cycleId: C27, thrustArea: "Technology", title: "Complete Platform Architecture Redesign",       uomType: UomType.max_percent, targetValue: 100, weightage: 30, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: sana.id, cycleId: C27, thrustArea: "Technology", title: "Achieve 98% Automated Test Coverage",          uomType: UomType.max_percent, targetValue: 98,  weightage: 25, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: sana.id, cycleId: C27, thrustArea: "Technology", title: "Reduce API Response Time Below 150ms",         uomType: UomType.min_numeric, targetValue: 150, weightage: 25, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: sana.id, cycleId: C27, thrustArea: "People",     title: "Mentor 2 Junior Developers to Mid-Level",     uomType: UomType.max_numeric, targetValue: 2,   weightage: 20, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
  ])
  for (const g of sana27) { await auditGoal(g.id, sana.id, AuditAction.created, "2026-05-02"); await auditGoal(g.id, sana.id, AuditAction.submitted, "2026-05-05"); await auditGoal(g.id, arjun.id, AuditAction.approved, "2026-05-13") }

  // ── SHARED GOAL FY 2026-27 (Raj + Meera) ──────────────────────────────────
  const sharedTemplate27 = await goal({
    employeeId: raj.id, cycleId: C27,
    thrustArea: "Customer",
    title: "Zero Critical Production Incidents — FY 2026-27",
    description: "Team KPI: zero Sev-1 incidents in production across the full financial year.",
    uomType: UomType.zero, weightage: 0,
    status: GoalStatus.approved, isShared: true,
    lockedById: arjun.id, lockedAt: d("2026-05-13"),
  })

  // ── RAJ IYER  · personal goals APPROVED + shared copy ─────────────────────
  console.log("  Raj (FY 2026-27) — approved…")
  const rajPersonal27 = await Promise.all([
    goal({ employeeId: raj.id, cycleId: C27, thrustArea: "Technology", title: "Deliver Event-Driven Architecture Migration",  uomType: UomType.max_percent, targetValue: 100, weightage: 35, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: raj.id, cycleId: C27, thrustArea: "Technology", title: "Reduce Deployment Lead Time to 1 Hour",       uomType: UomType.min_numeric, targetValue: 1,   weightage: 30, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: raj.id, cycleId: C27, thrustArea: "Technology", title: "Achieve 99.5% System Uptime",                 uomType: UomType.max_percent, targetValue: 99.5, weightage: 20, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
  ])
  const rajShared27 = await goal({
    employeeId: raj.id, cycleId: C27,
    thrustArea: "Customer",
    title: "Zero Critical Production Incidents — FY 2026-27",
    uomType: UomType.zero, weightage: 15,
    status: GoalStatus.approved, isShared: true,
    sharedFromId: sharedTemplate27.id,
    lockedById: arjun.id, lockedAt: d("2026-05-13"),
  })
  for (const g of [...rajPersonal27, rajShared27]) { await auditGoal(g.id, raj.id, AuditAction.created, "2026-05-03"); await auditGoal(g.id, raj.id, AuditAction.submitted, "2026-05-07"); await auditGoal(g.id, arjun.id, AuditAction.approved, "2026-05-13") }

  // ── MEERA NAIR  · personal goals APPROVED + shared copy ───────────────────
  console.log("  Meera (FY 2026-27) — approved…")
  const meeraPersonal27 = await Promise.all([
    goal({ employeeId: meera.id, cycleId: C27, thrustArea: "Technology", title: "Scale Analytics Platform to Handle 10x Load",  uomType: UomType.max_percent, targetValue: 100, weightage: 35, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: meera.id, cycleId: C27, thrustArea: "Technology", title: "Implement ML-Based Anomaly Detection",         uomType: UomType.zero,       weightage: 30, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
    goal({ employeeId: meera.id, cycleId: C27, thrustArea: "People",     title: "Publish 2 Engineering Blog Posts",            uomType: UomType.max_numeric, targetValue: 2, weightage: 20, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: d("2026-05-13") }),
  ])
  const meeraShared27 = await goal({
    employeeId: meera.id, cycleId: C27,
    thrustArea: "Customer",
    title: "Zero Critical Production Incidents — FY 2026-27",
    uomType: UomType.zero, weightage: 15,
    status: GoalStatus.approved, isShared: true,
    sharedFromId: sharedTemplate27.id,
    lockedById: arjun.id, lockedAt: d("2026-05-13"),
  })
  for (const g of [...meeraPersonal27, meeraShared27]) { await auditGoal(g.id, meera.id, AuditAction.created, "2026-05-03"); await auditGoal(g.id, meera.id, AuditAction.submitted, "2026-05-07"); await auditGoal(g.id, arjun.id, AuditAction.approved, "2026-05-13") }

  // ── suppress unused-var warnings (referenced but otherwise unused) ─────────
  void [kavya27, dev27, rajShared27, meeraShared27, sana27, anita27, amit27, priya27, rohan27]

  console.log("  ✅ FY 2026-27 complete.\n")

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("✅ Seed complete!")
  console.log("")
  console.log("FY 2025-26 (COMPLETED) — all goals locked, Q1-Q4 full data")
  console.log("FY 2026-27 (ACTIVE)    — goal setting in progress, zero check-ins")
  console.log("")
  console.log("Demo Credentials")
  console.log("  admin@atomberg.com          Admin@123")
  console.log("  manager1@atomberg.com       Manager@123   (Rahul Singh — Sales)")
  console.log("  manager2@atomberg.com       Manager@123   (Neha Joshi — Operations)")
  console.log("  manager3@atomberg.com       Manager@123   (Arjun Verma — Technology)")
  console.log("  emp1@atomberg.com           Emp@123   Priya Patel    — approved")
  console.log("  emp2@atomberg.com           Emp@123   Amit Kumar     — returned (needs revision)")
  console.log("  emp3@atomberg.com           Emp@123   Kavya Sharma   — submitted (pending)")
  console.log("  emp4@atomberg.com           Emp@123   Rohan Mehta    — approved")
  console.log("  emp5@atomberg.com           Emp@123   Anita Desai    — 2 approved, 1 pending")
  console.log("  emp6@atomberg.com           Emp@123   Dev Gupta      — draft / escalation")
  console.log("  emp7@atomberg.com           Emp@123   Sana Khan      — approved")
  console.log("  emp8@atomberg.com           Emp@123   Raj Iyer       — approved + shared")
  console.log("  emp9@atomberg.com           Emp@123   Meera Nair     — approved + shared")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
