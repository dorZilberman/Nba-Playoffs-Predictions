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
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { ITeam } from "@/app/lib/models/Team"

interface AdminPlayInModalProps {
  game: IPlayInGame | Partial<IPlayInGame>
  isOpen: boolean
  onClose: () => void
  onSave: (game: Partial<IPlayInGame> & { gameType: string }) => Promise<void>
}

export function AdminPlayInModal({
  game,
  isOpen,
  onClose,
  onSave,
}: AdminPlayInModalProps) {
  const [teams, setTeams] = useState<ITeam[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
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

  const [formData, setFormData] = useState({
    gameType: (game as IPlayInGame)?.gameType || "east-7-8",
    team1: (game as IPlayInGame)?.team1 || "none",
    team2: (game as IPlayInGame)?.team2 || "none",
    startTime: (game as IPlayInGame)?.startTime
      ? utcToLocalDateTime((game as IPlayInGame).startTime)
      : "",
    winner: (game as IPlayInGame)?.winner || "none",
  })
  const [saving, setSaving] = useState(false)

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
    if (isOpen) {
      fetchTeams()
    }
  }, [isOpen, fetchTeams])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        gameType: (game as IPlayInGame)?.gameType || "east-7-8",
        team1: (game as IPlayInGame)?.team1 || "none",
        team2: (game as IPlayInGame)?.team2 || "none",
        startTime: (game as IPlayInGame)?.startTime
          ? utcToLocalDateTime((game as IPlayInGame).startTime)
          : "",
        winner: (game as IPlayInGame)?.winner || "none",
      })
    }
  }, [isOpen, game])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await onSave({
        gameType: formData.gameType,
        team1: formData.team1 === "none" ? "" : formData.team1,
        team2: formData.team2 === "none" ? "" : formData.team2,
        startTime: new Date(formData.startTime).toISOString(),
        winner: formData.winner === "none" ? undefined : formData.winner,
      })
    } catch (error) {
      console.error("Error saving game:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Play-In Game</DialogTitle>
          <DialogDescription>
            Update teams, winner, and deadline for this Play-In game
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Game Type */}
          <div className="space-y-2">
            <Label htmlFor="gameType">Game Type</Label>
            <Select
              value={formData.gameType}
              onValueChange={(value) => setFormData({ ...formData, gameType: value })}
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

          {/* Teams */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team1">Team 1</Label>
              {loadingTeams ? (
                <Input disabled value="Loading teams..." />
              ) : (
                <Select
                  value={formData.team1}
                  onValueChange={(value) => setFormData({ ...formData, team1: value })}
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
                  value={formData.team2}
                  onValueChange={(value) => setFormData({ ...formData, team2: value })}
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

          {/* Start Time (Deadline) */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Game Start Time (Prediction Deadline)</Label>
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

          {/* Winner */}
          <div className="space-y-2">
            <Label htmlFor="winner">Winner (Optional)</Label>
            <Select
              value={formData.winner || "none"}
              onValueChange={(value) => setFormData({ ...formData, winner: value === "none" ? "" : value })}
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
