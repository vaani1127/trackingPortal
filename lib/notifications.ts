import { Resend } from "resend"

const FROM_ADDRESS = "AtomQuest Portal <noreply@atomberg.com>"
const PORTAL_URL = process.env.NEXTAUTH_URL ?? "https://portal.atomberg.com"

// ─── HTML base ────────────────────────────────────────────────────────────────

function emailBase(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Orange header band -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:28px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:0.1em;line-height:1;">ATOMBERG</h1>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.80);font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Performance Portal</p>
                  </td>
                  <td align="right" style="padding-left:16px;">
                    <div style="width:42px;height:42px;background:rgba(255,255,255,0.15);border-radius:10px;display:table-cell;text-align:center;vertical-align:middle;">
                      <span style="font-size:22px;line-height:42px;">⚡</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 36px;"><div style="height:1px;background:#f1f5f9;"></div></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;background:#f8fafc;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.7;text-align:center;">
                You're receiving this because you're part of the Atomberg performance management system.
              </p>
              <p style="margin:0;text-align:center;font-size:12px;">
                <a href="${PORTAL_URL}" style="color:#f97316;text-decoration:none;font-weight:600;">Open Portal</a>
                <span style="color:#cbd5e1;margin:0 8px;">&middot;</span>
                <span style="color:#94a3b8;">To stop notifications, contact your HR admin.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:${color}20;color:${color};">${text}</span>`
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
    <tr>
      <td style="border-radius:10px;background:#f97316;">
        <a href="${href}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.02em;">${text} →</a>
      </td>
    </tr>
  </table>`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
      <span style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${label}</span><br>
      <span style="color:#1e293b;font-size:14px;font-weight:500;">${value}</span>
    </td>
  </tr>`
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string
  html: string
}

export const EmailTemplates = {
  goalSubmitted(employee: string, manager: string, goalCount: number): EmailTemplate {
    const content = `
      <p style="margin:0 0 6px;">${badge("Action Required", "#f97316")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        Goals Submitted for Review
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">Please review and approve within 5 working days.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${manager}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        <strong style="color:#0f172a;">${employee}</strong> has submitted their goal sheet with
        <strong style="color:#f97316;">${goalCount} goal${goalCount !== 1 ? "s" : ""}</strong> for this performance cycle.
        Your review and approval is requested.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <tbody>
          ${infoRow("Submitted By", employee)}
          ${infoRow("Goals Count", `${goalCount} goal${goalCount !== 1 ? "s" : ""}`)}
          ${infoRow("Action Needed", "Review &amp; Approve")}
        </tbody>
      </table>

      ${ctaButton("Review Goal Sheet", `${PORTAL_URL}/manager/approvals`)}
    `
    return {
      subject: `Goal Sheet Submitted — ${employee} (${goalCount} goal${goalCount !== 1 ? "s" : ""})`,
      html: emailBase("Goals Submitted for Review", content),
    }
  },

  goalApproved(employee: string, managerName: string, cycleYear: string): EmailTemplate {
    const content = `
      <p style="margin:0 0 6px;">${badge("All Approved", "#22c55e")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        Your Goals Have Been Approved!
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">Your performance cycle is now active.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${employee}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        Great news! <strong style="color:#0f172a;">${managerName}</strong> has reviewed and approved all your goals
        for <strong>${cycleYear}</strong>. Your goals are now locked and the performance cycle is active.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <tbody>
          ${infoRow("Performance Cycle", cycleYear)}
          ${infoRow("Approved By", managerName)}
          ${infoRow("Status", "Goals Locked &amp; Active")}
        </tbody>
      </table>

      <p style="margin:28px 0 0;color:#475569;font-size:14px;line-height:1.7;">
        Remember to submit your quarterly check-ins on time. You can track your progress anytime via the portal.
      </p>

      ${ctaButton("View My Goals", `${PORTAL_URL}/employee/goals`)}
    `
    return {
      subject: `Your Goals Are Approved — ${cycleYear}`,
      html: emailBase("Goals Approved", content),
    }
  },

  goalReturned(employee: string, goalTitle: string, comment: string, managerName: string): EmailTemplate {
    const content = `
      <p style="margin:0 0 6px;">${badge("Revision Needed", "#f59e0b")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        Goal Returned for Revision
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">Please update your goal based on the feedback below.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${employee}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        <strong style="color:#0f172a;">${managerName}</strong> has returned your goal
        <em>"${goalTitle}"</em> with feedback. Please revise it and resubmit for approval.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <tbody>
          ${infoRow("Goal", goalTitle)}
          ${infoRow("Returned By", managerName)}
        </tbody>
      </table>

      <div style="margin:20px 0;padding:16px 20px;background:#f8fafc;border-left:4px solid #f97316;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Manager&rsquo;s Feedback</p>
        <p style="margin:0;color:#1e293b;font-size:14px;line-height:1.7;">${comment}</p>
      </div>

      ${ctaButton("Update Goal", `${PORTAL_URL}/employee/goals`)}
    `
    return {
      subject: `Goal Returned for Revision — "${goalTitle}"`,
      html: emailBase("Goal Returned", content),
    }
  },

  goalUnlocked(employee: string, goalTitle: string): EmailTemplate {
    const content = `
      <p style="margin:0 0 6px;">${badge("Unlocked", "#6366f1")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        Goal Unlocked for Editing
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">An administrator has made this goal available for editing.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${employee}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        Your goal <em>"${goalTitle}"</em> has been unlocked by an administrator. You can now edit and resubmit it for approval.
      </p>

      ${ctaButton("Edit Goal", `${PORTAL_URL}/employee/goals`)}
    `
    return {
      subject: `Goal Unlocked for Editing — "${goalTitle}"`,
      html: emailBase("Goal Unlocked", content),
    }
  },

  checkinReminder(employee: string, quarter: string, daysOpen: number): EmailTemplate {
    const content = `
      <p style="margin:0 0 6px;">${badge("Reminder", "#3b82f6")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        ${quarter} Check-in Reminder
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">The check-in window has been open for ${daysOpen} days.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${employee}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        The <strong>${quarter} check-in window has been open for ${daysOpen} days</strong> and we haven't received
        your update yet. Please log your progress for each goal before the window closes.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <tbody>
          ${infoRow("Quarter", quarter)}
          ${infoRow("Window Open Since", `${daysOpen} days ago`)}
          ${infoRow("Status", "Check-in Pending")}
        </tbody>
      </table>

      ${ctaButton("Submit Check-in", `${PORTAL_URL}/employee/check-ins`)}
    `
    return {
      subject: `Reminder: ${quarter} Check-in Not Submitted`,
      html: emailBase(`${quarter} Check-in Reminder`, content),
    }
  },

  escalationEmployee(employee: string, type: string, daysOverdue: number): EmailTemplate {
    const typeLabels: Record<string, string> = {
      goal_not_submitted: "Goal Sheet Not Submitted",
      goal_not_approved: "Goals Pending Manager Approval",
      checkin_missed: "Quarterly Check-in Missed",
    }
    const typeDescriptions: Record<string, string> = {
      goal_not_submitted: `Your goal sheet was due ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} ago. Please submit it as soon as possible to avoid further escalation.`,
      goal_not_approved: `Your submitted goals are pending approval. This is a reminder that the approval deadline has passed.`,
      checkin_missed: `You have missed the quarterly check-in deadline. Please submit your progress update immediately.`,
    }
    const label = typeLabels[type] ?? type
    const description = typeDescriptions[type] ?? ""

    const content = `
      <p style="margin:0 0 6px;">${badge("Escalation Notice", "#ef4444")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        ${label}
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">Please take immediate action to avoid further escalation.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${employee}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        ${description}
      </p>

      <div style="margin:0 0 24px;padding:16px 20px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
        <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.7;">
          ⚠️ <strong>Note:</strong> If this is not resolved, the matter will be escalated to your manager and the HR team.
        </p>
      </div>

      ${ctaButton("Take Action Now", `${PORTAL_URL}/employee/goals`)}
    `
    return {
      subject: `Escalation: ${label} — Action Required`,
      html: emailBase("Escalation Notice", content),
    }
  },

  escalationManager(manager: string, employeeName: string, type: string): EmailTemplate {
    const typeLabels: Record<string, string> = {
      goal_not_submitted: "Goal Sheet Not Submitted",
      goal_not_approved: "Goals Pending Your Approval",
      checkin_missed: "Team Member Missed Check-in",
    }
    const typeActions: Record<string, string> = {
      goal_not_submitted: `${employeeName} has not submitted their goal sheet despite reminders. Please follow up with them directly.`,
      goal_not_approved: `${employeeName} has goals awaiting your approval. The approval window has passed.`,
      checkin_missed: `${employeeName} has not submitted their quarterly check-in. Please follow up.`,
    }
    const label = typeLabels[type] ?? type
    const action = typeActions[type] ?? ""

    const content = `
      <p style="margin:0 0 6px;">${badge("Manager Alert", "#f59e0b")}</p>
      <h2 style="margin:12px 0 6px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
        ${label}
      </h2>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;">Your team member requires attention.</p>

      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
        Hi <strong style="color:#0f172a;">${manager}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
        ${action}
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <tbody>
          ${infoRow("Employee", employeeName)}
          ${infoRow("Issue", label)}
        </tbody>
      </table>

      ${ctaButton("View Team Status", `${PORTAL_URL}/manager/dashboard`)}
    `
    return {
      subject: `Team Alert: ${label} — ${employeeName}`,
      html: emailBase("Manager Alert", content),
    }
  },
}

// ─── Send email ───────────────────────────────────────────────────────────────

export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: template.subject,
      html: template.html,
    })
  } catch (err) {
    console.error("[notifications] Email send failed:", err)
  }
}

// ─── Teams Adaptive Cards ─────────────────────────────────────────────────────

interface AdaptiveFact { title: string; value: string }

function teamsCard(params: {
  badge: string
  badgeStyle: "good" | "attention" | "warning" | "accent"
  title: string
  body: string
  facts: AdaptiveFact[]
  actionLabel: string
  actionUrl: string
}): object {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.2",
          body: [
            {
              type: "Container",
              style: "emphasis",
              bleed: true,
              items: [
                {
                  type: "ColumnSet",
                  columns: [
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        {
                          type: "TextBlock",
                          text: "⚡ ATOMBERG Performance Portal",
                          weight: "Bolder",
                          color: "Accent",
                          size: "Small",
                        },
                      ],
                    },
                    {
                      type: "Column",
                      width: "auto",
                      items: [
                        {
                          type: "TextBlock",
                          text: params.badge,
                          color: params.badgeStyle === "good"
                            ? "Good"
                            : params.badgeStyle === "attention"
                            ? "Attention"
                            : params.badgeStyle === "warning"
                            ? "Warning"
                            : "Accent",
                          weight: "Bolder",
                          size: "Small",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "Container",
              items: [
                {
                  type: "TextBlock",
                  text: params.title,
                  weight: "Bolder",
                  size: "Large",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: params.body,
                  wrap: true,
                  color: "Default",
                  spacing: "Small",
                },
                {
                  type: "FactSet",
                  spacing: "Medium",
                  facts: params.facts,
                },
              ],
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: `${params.actionLabel} →`,
              url: params.actionUrl,
            },
          ],
          msteams: { width: "Full" },
        },
      },
    ],
  }
}

export const TeamsTemplates = {
  goalSubmitted(employee: string, manager: string, goalCount: number) {
    return teamsCard({
      badge: "ACTION REQUIRED",
      badgeStyle: "warning",
      title: "Goals Submitted for Review",
      body: `**${employee}** has submitted their goal sheet with **${goalCount} goal${goalCount !== 1 ? "s" : ""}** for this performance cycle. Please review and approve within 5 working days.`,
      facts: [
        { title: "Submitted By", value: employee },
        { title: "Goals", value: `${goalCount} goal${goalCount !== 1 ? "s" : ""}` },
        { title: "Action", value: "Review & Approve" },
      ],
      actionLabel: "Review Goal Sheet",
      actionUrl: `${PORTAL_URL}/manager/approvals`,
    })
  },

  goalApproved(employee: string, managerName: string, cycleName: string) {
    return teamsCard({
      badge: "APPROVED ✓",
      badgeStyle: "good",
      title: "Your Goals Have Been Approved!",
      body: `**${managerName}** has reviewed and approved all your goals for **${cycleName}**. Your goals are now locked and the performance cycle is active.`,
      facts: [
        { title: "Approved By", value: managerName },
        { title: "Cycle", value: cycleName },
        { title: "Status", value: "Goals Locked & Active" },
      ],
      actionLabel: "View My Goals",
      actionUrl: `${PORTAL_URL}/employee/goals`,
    })
  },

  goalReturned(employee: string, goalTitle: string, comment: string, managerName: string) {
    return teamsCard({
      badge: "REVISION NEEDED",
      badgeStyle: "attention",
      title: "Goal Returned for Revision",
      body: `**${managerName}** has returned your goal **"${goalTitle}"** with feedback. Please revise and resubmit.\n\n> ${comment}`,
      facts: [
        { title: "Goal", value: goalTitle },
        { title: "Returned By", value: managerName },
      ],
      actionLabel: "Update Goal",
      actionUrl: `${PORTAL_URL}/employee/goals`,
    })
  },

  goalUnlocked(recipientName: string, goalTitle: string) {
    return teamsCard({
      badge: "UNLOCKED",
      badgeStyle: "accent",
      title: "Goal Unlocked for Editing",
      body: `An administrator has unlocked **"${goalTitle}"**. It can now be edited and resubmitted for approval.`,
      facts: [
        { title: "Goal", value: goalTitle },
        { title: "Action", value: "Edit & Resubmit" },
      ],
      actionLabel: "Edit Goal",
      actionUrl: `${PORTAL_URL}/employee/goals`,
    })
  },

  escalationEmployee(employee: string, type: string, daysOverdue: number) {
    const typeLabels: Record<string, string> = {
      goal_not_submitted: "Goal Sheet Not Submitted",
      goal_not_approved: "Goals Pending Approval",
      checkin_missed: "Quarterly Check-in Missed",
    }
    const typeActions: Record<string, string> = {
      goal_not_submitted: `Your goal sheet is **${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue**. Please submit it immediately to avoid further escalation.`,
      goal_not_approved: "Your submitted goals are still pending manager approval.",
      checkin_missed: "You have not submitted your quarterly check-in. Please do so immediately.",
    }
    return teamsCard({
      badge: "⚠️ ESCALATION",
      badgeStyle: "attention",
      title: typeLabels[type] ?? type,
      body: `Hi **${employee}**, ${typeActions[type] ?? "Immediate action is required."}`,
      facts: [
        { title: "Employee", value: employee },
        { title: "Issue", value: typeLabels[type] ?? type },
        { title: "Days Overdue", value: String(daysOverdue) },
      ],
      actionLabel: "Take Action Now",
      actionUrl: `${PORTAL_URL}/employee/goals`,
    })
  },

  escalationManager(manager: string, employeeName: string, type: string) {
    const typeLabels: Record<string, string> = {
      goal_not_submitted: "Goal Sheet Not Submitted",
      goal_not_approved: "Goals Pending Your Approval",
      checkin_missed: "Team Member Missed Check-in",
    }
    const typeActions: Record<string, string> = {
      goal_not_submitted: `**${employeeName}** has not submitted their goal sheet despite reminders. Please follow up directly.`,
      goal_not_approved: `**${employeeName}**'s goals are awaiting your approval. The approval window has passed.`,
      checkin_missed: `**${employeeName}** has not submitted their quarterly check-in.`,
    }
    return teamsCard({
      badge: "🚨 TEAM ALERT",
      badgeStyle: "attention",
      title: typeLabels[type] ?? type,
      body: `Hi **${manager}**, ${typeActions[type] ?? "Your team member requires immediate attention."}`,
      facts: [
        { title: "Employee", value: employeeName },
        { title: "Issue", value: typeLabels[type] ?? type },
      ],
      actionLabel: "View Team Dashboard",
      actionUrl: `${PORTAL_URL}/manager/dashboard`,
    })
  },

  checkinReminder(employee: string, quarter: string, daysOpen: number) {
    return teamsCard({
      badge: "REMINDER",
      badgeStyle: "warning",
      title: `${quarter} Check-in Pending`,
      body: `Hi **${employee}**, the **${quarter} check-in window has been open for ${daysOpen} day${daysOpen !== 1 ? "s" : ""}** and your update hasn't been submitted yet. Please log your progress before the window closes.`,
      facts: [
        { title: "Quarter", value: quarter },
        { title: "Window Open", value: `${daysOpen} day${daysOpen !== 1 ? "s" : ""}` },
        { title: "Status", value: "Check-in Pending" },
      ],
      actionLabel: "Submit Check-in",
      actionUrl: `${PORTAL_URL}/employee/check-ins`,
    })
  },
}

// ─── Send Teams card ───────────────────────────────────────────────────────────

export async function sendTeamsCard(card: object): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL
  if (!webhookUrl) return
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[notifications] Teams webhook failed ${res.status}:`, text)
    }
  } catch (err) {
    console.error("[notifications] Teams send failed:", err)
  }
}
