"use client"

import { useState, useEffect } from "react"
import type { ITeam } from "@/app/lib/models/Team"

interface TeamDisplayProps {
  teamName: string
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}

export function TeamDisplay({
  teamName,
  size = "md",
  showName = true,
  className = "",
}: TeamDisplayProps) {
  const [team, setTeam] = useState<ITeam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (teamName && teamName !== "TBD") {
      fetchTeam()
    } else {
      setLoading(false)
    }
  }, [teamName])

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/teams?name=${encodeURIComponent(teamName)}`)
      if (res.ok) {
        const teams = await res.json()
        const foundTeam = Array.isArray(teams) ? teams.find((t: ITeam) => t.name === teamName) : null
        setTeam(foundTeam || null)
      }
    } catch (error) {
      console.error("Error fetching team:", error)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: { logo: "w-4 h-4", text: "text-[10px] md:text-xs" },
    md: { logo: "w-5 h-5 md:w-6 md:h-6", text: "text-sm" },
    lg: { logo: "w-10 h-10", text: "text-base" },
  }

  const currentSize = sizeClasses[size]

  if (teamName === "TBD" || !teamName) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${currentSize.logo} rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0`}
        >
          ?
        </div>
        {showName && <span className={currentSize.text}>TBD</span>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${currentSize.logo} rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0`}
        >
          {teamName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()}
        </div>
        {showName && <span className={currentSize.text}>{teamName}</span>}
      </div>
    )
  }

  // Check if className includes justify-center to determine if we should center content
  const shouldCenter = className.includes('justify-center')
  
  return (
    <div className={`flex items-center gap-1 ${className} min-w-0 ${showName && !shouldCenter ? 'w-full' : ''}`}>
      {team?.logoUrl ? (
        <div className={`${currentSize.logo} relative shrink-0`}>
          <img
            src={team.logoUrl}
            alt={teamName}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = "none"
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">${teamName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}</div>`
              }
            }}
          />
        </div>
      ) : (
        <div
          className={`${currentSize.logo} rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0`}
        >
          {teamName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()}
        </div>
      )}
      {showName && (
        <span className={`${currentSize.text} truncate min-w-0 ${shouldCenter ? '' : 'flex-1 overflow-hidden'}`} title={teamName}>
          {teamName}
        </span>
      )}
    </div>
  )
}
