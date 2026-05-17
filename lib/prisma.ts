import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const createPrismaClient = () => {
  // Use the transaction pooler URL at runtime (PgBouncer-compatible).
  // DIRECT_URL is reserved for migrations/seed only.
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg(connectionString)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
