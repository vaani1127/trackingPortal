import Link from "next/link"
import { Target, BarChart3, Shield, ChevronRight } from "lucide-react"

export const metadata = { title: "Atomberg KPI Portal" }

const FEATURES = [
  {
    icon: Target,
    title: "Goal Management",
    desc: "Set, submit, and track KPIs across quarterly cycles with a full approval workflow.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Department heatmaps, trend charts, and exportable reports for every cycle.",
  },
  {
    icon: Shield,
    title: "Audit Trail",
    desc: "Every change — creation, approval, lock — is timestamped and logged automatically.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-[0.15em] text-orange-500 select-none">
            ATOMBERG
          </span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Sign In
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-28 bg-gradient-to-b from-blue-50 to-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-medium text-blue-600 mb-8">
          <span className="size-1.5 rounded-full bg-blue-500" />
          FY 2026–27 cycle is active
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight text-gray-900 mb-5 max-w-2xl">
          Performance management,{" "}
          <span className="text-blue-600">simplified.</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-md mb-10 leading-relaxed">
          Atomberg&apos;s internal portal for goal setting, quarterly check-ins, and team-wide analytics.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-md"
        >
          Go to your dashboard
          <ChevronRight className="size-4" />
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20 w-full">
        <div className="grid gap-8 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="size-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-sm font-extrabold tracking-[0.15em] text-orange-500 select-none">
            ATOMBERG
          </span>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Atomberg Technologies · Internal use only
          </p>
        </div>
      </footer>
    </div>
  )
}
