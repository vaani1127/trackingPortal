import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-36" />)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    </div>
  )
}
