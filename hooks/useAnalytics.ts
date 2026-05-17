"use client"

import { useQuery } from "@tanstack/react-query"

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

type CellStatus = "done" | "partial" | "missing" | "na"

export interface HeatmapData {
  employees: { id: string; name: string; department: string | null }[]
  phases: string[]
  data: Record<string, CellStatus>
}

export interface TrendSeries {
  name: string
  data: (number | null)[]
  isOverall: boolean
}

export interface TrendData {
  quarters: string[]
  departments: string[]
  series: TrendSeries[]
}

export interface DistributionData {
  thrustAreas: { name: string; value: number }[]
  uomTypes: { name: string; value: number }[]
}

export interface ManagerEffectivenessRow {
  managerId: string
  managerName: string
  teamSize: number
  Q1: number
  Q2: number
  Q3: number
  Q4: number
  avgCompletion: number
}

export interface PerformerRow {
  id: string
  name: string
  department: string | null
  managerName: string | null
  avgScore: number
  q1Score: number | null
  q2Score: number | null
}

export interface PerformersData {
  top: PerformerRow[]
  bottom: PerformerRow[]
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchAnalytics<T>(params: URLSearchParams): Promise<T> {
  const res = await fetch(`/api/analytics?${params.toString()}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useHeatmapData(cycleId: string, department?: string) {
  const params = new URLSearchParams({ type: "heatmap", cycleId })
  if (department && department !== "all") params.set("department", department)

  return useQuery<HeatmapData>({
    queryKey: ["analytics", "heatmap", cycleId, department ?? "all"],
    queryFn: () => fetchAnalytics<HeatmapData>(params),
    staleTime: STALE_TIME,
    enabled: !!cycleId,
  })
}

export function useTrendData(cycleId: string) {
  const params = new URLSearchParams({ type: "trends", cycleId })

  return useQuery<TrendData>({
    queryKey: ["analytics", "trends", cycleId],
    queryFn: () => fetchAnalytics<TrendData>(params),
    staleTime: STALE_TIME,
    enabled: !!cycleId,
  })
}

export function useDistributionData(cycleId: string) {
  const params = new URLSearchParams({ type: "distribution", cycleId })

  return useQuery<DistributionData>({
    queryKey: ["analytics", "distribution", cycleId],
    queryFn: () => fetchAnalytics<DistributionData>(params),
    staleTime: STALE_TIME,
    enabled: !!cycleId,
  })
}

export function useManagerEffectiveness(cycleId: string) {
  const params = new URLSearchParams({ type: "manager-effectiveness", cycleId })

  return useQuery<ManagerEffectivenessRow[]>({
    queryKey: ["analytics", "manager-effectiveness", cycleId],
    queryFn: () => fetchAnalytics<ManagerEffectivenessRow[]>(params),
    staleTime: STALE_TIME,
    enabled: !!cycleId,
  })
}

export function usePerformersData(cycleId: string) {
  const params = new URLSearchParams({ type: "performers", cycleId })

  return useQuery<PerformersData>({
    queryKey: ["analytics", "performers", cycleId],
    queryFn: () => fetchAnalytics<PerformersData>(params),
    staleTime: STALE_TIME,
    enabled: !!cycleId,
  })
}
