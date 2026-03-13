"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatToIST } from "@/app/lib/utils/timezone"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import type { ISeries } from "@/app/lib/models/Series"
import type { ITeam } from "@/app/lib/models/Team"

interface AdminSeriesModalProps {
  series: ISeries | Partial<ISeries>
  isOpen: boolean
  onClose: () => void
  onSave: (series: Partial<ISeries> & { round: string; conference: string | null }) => Promise<void>
}

export function AdminSeriesModal({
  series,
  isOpen,
  onClose,
  onSave,
}: AdminSeriesModalProps) {
  // Helper function to convert UTC date to local datetime-local format
  const utcToLocalDateTime = (utcDate: Date | string): string => {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate
    // Get local time components
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [teams, setTeams] = useState<ITeam[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [formData, setFormData] = useState({
    team1: series.team1 || "",
    team2: series.team2 || "",
    team1Seed: series.team1Seed || undefined,
    team2Seed: series.team2Seed || undefined,
    startTime: series.startTime
      ? utcToLocalDateTime(series.startTime)
      : "",
    team1Wins: series.currentScore?.team1Wins || 0,
    team2Wins: series.currentScore?.team2Wins || 0,
    winner: series.winner || "",
  })
  const [saving, setSaving] = useState(false)

  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true)
    try {
      // Determine which conference teams to show
      let conference: string | null = null
      if (series.round !== "finals") {
        conference = series.conference || null
      }
      
      const url = conference
        ? `/api/teams?conference=${conference}`
        : "/api/teams"
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
  }, [series.conference, series.round])

  useEffect(() => {
    if (isOpen) {
      fetchTeams()
    }
  }, [isOpen, fetchTeams])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        team1: series.team1 || "",
        team2: series.team2 || "",
        team1Seed: series.team1Seed || undefined,
        team2Seed: series.team2Seed || undefined,
        startTime: series.startTime
          ? utcToLocalDateTime(series.startTime)
          : "",
        team1Wins: series.currentScore?.team1Wins || 0,
        team2Wins: series.currentScore?.team2Wins || 0,
        winner: series.winner || "",
      })
    }
  }, [isOpen, series])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await onSave({
        round: series.round || "first",
        conference: series.conference || null,
        team1: formData.team1,
        team2: formData.team2,
        team1Seed: formData.team1Seed,
        team2Seed: formData.team2Seed,
        startTime: new Date(formData.startTime).toISOString(),
        currentScore: {
          team1Wins: formData.team1Wins,
          team2Wins: formData.team2Wins,
        },
        winner: formData.winner || undefined,
      })
    } catch (error) {
      console.error("Error saving series:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Series - {series.round.charAt(0).toUpperCase() + series.round.slice(1)} Round
            {series.conference && ` - ${series.conference.toUpperCase()}`}
          </DialogTitle>
          <DialogDescription>
            Update teams, scores, and deadline for this series
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Round and Conference Info (Read-only) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Round</Label>
              <Input value={series.round} disabled />
            </div>
            <div>
              <Label>Conference</Label>
              <Input value={series.conference || "Finals"} disabled />
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team1">Team 1</Label>
              {loadingTeams ? (
                <Input disabled value="Loading teams..." />
              ) : (
                <Select
                  value={formData.team1 || "none"}
                  onValueChange={(value) => {
                    const selectedTeam = teams.find((t) => t.name === value)
                    setFormData({
                      ...formData,
                      team1: value === "none" ? "" : value,
                      team1Seed: selectedTeam?.seed,
                    })
                  }}
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
            <div className="space-y-2">
              <Label htmlFor="team2">Team 2</Label>
              {loadingTeams ? (
                <Input disabled value="Loading teams..." />
              ) : (
                <Select
                  value={formData.team2 || "none"}
                  onValueChange={(value) => {
                    const selectedTeam = teams.find((t) => t.name === value)
                    setFormData({
                      ...formData,
                      team2: value === "none" ? "" : value,
                      team2Seed: selectedTeam?.seed,
                    })
                  }}
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

          {/* Seeds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team1Seed">Team 1 Seed</Label>
              <Input
                id="team1Seed"
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
                placeholder="1-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team2Seed">Team 2 Seed</Label>
              <Input
                id="team2Seed"
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
                placeholder="1-8"
              />
            </div>
          </div>

          {/* Start Time (Deadline) */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Series Start Time (Prediction Deadline)</Label>
            <Input
              id="startTime"
              type="datetime-local"
              min="2026-04-01T00:00"
              max="2026-08-01T23:59"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
            {formData.startTime && (
              <p className="text-xs text-muted-foreground">
                IST: {formatToIST(new Date(formData.startTime))}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Deadline must be between April 1, 2026 and August 1, 2026
            </p>
          </div>

          {/* Current Score */}
          <div className="space-y-2">
            <Label>Current Series Score</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team1Wins" className="text-xs text-muted-foreground">
                  {formData.team1} Wins
                </Label>
                <Input
                  id="team1Wins"
                  type="number"
                  min="0"
                  max="4"
                  value={formData.team1Wins}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      team1Wins: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="team2Wins" className="text-xs text-muted-foreground">
                  {formData.team2} Wins
                </Label>
                <Input
                  id="team2Wins"
                  type="number"
                  min="0"
                  max="4"
                  value={formData.team2Wins}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      team2Wins: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Winner */}
          <div className="space-y-2">
            <Label htmlFor="winner">Winner (Optional)</Label>
            <Select
              value={formData.winner || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, winner: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select winner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {formData.team1 && formData.team1 !== "none" && (
                  <SelectItem value={formData.team1}>{formData.team1}</SelectItem>
                )}
                {formData.team2 && formData.team2 !== "none" && (
                  <SelectItem value={formData.team2}>{formData.team2}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
