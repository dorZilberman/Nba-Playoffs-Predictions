"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function SeedTeamsButton() {
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSeed = async () => {
    if (
      !window.confirm(
        "This removes all existing team documents and inserts the 30 NBA teams from the app seed. Continue?"
      )
    ) {
      return
    }
    setSeeding(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/teams/seed", { method: "POST" })
      const data = (await res.json()) as {
        message?: string
        insertedCount?: number
        error?: string
      }
      if (res.ok) {
        const n = data.insertedCount ?? 0
        setMessage(data.message ?? `Successfully loaded ${n} teams.`)
      } else {
        setMessage(`Error: ${data.error ?? "Failed to seed teams"}`)
      }
    } catch {
      setMessage("Failed to seed teams")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Button onClick={handleSeed} disabled={seeding} variant="secondary">
        {seeding ? "Loading…" : "Load 30 teams into database"}
      </Button>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.startsWith("Error") ? "text-destructive" : "text-green-600 dark:text-green-500"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
