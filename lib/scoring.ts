/**
 * UoM-aware goal achievement scoring.
 * Returns a 0–100 score (or null if inputs are insufficient).
 */
export function computeScore(
  uomType: string,
  target: number | null,
  actual: number | null,
  targetDate?: Date | string | null,
  actualDate?: Date | string | null
): number | null {
  if (uomType === "zero") {
    if (actual === null) return null
    return actual === 0 ? 100 : 0
  }

  if (uomType === "timeline") {
    if (!targetDate || !actualDate) return null
    const td = new Date(targetDate)
    const ad = new Date(actualDate)
    if (ad <= td) return 100
    const daysLate = Math.round((ad.getTime() - td.getTime()) / 86_400_000)
    return Math.max(0, 100 - daysLate * 5)
  }

  if (target === null || target === 0 || actual === null) return null

  if (uomType === "min_numeric" || uomType === "min_percent") {
    // Lower is Better: achieved if actual <= target
    if (actual <= target) return 100
    return Math.max(0, (target / actual) * 100)
  }

  if (uomType === "max_numeric" || uomType === "max_percent") {
    // Higher is Better: score = actual/target × 100, capped at 100
    return Math.min(100, Math.max(0, (actual / target) * 100))
  }

  return null
}

/** Human-readable score tier */
export function scoreTier(score: number | null): "green" | "yellow" | "red" | "none" {
  if (score === null) return "none"
  if (score >= 80) return "green"
  if (score >= 50) return "yellow"
  return "red"
}

export function scoreTierLabel(score: number | null): string {
  const t = scoreTier(score)
  if (t === "green") return "On Track"
  if (t === "yellow") return "Needs Attention"
  if (t === "red") return "At Risk"
  return "Not Started"
}

export function scoreToColor(score: number | null): string {
  const t = scoreTier(score)
  if (t === "green") return "text-green-600"
  if (t === "yellow") return "text-amber-600"
  if (t === "red") return "text-red-600"
  return "text-muted-foreground"
}
