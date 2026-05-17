import "dotenv/config"
import * as dotenvLocal from "dotenv"
import { defineConfig } from "prisma/config"

// Load .env.local values that aren't already set by dotenv/config
dotenvLocal.config({ path: ".env.local" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (bypasses PgBouncer connection pooler)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "postgresql://placeholder",
  },
})
