"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock, ChevronDown, ChevronUp, Pencil, Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WeightageGauge } from "@/components/goals/WeightageGauge"

interface SerializedGoal {
  id: string
  title: string
  thrustArea: string
  description: string | null
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  status: string
  isShared: boolean
  sharedFromId: string | null
  returnComment: string | null
  returnedBy: string | null
  createdAt: string
}

interface GoalsListProps {
  goals: SerializedGoal[]
  totalWeightage: number
  goalCount: number
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  returned: "Returned",
  locked: "Locked",
}

const STATUS_VARIANTS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  submitted: "bg-blue-100 text-blue-700 border-transparent",
  approved: "bg-green-100 text-green-700 border-transparent",
  returned: "bg-amber-100 text-amber-700 border-transparent",
  locked: "bg-slate-100 text-slate-600 border-transparent",
}

const UOM_LABELS: Record<string, string> = {
  min_numeric: "Lower is Better",
  max_numeric: "Higher is Better",
  min_percent: "Lower is Better (%)",
  max_percent: "Higher is Better (%)",
  timeline: "Timeline",
  zero: "Zero-based",
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

function SharedWeightageEdit({
  goalId,
  weightage,
  onUpdated,
}: {
  goalId: string
  weightage: number
  onUpdated: (newWeight: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(weightage))
  const [saving, setSaving] = useState(false)

  async function commit() {
    const n = parseInt(draft, 10)
    if (isNaN(n) || n < 10 || n > 90 || n % 5 !== 0) {
      toast.error("Weightage must be 10–90%, in multiples of 5")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightage: n }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Update failed")
        return
      }
      onUpdated(n)
      toast.success("Weightage updated")
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div
        className="flex items-center gap-1 ml-auto"
        onClick={(e) => e.preventDefault()}
      >
        <input
          type="number"
          value={draft}
          min={10}
          max={90}
          step={5}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          className="w-16 border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-right"
          autoFocus
        />
        <span className="text-xs text-muted-foreground">%</span>
        {saving ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <>
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
          </>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        setDraft(String(weightage))
        setEditing(true)
      }}
      className="group ml-auto flex items-center gap-1 text-sm font-bold text-orange-600 tabular-nums hover:text-orange-700"
      title="Click to adjust your weightage for this shared goal"
    >
      {weightage}%
      <Pencil className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}

function GoalCard({
  goal,
  onWeightageUpdated,
}: {
  goal: SerializedGoal
  onWeightageUpdated: (id: string, w: number) => void
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const isLocked = goal.status === "locked" || goal.status === "approved"
  const isReturned = goal.status === "returned"
  const isSharedCopy = goal.isShared && goal.sharedFromId !== null

  return (
    <Link
      href={`/employee/goals/${goal.id}`}
      className="block rounded-lg border bg-card hover:border-orange-400/60 transition-colors shadow-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-nav]")) {
          e.preventDefault()
        }
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0",
              THRUST_COLORS[goal.thrustArea] ?? "bg-muted text-muted-foreground"
            )}
          >
            {goal.thrustArea}
          </span>
          <h3 className="text-sm font-semibold flex-1">{goal.title}</h3>
          {isLocked && (
            <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
              <Lock className="size-3" />
              {goal.status === "approved" ? "Approved · Locked" : "Locked"}
            </span>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border",
              STATUS_VARIANTS[goal.status] ?? "bg-muted text-muted-foreground"
            )}
          >
            {STATUS_LABELS[goal.status] ?? goal.status}
          </span>
          <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
            {UOM_LABELS[goal.uomType] ?? goal.uomType}
          </span>
          {goal.targetValue !== null && (
            <span className="text-xs text-muted-foreground">
              Target: {goal.targetValue}
            </span>
          )}
          {goal.targetDate && (
            <span className="text-xs text-muted-foreground">
              By: {new Date(goal.targetDate).toLocaleDateString()}
            </span>
          )}
          {isSharedCopy && (
            <span className="text-xs text-blue-600 font-medium border border-blue-200 rounded-full px-2 py-0.5">
              Shared
            </span>
          )}

          {/* Weightage — editable for shared copies, static otherwise */}
          {isSharedCopy ? (
            <div data-no-nav className="ml-auto">
              <SharedWeightageEdit
                goalId={goal.id}
                weightage={goal.weightage}
                onUpdated={(w) => onWeightageUpdated(goal.id, w)}
              />
            </div>
          ) : (
            <span className="ml-auto text-sm font-bold text-orange-600 tabular-nums">
              {goal.weightage}%
            </span>
          )}
        </div>

        {/* Shared goal hint */}
        {isSharedCopy && (
          <p className="text-[11px] text-muted-foreground italic">
            Title and target set by admin/manager · You can adjust your weightage above
          </p>
        )}

        {/* Returned: show manager notes */}
        {isReturned && (
          <div data-no-nav>
            <button
              type="button"
              onClick={() => setNotesOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium"
            >
              {notesOpen ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              View Manager Notes
            </button>
            {notesOpen && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                {goal.returnComment ? (
                  <>
                    {goal.returnedBy && (
                      <p className="font-semibold mb-1">{goal.returnedBy} wrote:</p>
                    )}
                    <p className="leading-relaxed">{goal.returnComment}</p>
                  </>
                ) : (
                  <p className="italic">No feedback comment recorded.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

export function GoalsList({ goals: initialGoals, totalWeightage: initialTotal, goalCount }: GoalsListProps) {
  const [goals, setGoals] = useState(initialGoals)

  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0)

  function handleWeightageUpdated(id: string, w: number) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, weightage: w } : g)))
  }

  const filterGoals = (status: string) =>
    status === "all" ? goals : goals.filter((g) => g.status === status)

  const counts = {
    all: goals.length,
    draft: goals.filter((g) => g.status === "draft").length,
    submitted: goals.filter((g) => g.status === "submitted").length,
    approved: goals.filter((g) => g.status === "approved").length,
    returned: goals.filter((g) => g.status === "returned").length,
    locked: goals.filter((g) => g.status === "locked").length,
  }

  const tabs = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Approved" },
    { value: "returned", label: "Returned" },
    { value: "locked", label: "Locked" },
  ].filter((t) => t.value === "all" || counts[t.value as keyof typeof counts] > 0)

  return (
    <div className="space-y-4">
      {/* Weightage summary */}
      <div className="flex items-center gap-6 rounded-lg border bg-card p-4">
        <WeightageGauge
          total={totalWeightage}
          goalCount={goalCount}
          maxGoals={8}
          size="sm"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {goalCount} goals · {totalWeightage}% allocated
          </p>
          <p
            className={cn(
              "text-xs",
              Math.abs(totalWeightage - 100) < 0.01
                ? "text-green-600"
                : totalWeightage > 100
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {Math.abs(totalWeightage - 100) < 0.01
              ? "Weightage balanced — ready to submit"
              : totalWeightage > 100
              ? `Over limit by ${totalWeightage - 100}%`
              : `${100 - totalWeightage}% remaining to allocate`}
          </p>
        </div>
      </div>

      <Separator />

      {/* Filter tabs + goal cards */}
      <Tabs defaultValue="all">
        <TabsList variant="line" className="mb-4 flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} ({counts[t.value as keyof typeof counts]})
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="space-y-3">
              {filterGoals(tab.value).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No {tab.value === "all" ? "" : tab.value} goals.
                </p>
              ) : (
                filterGoals(tab.value).map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onWeightageUpdated={handleWeightageUpdated}
                  />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
