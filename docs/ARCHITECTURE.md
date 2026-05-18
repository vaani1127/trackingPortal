# Architecture — Atomberg KPI Portal

## Overview

The portal is a **Next.js 16 App Router** monolith. Server Components handle all data fetching (no client-side loading spinners for initial page load); Client Components handle interactive forms and real-time state. API routes expose a REST-ish surface consumed by client-side TanStack Query hooks where interactivity is needed.

---

## Request Lifecycle

```
Browser
  │
  ├─► GET /                          → Landing page (Server Component, no auth)
  ├─► GET /login                     → Login page (Server Component)
  │     └─► POST /api/auth/callback  → NextAuth credentials provider
  │
  └─► GET /employee/dashboard        → Protected Server Component
        ├─ middleware.ts checks JWT token
        ├─ getSession() reads session
        ├─ getSelectedCycleId() reads selectedCycleId cookie
        └─ prisma queries scoped to that cycleId
```

---

## Multi-Year Cycle Selection

This is the core architectural decision that makes year-switching work across every page.

### The problem
Every page needs to know "which year is the user looking at". Options considered:

| Option | Rejected because |
|--------|-----------------|
| URL query param `?cycle=xxx` | Clutters every URL; breaks deep links; hard to maintain across navigation |
| React Context / Zustand | Client-side only — Server Components can't read it; requires hydration |
| Database user preference | Extra DB round-trip on every page load; complicates seed/test setup |
| **Cookie** | **Chosen** — readable server-side in any Server Component, persists across tabs, zero URL pollution |

### Implementation

```
CycleSwitcher (Client Component)
  │
  ├─ onValueChange(id)
  │     ├─ selectCycle(id)          ← Server Action: sets selectedCycleId cookie (30 days, SameSite=lax)
  │     ├─ queryClient.clear()      ← Bust all TanStack Query cache (client-fetched data)
  │     └─ router.refresh()         ← Tell Next.js to re-render all Server Components
  │
  └─ Every Server Component re-renders
        └─ getSelectedCycleId()     ← Reads cookie, validates against DB, falls back to latest cycle
              └─ prisma.cycle.findUnique({ where: { id: cycleId } })
                    └─ All subsequent queries filtered: where: { cycleId }
```

**Key files**:
- `lib/selected-cycle.ts` — server-side helper, reads + validates cookie
- `lib/actions/cycle.ts` — server action to set the cookie
- `components/layout/CycleSwitcher.tsx` — UI component in the header
- `app/api/cycles/available/route.ts` — returns non-archived cycles + selected ID for the switcher

### Client Components with internal cycle state

Analytics (`AnalyticsDashboard`) and Reports (`ReportsClient`) have their own internal cycle selector (so a user can switch years without leaving those pages). They receive `defaultCycleId` as a prop from the server component, initialised from the cookie.

**Problem**: React's `useState(defaultCycleId)` only uses the initial value — the prop change from `router.refresh()` would be ignored.

**Fix**: Each component adds:
```ts
const [cycleId, setCycleId] = useState(defaultCycleId)
useEffect(() => { setCycleId(defaultCycleId) }, [defaultCycleId])
```
This syncs the local state whenever the navbar switcher triggers a server re-render.

---

## Data Model

```
Cycle
  └─ Goal (cycleId FK)
       ├─ Achievement (goalId FK) — one per quarter, @@unique([goalId, quarter])
       ├─ Checkin (goalId FK)    — manager comment per quarter
       └─ AuditLog (goalId FK)   — every status change + field diff

User
  ├─ goals (as employee)
  ├─ approvedGoals (as manager who locked)
  ├─ checkins (as manager who submitted check-in)
  ├─ escalationsAsEmployee
  └─ escalationsAsManager

Escalation (cycleId FK, employeeId FK, managerId FK)
```

### Goal Status Machine

```
draft ──► submitted ──► approved ──► locked
            │               │
            ▼               │
         returned ──────────┘  (re-submitted after revision)
```

`locked` is the terminal state used in all analytics/reports. Only admins can unlock a locked goal (creates an `unlocked` audit entry, updates a field, then re-locks).

### UoM Score Computation (`lib/scoring.ts`)

| UoM type | Formula |
|----------|---------|
| `max_numeric` | `(actual / target) × 100`, capped at 100 |
| `min_numeric` | `(target / actual) × 100`, capped at 100 |
| `max_percent` | Same as max_numeric |
| `min_percent` | Same as min_numeric |
| `timeline` | 100 if submitted on/before targetDate, else decays by days late |
| `zero` | Always 100 (binary — done or not done) |

---

## Authentication & Authorisation

**Auth**: NextAuth v4 Credentials provider. Passwords hashed with bcrypt (10 salt rounds). Session stored as JWT in a cookie (`next-auth.session-token`).

**Route guards** in `middleware.ts`:
```
/employee/* → requires any authenticated session
/manager/*  → requires role = manager or admin
/admin/*    → requires role = admin
/           → unauthenticated → landing page; authenticated → role dashboard
/login      → authenticated → redirect to role dashboard
```

`getSession()` is called at the top of every Server Component page to double-check auth server-side (the middleware is the first gate; the server component is the second).

---

## Notifications

Two parallel channels fire on every goal lifecycle event:

```
Goal submitted / approved / returned / unlocked
  │
  ├─ sendEmail(...)     → Resend API → employee/manager inbox
  └─ sendTeamsCard(...) → Teams Incoming Webhook → channel card
```

Both calls are wrapped in `Promise.allSettled` so a failure in one channel doesn't break the API response.

**Escalation cron** (`/api/escalations/check`, runs daily at 09:00 UTC via `vercel.json`):
1. Finds employees whose goals are not submitted after N days
2. Finds submitted goals not approved after N days
3. Finds employees who missed a check-in for the current quarter
4. Creates/increments `Escalation` records
5. Fires Teams + email notifications for each

---

## Seed Architecture

Two cycles are maintained in the demo database:

| Cycle | Status | Goals | Check-ins | Purpose |
|-------|--------|-------|-----------|---------|
| FY 2025-26 | `completed` | 31 locked | 120 (Q1–Q4 × 30 goals) | Historical year view |
| FY 2026-27 | `active` | 32 (mixed) | 0 | Current year — goal setting in progress |

**`prisma/seed-complete.ts`** is the canonical seed script:
- Does **not** delete users (preserves credentials)
- Deletes all cycle-scoped rows (escalations → auditLogs → checkins → achievements → goals → cycles)
- Creates FY 2025-26 first (completed, locked, full Q1–Q4 data)
- Creates FY 2026-27 second (active, goal setting window open, zero check-ins)

Run order on a fresh database:
```bash
npm run db:push          # create tables
npm run db:seed          # create 13 users + initial cycle
npm run db:seed-complete # reset both cycles to correct state
```

---

## Analytics API Design

`GET /api/analytics?type=<type>&cycleId=<id>&department=<dept>`

All analytics are computed server-side on each request (no pre-aggregation). The `staleTime: 5 * 60 * 1000` in `useAnalytics.ts` hooks means charts re-fetch at most once per 5 minutes.

| `type` | Returns | Used by |
|--------|---------|---------|
| `heatmap` | Employee × Quarter status matrix | CompletionHeatmap |
| `trends` | Quarter-by-quarter submission + check-in rates | Line chart |
| `distribution` | Goal count by status (Pie) + by UoM (Bar) | Distribution section |
| `manager-effectiveness` | Per-manager check-in % by quarter | Grouped bar chart |
| `performers` | Top 5 / Bottom 5 employees by avg score | Performers tab |

---

## Frontend Patterns

### Server Components (data-heavy pages)
```tsx
export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const cycleId = await getSelectedCycleId()          // reads cookie
  const cycle = cycleId ? await prisma.cycle.findUnique(...) : null

  const [totalEmployees, goalStats, escalations] = await Promise.all([...])

  return <DashboardUI data={...} />
}
```

### Client Components (interactive)
- Forms use `react-hook-form` + `zod` validation
- Mutations call API routes via `fetch`, then `queryClient.invalidateQueries()`
- Analytics use custom `useQuery` hooks from `hooks/useAnalytics.ts`

### Shared Goal Pattern
A shared goal has `isShared: true`. The admin creates a template goal (attached to the first assignee, `weightage: 0`). Each assignee gets their own copy with `sharedFromId` pointing to the template. Achievements are tracked independently per copy.

---

## Deployment

```
GitHub push
  └─► Vercel CI
        ├─ next build (type-check + bundle)
        └─ Deploy to edge

vercel.json cron
  └─► GET /api/escalations/check  (daily 09:00 UTC)
        └─ Authorization: Bearer $CRON_SECRET
```

No database migrations on deploy — schema changes use `prisma db push` (declarative, safe for Supabase free tier which doesn't support migration history well).
