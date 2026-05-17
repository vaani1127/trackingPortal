import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import LoginForm from "./_components/LoginForm"

export const metadata = { title: "Sign In — Atomberg Portal" }

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
