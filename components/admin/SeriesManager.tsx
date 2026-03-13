"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Edit, Trash2 } from "lucide-react"
import { formatToIST } from "@/app/lib/utils/timezone"
import type { ISeries } from "@/app/lib/models/Series"

interface SeriesManagerProps {
  seasonId: string
}

export function SeriesManager({ seasonId }: SeriesManagerProps) {
  const [series, setSeries] = useState<ISeries[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ISeries | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const res = await fetch("/api/admin/series")
      const data = await res.json()
      setSeries(data)
    } catch (error) {
      console.error("Error fetching series:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this series?")) return

    try {
      const res = await fetch(`/api/admin/series/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchSeries()
      }
    } catch (error) {
      console.error("Error deleting series:", error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Playoff Series</CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Series
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <SeriesForm
            seasonId={seasonId}
            series={editing}
            onSuccess={() => {
              setShowForm(false)
              setEditing(null)
              fetchSeries()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        )}
        <div className="mt-4 space-y-2">
          {series.map((s) => (
            <div
              key={s._id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div className="flex-1">
                <div className="font-semibold">
                  {s.team1} vs {s.team2}
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.round} {s.conference && `(${s.conference})`} -{" "}
                  {formatToIST(s.startTime)} - {s.status}
                </div>
                {s.currentScore && (
                  <div className="text-sm">
                    Score: {s.currentScore.team1Wins} -{" "}
                    {s.currentScore.team2Wins}
                  </div>
                )}
                {s.winner && (
                  <div className="text-sm font-medium">Winner: {s.winner}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(s)
                    setShowForm(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(s._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SeriesForm({
  seasonId,
  series,
  onSuccess,
  onCancel,
}: {
  seasonId: string
  series?: ISeries | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    round: series?.round || "first",
    conference: series?.conference || "none",
    team1: series?.team1 || "",
    team2: series?.team2 || "",
    team1Seed: series?.team1Seed || undefined,
    team2Seed: series?.team2Seed || undefined,
    startTime: series?.startTime
      ? new Date(series.startTime).toISOString().slice(0, 16)
      : "",
    team1Wins: series?.currentScore?.team1Wins || 0,
    team2Wins: series?.currentScore?.team2Wins || 0,
    winner: series?.winner || "none",
    status: series?.status || "upcoming",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      seasonId,
      round: formData.round,
      conference: formData.conference === "none" ? null : formData.conference,
      team1: formData.team1,
      team2: formData.team2,
      team1Seed: formData.team1Seed || undefined,
      team2Seed: formData.team2Seed || undefined,
      startTime: new Date(formData.startTime).toISOString(),
      currentScore: {
        team1Wins: formData.team1Wins,
        team2Wins: formData.team2Wins,
      },
      winner: formData.winner === "none" ? undefined : formData.winner,
      status: formData.status,
    }

    try {
      const url = series
        ? `/api/admin/series/${series._id}`
        : "/api/admin/series"
      const method = series ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving series:", error)
      alert("Failed to save series")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Round</label>
          <Select
            value={formData.round}
            onValueChange={(value) =>
              setFormData({ ...formData, round: value as any })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First Round</SelectItem>
              <SelectItem value="second">Second Round</SelectItem>
              <SelectItem value="conference">Conference Finals</SelectItem>
              <SelectItem value="finals">Finals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Conference</label>
          <Select
            value={formData.conference}
            onValueChange={(value) =>
              setFormData({ ...formData, conference: value === "none" ? "none" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select conference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="east">East</SelectItem>
              <SelectItem value="west">West</SelectItem>
              <SelectItem value="none">Finals (no conference)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Team 1</label>
          <Input
            value={formData.team1}
            onChange={(e) =>
              setFormData({ ...formData, team1: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Team 2</label>
          <Input
            value={formData.team2}
            onChange={(e) =>
              setFormData({ ...formData, team2: e.target.value })
            }
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Team 1 Seed (1-8)</label>
          <Input
            type="number"
            min="1"
            max="8"
            value={formData.team1Seed || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                team1Seed: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Team 2 Seed (1-8)</label>
          <Input
            type="number"
            min="1"
            max="8"
            value={formData.team2Seed || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                team2Seed: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Start Time (UTC)</label>
        <Input
          type="datetime-local"
          value={formData.startTime}
          onChange={(e) =>
            setFormData({ ...formData, startTime: e.target.value })
          }
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Team 1 Wins</label>
          <Input
            type="number"
            min="0"
            max="4"
            value={formData.team1Wins}
            onChange={(e) =>
              setFormData({ ...formData, team1Wins: parseInt(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Team 2 Wins</label>
          <Input
            type="number"
            min="0"
            max="4"
            value={formData.team2Wins}
            onChange={(e) =>
              setFormData({ ...formData, team2Wins: parseInt(e.target.value) })
            }
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Winner (optional)</label>
        <Input
          value={formData.winner}
          onChange={(e) =>
            setFormData({ ...formData, winner: e.target.value })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit">{series ? "Update" : "Create"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
