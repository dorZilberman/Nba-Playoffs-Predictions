"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function SeedTeamsButton() {
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSeed = async () => {
    setSeeding(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/teams/seed", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Successfully seeded ${data.teams?.length || 0} teams!`)
      } else {
        setMessage(`Error: ${data.error || "Failed to seed teams"}`)
      }
    } catch (error) {
      setMessage("Failed to seed teams")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div>
      <Button onClick={handleSeed} disabled={seeding}>
        {seeding ? "Seeding..." : "Seed Teams Database"}
      </Button>
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.includes("Error") ? "text-destructive" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
