"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { Plus, CalendarIcon, Loader2, Archive, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CycleRow {
  id: string
  name: string
  status: string
  phase1Opens: string
  q1Opens: string
  q2Opens: string
  q3Opens: string
  q4Opens: string
  createdAt: string
  goalCount: number
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    phase1Opens: z.date(),
    q1Opens: z.date(),
    q2Opens: z.date(),
    q3Opens: z.date(),
    q4Opens: z.date(),
  })
  .superRefine((d, ctx) => {
    if (d.q1Opens <= d.phase1Opens)
      ctx.addIssue({ code: "custom", message: "Q1 must be after Phase 1", path: ["q1Opens"] })
    if (d.q2Opens <= d.q1Opens)
      ctx.addIssue({ code: "custom", message: "Q2 must be after Q1", path: ["q2Opens"] })
    if (d.q3Opens <= d.q2Opens)
      ctx.addIssue({ code: "custom", message: "Q3 must be after Q2", path: ["q3Opens"] })
    if (d.q4Opens <= d.q3Opens)
      ctx.addIssue({ code: "custom", message: "Q4 must be after Q3", path: ["q4Opens"] })
  })

type FormValues = z.infer<typeof schema>

// ─── Date field picker ────────────────────────────────────────────────────────

function DateField({
  label,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  label: string
  value: Date | undefined
  onChange: (d: Date) => void
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-9",
                !value && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(value, "dd MMM yyyy") : "Pick date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) { onChange(d); onOpenChange(false) }
            }}
          />
        </PopoverContent>
      </Popover>
    </FormItem>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CycleManager({ cycles: initial }: { cycles: CycleRow[] }) {
  const [cycles, setCycles] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeCalendar, setActiveCalendar] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })

  function openCal(field: string) { setActiveCalendar(field) }
  function closeCal() { setActiveCalendar(null) }

  async function onCreate(values: FormValues) {
    const res = await fetch("/api/admin/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const e = await res.json()
      toast.error(e.error ?? "Failed to create cycle")
      return
    }
    const created = await res.json()
    setCycles((prev) => [{ ...created, goalCount: 0, phase1Opens: created.phase1Opens, q1Opens: created.q1Opens, q2Opens: created.q2Opens, q3Opens: created.q3Opens, q4Opens: created.q4Opens, createdAt: created.createdAt }, ...prev])
    toast.success("Cycle created")
    setDialogOpen(false)
    form.reset()
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      })
      if (!res.ok) { toast.error("Failed to archive cycle"); return }
      setCycles((prev) => prev.map((c) => c.id === id ? { ...c, status: "archived" } : c))
      toast.success("Cycle archived")
    })
  }

  function handleActivate(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      if (!res.ok) { toast.error("Failed to activate cycle"); return }
      setCycles((prev) => prev.map((c) => c.id === id ? { ...c, status: "active" } : c))
      toast.success("Cycle activated")
    })
  }

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="size-4" />
          Create New Cycle
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Phase 1</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">Q1</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">Q2</th>
              <th className="text-center px-3 py-3 font-medium text-muted-foreground">Goals</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {cycles.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                  No cycles yet.
                </td>
              </tr>
            )}
            {cycles.map((c) => (
              <tr key={c.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="text-center px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      c.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {c.status === "active" && <CheckCircle2 className="size-2.5 mr-1" />}
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {format(new Date(c.phase1Opens), "d MMM yyyy")}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                  {format(new Date(c.q1Opens), "d MMM yyyy")}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                  {format(new Date(c.q2Opens), "d MMM yyyy")}
                </td>
                <td className="text-center px-3 py-3 tabular-nums">{c.goalCount}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {c.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleArchive(c.id)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Archive className="size-3" />
                        Archive
                      </Button>
                    ) : c.status === "archived" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleActivate(c.id)}
                        className="gap-1 h-7 text-xs"
                      >
                        Reactivate
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Performance Cycle</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cycle Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., FY 2026-27" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(["phase1Opens", "q1Opens", "q2Opens", "q3Opens", "q4Opens"] as const).map((fname) => {
                const labels: Record<string, string> = {
                  phase1Opens: "Phase 1 Opens (Goal Setting)",
                  q1Opens: "Q1 Opens",
                  q2Opens: "Q2 Opens",
                  q3Opens: "Q3 Opens",
                  q4Opens: "Q4 Opens",
                }
                return (
                  <FormField
                    key={fname}
                    control={form.control}
                    name={fname}
                    render={({ field }) => (
                      <>
                        <DateField
                          label={labels[fname]}
                          value={field.value as Date | undefined}
                          onChange={field.onChange}
                          open={activeCalendar === fname}
                          onOpenChange={(v) => v ? openCal(fname) : closeCal()}
                        />
                        <FormMessage />
                      </>
                    )}
                  />
                )
              })}

              <DialogFooter showCloseButton>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Create Cycle
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
