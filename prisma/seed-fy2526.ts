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

// Use DIRECT_URL for seeding: bypasses PgBouncer so transactions work correctly.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

// ─── helpers ──────────────────────────────────────────────────────────────────

function d(s: string): Date {
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
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: userId,
      action: AuditAction.created,
      changedAt: d(at),
    },
  })
}

async function auditSubmitted(goalId: string, userId: string, at: string) {
  return prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: userId,
      action: AuditAction.submitted,
      changedAt: d(at),
    },
  })
}

async function auditApproved(goalId: string, userId: string, at: string) {
  return prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: userId,
      action: AuditAction.approved,
      changedAt: d(at),
    },
  })
}

async function auditLocked(goalId: string, managerId: string, at: string) {
  return prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: managerId,
      action: AuditAction.locked,
      changedAt: d(at),
    },
  })
}

async function auditReturned(
  goalId: string,
  managerId: string,
  at: string,
  comment: string
) {
  await prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: managerId,
      action: AuditAction.returned,
      changedAt: d(at),
    },
  })
  await prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: managerId,
      action: AuditAction.returned,
      fieldName: "returnComment",
      newValue: comment,
      changedAt: d(at),
    },
  })
}

async function auditShared(goalId: string, managerId: string, at: string) {
  return prisma.auditLog.create({
    data: {
      entityType: "Goal",
      entityId: goalId,
      goalId,
      changedById: managerId,
      action: AuditAction.shared,
      changedAt: d(at),
    },
  })
}

async function addAchievement(
  goalId: string,
  quarter: Quarter,
  actualValue: number | null,
  score: number,
  status: AchievementStatus,
  submittedAt: string
) {
  return prisma.achievement.create({
    data: {
      goalId,
      quarter,
      actualValue,
      computedScore: score,
      progressStatus: status,
      submittedAt: d(submittedAt),
    },
  })
}

async function addCheckin(
  goalId: string,
  managerId: string,
  employeeId: string,
  quarter: Quarter,
  comment: string,
  at: string
) {
  return prisma.checkin.create({
    data: { goalId, managerId, employeeId, quarter, comment, createdAt: d(at) },
  })
}

// Adds full audit trail (created → submitted → approved → locked) for a
// goal that was finalized as part of the FY 2025-26 goal-setting window.
async function auditGoalFullLock(
  goalId: string,
  employeeId: string,
  managerId: string
) {
  await auditCreated(goalId, employeeId, "2025-04-05")
  await auditSubmitted(goalId, employeeId, "2025-04-12")
  await auditApproved(goalId, managerId, "2025-04-22")
  await auditLocked(goalId, managerId, "2025-04-22")
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Looking up existing users…")

  // ── Resolve users by email (do NOT create new users) ──
  const admin  = await prisma.user.findUniqueOrThrow({ where: { email: "admin@atomberg.com" } })
  const rahul  = await prisma.user.findUniqueOrThrow({ where: { email: "manager1@atomberg.com" } })
  const neha   = await prisma.user.findUniqueOrThrow({ where: { email: "manager2@atomberg.com" } })
  const arjun  = await prisma.user.findUniqueOrThrow({ where: { email: "manager3@atomberg.com" } })
  const priya  = await prisma.user.findUniqueOrThrow({ where: { email: "emp1@atomberg.com" } })
  const amit   = await prisma.user.findUniqueOrThrow({ where: { email: "emp2@atomberg.com" } })
  const kavya  = await prisma.user.findUniqueOrThrow({ where: { email: "emp3@atomberg.com" } })
  const rohan  = await prisma.user.findUniqueOrThrow({ where: { email: "emp4@atomberg.com" } })
  const anita  = await prisma.user.findUniqueOrThrow({ where: { email: "emp5@atomberg.com" } })
  const dev    = await prisma.user.findUniqueOrThrow({ where: { email: "emp6@atomberg.com" } })
  const sana   = await prisma.user.findUniqueOrThrow({ where: { email: "emp7@atomberg.com" } })
  const raj    = await prisma.user.findUniqueOrThrow({ where: { email: "emp8@atomberg.com" } })
  const meera  = await prisma.user.findUniqueOrThrow({ where: { email: "emp9@atomberg.com" } })

  console.log("Creating FY 2025-26 cycle…")

  const cycle = await prisma.cycle.create({
    data: {
      name: "FY 2025-26",
      phase1Opens: d("2025-04-01"), // Goal-setting window opened
      q1Opens:     d("2025-07-01"), // Q1 check-in window
      q2Opens:     d("2025-10-01"), // Q2 check-in window
      q3Opens:     d("2026-01-01"), // Q3 check-in window
      q4Opens:     d("2026-03-01"), // Q4/Annual check-in window
      status: "completed",
      createdById: admin.id,
    },
  })

  const CID = cycle.id
  const LOCKED_AT = d("2025-04-22")

  console.log("Seeding FY 2025-26 goals…")

  // ════════════════════════════════════════════════════════════════════════════
  // PRIYA PATEL — top performer, all 4 goals locked, full Q1-Q4 data
  // ════════════════════════════════════════════════════════════════════════════
  const priyaGoals = await Promise.all([
    createGoal({
      employeeId: priya.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Achieve ₹4 Crore Annual Revenue Target",
      description: "Meet or exceed ₹4 Cr annual sales revenue through new and existing accounts.",
      uomType: UomType.max_numeric, targetValue: 40000000,
      weightage: 30, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: priya.id, cycleId: CID,
      thrustArea: "Customer",
      title: "Grow Client Base by 25%",
      description: "Expand overall client portfolio by at least 25% over the fiscal year.",
      uomType: UomType.max_percent, targetValue: 25,
      weightage: 25, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: priya.id, cycleId: CID,
      thrustArea: "Customer",
      title: "Improve CSAT Score to 4.5/5",
      description: "Drive customer satisfaction initiatives to achieve a CSAT score of 4.5 out of 5.",
      uomType: UomType.max_numeric, targetValue: 4.5,
      weightage: 25, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: priya.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Build Strategic Partnership with 2 Key Distributors",
      description: "Formalise distribution agreements with 2 strategic distributor partners.",
      uomType: UomType.max_numeric, targetValue: 2,
      weightage: 20, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
  ])

  for (const g of priyaGoals) {
    await auditGoalFullLock(g.id, priya.id, rahul.id)
  }

  // Priya Q1 (2025-07-05) — on_track, scores: 78, 72, 76, 70
  const priyaQ1Scores  = [78, 72, 76, 70]
  const priyaQ1Actuals = [9200000, 8, 4.0, 0]
  const priyaQ1Comments = [
    "Revenue at ₹92L in Q1 — a solid start and right on pace. Keep the pipeline density high going into Q2.",
    "8% client base growth in Q1 is tracking well. Focus on converting the 5 warm leads from the channel program.",
    "CSAT at 4.0 is a good foundation. Follow up on the low-scoring accounts with a QBR before Q2 closes.",
    "Partnership discussions with both distributors are progressing. Aim to sign one MOU before Q2 ends.",
  ]
  for (let i = 0; i < priyaGoals.length; i++) {
    await addAchievement(priyaGoals[i].id, Quarter.Q1, priyaQ1Actuals[i], priyaQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(priyaGoals[i].id, rahul.id, priya.id, Quarter.Q1, priyaQ1Comments[i], "2025-07-10")
  }

  // Priya Q2 (2025-10-05) — on_track, scores: 84, 80, 82, 78
  const priyaQ2Scores  = [84, 80, 82, 78]
  const priyaQ2Actuals = [19500000, 17, 4.2, 1]
  const priyaQ2Comments = [
    "₹1.95 Cr YTD — H1 is strong. The new enterprise segment additions are clearly driving the uplift.",
    "17% client base growth at H1 is ahead of pace. Lock in the 8 prospects currently in proposal stage.",
    "CSAT improved to 4.2 — great progress. The QBR program you initiated is showing results.",
    "First distributor MOU signed — well done. Drive the second agreement to closure before Q3 ends.",
  ]
  for (let i = 0; i < priyaGoals.length; i++) {
    await addAchievement(priyaGoals[i].id, Quarter.Q2, priyaQ2Actuals[i], priyaQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(priyaGoals[i].id, rahul.id, priya.id, Quarter.Q2, priyaQ2Comments[i], "2025-10-10")
  }

  // Priya Q3 (2026-01-05) — on_track, scores: 88, 85, 87, 84
  const priyaQ3Scores  = [88, 85, 87, 84]
  const priyaQ3Actuals = [31000000, 21, 4.35, 2]
  const priyaQ3Comments = [
    "₹3.1 Cr YTD — you are well within reach of the annual target. Protect the Q4 pipeline carefully.",
    "21% client base growth through Q3 is excellent. One more push on channel acquisition closes out the goal.",
    "CSAT at 4.35 — the highest in the sales team. Keep the momentum into the renewal-heavy Q4 period.",
    "Both distributor partnerships now formalised. Document the engagement model for team replication in FY 2026-27.",
  ]
  for (let i = 0; i < priyaGoals.length; i++) {
    await addAchievement(priyaGoals[i].id, Quarter.Q3, priyaQ3Actuals[i], priyaQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(priyaGoals[i].id, rahul.id, priya.id, Quarter.Q3, priyaQ3Comments[i], "2026-01-10")
  }

  // Priya Q4 (2026-03-05) — completed, scores: 92, 90, 93, 88
  const priyaQ4Scores  = [92, 90, 93, 88]
  const priyaQ4Actuals = [41200000, 26, 4.6, 2]
  const priyaQ4Comments = [
    "₹4.12 Cr — target exceeded! Exceptional year-end push. This sets a strong benchmark for FY 2026-27.",
    "26% client base growth, surpassing the 25% target. Outstanding prospecting and conversion discipline.",
    "CSAT at 4.6 exceeds the 4.5 target — top score in the region. Nominate for the customer excellence award.",
    "Both partnerships fully operational and contributing to the pipeline. Fantastic execution on this goal.",
  ]
  for (let i = 0; i < priyaGoals.length; i++) {
    await addAchievement(priyaGoals[i].id, Quarter.Q4, priyaQ4Actuals[i], priyaQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(priyaGoals[i].id, rahul.id, priya.id, Quarter.Q4, priyaQ4Comments[i], "2026-03-10")
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AMIT KUMAR — 2 locked goals, 1 returned (never resubmitted)
  // ════════════════════════════════════════════════════════════════════════════
  const amitGoals = await Promise.all([
    createGoal({
      employeeId: amit.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Achieve ₹5.5 Crore Revenue Target",
      description: "Annual sales revenue target for FY 2025-26.",
      uomType: UomType.max_numeric, targetValue: 55000000,
      weightage: 40, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: amit.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Close 10 Enterprise Accounts",
      description: "Win and onboard 10 net-new enterprise-tier accounts.",
      uomType: UomType.max_numeric, targetValue: 10,
      weightage: 35, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: amit.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Reduce Average Deal Cycle to 45 Days",
      description: "Streamline the sales process to reduce mean deal cycle time to 45 days.",
      uomType: UomType.min_numeric, targetValue: 45,
      weightage: 25, status: GoalStatus.returned,
    }),
  ])

  // Locked goals: full audit trail
  for (const g of [amitGoals[0], amitGoals[1]]) {
    await auditGoalFullLock(g.id, amit.id, rahul.id)
  }
  // Returned goal: created → submitted → returned (never resubmitted before window closed)
  await auditCreated(amitGoals[2].id, amit.id, "2025-04-05")
  await auditSubmitted(amitGoals[2].id, amit.id, "2025-04-12")
  await auditReturned(
    amitGoals[2].id,
    rahul.id,
    "2025-04-22",
    "A target of 45 days is too aggressive given the current avg of 72 days. Please revise to 60 days and attach a process improvement plan.",
  )

  // Amit Q1 (locked goals only), scores: 68, 62
  const amitQ1Scores  = [68, 62]
  const amitQ1Actuals = [11000000, 2]
  const amitQ1Comments = [
    "₹1.1 Cr in Q1 — below the quarterly pace needed. Identify the top 5 stalled deals and set hard close dates.",
    "2 enterprise accounts closed in Q1 against a target of 10. Pipeline coverage needs to triple to stay on track.",
  ]
  for (let i = 0; i < 2; i++) {
    await addAchievement(amitGoals[i].id, Quarter.Q1, amitQ1Actuals[i], amitQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(amitGoals[i].id, rahul.id, amit.id, Quarter.Q1, amitQ1Comments[i], "2025-07-10")
  }

  // Amit Q2, scores: 72, 68
  const amitQ2Scores  = [72, 68]
  const amitQ2Actuals = [23000000, 5]
  const amitQ2Comments = [
    "₹2.3 Cr YTD — improving trend. H2 needs to be significantly stronger; ensure the enterprise deals in Q3 stage are accelerated.",
    "5 enterprise accounts by H1 — halfway there. Prioritise the 3 deals in final negotiation to close them in Q3.",
  ]
  for (let i = 0; i < 2; i++) {
    await addAchievement(amitGoals[i].id, Quarter.Q2, amitQ2Actuals[i], amitQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(amitGoals[i].id, rahul.id, amit.id, Quarter.Q2, amitQ2Comments[i], "2025-10-10")
  }

  // Amit Q3, scores: 75, 72
  const amitQ3Scores  = [75, 72]
  const amitQ3Actuals = [36000000, 7]
  const amitQ3Comments = [
    "₹3.6 Cr YTD shows good Q3 momentum. A strong Q4 close can still bring this within striking range of the target.",
    "7 enterprise accounts through Q3 — good progress. The final 3 need to be locked in January to hit the annual number.",
  ]
  for (let i = 0; i < 2; i++) {
    await addAchievement(amitGoals[i].id, Quarter.Q3, amitQ3Actuals[i], amitQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(amitGoals[i].id, rahul.id, amit.id, Quarter.Q3, amitQ3Comments[i], "2026-01-10")
  }

  // Amit Q4 — completed, scores: 78, 75
  const amitQ4Scores  = [78, 75]
  const amitQ4Actuals = [47500000, 9]
  const amitQ4Comments = [
    "₹4.75 Cr at year-end — a solid finish even if short of the ₹5.5 Cr stretch target. The improving trend is encouraging.",
    "9 enterprise accounts closed — one short of target, but the quality of logos is strong. Let's set a more aggressive plan for FY 2026-27.",
  ]
  for (let i = 0; i < 2; i++) {
    await addAchievement(amitGoals[i].id, Quarter.Q4, amitQ4Actuals[i], amitQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(amitGoals[i].id, rahul.id, amit.id, Quarter.Q4, amitQ4Comments[i], "2026-03-10")
  }

  // ════════════════════════════════════════════════════════════════════════════
  // KAVYA SHARMA — all 3 goals locked, moderate performer
  // ════════════════════════════════════════════════════════════════════════════
  const kavyaGoals = await Promise.all([
    createGoal({
      employeeId: kavya.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Achieve ₹3 Crore Annual Revenue Target",
      description: "Annual sales revenue target of ₹3 Cr for FY 2025-26.",
      uomType: UomType.max_numeric, targetValue: 30000000,
      weightage: 40, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: kavya.id, cycleId: CID,
      thrustArea: "Customer",
      title: "Maintain 85% Customer Retention",
      description: "Keep existing customer retention rate at or above 85% throughout the fiscal year.",
      uomType: UomType.max_percent, targetValue: 85,
      weightage: 30, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: kavya.id, cycleId: CID,
      thrustArea: "Sales",
      title: "Onboard 6 New Enterprise Clients",
      description: "Identify, qualify, and close 6 new enterprise-level clients.",
      uomType: UomType.max_numeric, targetValue: 6,
      weightage: 30, status: GoalStatus.locked,
      lockedById: rahul.id, lockedAt: LOCKED_AT,
    }),
  ])

  for (const g of kavyaGoals) {
    await auditGoalFullLock(g.id, kavya.id, rahul.id)
  }

  // Kavya Q1 — on_track, scores: 62, 68, 58
  const kavyaQ1Scores  = [62, 68, 58]
  const kavyaQ1Actuals = [5500000, 80, 1]
  const kavyaQ1Comments = [
    "₹55L in Q1 is below the quarterly pace. Review the prospect list and identify 3 deals that can close before Q2 ends.",
    "80% retention in Q1 — needs attention. Reach out to the at-risk accounts and offer an EBR this quarter.",
    "1 enterprise client onboarded so far. Pipeline development needs to accelerate significantly to reach 6 by year-end.",
  ]
  for (let i = 0; i < kavyaGoals.length; i++) {
    await addAchievement(kavyaGoals[i].id, Quarter.Q1, kavyaQ1Actuals[i], kavyaQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(kavyaGoals[i].id, rahul.id, kavya.id, Quarter.Q1, kavyaQ1Comments[i], "2025-07-10")
  }

  // Kavya Q2 — on_track, scores: 67, 73, 65
  const kavyaQ2Scores  = [67, 73, 65]
  const kavyaQ2Actuals = [13000000, 83, 3]
  const kavyaQ2Comments = [
    "₹1.3 Cr YTD — the trend is improving. Focus on deal velocity in H2; several deals in your pipeline are ready to close.",
    "Retention improved to 83% — the EBR cadence is paying off. Push to get this above 85% by Q3.",
    "3 enterprise clients onboarded at H1 — halfway to target. The second half will require a more structured outreach plan.",
  ]
  for (let i = 0; i < kavyaGoals.length; i++) {
    await addAchievement(kavyaGoals[i].id, Quarter.Q2, kavyaQ2Actuals[i], kavyaQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(kavyaGoals[i].id, rahul.id, kavya.id, Quarter.Q2, kavyaQ2Comments[i], "2025-10-10")
  }

  // Kavya Q3 — on_track, scores: 72, 78, 70
  const kavyaQ3Scores  = [72, 78, 70]
  const kavyaQ3Actuals = [22000000, 85, 5]
  const kavyaQ3Comments = [
    "₹2.2 Cr YTD — good recovery in Q3. Protect the 3 deals in late-stage negotiation to ensure a strong Q4 finish.",
    "85% retention — target reached ahead of Q4. Keep the renewal conversations active to maintain this through year-end.",
    "5 enterprise clients onboarded through Q3. One more closure in Q4 will hit the annual target.",
  ]
  for (let i = 0; i < kavyaGoals.length; i++) {
    await addAchievement(kavyaGoals[i].id, Quarter.Q3, kavyaQ3Actuals[i], kavyaQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(kavyaGoals[i].id, rahul.id, kavya.id, Quarter.Q3, kavyaQ3Comments[i], "2026-01-10")
  }

  // Kavya Q4 — completed, scores: 76, 82, 74
  const kavyaQ4Scores  = [76, 82, 74]
  const kavyaQ4Actuals = [28500000, 87, 6]
  const kavyaQ4Comments = [
    "₹2.85 Cr at year-end — just short of the ₹3 Cr target but a clear improvement arc across the year.",
    "87% retention — above the 85% target and the best you have achieved. Great consistency through Q4.",
    "6 enterprise clients onboarded — target achieved! The late Q4 push made all the difference.",
  ]
  for (let i = 0; i < kavyaGoals.length; i++) {
    await addAchievement(kavyaGoals[i].id, Quarter.Q4, kavyaQ4Actuals[i], kavyaQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(kavyaGoals[i].id, rahul.id, kavya.id, Quarter.Q4, kavyaQ4Comments[i], "2026-03-10")
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROHAN MEHTA — all 4 goals locked, solid performer
  // ════════════════════════════════════════════════════════════════════════════
  const rohanGoals = await Promise.all([
    createGoal({
      employeeId: rohan.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Reduce Supply Chain Lead Time by 15%",
      description: "Achieve a 15% reduction in end-to-end supply chain lead time through process improvements.",
      uomType: UomType.min_percent, targetValue: 15,
      weightage: 30, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: rohan.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Achieve 97% On-Time Delivery Rate",
      description: "Maintain on-time delivery performance at or above 97% across all shipment categories.",
      uomType: UomType.max_percent, targetValue: 97,
      weightage: 30, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: rohan.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Implement 5S Methodology Across Warehouse",
      description: "Roll out the full 5S workplace organisation methodology across all warehouse zones.",
      uomType: UomType.zero,
      weightage: 25, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: rohan.id, cycleId: CID,
      thrustArea: "People",
      title: "Complete PMP Certification",
      description: "Obtain the Project Management Professional (PMP) certification by January 2026.",
      uomType: UomType.timeline, targetDate: d("2026-01-31"),
      weightage: 15, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
  ])

  for (const g of rohanGoals) {
    await auditGoalFullLock(g.id, rohan.id, neha.id)
  }

  // Rohan Q1 — on_track, scores: 80, 76, 72, 70
  const rohanQ1Scores  = [80, 76, 72, 70]
  const rohanQ1Comments = [
    "Lead time reduction of 8% in Q1 is solid — you're ahead of the quarterly pace. Document the process changes for replication.",
    "94% OTD in Q1 — good but 3 points below target. Identify the top carriers causing delays and escalate.",
    "5S implemented across 2 of 5 warehouse zones. Keep the momentum and involve the team captains for buy-in.",
    "PMP study plan is underway. Ensure the exam is scheduled by end of Q2 to allow buffer time.",
  ]
  for (let i = 0; i < rohanGoals.length; i++) {
    await addAchievement(rohanGoals[i].id, Quarter.Q1, null, rohanQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(rohanGoals[i].id, neha.id, rohan.id, Quarter.Q1, rohanQ1Scores[i] >= 85 ? rohanQ1Comments[i] : rohanQ1Comments[i], "2025-07-10")
  }

  // Rohan Q2 — on_track, scores: 84, 80, 78, 80
  const rohanQ2Scores  = [84, 80, 78, 80]
  const rohanQ2Comments = [
    "Lead time down 11% YTD — great trajectory. The new vendor SLA framework is clearly working.",
    "OTD at 96% — very close to target. The carrier escalation process is showing results; keep monitoring weekly.",
    "5S rolled out across 4 of 5 zones — almost there. Schedule the final zone for Q3 and plan the audit.",
    "PMP exam booked for November — good planning. Use the Q3 study leave allocation effectively.",
  ]
  for (let i = 0; i < rohanGoals.length; i++) {
    await addAchievement(rohanGoals[i].id, Quarter.Q2, null, rohanQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(rohanGoals[i].id, neha.id, rohan.id, Quarter.Q2, rohanQ2Comments[i], "2025-10-10")
  }

  // Rohan Q3 — on_track, scores: 86, 84, 85, 90
  const rohanQ3Scores  = [86, 84, 85, 90]
  const rohanQ3Comments = [
    "Lead time reduction at 13% through Q3 — one more push in Q4 closes the gap to the 15% target.",
    "96.8% OTD — fractionally below target but the trendline is excellent. Maintain pressure through peak season.",
    "5S implemented across all warehouse zones and the first internal audit passed. Outstanding execution.",
    "PMP exam completed in Q3 — awaiting results. Fantastic commitment to professional development.",
  ]
  for (let i = 0; i < rohanGoals.length; i++) {
    await addAchievement(rohanGoals[i].id, Quarter.Q3, null, rohanQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(rohanGoals[i].id, neha.id, rohan.id, Quarter.Q3, rohanQ3Comments[i], "2026-01-10")
  }

  // Rohan Q4 — completed, scores: 90, 88, 92, 100
  const rohanQ4Scores  = [90, 88, 92, 100]
  const rohanQ4Comments = [
    "15.5% lead time reduction at year-end — target exceeded! This directly improved working capital efficiency.",
    "97.2% OTD — above target for the first time this year. Excellent Q4 effort from you and the logistics team.",
    "5S audit scores are the highest in the operations group. A model for other teams to replicate.",
    "PMP certified — congratulations! You are now the team's first certified PM. Use this in the cross-functional projects coming in FY 2026-27.",
  ]
  for (let i = 0; i < rohanGoals.length; i++) {
    await addAchievement(rohanGoals[i].id, Quarter.Q4, null, rohanQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(rohanGoals[i].id, neha.id, rohan.id, Quarter.Q4, rohanQ4Comments[i], "2026-03-10")
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ANITA DESAI — all 3 goals locked, improving arc over year
  // ════════════════════════════════════════════════════════════════════════════
  const anitaGoals = await Promise.all([
    createGoal({
      employeeId: anita.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Reduce Operational Waste by 12%",
      description: "Identify and eliminate operational waste to achieve a 12% reduction in waste metrics.",
      uomType: UomType.min_percent, targetValue: 12,
      weightage: 30, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: anita.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Improve Supplier OTD to 92%",
      description: "Drive supplier on-time delivery performance to 92% through structured SLA management.",
      uomType: UomType.max_percent, targetValue: 92,
      weightage: 30, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: anita.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Automate 3 Manual Reporting Processes",
      description: "Identify and fully automate 3 high-effort manual reporting processes using available tooling.",
      uomType: UomType.max_numeric, targetValue: 3,
      weightage: 40, status: GoalStatus.locked,
      lockedById: neha.id, lockedAt: LOCKED_AT,
    }),
  ])

  for (const g of anitaGoals) {
    await auditGoalFullLock(g.id, anita.id, neha.id)
  }

  // Anita Q1 — on_track, scores: 55, 60, 62 (starts weak)
  const anitaQ1Scores  = [55, 60, 62]
  const anitaQ1Actuals = [null, 82, 1]
  const anitaQ1Comments = [
    "Waste reduction is below the expected pace for Q1. Please share the blockers by end of week so we can address them together.",
    "Supplier OTD at 82% is well below the 92% target. Prioritise the three underperforming suppliers and issue formal PIPs.",
    "1 reporting process automated in Q1 — a reasonable start. Identify the next 2 candidates and get IT alignment in Q2.",
  ]
  for (let i = 0; i < anitaGoals.length; i++) {
    await addAchievement(anitaGoals[i].id, Quarter.Q1, anitaQ1Actuals[i], anitaQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(anitaGoals[i].id, neha.id, anita.id, Quarter.Q1, anitaQ1Comments[i], "2025-07-10")
  }

  // Anita Q2 — on_track, scores: 62, 66, 68
  const anitaQ2Scores  = [62, 66, 68]
  const anitaQ2Actuals = [null, 85, 2]
  const anitaQ2Comments = [
    "Incremental improvement in waste reduction — the lean initiatives are starting to register. Stay disciplined on the tracking.",
    "Supplier OTD up to 85% — a clear improvement. The PIP process is working; maintain the monthly supplier reviews.",
    "2 processes automated at H1 — good progress. Schedule the third automation for Q3 delivery to close the goal on time.",
  ]
  for (let i = 0; i < anitaGoals.length; i++) {
    await addAchievement(anitaGoals[i].id, Quarter.Q2, anitaQ2Actuals[i], anitaQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(anitaGoals[i].id, neha.id, anita.id, Quarter.Q2, anitaQ2Comments[i], "2025-10-10")
  }

  // Anita Q3 — on_track, scores: 68, 72, 75
  const anitaQ3Scores  = [68, 72, 75]
  const anitaQ3Actuals = [null, 88, 3]
  const anitaQ3Comments = [
    "Waste metrics trending in the right direction through Q3. Finalise the root-cause analysis so we can close this out in Q4.",
    "88% OTD — getting closer to the 92% target. Engage the two remaining underperformers with senior management support.",
    "All 3 reporting processes automated — goal achieved ahead of Q4. Document the methodology for other teams.",
  ]
  for (let i = 0; i < anitaGoals.length; i++) {
    await addAchievement(anitaGoals[i].id, Quarter.Q3, anitaQ3Actuals[i], anitaQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(anitaGoals[i].id, neha.id, anita.id, Quarter.Q3, anitaQ3Comments[i], "2026-01-10")
  }

  // Anita Q4 — completed, scores: 72, 76, 82
  const anitaQ4Scores  = [72, 76, 82]
  const anitaQ4Actuals = [null, 91, 3]
  const anitaQ4Comments = [
    "12.4% waste reduction at year-end — target achieved! Your persistence through a slow start paid off.",
    "91% supplier OTD — just short of 92% but a remarkable improvement over the 82% starting point in Q1.",
    "All 3 automations live and saving the team 15+ hours per month. Excellent impact on operational efficiency.",
  ]
  for (let i = 0; i < anitaGoals.length; i++) {
    await addAchievement(anitaGoals[i].id, Quarter.Q4, anitaQ4Actuals[i], anitaQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(anitaGoals[i].id, neha.id, anita.id, Quarter.Q4, anitaQ4Comments[i], "2026-03-10")
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEV GUPTA — all 3 goals in draft, no check-ins, no achievements
  // ════════════════════════════════════════════════════════════════════════════
  const devGoals = await Promise.all([
    createGoal({
      employeeId: dev.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Optimise Warehouse Storage Capacity by 20%",
      description: "Improve warehouse storage utilisation by 20% through layout redesign and slotting optimisation.",
      uomType: UomType.max_percent, targetValue: 20,
      weightage: 40, status: GoalStatus.draft,
    }),
    createGoal({
      employeeId: dev.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Reduce Machine Breakdown Rate by 25%",
      description: "Implement preventive maintenance schedules to cut unplanned machine breakdown rate by 25%.",
      uomType: UomType.min_percent, targetValue: 25,
      weightage: 35, status: GoalStatus.draft,
    }),
    createGoal({
      employeeId: dev.id, cycleId: CID,
      thrustArea: "People",
      title: "Complete ISO 45001 Safety Training",
      description: "Obtain ISO 45001 occupational health and safety management system certification.",
      uomType: UomType.zero,
      weightage: 25, status: GoalStatus.draft,
    }),
  ])

  // Only audit created — goals were never submitted
  for (const g of devGoals) {
    await auditCreated(g.id, dev.id, "2025-04-05")
  }

  // No achievements or check-ins for Dev — persistent draft pattern

  // ════════════════════════════════════════════════════════════════════════════
  // SANA KHAN — all 4 goals locked, excellent performer (top tech)
  // ════════════════════════════════════════════════════════════════════════════
  const sanaGoals = await Promise.all([
    createGoal({
      employeeId: sana.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Migrate 80% of Services to Cloud-Native Architecture",
      description: "Lead the migration of 80% of existing services to a cloud-native, containerised architecture.",
      uomType: UomType.max_percent, targetValue: 80,
      weightage: 30, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: sana.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Achieve 99.5% System Uptime SLA",
      description: "Maintain production system availability at or above 99.5% across all SLA-governed services.",
      uomType: UomType.max_percent, targetValue: 99.5,
      weightage: 25, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: sana.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Reduce Infrastructure Cost by 20%",
      description: "Drive a 20% reduction in cloud and on-prem infrastructure spend through rightsizing and automation.",
      uomType: UomType.min_percent, targetValue: 20,
      weightage: 25, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: sana.id, cycleId: CID,
      thrustArea: "People",
      title: "Obtain AWS DevOps Professional Certification",
      description: "Achieve the AWS Certified DevOps Engineer – Professional certification by December 2025.",
      uomType: UomType.timeline, targetDate: d("2025-12-31"),
      weightage: 20, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
  ])

  for (const g of sanaGoals) {
    await auditGoalFullLock(g.id, sana.id, arjun.id)
  }

  // Sana Q1 — on_track, scores: 80, 78, 74, 76
  const sanaQ1Scores  = [80, 78, 74, 76]
  const sanaQ1Actuals = [35, 99.4, null, null]
  const sanaQ1Comments = [
    "35% of services migrated in Q1 — ahead of the quarterly milestone. Keep the containerisation velocity high.",
    "99.4% uptime in Q1 — very close to the 99.5% SLA. Review the 2 incidents and close the root-cause action items.",
    "Infrastructure cost tracking is showing early savings. Ensure the rightsizing recommendations are actioned by Q2.",
    "AWS DevOps study plan is progressing well. Book the exam slot for Q3 to give yourself buffer time.",
  ]
  for (let i = 0; i < sanaGoals.length; i++) {
    await addAchievement(sanaGoals[i].id, Quarter.Q1, sanaQ1Actuals[i], sanaQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(sanaGoals[i].id, arjun.id, sana.id, Quarter.Q1, sanaQ1Comments[i], "2025-07-10")
  }

  // Sana Q2 — on_track, scores: 86, 82, 80, 82
  const sanaQ2Scores  = [86, 82, 80, 82]
  const sanaQ2Actuals = [58, 99.6, null, null]
  const sanaQ2Comments = [
    "58% services migrated at H1 — excellent execution. The CI/CD pipeline improvements are clearly accelerating velocity.",
    "99.6% uptime — SLA achieved and sustained. The runbook improvements you put in place are having a direct effect.",
    "Cost reduction trajectory looks solid at H1. Ensure the automated scaling policies are applied to all non-prod environments.",
    "AWS exam scheduled for Q3 — great discipline. Use the Q2 study leave to cement the weak areas.",
  ]
  for (let i = 0; i < sanaGoals.length; i++) {
    await addAchievement(sanaGoals[i].id, Quarter.Q2, sanaQ2Actuals[i], sanaQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(sanaGoals[i].id, arjun.id, sana.id, Quarter.Q2, sanaQ2Comments[i], "2025-10-10")
  }

  // Sana Q3 — on_track, scores: 90, 87, 86, 90
  const sanaQ3Scores  = [90, 87, 86, 90]
  const sanaQ3Actuals = [76, 99.7, null, null]
  const sanaQ3Comments = [
    "76% services migrated through Q3 — on course to exceed the 80% target by year-end. Excellent work.",
    "99.7% uptime — best quarter yet. Present the incident-reduction framework to the wider engineering org.",
    "Infrastructure cost savings are tracking at 17% reduction — within reach of the 20% annual target.",
    "AWS DevOps Professional certification obtained in Q3 — ahead of the December deadline. Outstanding achievement.",
  ]
  for (let i = 0; i < sanaGoals.length; i++) {
    await addAchievement(sanaGoals[i].id, Quarter.Q3, sanaQ3Actuals[i], sanaQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(sanaGoals[i].id, arjun.id, sana.id, Quarter.Q3, sanaQ3Comments[i], "2026-01-10")
  }

  // Sana Q4 — completed, scores: 94, 92, 90, 100
  const sanaQ4Scores  = [94, 92, 90, 100]
  const sanaQ4Actuals = [83, 99.8, null, null]
  const sanaQ4Comments = [
    "83% of services migrated — target exceeded by 3 points. The cloud-native architecture is now a competitive differentiator.",
    "99.8% uptime for the year — remarkable reliability. This directly supports the product team's ambitious roadmap.",
    "21% infrastructure cost reduction — target surpassed. The FinOps discipline you built will save the org millions.",
    "AWS DevOps Professional achieved in Q3 ahead of schedule. You are now our go-to resource for cloud architecture reviews.",
  ]
  for (let i = 0; i < sanaGoals.length; i++) {
    await addAchievement(sanaGoals[i].id, Quarter.Q4, sanaQ4Actuals[i], sanaQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(sanaGoals[i].id, arjun.id, sana.id, Quarter.Q4, sanaQ4Comments[i], "2026-03-10")
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SHARED GOAL — "Zero Critical Incidents in Production — Q3"
  // Template: stored on Raj (isShared=true, sharedFromId=null, weightage=0)
  // Copies: one for Raj, one for Meera (both isShared=true, weightage=20)
  // ════════════════════════════════════════════════════════════════════════════
  const sharedTemplate = await createGoal({
    employeeId: raj.id,
    cycleId: CID,
    thrustArea: "Technology",
    title: "Zero Critical Incidents in Production — Q3",
    description: "Team KPI: achieve zero critical (P0/P1) incidents in the production environment during Q3.",
    uomType: UomType.zero,
    weightage: 0,
    status: GoalStatus.locked,
    isShared: true,
    lockedById: arjun.id,
    lockedAt: LOCKED_AT,
  })
  await auditGoalFullLock(sharedTemplate.id, raj.id, arjun.id)

  // ─── RAJ IYER — 3 personal goals + shared copy ───────────────────────────
  const rajPersonal = await Promise.all([
    createGoal({
      employeeId: raj.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Build Self-Service Analytics Platform",
      description: "Deliver a self-service analytics platform enabling business teams to run their own reports.",
      uomType: UomType.max_percent, targetValue: 100,
      weightage: 35, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: raj.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Implement Automated Security Scanning Pipeline",
      description: "Integrate automated SAST/DAST security scanning into the CI/CD pipeline for all services.",
      uomType: UomType.zero,
      weightage: 30, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: raj.id, cycleId: CID,
      thrustArea: "Operations",
      title: "Reduce Mean Time to Resolve (MTTR) to Under 1 Hour",
      description: "Improve incident response and resolution processes to achieve a mean MTTR under 1 hour.",
      uomType: UomType.min_numeric, targetValue: 1,
      weightage: 35, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
  ])

  const rajShared = await createGoal({
    employeeId: raj.id,
    cycleId: CID,
    thrustArea: "Technology",
    title: "Zero Critical Incidents in Production — Q3",
    description: "Team KPI: achieve zero critical (P0/P1) incidents in the production environment during Q3.",
    uomType: UomType.zero,
    weightage: 20,
    status: GoalStatus.locked,
    isShared: true,
    sharedFromId: sharedTemplate.id,
    lockedById: arjun.id,
    lockedAt: LOCKED_AT,
  })

  for (const g of [...rajPersonal, rajShared]) {
    await auditGoalFullLock(g.id, raj.id, arjun.id)
  }
  await auditShared(rajShared.id, arjun.id, "2025-04-22")

  // Raj Q1 personal — on_track, scores: 70, 72, 76
  const rajQ1Scores  = [70, 72, 76]
  const rajQ1Actuals = [28, null, 1.4]
  const rajQ1Comments = [
    "Analytics platform at 28% in Q1 — data model and ingestion layer are solid foundations. Keep the delivery cadence.",
    "Security scanning integrated into 3 of 8 pipelines. Prioritise the customer-facing services next for maximum impact.",
    "MTTR at 1.4 hours in Q1 — above the 1-hour target. Review the escalation tree to cut handoff delays.",
  ]
  for (let i = 0; i < rajPersonal.length; i++) {
    await addAchievement(rajPersonal[i].id, Quarter.Q1, rajQ1Actuals[i], rajQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(rajPersonal[i].id, arjun.id, raj.id, Quarter.Q1, rajQ1Comments[i], "2025-07-10")
  }
  // Raj shared Q1 — score: 90
  await addAchievement(rajShared.id, Quarter.Q1, 0, 90, AchievementStatus.on_track, "2025-07-05")
  await addCheckin(rajShared.id, arjun.id, raj.id, Quarter.Q1,
    "Zero critical incidents in Q1 — excellent on-call discipline from the team. Maintain the pre-deployment checklist process.",
    "2025-07-10")

  // Raj Q2 personal — on_track, scores: 76, 78, 80
  const rajQ2Scores  = [76, 78, 80]
  const rajQ2Actuals = [52, null, 1.1]
  const rajQ2Comments = [
    "52% complete at H1 — the self-service dashboard layer is looking impressive. Get early user feedback before Q3.",
    "Security scanning now covers all customer-facing services. Extend to internal APIs in Q3.",
    "MTTR at 1.1 hours — improving steadily. The new runbook standardisation is having a clear effect.",
  ]
  for (let i = 0; i < rajPersonal.length; i++) {
    await addAchievement(rajPersonal[i].id, Quarter.Q2, rajQ2Actuals[i], rajQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(rajPersonal[i].id, arjun.id, raj.id, Quarter.Q2, rajQ2Comments[i], "2025-10-10")
  }
  // Raj shared Q2 — score: 88
  await addAchievement(rajShared.id, Quarter.Q2, 0, 88, AchievementStatus.on_track, "2025-10-05")
  await addCheckin(rajShared.id, arjun.id, raj.id, Quarter.Q2,
    "Zero critical incidents maintained in Q2 as well. The alert fatigue reduction you implemented is paying dividends.",
    "2025-10-10")

  // Raj Q3 personal — on_track, scores: 80, 82, 84
  const rajQ3Scores  = [80, 82, 84]
  const rajQ3Actuals = [75, null, 0.9]
  const rajQ3Comments = [
    "75% platform completion — the pilot with the sales analytics team got great feedback. Document the use cases for launch.",
    "Automated scanning pipeline fully deployed across all services. Zero false-positive threshold is a high bar, well done.",
    "MTTR under 1 hour for the first time this quarter — target achieved. Share the playbook with the other squads.",
  ]
  for (let i = 0; i < rajPersonal.length; i++) {
    await addAchievement(rajPersonal[i].id, Quarter.Q3, rajQ3Actuals[i], rajQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(rajPersonal[i].id, arjun.id, raj.id, Quarter.Q3, rajQ3Comments[i], "2026-01-10")
  }
  // Raj shared Q3 — score: 85
  await addAchievement(rajShared.id, Quarter.Q3, 0, 85, AchievementStatus.on_track, "2026-01-05")
  await addCheckin(rajShared.id, arjun.id, raj.id, Quarter.Q3,
    "Zero critical incidents for the third consecutive quarter — the incident prevention culture you have built is exceptional.",
    "2026-01-10")

  // Raj Q4 personal — completed, scores: 85, 88, 88
  const rajQ4Scores  = [85, 88, 88]
  const rajQ4Actuals = [95, null, 0.75]
  const rajQ4Comments = [
    "95% platform completion — effectively done. The self-service capability has already reduced ad-hoc BI requests by 40%.",
    "Security pipeline is robust and has caught 12 vulnerabilities pre-production this year. Excellent engineering quality.",
    "Average MTTR at 45 minutes for Q4 — well below the 1-hour target. A model for engineering excellence.",
  ]
  for (let i = 0; i < rajPersonal.length; i++) {
    await addAchievement(rajPersonal[i].id, Quarter.Q4, rajQ4Actuals[i], rajQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(rajPersonal[i].id, arjun.id, raj.id, Quarter.Q4, rajQ4Comments[i], "2026-03-10")
  }
  // Raj shared Q4 — score: 92
  await addAchievement(rajShared.id, Quarter.Q4, 0, 92, AchievementStatus.completed, "2026-03-05")
  await addCheckin(rajShared.id, arjun.id, raj.id, Quarter.Q4,
    "Zero critical incidents across all 4 quarters — a landmark achievement for the technology team. Outstanding ownership.",
    "2026-03-10")

  // ─── MEERA NAIR — 3 personal goals + shared copy ────────────────────────
  const meeraPersonal = await Promise.all([
    createGoal({
      employeeId: meera.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Build Customer Churn Prediction Model",
      description: "Develop and deploy a machine-learning customer churn prediction model integrated into the CRM.",
      uomType: UomType.max_percent, targetValue: 100,
      weightage: 35, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: meera.id, cycleId: CID,
      thrustArea: "Technology",
      title: "Implement Data Governance Framework",
      description: "Establish and operationalise a company-wide data governance framework covering classification and access.",
      uomType: UomType.zero,
      weightage: 30, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
    createGoal({
      employeeId: meera.id, cycleId: CID,
      thrustArea: "People",
      title: "Obtain AWS Data Analytics Specialty Certification",
      description: "Achieve the AWS Certified Data Analytics – Specialty certification by January 2026.",
      uomType: UomType.timeline, targetDate: d("2026-01-31"),
      weightage: 35, status: GoalStatus.locked,
      lockedById: arjun.id, lockedAt: LOCKED_AT,
    }),
  ])

  const meeraShared = await createGoal({
    employeeId: meera.id,
    cycleId: CID,
    thrustArea: "Technology",
    title: "Zero Critical Incidents in Production — Q3",
    description: "Team KPI: achieve zero critical (P0/P1) incidents in the production environment during Q3.",
    uomType: UomType.zero,
    weightage: 20,
    status: GoalStatus.locked,
    isShared: true,
    sharedFromId: sharedTemplate.id,
    lockedById: arjun.id,
    lockedAt: LOCKED_AT,
  })

  for (const g of [...meeraPersonal, meeraShared]) {
    await auditGoalFullLock(g.id, meera.id, arjun.id)
  }
  await auditShared(meeraShared.id, arjun.id, "2025-04-22")

  // Meera Q1 personal — on_track, scores: 65, 68, 66
  const meeraQ1Scores  = [65, 68, 66]
  const meeraQ1Actuals = [22, null, null]
  const meeraQ1Comments = [
    "22% of the churn model done in Q1 — feature engineering is the right starting point. Keep moving; the CRM team is eager.",
    "Data governance policy draft reviewed with legal — good first step. The data classification matrix needs to be finalised by Q2.",
    "AWS Data Analytics study plan looks reasonable. Ensure practice exams are built into the Q2/Q3 schedule.",
  ]
  for (let i = 0; i < meeraPersonal.length; i++) {
    await addAchievement(meeraPersonal[i].id, Quarter.Q1, meeraQ1Actuals[i], meeraQ1Scores[i], AchievementStatus.on_track, "2025-07-05")
    await addCheckin(meeraPersonal[i].id, arjun.id, meera.id, Quarter.Q1, meeraQ1Comments[i], "2025-07-10")
  }
  // Meera shared Q1 — score: 90
  await addAchievement(meeraShared.id, Quarter.Q1, 0, 90, AchievementStatus.on_track, "2025-07-05")
  await addCheckin(meeraShared.id, arjun.id, meera.id, Quarter.Q1,
    "Zero critical incidents in Q1 — your proactive monitoring improvements were key to this outcome.",
    "2025-07-10")

  // Meera Q2 personal — on_track, scores: 72, 74, 72
  const meeraQ2Scores  = [72, 74, 72]
  const meeraQ2Actuals = [48, null, null]
  const meeraQ2Comments = [
    "48% complete at H1 — model training runs are showing promising early accuracy. Loop in the product team for feedback.",
    "Data classification framework approved by the data committee. Start the access control rollout in Q3.",
    "AWS study on track. The mock exam scores indicate readiness; book the exam for October to lock in a date.",
  ]
  for (let i = 0; i < meeraPersonal.length; i++) {
    await addAchievement(meeraPersonal[i].id, Quarter.Q2, meeraQ2Actuals[i], meeraQ2Scores[i], AchievementStatus.on_track, "2025-10-05")
    await addCheckin(meeraPersonal[i].id, arjun.id, meera.id, Quarter.Q2, meeraQ2Comments[i], "2025-10-10")
  }
  // Meera shared Q2 — score: 88
  await addAchievement(meeraShared.id, Quarter.Q2, 0, 88, AchievementStatus.on_track, "2025-10-05")
  await addCheckin(meeraShared.id, arjun.id, meera.id, Quarter.Q2,
    "Zero critical incidents in Q2 — excellent collaboration with the SRE team on the alerting improvements.",
    "2025-10-10")

  // Meera Q3 personal — on_track, scores: 78, 80, 80
  const meeraQ3Scores  = [78, 80, 80]
  const meeraQ3Actuals = [72, null, null]
  const meeraQ3Comments = [
    "72% complete — the model is in A/B testing and early results show 78% recall on churn prediction. Strong progress.",
    "Data governance framework fully operational across 6 of 8 business units. Close the final 2 in Q4.",
    "AWS exam completed in Q3 — awaiting results. The timing was well managed given project delivery pressures.",
  ]
  for (let i = 0; i < meeraPersonal.length; i++) {
    await addAchievement(meeraPersonal[i].id, Quarter.Q3, meeraQ3Actuals[i], meeraQ3Scores[i], AchievementStatus.on_track, "2026-01-05")
    await addCheckin(meeraPersonal[i].id, arjun.id, meera.id, Quarter.Q3, meeraQ3Comments[i], "2026-01-10")
  }
  // Meera shared Q3 — score: 85
  await addAchievement(meeraShared.id, Quarter.Q3, 0, 85, AchievementStatus.on_track, "2026-01-05")
  await addCheckin(meeraShared.id, arjun.id, meera.id, Quarter.Q3,
    "Zero critical incidents for Q3 as well — the automated alerting runbook you built for the team is working perfectly.",
    "2026-01-10")

  // Meera Q4 personal — completed, scores: 82, 85, 100
  const meeraQ4Scores  = [82, 85, 100]
  const meeraQ4Actuals = [90, null, null]
  const meeraQ4Comments = [
    "Churn model at 90% and live in production — it has already flagged 34 at-risk accounts, saving an estimated ₹30L in ARR.",
    "Data governance live across all 8 business units — a company-first. This will be foundational for our AI initiatives next year.",
    "AWS Data Analytics Specialty certified — one of the few in the org with this credential. Excellent investment in your skill set.",
  ]
  for (let i = 0; i < meeraPersonal.length; i++) {
    await addAchievement(meeraPersonal[i].id, Quarter.Q4, meeraQ4Actuals[i], meeraQ4Scores[i], AchievementStatus.completed, "2026-03-05")
    await addCheckin(meeraPersonal[i].id, arjun.id, meera.id, Quarter.Q4, meeraQ4Comments[i], "2026-03-10")
  }
  // Meera shared Q4 — score: 92
  await addAchievement(meeraShared.id, Quarter.Q4, 0, 92, AchievementStatus.completed, "2026-03-05")
  await addCheckin(meeraShared.id, arjun.id, meera.id, Quarter.Q4,
    "Zero critical incidents across all 4 quarters — a truly exceptional team result. Your on-call rigour set the standard.",
    "2026-03-10")

  console.log("\n✅ FY 2025-26 seed complete!\n")
  console.log("Cycle: FY 2025-26 (status: completed, all 4 quarters finalised)")
  console.log("────────────────────────────────────────────────────────────────")
  console.log("Employees seeded:")
  console.log("  Priya Patel   — 4 goals locked, Q1-Q4 completed (top performer)")
  console.log("  Amit Kumar    — 2 goals locked + 1 returned, Q1-Q4 for locked goals")
  console.log("  Kavya Sharma  — 3 goals locked, Q1-Q4 completed (moderate, improving)")
  console.log("  Rohan Mehta   — 4 goals locked, Q1-Q4 completed (solid, PMP done)")
  console.log("  Anita Desai   — 3 goals locked, Q1-Q4 completed (improving arc)")
  console.log("  Dev Gupta     — 3 goals draft only, NO check-ins or achievements")
  console.log("  Sana Khan     — 4 goals locked, Q1-Q4 completed (top tech performer)")
  console.log("  Raj Iyer      — 3 personal + 1 shared copy, Q1-Q4 completed")
  console.log("  Meera Nair    — 3 personal + 1 shared copy, Q1-Q4 completed")
  console.log("Shared goal template: 'Zero Critical Incidents in Production — Q3'")
  console.log("  Raj shared copy  → 4 quarters (90/88/85/92)")
  console.log("  Meera shared copy → 4 quarters (90/88/85/92)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
