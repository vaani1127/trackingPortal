import Link from "next/link"
import { Target, TrendingUp, BarChart3, Shield, Users, Zap, ChevronRight, CheckCircle } from "lucide-react"

export const metadata = { title: "Atomberg KPI Portal" }

const FEATURES = [
  {
    icon: Target,
    title: "Goal Setting",
    desc: "Define measurable KPIs with thrust areas, weightage, and target dates across numeric, percentage, and milestone types.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: TrendingUp,
    title: "Quarterly Check-ins",
    desc: "Track progress every quarter with actual value submissions and comments. Visual heatmap for team-wide visibility.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Cycle-wise dashboards, department breakdowns, submission rates, and exportable CSV reports for HR review.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Shield,
    title: "Audit Trail",
    desc: "Every goal action - creation, submission, approval, lock - is timestamped and logged for full compliance.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Users,
    title: "Multi-Role Access",
    desc: "Separate dashboards for Employees, Managers, and Admins. Each role sees exactly what they need, nothing more.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Zap,
    title: "Smart Escalations",
    desc: "Automated alerts for missed check-ins, unsubmitted goals, and pending approvals - no manual follow-ups needed.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
]

const ROLES = [
  {
    title: "Employee",
    emoji: "👤",
    points: [
      "Set and submit quarterly KPI goals",
      "Log check-in progress each quarter",
      "View your performance heatmap",
      "Track approval status in real time",
    ],
  },
  {
    title: "Manager",
    emoji: "👥",
    points: [
      "Review and approve team goals",
      "Monitor check-in completion rates",
      "Lock year-end achievements",
      "Manage shared team goals",
    ],
  },
  {
    title: "Admin",
    emoji: "⚙️",
    points: [
      "Create and manage performance cycles",
      "View org-wide analytics and reports",
      "Export data for HR processing",
      "Monitor open escalations and alerts",
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-[0.15em] text-orange-500 select-none">
            ATOMBERG
          </span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Sign In <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 w-full">
        <div className="flex flex-col items-start gap-5 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
            <span className="size-1.5 rounded-full bg-blue-500" />
            FY 2026-27 cycle is active
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-gray-900">
            Performance<br />management,{" "}
            <span className="text-blue-600">simplified.</span>
          </h1>
          <p className="text-gray-500 text-base max-w-sm leading-relaxed">
            Atomberg&apos;s internal portal for goal setting, quarterly check-ins, and team-wide analytics.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-md shadow-orange-200"
          >
            Go to login <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* Stats inline */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "13", label: "Team members" },
            { value: "3", label: "Departments" },
            { value: "2", label: "Active cycles" },
            { value: "8", label: "Thrust areas" },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl bg-slate-900 px-5 py-4">
              <p className="text-2xl font-extrabold text-blue-400 tabular-nums">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="border-t border-gray-100" />
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900">Everything you need</h2>
          <p className="text-gray-400 text-sm mt-1">A complete performance management workflow, built for Atomberg.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="rounded-2xl bg-slate-900 p-5 hover:bg-slate-800 transition-colors group"
            >
              <div className={`inline-flex rounded-lg p-2 mb-3 ${bg}`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="border-t border-gray-100" />
      </div>

      {/* Roles */}
      <section className="max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900">Built for every role</h2>
          <p className="text-gray-400 text-sm mt-1">Tailored dashboards so each person sees exactly what matters.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLES.map(({ title, emoji, points }) => (
            <div key={title} className="rounded-2xl bg-slate-900 p-5">
              <div className="text-2xl mb-2">{emoji}</div>
              <h3 className="text-base font-bold text-white mb-3">{title}</h3>
              <ul className="space-y-2">
                {points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-xs text-slate-400">
                    <CheckCircle className="size-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-16 w-full">
        <div className="rounded-2xl bg-slate-900 p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Ready to track your goals?</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in with your Atomberg credentials to get started.</p>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-900/30"
          >
            Sign In Now <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-base font-extrabold tracking-[0.15em] text-orange-500 select-none">
            ATOMBERG
          </span>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Atomberg Technologies. Internal use only.
          </p>
        </div>
      </footer>

    </div>
  )
}
