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
    desc: "Every change - creation, approval, lock - is timestamped and logged automatically.",
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
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-slate-900">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1 text-xs font-medium text-slate-300 mb-6">
          <span className="size-1.5 rounded-full bg-blue-400" />
          FY 2026-27 cycle is active
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white mb-4 max-w-2xl">
          Performance management,{" "}
          <span className="text-blue-400">simplified.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md mb-8 leading-relaxed">
          Atomberg&apos;s internal portal for goal setting, quarterly check-ins, and team-wide analytics.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-md"
        >
          Go to login
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
