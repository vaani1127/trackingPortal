import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-center px-4">
      <div className="space-y-2">
        <p className="text-7xl font-extrabold text-orange-500">404</p>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-sm">
          The page you were looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-md bg-orange-500 px-4 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
      >
        Go back home
      </Link>
    </div>
  )
}
