"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Users, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Copy {
  id: string
  weightage: number
  status: string
  employee: { name: string; department: string | null }
}

interface Template {
  id: string
  title: string
  thrustArea: string
  uomType: string
  targetValue: number | null
  weightage: number
  status: string
  cycle: { name: string }
  sharedCopies: Copy[]
}

interface Employee {
  id: string
  name: string
  department: string | null
}

interface SharedGoalsManagerProps {
  templates: Template[]
  employees: Employee[]
  departments: string[]
  cycles: { id: string; name: string }[]
  defaultCycleId: string
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  thrustArea: z.string().min(1, "Required"),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  uomType: z.enum(
    ["min_numeric", "max_numeric", "min_percent", "max_percent", "timeline", "zero"] as const
  ),
  targetValue: z.number().positive().optional().nullable(),
  defaultWeightage: z
    .number()
    .min(5)
    .max(90)
    .refine((n) => n % 5 === 0, "Multiple of 5%"),
  cycleId: z.string().uuid(),
})

type FormValues = z.infer<typeof schema>

const THRUST_AREAS = [
  "Sales", "Operations", "Quality", "Safety",
  "People", "Finance", "Technology", "Customer",
]

const UOM_OPTIONS = [
  { value: "min_numeric", label: "Lower is Better (Numeric)" },
  { value: "max_numeric", label: "Higher is Better (Numeric)" },
  { value: "min_percent", label: "Lower is Better (%)" },
  { value: "max_percent", label: "Higher is Better (%)" },
  { value: "timeline", label: "Timeline" },
  { value: "zero", label: "Zero-based" },
]

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

// ─── Recipient selector ───────────────────────────────────────────────────────

function RecipientSelector({
  employees,
  departments,
  selected,
  onToggle,
}: {
  employees: Employee[]
  departments: string[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const [deptFilter, setDeptFilter] = useState<string>("all")

  const filtered = employees.filter(
    (e) => deptFilter === "all" || e.department === deptFilter
  )

  function toggleDept(dept: string) {
    const ids = employees.filter((e) => e.department === dept).map((e) => e.id)
    const allSelected = ids.every((id) => selected.has(id))
    ids.forEach((id) => {
      if (allSelected ? selected.has(id) : !selected.has(id)) onToggle(id)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Recipients{" "}
          <span className="text-muted-foreground text-xs">
            ({selected.size} selected)
          </span>
        </label>
        <Select value={deptFilter} onValueChange={(v) => v && setDeptFilter(v)}>
          <SelectTrigger size="sm" className="w-36 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dept bulk-select buttons */}
      {deptFilter === "all" && departments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {departments.map((dept) => {
            const deptEmployees = employees.filter((e) => e.department === dept)
            const allSel = deptEmployees.every((e) => selected.has(e.id))
            return (
              <button
                key={dept}
                type="button"
                onClick={() => toggleDept(dept)}
                className={cn(
                  "text-[10px] font-semibold rounded-full px-2 py-0.5 border transition-colors",
                  allSel
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-border text-muted-foreground hover:border-orange-300"
                )}
              >
                {dept} ({deptEmployees.length})
              </button>
            )
          })}
        </div>
      )}

      <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
        {filtered.map((emp) => (
          <label
            key={emp.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(emp.id)}
              onChange={() => onToggle(emp.id)}
              className="rounded border-input accent-orange-500"
            />
            <span className="flex-1 text-sm">{emp.name}</span>
            {emp.department && (
              <span className="text-xs text-muted-foreground">{emp.department}</span>
            )}
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-4 text-sm text-muted-foreground">No employees found.</p>
        )}
      </div>
    </div>
  )
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ t }: { t: Template }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", THRUST_COLORS[t.thrustArea] ?? "bg-muted text-muted-foreground")}>
              {t.thrustArea}
            </span>
            <span className="text-xs text-muted-foreground">{t.cycle.name}</span>
          </div>
          <p className="text-sm font-semibold">{t.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.uomType} · Target: {t.targetValue ?? "—"} · Default: {t.weightage}% weight
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Users className="size-3" />
          {t.sharedCopies.length}
        </span>
      </div>

      {t.sharedCopies.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? "Hide" : "Show"} recipients
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {t.sharedCopies.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{c.employee.name}{c.employee.department && ` · ${c.employee.department}`}</span>
                  <span className="tabular-nums">{c.weightage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SharedGoalsManager({
  templates: initial,
  employees,
  departments,
  cycles,
  defaultCycleId,
}: SharedGoalsManagerProps) {
  const [templates, setTemplates] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      thrustArea: "",
      title: "",
      description: "",
      uomType: "min_numeric",
      targetValue: undefined,
      defaultWeightage: 20,
      cycleId: defaultCycleId,
    },
  })

  const watchedUomType = form.watch("uomType")
  const needsTarget = !["timeline", "zero"].includes(watchedUomType)

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function onSubmit(values: FormValues) {
    if (selectedRecipients.size === 0) {
      toast.error("Select at least one recipient")
      return
    }
    const res = await fetch("/api/admin/shared-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, recipientIds: [...selectedRecipients] }),
    })
    if (!res.ok) {
      const e = await res.json()
      toast.error(e.error ?? "Failed to push shared goal")
      return
    }
    const { copies } = await res.json()
    toast.success(`Shared goal pushed to ${copies} employee${copies !== 1 ? "s" : ""}`)
    setDialogOpen(false)
    form.reset()
    setSelectedRecipients(new Set())
    // Refresh page for updated list
    window.location.reload()
  }

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="size-4" />
          Push Shared Goal
        </Button>
      </div>

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No shared goals yet. Push a departmental KPI to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => <TemplateCard key={t.id} t={t} />)}
        </div>
      )}

      {/* Push dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Push Shared Goal / Departmental KPI</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="cycleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cycle</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="thrustArea" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thrust Area</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select area" /></SelectTrigger>
                        <SelectContent>
                          {THRUST_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>KPI Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Monthly Revenue Target" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Textarea placeholder="Context for recipients…" className="resize-none min-h-16" maxLength={500} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="uomType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measurement</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UOM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {needsTarget && (
                  <FormField control={form.control} name="targetValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="defaultWeightage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Weightage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={90}
                        step={5}
                        value={field.value !== undefined ? String(field.value) : ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <RecipientSelector
                employees={employees}
                departments={departments}
                selected={selectedRecipients}
                onToggle={toggleRecipient}
              />

              <DialogFooter showCloseButton>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || selectedRecipients.size === 0}
                  className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Push to {selectedRecipients.size} Recipient{selectedRecipients.size !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
