"use client"

import { useState, useTransition, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Search, Pencil, Check, X, Loader2, Upload } from "lucide-react"
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

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  managerId: string | null
  createdAt: string
  manager: { id: string; name: string } | null
  _count: { goals: number }
}

interface Manager {
  id: string
  name: string
  role: string
}

interface UsersTableProps {
  users: UserRow[]
  managers: Manager[]
  departments: string[]
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const AddUserSchema = z.object({
  name: z.string().min(1, "Required").max(100),
  email: z.string().email("Invalid email"),
  role: z.enum(["employee", "manager", "admin"] as const),
  department: z.string().max(100).optional(),
  managerId: z.string().optional(),
  password: z.string().min(6, "Min 6 characters").optional(),
})

type AddUserValues = z.infer<typeof AddUserSchema>

const ROLE_BADGE: Record<string, string> = {
  employee: "bg-blue-100 text-blue-700",
  manager: "bg-purple-100 text-purple-700",
  admin: "bg-orange-100 text-orange-700",
}

// ─── Inline edit cell ─────────────────────────────────────────────────────────

function EditableSelect({
  value,
  options,
  onSave,
  renderLabel,
}: {
  value: string | null
  options: { value: string; label: string }[]
  onSave: (v: string | null) => void
  renderLabel?: (v: string | null) => React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Select value={draft} onValueChange={(v) => setDraft(v ?? "")}>
          <SelectTrigger size="sm" className="w-36 h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— None —</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => { onSave(draft || null); setEditing(false) }}
          className="text-green-600 hover:text-green-700"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-muted-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value ?? ""); setEditing(true) }}
      className="group flex items-center gap-1 hover:text-foreground"
    >
      {renderLabel ? renderLabel(value) : <span className="text-sm">{value ?? "—"}</span>}
      <Pencil className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsersTable({ users: initial, managers, departments }: UsersTableProps) {
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [deptFilter, setDeptFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [csvPending, startCsvTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<AddUserValues>({
    resolver: zodResolver(AddUserSchema),
    defaultValues: { name: "", email: "", role: "employee", department: "", password: "" },
  })

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false
    if (deptFilter !== "all" && u.department !== deptFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function patchUser(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const e = await res.json()
      toast.error(e.error ?? "Update failed")
      return false
    }
    const updated: UserRow = await res.json()
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...updated, createdAt: u.createdAt } : u)))
    return true
  }

  async function handleAddUser(values: AddUserValues) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, managerId: values.managerId || undefined }),
    })
    if (!res.ok) {
      const e = await res.json()
      toast.error(e.error ?? "Failed to add user")
      return
    }
    const created: UserRow = await res.json()
    setUsers((prev) => [...prev, { ...created, createdAt: created.createdAt, manager: null, _count: { goals: 0 } }].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`${created.name} added`)
    setAddOpen(false)
    form.reset()
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split("\n").filter(Boolean)
      if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return }
      const [header, ...rows] = lines
      const cols = header.split(",").map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase())
      const nameIdx = cols.indexOf("name")
      const emailIdx = cols.indexOf("email")
      const roleIdx = cols.indexOf("role")
      const deptIdx = cols.indexOf("department")
      if (nameIdx < 0 || emailIdx < 0) { toast.error("CSV must have Name and Email columns"); return }

      const users = rows.map((row) => {
        const cells = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        return {
          name: cells[nameIdx] ?? "",
          email: cells[emailIdx] ?? "",
          role: (cells[roleIdx] ?? "employee") as "employee" | "manager" | "admin",
          department: deptIdx >= 0 ? cells[deptIdx] : undefined,
        }
      }).filter((u) => u.name && u.email)

      startCsvTransition(async () => {
        let ok = 0
        for (const u of users) {
          const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          })
          if (res.ok) { const created = await res.json(); setUsers((prev) => [...prev, { ...created, manager: null, _count: { goals: 0 } }]); ok++ }
        }
        toast.success(`${ok}/${users.length} users imported`)
        if (fileRef.current) fileRef.current.value = ""
      })
    }
    reader.readAsText(file)
  }

  const managerOptions = managers.map((m) => ({ value: m.id, label: m.name }))
  const roleOptions = [
    { value: "employee", label: "Employee" },
    { value: "manager", label: "Manager" },
    { value: "admin", label: "Admin" },
  ]

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={(v) => v && setDeptFilter(v)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          <Button
            variant="outline"
            size="sm"
            disabled={csvPending}
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            {csvPending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="size-3.5" />
            Add User
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Department</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">Manager</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</td></tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="px-3 py-3">
                    <EditableSelect
                      value={u.role}
                      options={roleOptions}
                      onSave={(v) => v && patchUser(u.id, { role: v })}
                      renderLabel={(v) => (
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", ROLE_BADGE[v ?? "employee"] ?? "bg-muted text-muted-foreground")}>
                          {v}
                        </span>
                      )}
                    />
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {u.department ?? "—"}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <EditableSelect
                      value={u.managerId}
                      options={managerOptions}
                      onSave={(v) => patchUser(u.id, { managerId: v })}
                      renderLabel={(v) => (
                        <span className="text-xs text-muted-foreground">
                          {managers.find((m) => m.id === v)?.name ?? "—"}
                        </span>
                      )}
                    />
                  </td>
                  <td className="text-center px-3 py-3 tabular-nums text-muted-foreground">
                    {u._count.goals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@atomberg.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl><Input placeholder="e.g., Sales" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="managerId" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Manager</FormLabel>
                    <FormControl>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— None —</SelectItem>
                          {managers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Temporary Password <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input type="password" placeholder="Auto-generated if blank" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter showCloseButton>
                <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Add User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
