"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[EmployeeError]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-red-100 p-3">
        <AlertTriangle className="size-6 text-red-600" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "An unexpected error occurred loading this page."}
        </p>
      </div>
      <Button variant="outline" className="gap-2" onClick={reset}>
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  )
}
