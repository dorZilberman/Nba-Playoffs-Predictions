"use client"

import { useState, useEffect, useCallback } from "react"
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
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { ITeam } from "@/app/lib/models/Team"

interface PlayInManagerProps {
  seasonId: string
}

export function PlayInManager({ seasonId }: PlayInManagerProps) {
  const [games, setGames] = useState<IPlayInGame[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<IPlayInGame | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/admin/playin")
      const data = await res.json()
      setGames(data)
    } catch (error) {
      console.error("Error fetching Play-In games:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this game?")) return

    try {
      const res = await fetch(`/api/admin/playin/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchGames()
      }
    } catch (error) {
      console.error("Error deleting game:", error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Play-In Games</CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Game
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <PlayInForm
            seasonId={seasonId}
            game={editing}
            onSuccess={() => {
              setShowForm(false)
              setEditing(null)
              fetchGames()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        )}
        <div className="mt-4 space-y-2">
          {games.map((g) => (
            <div
              key={g._id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  <TeamDisplay teamName={g.team1} size="sm" />
                  <span>vs</span>
                  <TeamDisplay teamName={g.team2} size="sm" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {g.gameType} - {formatToIST(g.startTime)} - {g.status}
                </div>
                {g.winner && (
                  <div className="text-sm font-medium flex items-center gap-2">
                    Winner: <TeamDisplay teamName={g.winner} size="sm" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(g)
                    setShowForm(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(g._id)}
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

function PlayInForm({
  seasonId,
  game,
  onSuccess,
  onCancel,
}: {
  seasonId: string
  game?: IPlayInGame | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [teams, setTeams] = useState<ITeam[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [formData, setFormData] = useState({
    gameType: game?.gameType || "east-7-8",
    team1: game?.team1 || "none",
    team2: game?.team2 || "none",
    startTime: game?.startTime
      ? new Date(game.startTime).toISOString().slice(0, 16)
      : "",
    winner: game?.winner || "none",
    status: game?.status || "upcoming",
  })

  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true)
    try {
      // Determine conference from gameType
      let conference: string | null = null
      if (formData.gameType.startsWith("east")) conference = "east"
      else if (formData.gameType.startsWith("west")) conference = "west"
      
      const url = conference ? `/api/teams?conference=${conference}` : "/api/teams"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTeams(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoadingTeams(false)
    }
  }, [formData.gameType])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  // Reset form when game changes
  useEffect(() => {
    if (game) {
      setFormData({
        gameType: game.gameType || "east-7-8",
        team1: game.team1 || "none",
        team2: game.team2 || "none",
        startTime: game.startTime
          ? new Date(game.startTime).toISOString().slice(0, 16)
          : "",
        winner: game.winner || "none",
        status: game.status || "upcoming",
      })
    } else {
      setFormData({
        gameType: "east-7-8",
        team1: "none",
        team2: "none",
        startTime: "",
        winner: "none",
        status: "upcoming",
      })
    }
  }, [game])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      seasonId,
      gameType: formData.gameType,
      team1: formData.team1,
      team2: formData.team2,
      startTime: new Date(formData.startTime).toISOString(),
      winner: formData.winner || undefined,
      status: formData.status,
    }

    try {
      const url = game ? `/api/admin/playin/${game._id}` : "/api/admin/playin"
      const method = game ? "PUT" : "POST"

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
      console.error("Error saving game:", error)
      alert("Failed to save game")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border p-4">
      <div>
        <label className="text-sm font-medium">Game Type</label>
        <Select
          value={formData.gameType}
          onValueChange={(value) =>
            setFormData({ ...formData, gameType: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="east-7-8">East 7-8</SelectItem>
            <SelectItem value="east-9-10">East 9-10</SelectItem>
            <SelectItem value="west-7-8">West 7-8</SelectItem>
            <SelectItem value="west-9-10">West 9-10</SelectItem>
            <SelectItem value="east-final">East Final</SelectItem>
            <SelectItem value="west-final">West Final</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Team 1</label>
          {loadingTeams ? (
            <Input disabled value="Loading teams..." />
          ) : (
            <Select
              value={formData.team1}
              onValueChange={(value) =>
                setFormData({ ...formData, team1: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team 1" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team.name}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Team 2</label>
          {loadingTeams ? (
            <Input disabled value="Loading teams..." />
          ) : (
            <Select
              value={formData.team2}
              onValueChange={(value) =>
                setFormData({ ...formData, team2: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team 2" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team.name}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
      <div>
        <label className="text-sm font-medium">Winner (optional)</label>
        {loadingTeams ? (
          <Input disabled value="Loading teams..." />
        ) : (
          <Select
            value={formData.winner}
            onValueChange={(value) =>
              setFormData({ ...formData, winner: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select winner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team._id} value={team.name}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit">{game ? "Update" : "Create"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
