# Demo Script — Atomberg KPI Portal

**Duration**: ~10 minutes  
**Today's date in demo**: May 17, 2026  
**Active cycle**: FY 2026-27 (goal setting window open since May 1; Q1 check-in window opens July 1)  
**Historical cycle**: FY 2025-26 (completed — all 4 quarters done, all goals locked)

---

## Quick-Access Credentials

| Who | Email | Password |
|-----|-------|----------|
| Admin | `admin@atomberg.com` | `Admin@123` |
| Sales Manager (Rahul) | `manager1@atomberg.com` | `Manager@123` |
| Ops Manager (Neha) | `manager2@atomberg.com` | `Manager@123` |
| Tech Manager (Arjun) | `manager3@atomberg.com` | `Manager@123` |
| Priya Patel (Sales) | `emp1@atomberg.com` | `Emp@123` |
| Amit Kumar (Sales) | `emp2@atomberg.com` | `Emp@123` |
| Dev Gupta (Operations) | `emp6@atomberg.com` | `Emp@123` |
| Sana Khan (Technology) | `emp7@atomberg.com` | `Emp@123` |

---

## Part 1 — Landing Page & Login (1 min)

1. Open the app root URL. The **landing page** appears — no login required.
   - Show: sticky navbar with ATOMBERG logo + Sign In button
   - Show: orange gradient hero, feature cards, role breakdowns
   - Click **Sign In** (or the button in the hero)

2. On the **login page**:
   - Click **Demo credentials** to expand the accordion
   - Show all 13 accounts grouped by Admin / Managers / Employees
   - Click **Priya Patel** — email and password auto-fill
   - Toggle the **eye icon** to reveal the password
   - Click **Sign in**

---

## Part 2 — Employee View: FY 2026-27 Goal Setting (2 min)

> Logged in as `emp1@atomberg.com` (Priya Patel, Sales)

### Dashboard
- Header shows **FY 2026-27 · Active** badge
- Dashboard cards show Priya's 4 approved goals
- All quarterly check-in cells are **blank** — Q1 hasn't ended yet (ends June 30)
- This is intentional: goal setting is in progress, check-in window opens July 1

### Goals page
- All 4 goals show **Approved** status badges
- Each goal: Sales Revenue ₹6 Cr / 92% retention / 12 enterprise clients / NPS 8.5+
- Weightage totals to 100%

### Show a "returned goals" scenario
- Log out → log in as `emp2@atomberg.com` (Amit Kumar)
- Goals page: all 3 goals show **Returned** status
- Click a goal → audit trail shows manager's return comment: "Revenue target of ₹9 Cr is not aligned with your territory…"
- This employee needs to revise and resubmit

### Show a "draft + escalation" scenario
- Log out → log in as `emp6@atomberg.com` (Dev Gupta)
- 3 goals in **Draft** — he hasn't submitted anything yet
- The system has already triggered an escalation (visible in admin's notification bell)

---

## Part 3 — Manager View: FY 2026-27 (1.5 min)

> Log in as `manager2@atomberg.com` (Neha Joshi, Operations)

### Dashboard
- **Pending Approval**: 1 (Anita's Six Sigma goal still submitted)
- Team progress table: Rohan and Anita have goals, Dev shows no approved goals
- Q1–Q4 check-in columns are all blank (correct — no check-ins yet)

### Approval Inbox
- Anita Desai's "Complete Six Sigma Green Belt" goal is waiting
- Click **Approve** to move it to approved status
- Watch the pending count on the dashboard drop to 0

---

## Part 4 — Year Switch: FY 2025-26 (2 min)

> This is the key demo moment — show that switching the year completely changes the data.

1. In the header, click the **cycle switcher** (currently shows "FY 2026-27")
2. Select **FY 2025-26**
3. The whole page reloads — now showing the completed year

### Manager Dashboard (FY 2025-26)
- Team progress table: all employees have completed goals
- Q1 / Q2 / Q3 / Q4 columns all show **✓ Done** for every employee
- This is the complete historical record

### Switch to Employee view to show performance arcs
- Log in as `emp7@atomberg.com` (Sana Khan, Technology)
- Goal list: 4 goals, all **Locked**
- Click any goal → Achievement tab shows Q1→Q4 scores: 82 → 88 → 93 → 96 (top performer arc)
- Click the Audit tab → full history: created → submitted → approved → locked

- Switch to `emp6@atomberg.com` (Dev Gupta) — same year (FY 2025-26)
- Q1→Q4 scores: 45 → 52 → 58 → 64 — weaker performance, shows the contrast

---

## Part 5 — Admin Analytics (2 min)

> Log in as `admin@atomberg.com`

### Switch back to FY 2025-26 first

### Analytics page

**Completion Heatmap**
- 9 rows (employees) × 5 columns (Goal Setting + Q1 + Q2 + Q3 + Q4)
- All cells green — every employee completed every quarter
- Filter by department (Sales / Operations / Technology) — heatmap updates live

**QoQ Trend chart**
- Line chart: submission rate and check-in rate by quarter
- Shows the completed year arc

**Distribution charts**
- Pie: breakdown by goal status — all "locked" in FY 2025-26
- Bar: breakdown by UoM type

**Manager Effectiveness**
- Grouped bar: Rahul / Neha / Arjun side by side per quarter

**Top Performers**
- Ranked list: Sana Khan at the top (avg ~94%), Dev Gupta at the bottom (~56%)

### Switch to FY 2026-27
- Heatmap: Goal Setting column shows mix of green (approved) / amber (submitted) / red (draft/returned)
- Q1–Q4 columns are all grey/NA — correct, no check-ins yet
- Distribution: now shows draft / submitted / approved / returned breakdown

---

## Part 6 — Admin Reports & Export (1 min)

> Still as admin, FY 2025-26 selected

### Reports page → Achievement Report tab
- Table: all 9 employees × their goals × Q1 Actual / Q1 Score / Q2 / Q3 / Q4
- Avg score row in footer
- Filter by department → Sales only
- Search for "Priya" → narrows to her rows
- Click **Excel** → `.xlsx` downloads with correct cycle data

### Reports page → Completion Dashboard tab
- Per-employee phase status: Goal Setting / Q1 / Q2 / Q3 / Q4
- Manager summary table: Rahul / Neha / Arjun completion rates

---

## Part 7 — Escalations & Notifications (1 min)

> Switch to FY 2026-27

### Notification bell (top-right of header)
- Click the bell — dropdown shows open alerts
- 3 alerts: Dev Gupta (goal_not_submitted) + Amit Kumar + Kavya Sharma (goal_not_approved)
- Each shows employee name, department, timestamp ("2 days ago")

### Escalations page (Admin → Escalations)
- Same alerts in a full-page view, scoped to FY 2026-27
- Switch to FY 2025-26 → escalations list is empty (all resolved when year completed)

### Audit Log page
- Filter by employee: shows every action Priya took across both cycles
- Filter by action type: shows all "returned" events (Amit's goals)

---

## Part 8 — Cycle Management (30 sec)

> Admin → Cycle Management

- Two cycles listed: FY 2025-26 (Completed) and FY 2026-27 (Active)
- FY 2026-27: shows phase dates (goal setting open since May 1, Q1 check-in opens July 1)
- Can create a new cycle, change status (Draft → Active → Completed → Archived)

---

## What to highlight in Q&A

**"How does year switching work?"**  
A cookie (`selectedCycleId`) is set server-side when you pick a year. Every page reads this cookie to scope its database queries. Switching the year triggers a full server re-render — nothing is cached from the previous year.

**"What happens when Q1 check-in window opens on July 1?"**  
The Q1 column in analytics and the employee check-in page will unlock. Employees submit actuals → manager reviews → check-in recorded. The heatmap cell turns green.

**"What's the difference between approved and locked?"**  
Approved = manager agreed to the goal; employee can still make minor edits. Locked = year-end state; the goal is immutable. Admins can unlock with a full audit trail of what changed.

**"How does the shared goal work?"**  
Admin creates a template goal, assigns it to Raj and Meera. Each gets their own copy tracked independently. In FY 2025-26, both achieved 100% on "Zero Critical Production Incidents" every quarter.

**"What triggers escalations?"**  
A daily cron at 09:00 UTC checks three rules: (1) goals not submitted N days after phase1Opens, (2) submitted goals not approved N days after submission, (3) check-ins not submitted N days after the quarter window opens. Each hit creates/increments an Escalation record and fires a Teams card + email.
