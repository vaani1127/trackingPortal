import * as XLSX from "xlsx"

export interface ReportRow {
  employeeName: string
  department: string
  thrustArea: string
  title: string
  uomType: string
  targetValue: number | null
  q1Actual: number | null
  q1Score: number | null
  q2Actual: number | null
  q2Score: number | null
  q3Actual: number | null
  q3Score: number | null
  q4Actual: number | null
  q4Score: number | null
  progressStatus: string
}

export function generateAchievementReport(data: ReportRow[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(
    data.map((row) => ({
      Employee: row.employeeName,
      Department: row.department,
      "Thrust Area": row.thrustArea,
      "Goal Title": row.title,
      "UoM Type": row.uomType,
      Target: row.targetValue ?? "—",
      "Q1 Actual": row.q1Actual ?? "—",
      "Q1 Score": row.q1Score !== null ? `${Math.round(row.q1Score)}%` : "—",
      "Q2 Actual": row.q2Actual ?? "—",
      "Q2 Score": row.q2Score !== null ? `${Math.round(row.q2Score)}%` : "—",
      "Q3 Actual": row.q3Actual ?? "—",
      "Q3 Score": row.q3Score !== null ? `${Math.round(row.q3Score)}%` : "—",
      "Q4 Actual": row.q4Actual ?? "—",
      "Q4 Score": row.q4Score !== null ? `${Math.round(row.q4Score)}%` : "—",
      Status: row.progressStatus,
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Achievement Report")
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

export function generateCSV(data: ReportRow[]): string {
  const headers = [
    "Employee", "Department", "Thrust Area", "Goal Title", "UoM Type",
    "Target", "Q1 Actual", "Q1 Score", "Q2 Actual", "Q2 Score",
    "Q3 Actual", "Q3 Score", "Q4 Actual", "Q4 Score", "Status",
  ]
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const rows = data.map((row) => [
    row.employeeName, row.department, row.thrustArea, row.title, row.uomType,
    row.targetValue ?? "",
    row.q1Actual ?? "", row.q1Score !== null ? `${Math.round(row.q1Score)}%` : "",
    row.q2Actual ?? "", row.q2Score !== null ? `${Math.round(row.q2Score)}%` : "",
    row.q3Actual ?? "", row.q3Score !== null ? `${Math.round(row.q3Score)}%` : "",
    row.q4Actual ?? "", row.q4Score !== null ? `${Math.round(row.q4Score)}%` : "",
    row.progressStatus,
  ].map(escape).join(","))
  return [headers.map(escape).join(","), ...rows].join("\n")
}
