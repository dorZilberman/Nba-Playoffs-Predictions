"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import type { ITeam } from "@/app/lib/models/Team"

interface TeamsContextType {
  teams: ITeam[]
  loading: boolean
  getTeamByName: (name: string) => ITeam | null
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined)

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<ITeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAllTeams = async () => {
      try {
        const res = await fetch("/api/teams")
        if (res.ok) {
          const data = await res.json()
          setTeams(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("Error fetching teams:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllTeams()
  }, [])

  const getTeamByName = (name: string): ITeam | null => {
    return teams.find((team) => team.name === name) || null
  }

  return (
    <TeamsContext.Provider value={{ teams, loading, getTeamByName }}>
      {children}
    </TeamsContext.Provider>
  )
}

export function useTeams() {
  const context = useContext(TeamsContext)
  if (context === undefined) {
    throw new Error("useTeams must be used within a TeamsProvider")
  }
  return context
}
