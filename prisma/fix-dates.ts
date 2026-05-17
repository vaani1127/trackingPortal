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
      phase1Opens: new Date("2026-05-01"), // Goal Setting opens May 1, 2026
      q1Opens:     new Date("2026-07-01"), // Q1 Check-in opens July 1, 2026
      q2Opens:     new Date("2026-10-01"), // Q2 Check-in opens October 1, 2026
      q3Opens:     new Date("2027-01-01"), // Q3 Check-in opens January 1, 2027
      q4Opens:     new Date("2027-03-01"), // Q4/Annual opens March 1, 2027
    },
  })

  console.log("Done. Cycle dates updated (per spec):")
  console.log("  phase1Opens → May 1, 2026    (Goal Setting opens)")
  console.log("  q1Opens     → Jul 1, 2026    (Q1 Check-in opens)")
  console.log("  q2Opens     → Oct 1, 2026    (Q2 Check-in opens)")
  console.log("  q3Opens     → Jan 1, 2027    (Q3 Check-in opens)")
  console.log("  q4Opens     → Mar 1, 2027    (Q4/Annual opens)")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
