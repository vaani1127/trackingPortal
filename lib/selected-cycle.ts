import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

/**
 * Returns the cycle ID the user has selected via the header switcher.
 * Falls back to the most-recent non-archived cycle if no valid cookie is set.
 */
export async function getSelectedCycleId(): Promise<string | null> {
  const cookieStore = await cookies()
  const stored = cookieStore.get("selectedCycleId")?.value

  if (stored) {
    const exists = await prisma.cycle.findUnique({
      where: { id: stored },
      select: { id: true },
    })
    if (exists) return stored
  }

  const cycle = await prisma.cycle.findFirst({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  return cycle?.id ?? null
}
