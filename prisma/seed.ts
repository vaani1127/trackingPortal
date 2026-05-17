import {
  PrismaClient,
  Role,
  UomType,
  GoalStatus,
  Quarter,
  AchievementStatus,
  AuditAction,
} from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as bcrypt from "bcryptjs"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

// Use DIRECT_URL for seeding: bypasses PgBouncer so transactions work correctly.
// Falls back to DATABASE_URL for local dev (Prisma local DB or direct Postgres).
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

const SALT_ROUNDS = 10
const NOW = new Date("2026-05-17") // demo "today"

// ─── helpers ──────────────────────────────────────────────────────────────────

function d(s: string) {
  return new Date(s)
}

async function createGoal(data: {
  employeeId: string
  cycleId: string
  thrustArea: string
  title: string
  description?: string
  uomType: UomType
  targetValue?: number
  targetDate?: Date
  weightage: number
  status: GoalStatus
  lockedById?: string
  lockedAt?: Date
  isShared?: boolean
  sharedFromId?: string
}) {
  return prisma.goal.create({
    data: {
      employeeId: data.employeeId,
      cycleId: data.cycleId,
      thrustArea: data.thrustArea,
      title: data.title,
      description: data.description,
      uomType: data.uomType,
      targetValue: data.targetValue ?? null,
      targetDate: data.targetDate ?? null,
      weightage: data.weightage,
      status: data.status,
      isShared: data.isShared ?? false,
      sharedFromId: data.sharedFromId ?? null,
      lockedById: data.lockedById ?? null,
      lockedAt: data.lockedAt ?? null,
    },
  })
}

async function auditCreated(goalId: string, userId: string, at: string) {
  return prisma.auditLog.create({
    data: { entityType: "Goal", entityId: goalId, goalId, changedById: userId, action: AuditAction.created, changedAt: d(at) },
  })
}
async function auditSubmitted(goalId: string, userId: string, at: string) {
  return prisma.auditLog.create({
    data: { entityType: "Goal", entityId: goalId, goalId, changedById: userId, action: AuditAction.submitted, changedAt: d(at) },
  })
}
async function auditApproved(goalId: string, userId: string, at: string) {
  return prisma.auditLog.create({
    data: { entityType: "Goal", entityId: goalId, goalId, changedById: userId, action: AuditAction.approved, changedAt: d(at) },
  })
}
async function auditReturned(goalId: string, managerId: string, at: string, comment: string) {
  await prisma.auditLog.create({
    data: { entityType: "Goal", entityId: goalId, goalId, changedById: managerId, action: AuditAction.returned, changedAt: d(at) },
  })
  await prisma.auditLog.create({
    data: { entityType: "Goal", entityId: goalId, goalId, changedById: managerId, action: AuditAction.returned, fieldName: "returnComment", newValue: comment, changedAt: d(at) },
  })
}
async function auditLocked(goalId: string, managerId: string, at: string) {
  return prisma.auditLog.create({
    data: { entityType: "Goal", entityId: goalId, goalId, changedById: managerId, action: AuditAction.locked, changedAt: d(at) },
  })
}

async function addAchievement(goalId: string, quarter: Quarter, actualValue: number | null, score: number, status: AchievementStatus, submittedAt: string) {
  return prisma.achievement.create({
    data: { goalId, quarter, actualValue, computedScore: score, progressStatus: status, submittedAt: d(submittedAt) },
  })
}

async function addCheckin(goalId: string, managerId: string, employeeId: string, quarter: Quarter, comment: string, at: string) {
  return prisma.checkin.create({
    data: { goalId, managerId, employeeId, quarter, comment, createdAt: d(at) },
  })
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Cleaning existing data…")

  await prisma.escalation.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.checkin.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.cycle.deleteMany()
  await prisma.user.deleteMany()

  console.log("Hashing passwords…")
  const [adminHash, managerHash, empHash] = await Promise.all([
    bcrypt.hash("Admin@123", SALT_ROUNDS),
    bcrypt.hash("Manager@123", SALT_ROUNDS),
    bcrypt.hash("Emp@123", SALT_ROUNDS),
  ])

  console.log("Seeding users…")

  const admin = await prisma.user.create({
    data: { email: "admin@atomberg.com", name: "Admin User", passwordHash: adminHash, role: Role.admin, department: "Administration" },
  })

  // ── Managers ──
  const rahul = await prisma.user.create({
    data: { email: "manager1@atomberg.com", name: "Rahul Singh", passwordHash: managerHash, role: Role.manager, department: "Sales" },
  })
  const neha = await prisma.user.create({
    data: { email: "manager2@atomberg.com", name: "Neha Joshi", passwordHash: managerHash, role: Role.manager, department: "Operations" },
  })
  const arjun = await prisma.user.create({
    data: { email: "manager3@atomberg.com", name: "Arjun Verma", passwordHash: managerHash, role: Role.manager, department: "Technology" },
  })

  // ── Sales employees ──
  const priya = await prisma.user.create({
    data: { email: "emp1@atomberg.com", name: "Priya Patel", passwordHash: empHash, role: Role.employee, department: "Sales", managerId: rahul.id },
  })
  const amit = await prisma.user.create({
    data: { email: "emp2@atomberg.com", name: "Amit Kumar", passwordHash: empHash, role: Role.employee, department: "Sales", managerId: rahul.id },
  })
  const kavya = await prisma.user.create({
    data: { email: "emp3@atomberg.com", name: "Kavya Sharma", passwordHash: empHash, role: Role.employee, department: "Sales", managerId: rahul.id },
  })

  // ── Operations employees ──
  const rohan = await prisma.user.create({
    data: { email: "emp4@atomberg.com", name: "Rohan Mehta", passwordHash: empHash, role: Role.employee, department: "Operations", managerId: neha.id },
  })
  const anita = await prisma.user.create({
    data: { email: "emp5@atomberg.com", name: "Anita Desai", passwordHash: empHash, role: Role.employee, department: "Operations", managerId: neha.id },
  })
  const dev = await prisma.user.create({
    data: { email: "emp6@atomberg.com", name: "Dev Gupta", passwordHash: empHash, role: Role.employee, department: "Operations", managerId: neha.id },
  })

  // ── Technology employees ──
  const sana = await prisma.user.create({
    data: { email: "emp7@atomberg.com", name: "Sana Khan", passwordHash: empHash, role: Role.employee, department: "Technology", managerId: arjun.id },
  })
  const raj = await prisma.user.create({
    data: { email: "emp8@atomberg.com", name: "Raj Iyer", passwordHash: empHash, role: Role.employee, department: "Technology", managerId: arjun.id },
  })
  const meera = await prisma.user.create({
    data: { email: "emp9@atomberg.com", name: "Meera Nair", passwordHash: empHash, role: Role.employee, department: "Technology", managerId: arjun.id },
  })

  console.log("Seeding cycle…")

  const cycle = await prisma.cycle.create({
    data: {
      name: "FY 2026-27",
      phase1Opens: d("2026-05-01"), // Goal Setting opens May 1, 2026
      q1Opens:     d("2026-07-01"), // Q1 Check-in opens July 1, 2026
      q2Opens:     d("2026-10-01"), // Q2 Check-in opens October 1, 2026
      q3Opens:     d("2027-01-01"), // Q3 Check-in opens January 1, 2027
      q4Opens:     d("2027-03-01"), // Q4/Annual opens March 1, 2027
      status: "active",
      createdById: admin.id,
    },
  })

  const CID = cycle.id
  const LOCKED_AT = d("2026-04-25")

  console.log("Seeding goals…")

  // ────────────────────────────────────────────────────────────────────────────
  // PRIYA PATEL — all goals approved, Q1+Q2 on-track (star performer)
  // ────────────────────────────────────────────────────────────────────────────
  const priyaGoals = await Promise.all([
    createGoal({ employeeId: priya.id, cycleId: CID, thrustArea: "Sales", title: "Achieve ₹5 Crore Annual Revenue Target", description: "Meet or exceed annual sales revenue through new and existing accounts.", uomType: UomType.max_numeric, targetValue: 50000000, weightage: 25, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: priya.id, cycleId: CID, thrustArea: "Customer", title: "Maintain 90% Customer Retention Rate", description: "Ensure renewal rates remain at or above 90% through proactive engagement.", uomType: UomType.max_percent, targetValue: 90, weightage: 25, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: priya.id, cycleId: CID, thrustArea: "Sales", title: "Onboard 10 New Enterprise Clients", description: "Identify, qualify, and close 10 new enterprise-level clients.", uomType: UomType.max_numeric, targetValue: 10, weightage: 25, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: priya.id, cycleId: CID, thrustArea: "Customer", title: "Improve Average NPS Score to 8+", description: "Drive satisfaction initiatives to achieve Net Promoter Score of 8+.", uomType: UomType.max_numeric, targetValue: 8, weightage: 10, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: priya.id, cycleId: CID, thrustArea: "People", title: "Complete Advanced Product Certification", description: "Finish all required product knowledge certifications by Q2.", uomType: UomType.timeline, targetDate: d("2026-09-30"), weightage: 5, status: GoalStatus.approved, lockedById: rahul.id, lockedAt: LOCKED_AT }),
  ])

  for (const g of priyaGoals) {
    await auditCreated(g.id, priya.id, "2026-04-10")
    await auditSubmitted(g.id, priya.id, "2026-04-15")
    await auditApproved(g.id, rahul.id, "2026-04-20")
    await auditLocked(g.id, rahul.id, "2026-04-20")
  }

  // Q1 achievements — on track
  const priyaQ1 = [
    { actual: 13200000, score: 79 },  // 26% of 50M → prorated to 79
    { actual: 88, score: 82 },        // 88% retention
    { actual: 3, score: 60 },         // 3 of 10 clients
    { actual: 7.8, score: 78 },       // NPS 7.8 of 8
    { actual: null, score: 72 },      // timeline
  ]
  for (let i = 0; i < priyaGoals.length; i++) {
    const d2 = priyaQ1[i]
    await addAchievement(priyaGoals[i].id, Quarter.Q1, d2.actual, d2.score, AchievementStatus.on_track, "2026-07-05")
    await addCheckin(priyaGoals[i].id, rahul.id, priya.id, Quarter.Q1,
      ["Revenue pipeline is strong. Q1 at 26% of annual is right on track. Push to accelerate deal closures in Q2.",
       "Retention is excellent. Schedule QBRs with 5 at-risk accounts before Q2 renewals kick in.",
       "3 enterprise clients closed in Q1 — solid start. Target 4 more in Q2 to stay ahead.",
       "NPS of 7.8 is close to the 8.0 target. Survey cadence looks right — keep the momentum.",
       "Certification modules completed. On track for September deadline."][i],
      "2026-07-10")
  }

  // Q2 achievements — stronger
  const priyaQ2 = [
    { actual: 27500000, score: 88 },  // 55% of 50M (cumulative?)
    { actual: 92, score: 90 },        // 92% retention
    { actual: 7, score: 85 },         // 7 of 10
    { actual: 8.2, score: 100 },      // exceeded NPS target
    { actual: null, score: 95 },      // timeline almost complete
  ]
  for (let i = 0; i < priyaGoals.length; i++) {
    const d2 = priyaQ2[i]
    await addAchievement(priyaGoals[i].id, Quarter.Q2, d2.actual, d2.score, AchievementStatus.on_track, "2026-10-05")
    await addCheckin(priyaGoals[i].id, rahul.id, priya.id, Quarter.Q2,
      ["H1 revenue at ₹2.75 Cr — well on pace. H2 pipeline looks strong; close monitoring on deal velocity.",
       "92% retention in Q2 exceeds target. Great work on the proactive QBR cycle.",
       "7 enterprise clients YTD. Push for 3 more in Q3 to reach target ahead of schedule.",
       "NPS 8.2 — target achieved! Maintain the cadence and document what's driving it.",
       "Certification complete. Apply learnings to product demos immediately."][i],
      "2026-10-12")
  }

  // ────────────────────────────────────────────────────────────────────────────
  // AMIT KUMAR — goals returned by manager (reworking)
  // ────────────────────────────────────────────────────────────────────────────
  const amitGoals = await Promise.all([
    createGoal({ employeeId: amit.id, cycleId: CID, thrustArea: "Sales", title: "Achieve ₹8 Crore Annual Revenue Target", description: "Stretch revenue target for FY 2025-26.", uomType: UomType.max_numeric, targetValue: 80000000, weightage: 40, status: GoalStatus.returned }),
    createGoal({ employeeId: amit.id, cycleId: CID, thrustArea: "Customer", title: "Onboard 15 New Enterprise Clients", description: "Aggressive client acquisition target.", uomType: UomType.max_numeric, targetValue: 15, weightage: 35, status: GoalStatus.returned }),
    createGoal({ employeeId: amit.id, cycleId: CID, thrustArea: "Customer", title: "Achieve 95% Customer Retention", description: "Best-in-class retention through dedicated success programs.", uomType: UomType.max_percent, targetValue: 95, weightage: 25, status: GoalStatus.returned }),
  ])

  for (const g of amitGoals) {
    await auditCreated(g.id, amit.id, "2026-04-10")
    await auditSubmitted(g.id, amit.id, "2026-04-14")
  }
  await auditReturned(amitGoals[0].id, rahul.id, "2026-04-18", "Revenue target of ₹8 Cr is not aligned with territory size. Please revise to ₹5 Cr with a quarterly breakdown.")
  await auditReturned(amitGoals[1].id, rahul.id, "2026-04-18", "15 enterprise clients is unrealistic without adding headcount. Revise to 10 with a clear outreach plan.")
  await auditReturned(amitGoals[2].id, rahul.id, "2026-04-18", "95% retention is ambitious — please document the specific initiatives that will drive this.")

  // ────────────────────────────────────────────────────────────────────────────
  // KAVYA SHARMA — goals submitted, awaiting approval
  // ────────────────────────────────────────────────────────────────────────────
  const kavyaGoals = await Promise.all([
    createGoal({ employeeId: kavya.id, cycleId: CID, thrustArea: "Sales", title: "Achieve ₹4 Crore Annual Revenue Target", uomType: UomType.max_numeric, targetValue: 40000000, weightage: 35, status: GoalStatus.submitted }),
    createGoal({ employeeId: kavya.id, cycleId: CID, thrustArea: "Customer", title: "Maintain 88% Customer Retention Rate", uomType: UomType.max_percent, targetValue: 88, weightage: 30, status: GoalStatus.submitted }),
    createGoal({ employeeId: kavya.id, cycleId: CID, thrustArea: "Sales", title: "Onboard 8 New Enterprise Clients", uomType: UomType.max_numeric, targetValue: 8, weightage: 25, status: GoalStatus.submitted }),
    createGoal({ employeeId: kavya.id, cycleId: CID, thrustArea: "People", title: "Complete Sales Methodology Certification", uomType: UomType.timeline, targetDate: d("2026-09-30"), weightage: 10, status: GoalStatus.submitted }),
  ])
  for (const g of kavyaGoals) {
    await auditCreated(g.id, kavya.id, "2026-04-12")
    await auditSubmitted(g.id, kavya.id, "2026-04-16")
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ROHAN MEHTA — approved, Q1 done, Q2 pending
  // ────────────────────────────────────────────────────────────────────────────
  const rohanGoals = await Promise.all([
    createGoal({ employeeId: rohan.id, cycleId: CID, thrustArea: "Operations", title: "Reduce Operational Costs by 15%", uomType: UomType.min_percent, targetValue: 15, weightage: 30, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: rohan.id, cycleId: CID, thrustArea: "Operations", title: "Improve Process Throughput Efficiency by 20%", uomType: UomType.max_percent, targetValue: 20, weightage: 30, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: rohan.id, cycleId: CID, thrustArea: "Operations", title: "Achieve ISO 9001:2015 Quality Certification", uomType: UomType.timeline, targetDate: d("2026-09-30"), weightage: 25, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: rohan.id, cycleId: CID, thrustArea: "People", title: "Complete Lean Six Sigma Green Belt", uomType: UomType.timeline, targetDate: d("2026-12-31"), weightage: 15, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
  ])
  for (const g of rohanGoals) {
    await auditCreated(g.id, rohan.id, "2025-05-08")
    await auditSubmitted(g.id, rohan.id, "2026-04-14")
    await auditApproved(g.id, neha.id, "2026-04-20")
    await auditLocked(g.id, neha.id, "2026-04-20")
  }
  const rohanQ1 = [
    { actual: 9, score: 88 },     // cost reduced 9% (target 15%, "lower is better", good progress)
    { actual: 16, score: 80 },    // 16% improvement of 20% target
    { actual: null, score: 85 },  // timeline - on track
    { actual: null, score: 70 },  // timeline - in progress
  ]
  for (let i = 0; i < rohanGoals.length; i++) {
    const d2 = rohanQ1[i]
    await addAchievement(rohanGoals[i].id, Quarter.Q1, d2.actual, d2.score, AchievementStatus.on_track, "2026-07-05")
    await addCheckin(rohanGoals[i].id, neha.id, rohan.id, Quarter.Q1,
      ["9% cost reduction in Q1 is excellent. Identify 3 more procurement optimisations for H2.",
       "Process throughput up 16% — keep documenting the gains so we can present to leadership.",
       "ISO documentation is 70% complete. Schedule the pre-audit with the external body in Q3.",
       "Six Sigma modules progressing well. Ensure exam is booked by end of Q3."][i],
      "2026-07-12")
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ANITA DESAI — approved, behind on Q2
  // ────────────────────────────────────────────────────────────────────────────
  const anitaGoals = await Promise.all([
    createGoal({ employeeId: anita.id, cycleId: CID, thrustArea: "Operations", title: "Reduce Operational Costs by 12%", uomType: UomType.min_percent, targetValue: 12, weightage: 30, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: anita.id, cycleId: CID, thrustArea: "Operations", title: "Implement Automated Reporting Dashboard", description: "Deploy real-time ops dashboard using Power BI with ERP integration.", uomType: UomType.zero, weightage: 30, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: anita.id, cycleId: CID, thrustArea: "Operations", title: "Improve Supplier On-Time Delivery to 95%", uomType: UomType.max_percent, targetValue: 95, weightage: 25, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: anita.id, cycleId: CID, thrustArea: "People", title: "Complete Supply Chain Analytics Course", uomType: UomType.timeline, targetDate: d("2026-12-31"), weightage: 15, status: GoalStatus.approved, lockedById: neha.id, lockedAt: LOCKED_AT }),
  ])
  for (const g of anitaGoals) {
    await auditCreated(g.id, anita.id, "2025-05-09")
    await auditSubmitted(g.id, anita.id, "2026-04-15")
    await auditApproved(g.id, neha.id, "2026-04-21")
    await auditLocked(g.id, neha.id, "2026-04-21")
  }
  const anitaQ1 = [
    { actual: 6, score: 65 },
    { actual: null, score: 55 },
    { actual: 82, score: 62 },
    { actual: null, score: 60 },
  ]
  for (let i = 0; i < anitaGoals.length; i++) {
    await addAchievement(anitaGoals[i].id, Quarter.Q1, anitaQ1[i].actual, anitaQ1[i].score, AchievementStatus.on_track, "2026-07-06")
    await addCheckin(anitaGoals[i].id, neha.id, anita.id, Quarter.Q1,
      ["6% cost reduction in Q1 — below the pace needed. Please share the blockers so we can help.",
       "Dashboard spec is done but development is delayed. Let's align on timeline with IT this week.",
       "Supplier OTD at 82% is below target. Escalate the 3 critical suppliers to procurement immediately.",
       "Course enrollment confirmed. Maintain weekly study cadence to finish on schedule."][i],
      "2026-07-11")
  }
  // Q2 — behind
  const anitaQ2 = [
    { actual: 4, score: 38 },
    { actual: null, score: 35 },
    { actual: 79, score: 40 },
    { actual: null, score: 45 },
  ]
  for (let i = 0; i < anitaGoals.length; i++) {
    await addAchievement(anitaGoals[i].id, Quarter.Q2, anitaQ2[i].actual, anitaQ2[i].score, AchievementStatus.not_started, "2026-10-06")
    await addCheckin(anitaGoals[i].id, neha.id, anita.id, Quarter.Q2,
      ["Q2 cost reduction regressed — we need to revisit the supplier contracts and approve the automation spend.",
       "Dashboard is still in dev. This is now a high-priority escalation; daily standups starting Monday.",
       "OTD dropped to 79%. Please prepare a formal supplier improvement plan for the weekly review.",
       "Behind on course progress. Schedule two study days before end of Q3 to catch up."][i],
      "2026-10-13")
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DEV GUPTA — goals in draft (escalation scenario, day 8+)
  // ────────────────────────────────────────────────────────────────────────────
  const devGoals = await Promise.all([
    createGoal({ employeeId: dev.id, cycleId: CID, thrustArea: "Operations", title: "Streamline Warehouse Inventory Process", uomType: UomType.max_percent, targetValue: 25, weightage: 40, status: GoalStatus.draft }),
    createGoal({ employeeId: dev.id, cycleId: CID, thrustArea: "Operations", title: "Reduce Equipment Downtime by 30%", uomType: UomType.min_percent, targetValue: 30, weightage: 35, status: GoalStatus.draft }),
    createGoal({ employeeId: dev.id, cycleId: CID, thrustArea: "People", title: "Complete Safety Compliance Training", uomType: UomType.zero, weightage: 25, status: GoalStatus.draft }),
  ])
  for (const g of devGoals) {
    await auditCreated(g.id, dev.id, "2026-04-10")
  }
  await prisma.escalation.create({
    data: {
      type: "goal_not_submitted",
      employeeId: dev.id,
      managerId: neha.id,
      cycleId: CID,
      triggeredAt: d("2026-04-22"),
      notificationCount: 3,
      status: "open",
    },
  })

  // ────────────────────────────────────────────────────────────────────────────
  // SANA KHAN — excellent Q1+Q2 performer
  // ────────────────────────────────────────────────────────────────────────────
  const sanaGoals = await Promise.all([
    createGoal({ employeeId: sana.id, cycleId: CID, thrustArea: "Technology", title: "Complete Platform Architecture Redesign", uomType: UomType.max_percent, targetValue: 100, weightage: 30, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: sana.id, cycleId: CID, thrustArea: "Technology", title: "Achieve 95% Automated Test Coverage", uomType: UomType.max_percent, targetValue: 95, weightage: 25, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: sana.id, cycleId: CID, thrustArea: "Operations", title: "Reduce Average API Response Time to Under 200ms", uomType: UomType.min_numeric, targetValue: 200, weightage: 25, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: sana.id, cycleId: CID, thrustArea: "People", title: "Obtain AWS Solutions Architect Associate Certification", uomType: UomType.timeline, targetDate: d("2026-12-31"), weightage: 20, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
  ])
  for (const g of sanaGoals) {
    await auditCreated(g.id, sana.id, "2025-05-08")
    await auditSubmitted(g.id, sana.id, "2025-05-13")
    await auditApproved(g.id, arjun.id, "2026-04-19")
    await auditLocked(g.id, arjun.id, "2026-04-19")
  }
  const sanaQ1 = [
    { actual: 72, score: 92 },
    { actual: 89, score: 90 },
    { actual: 185, score: 95 },
    { actual: null, score: 88 },
  ]
  for (let i = 0; i < sanaGoals.length; i++) {
    await addAchievement(sanaGoals[i].id, Quarter.Q1, sanaQ1[i].actual, sanaQ1[i].score, AchievementStatus.on_track, "2026-07-04")
    await addCheckin(sanaGoals[i].id, arjun.id, sana.id, Quarter.Q1,
      ["72% redesign complete in Q1 — exceptional pace. Ensure knowledge transfer docs are being written in parallel.",
       "89% test coverage is outstanding. Set up automated coverage gates to prevent regression.",
       "185ms API response — already under target! Focus on p99 latency next.",
       "AWS study plan is solid. Book the exam slot now to create a hard deadline."][i],
      "2026-07-08")
  }
  const sanaQ2 = [
    { actual: 96, score: 95 },
    { actual: 94, score: 93 },
    { actual: 162, score: 98 },
    { actual: null, score: 95 },
  ]
  for (let i = 0; i < sanaGoals.length; i++) {
    await addAchievement(sanaGoals[i].id, Quarter.Q2, sanaQ2[i].actual, sanaQ2[i].score, AchievementStatus.on_track, "2026-10-04")
    await addCheckin(sanaGoals[i].id, arjun.id, sana.id, Quarter.Q2,
      ["Architecture at 96% — completion next sprint. Fantastic execution.",
       "94% test coverage in Q2. The automated gates are working perfectly.",
       "162ms is 20% under target — best in org. Document the caching strategy for others.",
       "AWS certified! Apply cloud-native patterns to the Q3 architecture sprint."][i],
      "2026-10-11")
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SHARED GOAL: Zero Customer Escalations — Q2
  // Template (stored as Raj's goal with isShared=true, sharedFromId=null)
  // ────────────────────────────────────────────────────────────────────────────
  const sharedTemplate = await createGoal({
    employeeId: raj.id,
    cycleId: CID,
    thrustArea: "Customer",
    title: "Zero Customer Escalations — Q2",
    description: "Team KPI: achieve zero unresolved customer escalations across the Technology team in Q2.",
    uomType: UomType.zero,
    weightage: 0, // template doesn't count directly
    status: GoalStatus.approved,
    isShared: true,
    lockedById: arjun.id,
    lockedAt: LOCKED_AT,
  })

  // ─── RAJ IYER — personal goals + shared goal copy ───────────────────────────
  const rajPersonal = await Promise.all([
    createGoal({ employeeId: raj.id, cycleId: CID, thrustArea: "Technology", title: "Lead API Gateway Migration to GraphQL", uomType: UomType.max_percent, targetValue: 100, weightage: 35, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: raj.id, cycleId: CID, thrustArea: "Technology", title: "Achieve 95% Automated Test Coverage", uomType: UomType.max_percent, targetValue: 95, weightage: 25, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: raj.id, cycleId: CID, thrustArea: "Operations", title: "Reduce Deployment Lead Time to Under 2 Hours", uomType: UomType.min_numeric, targetValue: 2, weightage: 20, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
  ])
  const rajShared = await createGoal({
    employeeId: raj.id,
    cycleId: CID,
    thrustArea: "Customer",
    title: "Zero Customer Escalations — Q2",
    description: "Team KPI: zero unresolved customer escalations across the Technology team.",
    uomType: UomType.zero,
    weightage: 20,
    status: GoalStatus.approved,
    isShared: true,
    sharedFromId: sharedTemplate.id,
    lockedById: arjun.id,
    lockedAt: LOCKED_AT,
  })

  const rajAllGoals = [...rajPersonal, rajShared]
  for (const g of rajAllGoals) {
    await auditCreated(g.id, raj.id, "2025-05-09")
    await auditSubmitted(g.id, raj.id, "2026-04-14")
    await auditApproved(g.id, arjun.id, "2026-04-19")
    await auditLocked(g.id, arjun.id, "2026-04-19")
  }

  // Q1 personal achievements for Raj
  const rajQ1 = [
    { actual: 60, score: 82 },
    { actual: 88, score: 87 },
    { actual: 1.8, score: 90 },
  ]
  for (let i = 0; i < rajPersonal.length; i++) {
    await addAchievement(rajPersonal[i].id, Quarter.Q1, rajQ1[i].actual, rajQ1[i].score, AchievementStatus.on_track, "2026-07-05")
    await addCheckin(rajPersonal[i].id, arjun.id, raj.id, Quarter.Q1,
      ["GraphQL migration at 60% — strong pace. Ensure backwards compatibility layer is documented.",
       "88% coverage — great work. Enforce coverage gates in CI to prevent regressions.",
       "1.8h deployment lead time — already under the 2h target. Optimise the test parallelisation next."][i],
      "2026-07-09")
  }
  // Q1 shared achievement for Raj (0 escalations = 100%)
  await addAchievement(rajShared.id, Quarter.Q1, 0, 100, AchievementStatus.on_track, "2026-07-05")
  await addCheckin(rajShared.id, arjun.id, raj.id, Quarter.Q1,
    "Zero escalations in Q1 — fantastic team coordination. Keep the daily triage process going into Q2.",
    "2026-07-09")

  // ─── MEERA NAIR — personal goals + shared goal copy ─────────────────────────
  const meeraPersonal = await Promise.all([
    createGoal({ employeeId: meera.id, cycleId: CID, thrustArea: "Technology", title: "Build Real-Time Analytics Pipeline", uomType: UomType.max_percent, targetValue: 100, weightage: 35, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: meera.id, cycleId: CID, thrustArea: "Technology", title: "Implement End-to-End CI/CD Pipeline", uomType: UomType.zero, weightage: 30, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
    createGoal({ employeeId: meera.id, cycleId: CID, thrustArea: "People", title: "Obtain Google Cloud Professional Data Engineer Certificate", uomType: UomType.timeline, targetDate: d("2026-12-31"), weightage: 20, status: GoalStatus.approved, lockedById: arjun.id, lockedAt: LOCKED_AT }),
  ])
  const meeraShared = await createGoal({
    employeeId: meera.id,
    cycleId: CID,
    thrustArea: "Customer",
    title: "Zero Customer Escalations — Q2",
    description: "Team KPI: zero unresolved customer escalations across the Technology team.",
    uomType: UomType.zero,
    weightage: 15,
    status: GoalStatus.approved,
    isShared: true,
    sharedFromId: sharedTemplate.id,
    lockedById: arjun.id,
    lockedAt: LOCKED_AT,
  })

  const meeraAllGoals = [...meeraPersonal, meeraShared]
  for (const g of meeraAllGoals) {
    await auditCreated(g.id, meera.id, "2025-05-09")
    await auditSubmitted(g.id, meera.id, "2026-04-14")
    await auditApproved(g.id, arjun.id, "2026-04-19")
    await auditLocked(g.id, arjun.id, "2026-04-19")
    if (g.isShared) {
      await prisma.auditLog.create({
        data: { entityType: "Goal", entityId: g.id, goalId: g.id, changedById: arjun.id, action: AuditAction.shared, changedAt: d("2026-04-19") },
      })
    }
  }

  const meeraQ1 = [
    { actual: 55, score: 80 },
    { actual: null, score: 75 },
    { actual: null, score: 70 },
  ]
  for (let i = 0; i < meeraPersonal.length; i++) {
    await addAchievement(meeraPersonal[i].id, Quarter.Q1, meeraQ1[i].actual, meeraQ1[i].score, AchievementStatus.on_track, "2026-07-05")
    await addCheckin(meeraPersonal[i].id, arjun.id, meera.id, Quarter.Q1,
      ["Analytics pipeline 55% done — Kafka integration looks clean. Focus on data quality validation next.",
       "CI/CD foundations laid — staging pipeline automated. Production deployment target for Q2.",
       "GCP study plan is on track. Schedule mock exams in Q3 to validate readiness."][i],
      "2026-07-09")
  }
  // Meera's shared goal Q1 achievement — synced value from Raj
  await addAchievement(meeraShared.id, Quarter.Q1, 0, 100, AchievementStatus.on_track, "2026-07-05")
  await addCheckin(meeraShared.id, arjun.id, meera.id, Quarter.Q1,
    "Zero escalations shared across the team. Your triage ownership has been excellent.",
    "2026-07-09")

  // ────────────────────────────────────────────────────────────────────────────
  // Admin-level locked goal audit demo (shows diff view in audit trail)
  // ────────────────────────────────────────────────────────────────────────────
  // Simulate an admin unlocking and relocking a goal (shows the diff in audit log)
  const demoGoal = priyaGoals[0]
  await prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: demoGoal.id,
      goalId: demoGoal.id,
      changedById: admin.id,
      action: AuditAction.unlocked,
      changedAt: d("2026-05-01"),
    },
  })
  await prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: demoGoal.id,
      goalId: demoGoal.id,
      changedById: admin.id,
      action: AuditAction.updated,
      fieldName: "targetValue",
      oldValue: "50000000",
      newValue: "48000000",
      changedAt: d("2026-05-01"),
    },
  })
  await prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: demoGoal.id,
      goalId: demoGoal.id,
      changedById: admin.id,
      action: AuditAction.locked,
      changedAt: d("2026-05-01"),
    },
  })

  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n")
  console.log("Cycle: FY 2026-27 (goal-setting window: Apr 1 – Jul 1 2026)")
  console.log("Demo Credentials")
  console.log("────────────────────────────────────────────────")
  console.log("  admin@atomberg.com          → Admin@123")
  console.log("  manager1@atomberg.com       → Manager@123   (Rahul Singh — Sales)")
  console.log("  manager2@atomberg.com       → Manager@123   (Neha Joshi — Operations)")
  console.log("  manager3@atomberg.com       → Manager@123   (Arjun Verma — Technology)")
  console.log("  emp1@atomberg.com           → Emp@123       (Priya Patel — star performer)")
  console.log("  emp2@atomberg.com           → Emp@123       (Amit Kumar — returned goals)")
  console.log("  emp3@atomberg.com           → Emp@123       (Kavya Sharma — awaiting approval)")
  console.log("  emp4@atomberg.com           → Emp@123       (Rohan Mehta — Q1 done)")
  console.log("  emp5@atomberg.com           → Emp@123       (Anita Desai — behind on Q2)")
  console.log("  emp6@atomberg.com           → Emp@123       (Dev Gupta — escalation scenario)")
  console.log("  emp7@atomberg.com           → Emp@123       (Sana Khan — top performer)")
  console.log("  emp8@atomberg.com           → Emp@123       (Raj Iyer — shared goal)")
  console.log("  emp9@atomberg.com           → Emp@123       (Meera Nair — shared goal)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
