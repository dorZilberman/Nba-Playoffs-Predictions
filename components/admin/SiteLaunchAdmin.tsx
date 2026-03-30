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

export function SiteLaunchAdmin() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [local, setLocal] = useState("")
  const [savedIso, setSavedIso] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/season", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load season")
      const season = await res.json()
      const raw = season.siteLaunchTime
      const d =
        raw != null && String(raw).trim() !== ""
          ? new Date(raw as string)
          : null
      const iso =
        d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
      setSavedIso(iso)
      setLocal(iso ? toDatetimeLocalValue(iso) : "")
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
      let siteLaunchTime: string | null
      if (local.trim() === "") {
        siteLaunchTime = null
      } else {
        const d = new Date(local)
        if (Number.isNaN(d.getTime())) {
          setError("Invalid site launch date.")
          setSaving(false)
          return
        }
        siteLaunchTime = d.toISOString()
      }

      const res = await fetch("/api/admin/season", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteLaunchTime }),
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
        <CardTitle>Site launch</CardTitle>
        <CardDescription>
          Until this time, signed-in users who are not admins only see the launch
          countdown (and can open Rules). Clear the field and save to disable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="site-launch">Launch time (local)</Label>
              <input
                id="site-launch"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save launch time"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
