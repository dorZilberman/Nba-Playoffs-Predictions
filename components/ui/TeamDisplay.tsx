"use client"

import { useMemo } from "react"
import Image from "next/image"
import { useTeams } from "@/components/teams-provider"

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
  const { getTeamByName, loading } = useTeams()
  
  const team = useMemo(() => {
    if (!teamName || teamName === "TBD") {
      return null
    }
    return getTeamByName(teamName)
  }, [teamName, getTeamByName])

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
          <Image
            src={team.logoUrl}
            alt={teamName}
            width={64}
            height={64}
            className="w-full h-full object-contain"
            unoptimized
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
