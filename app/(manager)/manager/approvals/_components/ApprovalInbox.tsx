"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface GoalRow {
  id: string
  employeeId: string
  thrustArea: string
  title: string
  description: string | null
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  status: string
}

interface EmployeeEntry {
  id: string
  name: string
  department: string | null
  goals: GoalRow[]
}

interface ApprovalInboxProps {
  employees: EmployeeEntry[]
  cycleId: string
}

const UOM_LABELS: Record<string, string> = {
  min_numeric: "↓ Lower better",
  max_numeric: "↑ Higher better",
  min_percent: "↓ Lower better (%)",
  max_percent: "↑ Higher better (%)",
  timeline: "📅 Timeline",
  zero: "◎ Zero-based",
}

const THRUST_COLORS: Record<string, string> = {
  Sales: "bg-blue-100 text-blue-700",
  Operations: "bg-purple-100 text-purple-700",
  Quality: "bg-teal-100 text-teal-700",
  Safety: "bg-red-100 text-red-700",
  People: "bg-pink-100 text-pink-700",
  Finance: "bg-amber-100 text-amber-700",
  Technology: "bg-indigo-100 text-indigo-700",
  Customer: "bg-orange-100 text-orange-700",
}

function ReturnDialog({
  open,
  onOpenChange,
  goalTitle,
  onConfirm,
  saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  goalTitle: string
  onConfirm: (comment: string) => void
  saving: boolean
}) {
  const [comment, setComment] = useState("")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return for Rework</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{goalTitle}</p>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Feedback <span className="text-muted-foreground">(required)</span>
          </label>
          <Textarea
            placeholder="Explain what needs to change…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none min-h-24"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
        </div>
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={saving || !comment.trim()}
            onClick={() => onConfirm(comment.trim())}
            className="gap-2"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Return Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InlineEditField({
  label,
  value,
  type,
  onSave,
}: {
  label: string
  value: number | null
  type: "number"
  onSave: (val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ""))

  function commit() {
    const n = parseFloat(draft)
    if (!isNaN(n)) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          className="w-20 border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
          autoFocus
        />
        <button
          type="button"
          onClick={commit}
          className="text-green-600 hover:text-green-700"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value ?? ""))
        setEditing(true)
      }}
      className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <span className="font-medium text-foreground">{value ?? "—"}</span>
      <span className="text-muted-foreground">{label}</span>
      <Pencil className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}

export function ApprovalInbox({ employees, cycleId }: ApprovalInboxProps) {
  const [selectedId, setSelectedId] = useState<string>(employees[0]?.id ?? "")
  const [localEmployees, setLocalEmployees] = useState(employees)
  const [returnTarget, setReturnTarget] = useState<GoalRow | null>(null)
  const [returning, startReturn] = useTransition()
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const [approvingAll, startApproveAll] = useTransition()

  const selected = localEmployees.find((e) => e.id === selectedId)

  function removeGoal(goalId: string) {
    setLocalEmployees((prev) =>
      prev
        .map((e) => ({ ...e, goals: e.goals.filter((g) => g.id !== goalId) }))
        .filter((e) => e.goals.length > 0)
    )
  }

  function updateGoalField(goalId: string, field: "targetValue" | "weightage", value: number) {
    setLocalEmployees((prev) =>
      prev.map((e) => ({
        ...e,
        goals: e.goals.map((g) => (g.id === goalId ? { ...g, [field]: value } : g)),
      }))
    )
  }

  async function handlePatch(goalId: string, field: "targetValue" | "weightage", value: number) {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Update failed")
      return
    }
    updateGoalField(goalId, field, value)
    toast.success("Goal updated")
  }

  async function handleApprove(goal: GoalRow) {
    setApprovingIds((prev) => new Set(prev).add(goal.id))
    try {
      const res = await fetch(`/api/goals/${goal.id}/approve`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Approval failed")
        return
      }
      toast.success(`"${goal.title}" approved`)
      removeGoal(goal.id)
      const emp = localEmployees.find((e) => e.id === selectedId)
      if (emp && emp.goals.filter((g) => g.id !== goal.id).length === 0) {
        const remaining = localEmployees.filter((e) => e.id !== selectedId)
        setSelectedId(remaining[0]?.id ?? "")
      }
    } finally {
      setApprovingIds((prev) => { const n = new Set(prev); n.delete(goal.id); return n })
    }
  }

  function handleReturn(comment: string) {
    if (!returnTarget) return
    const goalId = returnTarget.id
    const title = returnTarget.title
    startReturn(async () => {
      const res = await fetch(`/api/goals/${goalId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Return failed")
        return
      }
      toast.success(`"${title}" returned for rework`)
      setReturnTarget(null)
      removeGoal(goalId)
      const emp = localEmployees.find((e) => e.id === selectedId)
      if (emp && emp.goals.filter((g) => g.id !== goalId).length === 0) {
        const remaining = localEmployees.filter((e) => e.id !== selectedId)
        setSelectedId(remaining[0]?.id ?? "")
      }
    })
  }

  function handleApproveAll() {
    if (!selected) return
    const goals = selected.goals
    startApproveAll(async () => {
      const results = await Promise.allSettled(
        goals.map((g) => fetch(`/api/goals/${g.id}/approve`, { method: "POST" }))
      )
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length
      if (failed > 0) {
        toast.error(`${failed} goal(s) failed to approve`)
      } else {
        toast.success(`All goals approved for ${selected.name}`)
      }
      // Remove successfully approved goals (network success + HTTP 2xx)
      const succeededIds = goals
        .filter((_, i) => {
          const r = results[i]
          return r.status === "fulfilled" && r.value.ok
        })
        .map((g) => g.id)
      setLocalEmployees((prev) => {
        const updated = prev
          .map((e) => ({
            ...e,
            goals: e.goals.filter((g) => !succeededIds.includes(g.id)),
          }))
          .filter((e) => e.goals.length > 0)
        const remaining = updated.filter((e) => e.id !== selectedId)
        if (!updated.find((e) => e.id === selectedId)) {
          setSelectedId(remaining[0]?.id ?? "")
        }
        return updated
      })
    })
  }

  if (localEmployees.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <CheckCircle2 className="size-8 text-green-500 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">All submissions reviewed. Inbox clear!</p>
      </div>
    )
  }

  return (
    <div className="flex gap-0 rounded-lg border bg-card overflow-hidden min-h-[520px]">
      {/* Left panel — employee list */}
      <div className="w-64 flex-shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pending Submissions
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto divide-y">
          {localEmployees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setSelectedId(emp.id)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors",
                selectedId === emp.id && "bg-orange-50 border-r-2 border-orange-500"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium truncate", selectedId === emp.id && "text-orange-700")}>
                  {emp.name}
                </p>
                {emp.department && (
                  <p className="text-xs text-muted-foreground truncate">{emp.department}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {emp.goals.length}
                </span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Right panel — goal sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Panel header */}
            <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.goals.length} goal{selected.goals.length !== 1 ? "s" : ""} pending review
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {approvingAll ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Approve All
              </Button>
            </div>

            {/* Goals */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.goals.map((goal) => (
                <div key={goal.id} className="rounded-lg border bg-background p-4 space-y-3">
                  {/* Goal header */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0",
                        THRUST_COLORS[goal.thrustArea] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {goal.thrustArea}
                    </span>
                    <p className="text-sm font-semibold flex-1">{goal.title}</p>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Metadata row */}
                  <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                    <span className="border rounded-full px-2 py-0.5">
                      {UOM_LABELS[goal.uomType] ?? goal.uomType}
                    </span>

                    {/* Inline-editable target value */}
                    {goal.uomType !== "timeline" && goal.uomType !== "zero" && (
                      <InlineEditField
                        label="target"
                        value={goal.targetValue}
                        type="number"
                        onSave={(v) => handlePatch(goal.id, "targetValue", v)}
                      />
                    )}

                    {/* Inline-editable weightage */}
                    <InlineEditField
                      label="% weight"
                      value={goal.weightage}
                      type="number"
                      onSave={(v) => handlePatch(goal.id, "weightage", v)}
                    />

                    {goal.targetDate && (
                      <span>
                        By:{" "}
                        {new Date(goal.targetDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(goal)}
                      disabled={approvingIds.has(goal.id)}
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                    >
                      {approvingIds.has(goal.id) ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReturnTarget(goal)}
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                    >
                      <XCircle className="size-3.5" />
                      Return
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select an employee to review their goals.
          </div>
        )}
      </div>

      {/* Return dialog */}
      <ReturnDialog
        open={!!returnTarget}
        onOpenChange={(v) => !v && setReturnTarget(null)}
        goalTitle={returnTarget?.title ?? ""}
        onConfirm={handleReturn}
        saving={returning}
      />
    </div>
  )
}
