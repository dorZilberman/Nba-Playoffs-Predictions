"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AdminUserRow = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  hasPayed: boolean
  createdAt: string | null
}

type SortBy = "createdAt" | "name" | "email"

function createdAtMs(u: AdminUserRow): number {
  if (u.createdAt == null) return Number.NEGATIVE_INFINITY
  const t = new Date(u.createdAt).getTime()
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}

export function AdminUsersPayment() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("createdAt")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load users")
      const data = (await res.json()) as AdminUserRow[]
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      setError("Could not load users.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const displayedUsers = useMemo(() => {
    const copy = [...users]
    const cmp = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    if (sortBy === "createdAt") {
      copy.sort((a, b) => createdAtMs(b) - createdAtMs(a))
    } else if (sortBy === "name") {
      copy.sort((a, b) => cmp(a.name, b.name))
    } else {
      copy.sort((a, b) => cmp(a.email, b.email))
    }
    return copy
  }, [users, sortBy])

  const setHasPayed = async (id: string, hasPayed: boolean) => {
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasPayed }),
        cache: "no-store",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Update failed")
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, hasPayed: body.hasPayed } : u))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed")
      await load()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription className="space-y-1">
          {loading ? (
            <span className="block font-medium text-foreground">
              Loading user list…
            </span>
          ) : (
            <span className="block font-medium text-foreground">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          )}
          <span className="block">
            Mark users who have paid. New accounts default to{" "}
            <span className="font-medium text-foreground">Has paid: off</span>.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="admin-users-sort" className="text-sm whitespace-nowrap">
              Sort by
            </Label>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortBy)}
              disabled={loading || users.length === 0}
            >
              <SelectTrigger id="admin-users-sort" className="w-[min(100%,220px)]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Joined (newest first)</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="email">Email (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-end sm:self-auto"
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Admin</TableHead>
                <TableHead className="w-[140px]">Has paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.isAdmin ? "Yes" : "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <input
                        id={`hasPayed-${u.id}`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={u.hasPayed}
                        disabled={savingId === u.id}
                        onChange={(e) => setHasPayed(u.id, e.target.checked)}
                      />
                      <Label
                        htmlFor={`hasPayed-${u.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {savingId === u.id ? "Saving…" : u.hasPayed ? "Yes" : "No"}
                      </Label>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
