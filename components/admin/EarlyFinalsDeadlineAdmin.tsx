"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminCollapsibleCard } from "@/components/admin/AdminCollapsibleCard"
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

  const [playoffsLocal, setPlayoffsLocal] = useState("")
  const [playoffsSavedIso, setPlayoffsSavedIso] = useState<string | null>(null)

  const [playInLocal, setPlayInLocal] = useState("")
  const [playInSavedIso, setPlayInSavedIso] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/season", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load season")
      const season = await res.json()
      for (const [raw, setIso, setLocal] of [
        [season.playoffsStartTime, setPlayoffsSavedIso, setPlayoffsLocal] as const,
        [season.playInStartTime, setPlayInSavedIso, setPlayInLocal] as const,
      ]) {
        const d =
          raw != null && String(raw).trim() !== ""
            ? new Date(raw as string)
            : null
        const iso =
          d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
        setIso(iso)
        setLocal(iso ? toDatetimeLocalValue(iso) : "")
      }
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
      const payload: Record<string, string | null> = {}

      if (playoffsLocal.trim() === "") {
        payload.playoffsStartTime = null
      } else {
        const d = new Date(playoffsLocal)
        if (Number.isNaN(d.getTime())) {
          setError("Invalid playoffs start date.")
          setSaving(false)
          return
        }
        payload.playoffsStartTime = d.toISOString()
      }

      if (playInLocal.trim() === "") {
        payload.playInStartTime = null
      } else {
        const d = new Date(playInLocal)
        if (Number.isNaN(d.getTime())) {
          setError("Invalid play-in start date.")
          setSaving(false)
          return
        }
        payload.playInStartTime = d.toISOString()
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
    <AdminCollapsibleCard
      title="Season timing"
      description={
        <>
          Playoffs start locks Early Finals picks and opens the What-if page at
          that instant. Play-in start opens the Analytics page at that instant.
          Clear a field and save to remove that gate until you set a new time.
        </>
      }
      contentClassName="space-y-6 max-w-md"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
            <div className="space-y-2">
              <Label htmlFor="playoffs-start">Playoffs start (lock + What-if)</Label>
              <input
                id="playoffs-start"
                type="datetime-local"
                step={60}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={playoffsLocal}
                onChange={(e) => setPlayoffsLocal(e.target.value)}
              />
              {playoffsSavedIso && (
                <p className="text-xs text-muted-foreground">
                  Saved: {new Date(playoffsSavedIso).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="playin-start">Play-in start (Analytics)</Label>
              <input
                id="playin-start"
                type="datetime-local"
                step={60}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={playInLocal}
                onChange={(e) => setPlayInLocal(e.target.value)}
              />
              {playInSavedIso && (
                <p className="text-xs text-muted-foreground">
                  Saved: {new Date(playInSavedIso).toLocaleString()}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save times"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setPlayoffsLocal("")
                  setPlayInLocal("")
                }}
              >
                Clear both fields
              </Button>
            </div>
          </>
        )}
    </AdminCollapsibleCard>
  )
}
