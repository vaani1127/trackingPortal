"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldOff,
  Percent,
  Check,
  Loader2,
  AlertTriangle,
  Lock,
} from "lucide-react"

import { GoalFormSchema, type GoalFormValues } from "@/lib/validations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { WeightageGauge } from "@/components/goals/WeightageGauge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

// ─── Constants ───────────────────────────────────────────────────────────────

const THRUST_AREAS = [
  "Sales",
  "Operations",
  "Quality",
  "Safety",
  "People",
  "Finance",
  "Technology",
  "Customer",
]

const UOM_OPTIONS = [
  {
    value: "max_numeric" as const,
    label: "Higher is Better",
    subtitle: "Numeric",
    tooltip: "e.g., Sales Revenue, Units Sold",
    icon: TrendingUp,
  },
  {
    value: "min_numeric" as const,
    label: "Lower is Better",
    subtitle: "Numeric",
    tooltip: "e.g., TAT, Cost per Unit",
    icon: TrendingDown,
  },
  {
    value: "max_percent" as const,
    label: "Higher is Better",
    subtitle: "Percentage (%)",
    tooltip: "e.g., Customer satisfaction %, Utilisation %",
    icon: Percent,
  },
  {
    value: "min_percent" as const,
    label: "Lower is Better",
    subtitle: "Percentage (%)",
    tooltip: "e.g., Defect rate %, Attrition %",
    icon: Percent,
  },
  {
    value: "timeline" as const,
    label: "Timeline",
    subtitle: "Date-based",
    tooltip: "e.g., Project completion, Launch date",
    icon: CalendarIcon,
  },
  {
    value: "zero" as const,
    label: "Zero-based",
    subtitle: "Minimize to zero",
    tooltip: "e.g., Safety incidents, Customer complaints",
    icon: ShieldOff,
  },
]

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  returned: "bg-amber-100 text-amber-700",
  locked: "bg-slate-100 text-slate-700",
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExistingGoal {
  id: string
  title: string
  thrustArea: string
  weightage: number
  status: string
  uomType: string
}

interface GoalCreateFormProps {
  cycleId: string
  cycleName: string
  existingGoals: ExistingGoal[]
  windowOpen: boolean
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Goal Details" },
    { n: 2, label: "Review & Weight" },
    { n: 3, label: "Confirm & Submit" },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors",
                current === s.n
                  ? "bg-orange-500 border-orange-500 text-white"
                  : current > s.n
                  ? "bg-orange-500/10 border-orange-500 text-orange-600"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {current > s.n ? <Check className="size-4" /> : s.n}
            </div>
            <span
              className={cn(
                "mt-1 text-xs font-medium hidden sm:block",
                current === s.n ? "text-orange-600" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 flex-1 mx-2 -mt-5 transition-colors",
                current > s.n ? "bg-orange-500" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── UoM radio card ───────────────────────────────────────────────────────────

function UomCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof UOM_OPTIONS)[0]
  selected: boolean
  onSelect: () => void
}) {
  const Icon = option.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col gap-1 rounded-lg border-2 p-3 text-left transition-all hover:border-orange-400",
        selected
          ? "border-orange-500 bg-orange-500/5"
          : "border-border bg-background"
      )}
      aria-pressed={selected}
    >
      {selected && (
        <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-orange-500">
          <Check className="size-2.5 text-white" />
        </span>
      )}
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-4 flex-shrink-0",
            selected ? "text-orange-500" : "text-muted-foreground"
          )}
        />
        <span className="text-sm font-semibold">{option.label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{option.subtitle}</span>
      <span className="text-xs text-muted-foreground/70">{option.tooltip}</span>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GoalCreateForm({
  cycleId,
  cycleName,
  existingGoals,
  windowOpen,
}: GoalCreateFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(GoalFormSchema),
    defaultValues: {
      thrustArea: "",
      title: "",
      description: "",
      uomType: undefined,
      targetValue: undefined,
      targetDate: undefined,
      unitLabel: "",
      weightage: 10,
    },
  })

  const watchedUom = form.watch("uomType")
  const watchedWeightage = form.watch("weightage") ?? 0
  const watchedTitle = form.watch("title")

  const showTargetValue = ["min_numeric", "max_numeric", "min_percent", "max_percent"].includes(watchedUom ?? "")
  const showTargetDate = watchedUom === "timeline"
  const isPercentUom = watchedUom === "min_percent" || watchedUom === "max_percent"
  const showUnitLabel = !isPercentUom && (watchedUom === "min_numeric" || watchedUom === "max_numeric")

  const existingTotal = existingGoals.reduce((s, g) => s + g.weightage, 0)
  const totalWithNew = existingTotal + (watchedWeightage || 0)
  const isWeightageExact = Math.abs(totalWithNew - 100) < 0.01

  // ── Step 1 → 2 ─────────────────────────────────────────────────────────────

  async function handleNextToReview() {
    const fieldsToValidate: (keyof GoalFormValues)[] = [
      "thrustArea",
      "title",
      "description",
      "uomType",
      "weightage",
    ]
    if (showTargetValue) fieldsToValidate.push("targetValue")
    if (showTargetDate) fieldsToValidate.push("targetDate")

    const valid = await form.trigger(fieldsToValidate)
    if (valid) setStep(2)
  }

  // ── Save draft ──────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    const values = form.getValues()
    setIsLoading(true)
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thrustArea: values.thrustArea,
          title: values.title,
          description: values.description || undefined,
          uomType: values.uomType,
          targetValue: values.targetValue,
          targetDate: values.targetDate?.toISOString(),
          weightage: values.weightage,
          cycleId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to save goal")
        return
      }

      toast.success("Goal saved as draft")
      router.push("/employee/goals")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  // ── Submit for approval ─────────────────────────────────────────────────────

  async function handleSubmitForApproval() {
    const values = form.getValues()
    setIsLoading(true)
    try {
      // Step 1: create the goal
      const createRes = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thrustArea: values.thrustArea,
          title: values.title,
          description: values.description || undefined,
          uomType: values.uomType,
          targetValue: values.targetValue,
          targetDate: values.targetDate?.toISOString(),
          weightage: values.weightage,
          cycleId,
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        toast.error(err.error ?? "Failed to create goal")
        return
      }

      const createdGoal = await createRes.json()

      // Step 2: submit all goals
      const submitRes = await fetch(`/api/goals/${createdGoal.id}/submit`, {
        method: "POST",
      })

      if (!submitRes.ok) {
        const err = await submitRes.json()
        toast.error(err.error ?? "Failed to submit goals")
        return
      }

      toast.success("Goals submitted for manager approval")
      router.push("/employee/goals")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const uomLabel =
    UOM_OPTIONS.find((o) => o.value === watchedUom)?.label ?? "—"

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Goal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{cycleName}</p>
      </div>

      {!windowOpen && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 mb-6 text-sm text-amber-800">
          <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
          <span>
            The goal setting window is currently closed. You can still save a
            draft, but submission requires the window to be open.
          </span>
        </div>
      )}

      <StepIndicator current={step} />

      <Form {...form}>
        {/* ═══════════════════════════════ STEP 1 ════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Goal Details</h2>

            {/* Thrust Area */}
            <FormField
              control={form.control}
              name="thrustArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thrust Area</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Select a thrust area" />
                      </SelectTrigger>
                      <SelectContent>
                        {THRUST_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Increase monthly sales revenue"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {field.value?.length ?? 0}/100
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the goal, context, or success criteria…"
                      maxLength={500}
                      className="resize-none min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {field.value?.length ?? 0}/500
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <Separator />

            {/* UoM Type */}
            <FormField
              control={form.control}
              name="uomType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measurement</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {UOM_OPTIONS.map((opt) => (
                        <UomCard
                          key={opt.value}
                          option={opt}
                          selected={field.value === opt.value}
                          onSelect={() => {
                            field.onChange(opt.value)
                            form.resetField("targetValue")
                            form.resetField("targetDate")
                          }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Value (numeric / percent UoM) */}
            {showTargetValue && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Target Value{isPercentUom ? " (%)" : ""}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={isPercentUom ? 100 : undefined}
                            step={isPercentUom ? 1 : "any"}
                            placeholder={isPercentUom ? "e.g., 90" : "e.g., 1000"}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            className={isPercentUom ? "pr-8" : undefined}
                          />
                          {isPercentUom && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                              %
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showUnitLabel && (
                  <FormField
                    control={form.control}
                    name="unitLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Label</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., ₹ Lakhs, Days"
                            maxLength={20}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Target Date (timeline UoM) */}
            {showTargetDate && (
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                      >
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !field.value && "text-muted-foreground"
                              )}
                            />
                          }
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value
                            ? format(field.value, "PPP")
                            : "Pick a target date"}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date)
                              setCalendarOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

            {/* Weightage */}
            <FormField
              control={form.control}
              name="weightage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weightage (%)</FormLabel>
                  <FormDescription>
                    How much this goal contributes to your overall score.
                    Must be between 10% and 90%, in multiples of 5.
                  </FormDescription>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={10}
                        max={90}
                        step={5}
                        className="w-28"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                      />
                      <div className="flex gap-1 flex-wrap">
                        {[10, 15, 20, 25, 30, 35, 40].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => field.onChange(v)}
                            className={cn(
                              "h-7 px-2.5 rounded-md text-xs font-medium border transition-colors",
                              field.value === v
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "border-border bg-background hover:border-orange-400"
                            )}
                          >
                            {v}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {typeof watchedWeightage === "number" && (
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isWeightageExact
                          ? "text-green-600"
                          : totalWithNew > 100
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      Existing goals: {existingTotal}% + this goal:{" "}
                      {watchedWeightage}% = {totalWithNew}%
                      {totalWithNew > 100 && " — over limit"}
                      {isWeightageExact && " ✓"}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button onClick={handleNextToReview} className="gap-2">
                Next: Review & Weight
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ STEP 2 ════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold">Review & Weightage</h2>

            {/* Gauge */}
            <div className="flex flex-col items-center py-4">
              <WeightageGauge
                total={totalWithNew}
                goalCount={existingGoals.length + 1}
                maxGoals={8}
                size="lg"
              />
            </div>

            {/* Warning banners */}
            {totalWithNew > 100 && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                <span>
                  Total weightage is {totalWithNew}% — exceeds 100% by{" "}
                  {totalWithNew - 100}%. Reduce this goal&apos;s weightage or
                  reduce another goal first.
                </span>
              </div>
            )}
            {totalWithNew < 100 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                <span>
                  Total weightage is {totalWithNew}% — {100 - totalWithNew}%
                  short. You can submit only when total equals 100%.
                </span>
              </div>
            )}
            {isWeightageExact && (
              <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
                <Check className="size-4 mt-0.5 flex-shrink-0" />
                <span>
                  Total weightage is exactly 100%. Ready to submit.
                </span>
              </div>
            )}

            <Separator />

            {/* Existing goals */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Existing Goals
              </h3>
              {existingGoals.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No existing goals for this cycle.
                </p>
              )}
              {existingGoals.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5"
                >
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      THRUST_COLORS[g.thrustArea] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {g.thrustArea}
                  </span>
                  <span className="flex-1 text-sm truncate">{g.title}</span>
                  <span className="text-sm font-semibold tabular-nums w-12 text-right">
                    {g.weightage}%
                  </span>
                </div>
              ))}
            </div>

            {/* New goal preview */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                New Goal (this submission)
              </h3>
              <div className="flex items-center gap-3 rounded-lg border-2 border-orange-400 bg-orange-500/5 px-4 py-2.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    THRUST_COLORS[form.watch("thrustArea")] ??
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {form.watch("thrustArea") || "—"}
                </span>
                <span className="flex-1 text-sm truncate">
                  {watchedTitle || "Untitled goal"}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {uomLabel}
                </Badge>
                <span className="text-sm font-semibold tabular-nums w-12 text-right text-orange-600">
                  {watchedWeightage}%
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!isWeightageExact}
                className="gap-2"
              >
                Next: Confirm
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ STEP 3 ════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Confirm & Submit</h2>

            {/* Read-only summary */}
            <div className="rounded-lg border bg-card divide-y">
              <SummaryRow
                label="Thrust Area"
                value={form.watch("thrustArea")}
              />
              <SummaryRow label="Goal Title" value={watchedTitle} />
              {form.watch("description") && (
                <SummaryRow
                  label="Description"
                  value={form.watch("description")}
                />
              )}
              <SummaryRow label="Unit of Measurement" value={uomLabel} />
              {showTargetValue && (
                <SummaryRow
                  label="Target Value"
                  value={
                    form.watch("targetValue") !== undefined
                      ? `${form.watch("targetValue")}${form.watch("unitLabel") ? " " + form.watch("unitLabel") : ""}`
                      : "—"
                  }
                />
              )}
              {showTargetDate && (
                <SummaryRow
                  label="Target Date"
                  value={
                    form.watch("targetDate")
                      ? format(form.watch("targetDate")!, "PPP")
                      : "—"
                  }
                />
              )}
              <SummaryRow
                label="Weightage"
                value={`${watchedWeightage}%`}
                highlight
              />
              <SummaryRow
                label="Total after submission"
                value={`${totalWithNew}% of 100%`}
                highlight={isWeightageExact}
              />
            </div>

            {!isWeightageExact && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                <span>
                  Cannot submit — total weightage is {totalWithNew}%, not 100%.
                  Go back and adjust.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="gap-2 sm:mr-auto"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmitForApproval}
                disabled={isLoading || !isWeightageExact || !windowOpen}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Target className="size-4" />
                )}
                Submit for Approval
              </Button>
            </div>
            {!windowOpen && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="size-3" />
                Submission disabled — goal setting window is closed.
              </p>
            )}
          </div>
        )}
      </Form>
    </div>
  )
}

// ─── Summary row helper ───────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value?: string | null
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground w-40 flex-shrink-0">
        {label}
      </span>
      <span
        className={cn(
          "text-sm flex-1",
          highlight && "font-semibold text-orange-600"
        )}
      >
        {value || "—"}
      </span>
    </div>
  )
}
