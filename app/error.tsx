"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-center px-4">
      <div className="space-y-2">
        <p className="text-5xl font-extrabold text-red-500">500</p>
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm">
          An unexpected error occurred. The team has been notified.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex h-9 items-center rounded-md bg-orange-500 px-4 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
