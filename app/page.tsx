import Link from "next/link"
import { Target, TrendingUp, BarChart3, Shield, Users, Zap, ChevronRight, CheckCircle } from "lucide-react"

export const metadata = { title: "Atomberg KPI Portal" }

const FEATURES = [
  {
    icon: Target,
    title: "Goal Setting",
    desc: "Define measurable KPIs with thrust areas, weightage, and target dates. Supports numeric, percentage, and milestone-based goals.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: TrendingUp,
    title: "Quarterly Check-ins",
    desc: "Track progress every quarter with actual value submissions and comments. Visual heatmap for team-wide visibility.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Cycle-wise performance dashboards, department breakdowns, submission rates, and exportable CSV reports for HR review.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Audit Trail",
    desc: "Every goal action - creation, submission, approval, lock - is timestamped and logged for full compliance and transparency.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Multi-Role Access",
    desc: "Separate dashboards for Employees, Managers, and Admins. Each role sees exactly what they need, nothing more.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Smart Escalations",
    desc: "Automated alerts for missed check-ins, unsubmitted goals, and pending approvals. Keep your team on track without manual follow-ups.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
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
    <div className="min-h-screen bg-slate-900 text-gray-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-700/60 bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
      <section className="flex flex-col items-center justify-center text-center px-6 py-20 bg-slate-900">
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

      {/* Stats bar */}
      <section className="border-y border-slate-700/60 bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "13", label: "Team members" },
            { value: "3", label: "Departments" },
            { value: "2", label: "Active cycles" },
            { value: "8", label: "Thrust areas" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-blue-400 tabular-nums">{value}</p>
              <p className="text-sm text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3 text-gray-900">Everything you need</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A complete performance management workflow built for Atomberg&apos;s team structure.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="rounded-xl border border-slate-100 bg-slate-50 p-6 hover:border-blue-200 hover:shadow-md transition-all">
                <div className={`inline-flex rounded-lg p-2.5 mb-4 ${bg}`}>
                  <Icon className={`size-5 ${color}`} />
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3 text-gray-900">Built for every role</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Tailored dashboards so each person sees exactly what matters to them.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {ROLES.map(({ title, emoji, points }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-3xl mb-3">{emoji}</div>
                <h3 className="text-lg font-bold mb-4 text-slate-900">{title}</h3>
                <ul className="space-y-2.5">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="size-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 border-t border-slate-700/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Ready to track your goals?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Sign in with your Atomberg credentials to access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white font-bold px-8 py-3.5 text-base hover:bg-orange-600 transition-colors shadow-lg"
          >
            Sign In Now
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/60 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold tracking-[0.15em] text-orange-500 select-none">
            ATOMBERG
          </span>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Atomberg Technologies. Internal use only.
          </p>
        </div>
      </footer>
    </div>
  )
}
