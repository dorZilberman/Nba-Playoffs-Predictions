"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EarlyFinalsDeadlineAdmin() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localValue, setLocalValue] = useState("")
  const [savedIso, setSavedIso] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/season", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load season")
      const season = await res.json()
      const raw = season.earlyFinalsLockTime
      const d =
        raw != null && String(raw).trim() !== ""
          ? new Date(raw as string)
          : null
      const iso =
        d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
      setSavedIso(iso)
      setLocalValue(iso ? toDatetimeLocalValue(iso) : "")
    } catch {
      setError("Could not load season.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload =
        localValue.trim() === ""
          ? { earlyFinalsLockTime: null }
          : { earlyFinalsLockTime: new Date(localValue).toISOString() }

      if (localValue.trim() !== "" && Number.isNaN(new Date(localValue).getTime())) {
        setError("Invalid date.")
        setSaving(false)
        return
      }

      const res = await fetch("/api/admin/season", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Save failed")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Early Finals Predictions</CardTitle>
        <CardDescription>
          Set when picks for Early Finals Predictions lock (East / West finalist
          and NBA champion). Clearing the field removes the deadline until you
          save a new one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="early-finals-lock">Lock deadline (local time)</Label>
              <input
                id="early-finals-lock"
                type="datetime-local"
                step={60}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
              />
            </div>
            {savedIso && (
              <p className="text-xs text-muted-foreground">
                Saved: {new Date(savedIso).toLocaleString()}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save deadline"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setLocalValue("")
                }}
              >
                Clear field
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
