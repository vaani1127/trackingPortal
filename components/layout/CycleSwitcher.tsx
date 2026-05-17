"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { CalendarRange } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { selectCycle } from "@/lib/actions/cycle"

interface AvailableCyclesData {
  cycles: { id: string; name: string }[]
  selectedCycleId: string | null
}

export function CycleSwitcher() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery<AvailableCyclesData>({
    queryKey: ["available-cycles"],
    queryFn: () => fetch("/api/cycles/available").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const cycles = data?.cycles ?? []
  const selectedId = data?.selectedCycleId ?? ""

  // Only render when there are multiple cycles to choose from
  if (cycles.length <= 1) return null

  async function handleChange(id: string | null) {
    if (!id) return
    await selectCycle(id)
    // Clear all cached server data so every page re-fetches for the new cycle
    queryClient.clear()
    router.refresh()
  }

  return (
    <Select value={selectedId} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[130px] text-xs gap-1.5 border-border">
        <CalendarRange className="size-3 text-muted-foreground flex-shrink-0" />
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent align="end">
        {cycles.map((c) => (
          <SelectItem key={c.id} value={c.id} className="text-xs">
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
