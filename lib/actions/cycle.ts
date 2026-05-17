"use server"

import { cookies } from "next/headers"

export async function selectCycle(cycleId: string) {
  const cookieStore = await cookies()
  cookieStore.set("selectedCycleId", cycleId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  })
}
