import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

async function main() {
  const cycle = await prisma.cycle.findFirst({
    orderBy: { createdAt: "desc" },
  })

  if (!cycle) throw new Error("No cycle found")

  await prisma.cycle.update({
    where: { id: cycle.id },
    data: {
      phase1Opens: new Date("2025-11-01"), // goal-setting window opened
      q1Opens:     new Date("2026-02-01"), // Q1 check-ins started Feb
      q2Opens:     new Date("2026-08-01"), // Q2 opens Aug — goal-setting window stays open until then
      q3Opens:     new Date("2026-11-01"),
      q4Opens:     new Date("2027-02-01"),
    },
  })

  console.log("Done. Cycle dates updated:")
  console.log("  phase1Opens → Nov 1, 2025 (goal-setting started)")
  console.log("  q1Opens     → Feb 1, 2026 (Q1 check-ins — Q1 data valid)")
  console.log("  q2Opens     → Aug 1, 2026 (goal-setting window closes then)")
  console.log("  q3Opens     → Nov 1, 2026")
  console.log("  q4Opens     → Feb 1, 2027")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
