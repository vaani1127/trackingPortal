import Link from "next/link"
import { Target, TrendingUp, BarChart3, Shield, Users, Zap, ChevronRight, CheckCircle } from "lucide-react"

export const metadata = { title: "Atomberg KPI Portal — Performance Management" }

const FEATURES = [
  {
    icon: Target,
    title: "Goal Setting",
    desc: "Define measurable KPIs with thrust areas, weightage, and target dates. Supports numeric, percentage, and milestone-based goals.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: TrendingUp,
    title: "Quarterly Check-ins",
    desc: "Track progress every quarter with actual value submissions, comments, and file attachments. Visual heatmap for team-wide visibility.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Cycle-wise performance dashboards, department breakdowns, submission rates, and exportable CSV reports for HR review.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Shield,
    title: "Audit Trail",
    desc: "Every goal action — creation, submission, approval, lock — is timestamped and logged for full compliance and transparency.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: Users,
    title: "Multi-Role Access",
    desc: "Separate dashboards for Employees, Managers, and Admins. Each role sees exactly what they need — nothing more.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    icon: Zap,
    title: "Smart Escalations",
    desc: "Automated alerts for missed check-ins, unsubmitted goals, and pending approvals. Keep your team on track without manual follow-ups.",
    color: "text-red-500",
    bg: "bg-red-50",
  },
]

const ROLES = [
  {
    title: "Employee",
    emoji: "👤",
    color: "border-blue-200 bg-blue-50/50",
    titleColor: "text-blue-700",
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
    color: "border-orange-200 bg-orange-50/50",
    titleColor: "text-orange-700",
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
    color: "border-purple-200 bg-purple-50/50",
    titleColor: "text-purple-700",
    points: [
      "Create and manage performance cycles",
      "View org-wide analytics and reports",
      "Export data for HR processing",
      "Monitor open escalations & alerts",
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white blur-2xl -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium mb-6">
            <span className="size-2 rounded-full bg-white animate-pulse" />
            FY 2026–27 Cycle Active
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            One portal for every
            <br />
            <span className="text-amber-100">performance goal</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-orange-100 mb-10">
            Atomberg&apos;s internal KPI management platform. Set goals, track quarterly progress, and drive accountability — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-orange-600 font-bold px-8 py-3.5 text-base hover:bg-orange-50 transition-colors shadow-lg"
            >
              Get started
              <ChevronRight className="size-5" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 text-white font-semibold px-8 py-3.5 text-base hover:bg-white/10 transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "13", label: "Team members" },
            { value: "3", label: "Departments" },
            { value: "2", label: "Active cycles" },
            { value: "8", label: "Thrust areas" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-orange-500 tabular-nums">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold mb-3">Everything you need</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            A complete performance management workflow built for Atomberg&apos;s team structure.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className={`inline-flex rounded-lg p-2.5 mb-4 ${bg}`}>
                <Icon className={`size-5 ${color}`} />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3">Built for every role</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Tailored dashboards so each person sees exactly what matters to them.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {ROLES.map(({ title, emoji, color, titleColor, points }) => (
              <div key={title} className={`rounded-xl border p-6 ${color}`}>
                <div className="text-3xl mb-3">{emoji}</div>
                <h3 className={`text-lg font-bold mb-4 ${titleColor}`}>{title}</h3>
                <ul className="space-y-2.5">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="size-4 mt-0.5 flex-shrink-0 text-green-500" />
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white p-10 text-center">
          <h2 className="text-3xl font-extrabold mb-3">Ready to track your goals?</h2>
          <p className="text-orange-100 mb-8 max-w-md mx-auto">
            Sign in with your Atomberg credentials to access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-orange-600 font-bold px-8 py-3.5 text-base hover:bg-orange-50 transition-colors shadow-lg"
          >
            Sign In Now
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold tracking-[0.15em] text-orange-500 select-none">
            ATOMBERG
          </span>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Atomberg Technologies. Internal use only.
          </p>
        </div>
      </footer>
    </div>
  )
}
