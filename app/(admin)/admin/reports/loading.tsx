import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-44" />
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  )
}
