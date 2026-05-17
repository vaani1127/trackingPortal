"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CheckinModal } from "@/components/manager/CheckinModal"
import { CheckCircle2, AlertCircle, Clock, Minus } from "lucide-react"

interface Achievement {
  quarter: string
  actualValue: number | null
  actualDate: string | null
  progressStatus: string
  computedScore: number | null
}

interface GoalData {
  id: string
  employeeId: string
  title: string
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  achievements: Achievement[]
}

interface CheckinRecord {
  id: string
  employeeId: string
  goalId: string
  quarter: string
  comment: string
}

interface Employee {
  id: string
  name: string
  department: string | null
}

interface CheckinContentProps {
  employees: Employee[]
  goals: GoalData[]
  checkins: CheckinRecord[]
  cycleId: string
  currentQuarter: "Q1" | "Q2" | "Q3" | "Q4" | null
}

type CheckinStatus = "done" | "partial" | "missing" | "pending"

function getCheckinStatus(
  employeeId: string,
  quarter: string,
  goals: GoalData[],
  checkins: CheckinRecord[]
): CheckinStatus {
  const empGoals = goals.filter((g) => g.employeeId === employeeId)
  if (empGoals.length === 0) return "pending"
  const done = checkins.filter(
    (c) => c.employeeId === employeeId && c.quarter === quarter
  ).length
  if (done === 0) return "missing"
  if (done >= empGoals.length) return "done"
  return "partial"
}

const STATUS_CONFIG: Record<
  CheckinStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; badge: string }
> = {
  done: {
    icon: CheckCircle2,
    label: "Done",
    badge: "bg-green-100 text-green-700",
  },
  partial: {
    icon: AlertCircle,
    label: "Partial",
    badge: "bg-amber-100 text-amber-700",
  },
  missing: {
    icon: AlertCircle,
    label: "Missing",
    badge: "bg-red-100 text-red-600",
  },
  pending: {
    icon: Minus,
    label: "—",
    badge: "bg-muted text-muted-foreground",
  },
}

function buildModalGoals(
  employee: Employee,
  quarter: string,
  goals: GoalData[],
  checkins: CheckinRecord[]
) {
  const empGoals = goals.filter((g) => g.employeeId === employee.id)
  return empGoals.map((g) => {
    const ach = g.achievements.find((a) => a.quarter === quarter) ?? null
    const existingCheckin = checkins.find(
      (c) => c.goalId === g.id && c.quarter === quarter
    )
    return {
      id: g.id,
      title: g.title,
      uomType: g.uomType,
      targetValue: g.targetValue,
      targetDate: g.targetDate,
      weightage: g.weightage,
      achievement: ach
        ? {
            quarter: ach.quarter,
            actualValue: ach.actualValue,
            actualDate: ach.actualDate,
            progressStatus: ach.progressStatus,
            computedScore: ach.computedScore,
          }
        : null,
      existingCheckin: existingCheckin
        ? { id: existingCheckin.id, comment: existingCheckin.comment }
        : null,
    }
  })
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const

export function CheckinContent({
  employees,
  goals,
  checkins: initialCheckins,
  cycleId,
  currentQuarter,
}: CheckinContentProps) {
  const defaultTab = currentQuarter ?? "Q1"
  const [activeCheckins, setActiveCheckins] = useState(initialCheckins)
  const [modal, setModal] = useState<{
    employee: Employee
    quarter: string
  } | null>(null)

  function handleCheckinSaved(saved: CheckinRecord[]) {
    setActiveCheckins((prev) => {
      const incoming = new Map(saved.map((c) => [`${c.goalId}:${c.quarter}`, c]))
      const merged = prev.map((c) => incoming.get(`${c.goalId}:${c.quarter}`) ?? c)
      const mergedKeys = new Set(merged.map((c) => `${c.goalId}:${c.quarter}`))
      for (const [key, c] of incoming) {
        if (!mergedKeys.has(key)) merged.push(c)
      }
      return merged
    })
  }

  const modalGoals =
    modal
      ? buildModalGoals(modal.employee, modal.quarter, goals, activeCheckins)
      : []

  return (
    <>
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line" className="mb-4">
          {QUARTERS.map((q) => {
            // Count employees with missing check-ins for this quarter
            const missing = employees.filter((e) => {
              const status = getCheckinStatus(e.id, q, goals, activeCheckins)
              return status === "missing"
            }).length
            return (
              <TabsTrigger key={q} value={q} className="relative">
                {q}
                {missing > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {missing}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {QUARTERS.map((quarter) => (
          <TabsContent key={quarter} value={quarter}>
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {quarter} Check-ins
                  {quarter === currentQuarter && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">
                      <Clock className="size-2.5 mr-1" />
                      Current Quarter
                    </span>
                  )}
                </p>
              </div>

              <div className="divide-y">
                {employees.map((emp) => {
                  const status = getCheckinStatus(emp.id, quarter, goals, activeCheckins)
                  const empGoalCount = goals.filter((g) => g.employeeId === emp.id).length
                  const doneCount = activeCheckins.filter(
                    (c) => c.employeeId === emp.id && c.quarter === quarter
                  ).length
                  const cfg = STATUS_CONFIG[status]
                  const Icon = cfg.icon
                  const hasGoals = empGoalCount > 0

                  return (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.department ?? "—"}
                          {hasGoals && (
                            <span className="ml-2">
                              {empGoalCount} goal{empGoalCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                            cfg.badge
                          )}
                        >
                          <Icon className="size-3" />
                          {status === "partial"
                            ? `${doneCount}/${empGoalCount}`
                            : cfg.label}
                        </span>

                        {/* Action button */}
                        {hasGoals ? (
                          <Button
                            size="sm"
                            variant={status === "done" ? "outline" : "default"}
                            className={cn(
                              "h-7 text-xs",
                              status !== "done" &&
                                "bg-orange-500 hover:bg-orange-600 text-white"
                            )}
                            onClick={() => setModal({ employee: emp, quarter })}
                          >
                            {status === "done" ? "View / Edit" : "Conduct Check-in"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No approved goals
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Check-in modal */}
      {modal && (
        <CheckinModal
          open={!!modal}
          onOpenChange={(v) => !v && setModal(null)}
          employee={modal.employee}
          quarter={modal.quarter}
          cycleId={cycleId}
          goals={modalGoals}
          onSaved={handleCheckinSaved}
        />
      )}
    </>
  )
}
