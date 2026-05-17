"use client"

import { cn } from "@/lib/utils"

interface WeightageGaugeProps {
  total: number
  goalCount: number
  maxGoals?: number
  size?: "sm" | "default" | "lg"
  className?: string
}

const SIZE_CONFIG = {
  sm: { dim: 80, r: 30, sw: 6, text: "text-xl", sub: "text-[10px]" },
  default: { dim: 140, r: 52, sw: 10, text: "text-3xl", sub: "text-xs" },
  lg: { dim: 180, r: 68, sw: 12, text: "text-4xl", sub: "text-sm" },
}

export function WeightageGauge({
  total,
  goalCount,
  maxGoals = 8,
  size = "default",
  className,
}: WeightageGaugeProps) {
  const isComplete = Math.abs(total - 100) < 0.01
  const isOver = total > 100
  const clamped = Math.min(Math.max(total, 0), 100)

  const { dim, r, sw, text, sub } = SIZE_CONFIG[size]
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (clamped / 100) * circumference

  const trackColor = "oklch(0.922 0 0)"
  const progressColor = isComplete ? "oklch(0.527 0.154 150.069)" : "oklch(0.577 0.245 27.325)"

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative">
        <svg
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track ring */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={sw}
          />
          {/* Progress ring */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={progressColor}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.7s ease, stroke 0.4s ease" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("font-bold tabular-nums leading-none", text)}
            style={{ color: progressColor }}
          >
            {Math.round(total)}%
          </span>
          {size !== "sm" && (
            <span className={cn("text-muted-foreground mt-0.5", sub)}>
              {isOver ? "over limit" : isComplete ? "complete" : "allocated"}
            </span>
          )}
        </div>
      </div>

      {size !== "sm" && (
        <p className={cn("text-muted-foreground", sub)}>
          {goalCount} of {maxGoals} goals
        </p>
      )}
    </div>
  )
}
