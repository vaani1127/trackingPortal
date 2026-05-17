import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

function computeScore(
  uomType: string,
  target: number | null,
  actual: number | null,
  targetDate?: string | null,
  actualDate?: string | null
): number | null {
  if (uomType === "zero") {
    if (actual === null) return null
    return actual === 0 ? 100 : Math.max(0, 100 - actual * 20)
  }
  if (uomType === "timeline") {
    if (!targetDate || !actualDate) return null
    const td = new Date(targetDate)
    const ad = new Date(actualDate)
    if (ad <= td) return 100
    const daysLate = Math.round((ad.getTime() - td.getTime()) / 86_400_000)
    return Math.max(0, 100 - daysLate * 5)
  }
  if (target === null || target === 0 || actual === null) return null
  if (uomType === "min_numeric" || uomType === "min_percent") {
    if (actual <= target) return 100
    return Math.max(0, (target / actual) * 100)
  }
  if (uomType === "max_numeric" || uomType === "max_percent") {
    return Math.min(100, Math.max(0, (actual / target) * 100))
  }
  return null
}

async function main() {
  const achievements = await prisma.achievement.findMany({
    include: {
      goal: {
        select: { uomType: true, targetValue: true, targetDate: true },
      },
    },
  })

  let updated = 0
  for (const a of achievements) {
    const score = computeScore(
      a.goal.uomType,
      a.goal.targetValue !== null ? Number(a.goal.targetValue) : null,
      a.actualValue !== null ? Number(a.actualValue) : null,
      a.goal.targetDate?.toISOString() ?? null,
      a.actualDate?.toISOString() ?? null
    )

    const currentScore = a.computedScore !== null ? Number(a.computedScore) : null
    if (score !== currentScore) {
      await prisma.achievement.update({
        where: { id: a.id },
        data: { computedScore: score },
      })
      console.log(`  [${a.quarter}] ${a.id.slice(0, 8)}… ${currentScore ?? "null"} → ${score ?? "null"}`)
      updated++
    }
  }

  console.log(`\nDone. Updated ${updated} of ${achievements.length} achievements.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
