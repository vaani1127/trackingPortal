import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

// Maps legacy seed names → canonical form values
const REMAP: Record<string, string> = {
  "Revenue Growth":       "Sales",
  "Customer Success":     "Customer",
  "People Development":   "People",
  "Operational Excellence": "Operations",
  "Product Development":  "Technology",
}

async function main() {
  let total = 0
  for (const [oldName, newName] of Object.entries(REMAP)) {
    const { count } = await prisma.goal.updateMany({
      where: { thrustArea: oldName },
      data: { thrustArea: newName },
    })
    if (count > 0) {
      console.log(`  "${oldName}" → "${newName}" (${count} goals)`)
    }
    total += count
  }
  console.log(`\nDone. ${total} goals updated.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
