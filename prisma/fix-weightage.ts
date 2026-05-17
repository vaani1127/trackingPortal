import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find Priya Patel's revenue goal and reduce weightage from 35 → 25
  // so she has 10% headroom to add a new goal (total becomes 90%)
  const goal = await prisma.goal.findFirst({
    where: {
      employee: { email: "emp1@atomberg.com" },
      title: { contains: "Achieve" },
      weightage: 35,
    },
  })

  if (!goal) {
    console.log("Goal not found or already updated.")
    return
  }

  await prisma.goal.update({
    where: { id: goal.id },
    data: { weightage: 25 },
  })

  console.log(`Updated goal "${goal.title}" — weightage 35% → 25%`)
  console.log("Priya now has 90% allocated, 10% free to add a new goal.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
