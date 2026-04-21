"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/app/lib/utils/cn"
import { getNbaTeamLogoUrlByFullName } from "@/app/lib/nbaTeamLogos"
import type { NbaTeamOption } from "@/app/lib/minigames/whoHePlayForTeams"

type EnrichedTeam = NbaTeamOption & { logoUrl?: string }

type WhoHePlayForTeamPickerProps = {
  teams: NbaTeamOption[]
  value: string
  onChange: (abbr: string) => void
  disabled?: boolean
  id?: string
}

export function WhoHePlayForTeamPicker({
  teams,
  value,
  onChange,
  disabled,
  id,
}: WhoHePlayForTeamPickerProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  const enriched = useMemo<EnrichedTeam[]>(
    () =>
      teams.map((t) => ({
        ...t,
        logoUrl: getNbaTeamLogoUrlByFullName(t.label),
      })),
    [teams]
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return enriched
    return enriched.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.abbr.toLowerCase().includes(q)
    )
  }, [enriched, filter])

  const selected = value
    ? enriched.find((t) => t.abbr === value)
    : undefined

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const handlePick = useCallback(
    (abbr: string) => {
      onChange(abbr)
      setOpen(false)
      setFilter("")
    },
    [onChange]
  )

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-auto min-h-10 w-full justify-between gap-2 px-3 py-2 font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {selected ? (
            <>
              <TeamLogo url={selected.logoUrl} abbr={selected.abbr} />
              <span className="truncate text-sm">
                {selected.label}{" "}
                <span className="text-muted-foreground">({selected.abbr})</span>
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select a team…</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </Button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 flex max-h-[min(22rem,60vh)] flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="shrink-0 border-b bg-popover p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-9 pl-8"
                placeholder="Filter by city or abbreviation…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                autoFocus
                aria-label="Filter teams"
                onKeyDown={(e) => {
                  e.stopPropagation()
                }}
              />
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No teams match &ldquo;{filter.trim()}&rdquo;
              </li>
            ) : (
              filtered.map((t) => (
                <li key={t.abbr} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === t.abbr}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:bg-accent focus-visible:text-accent-foreground",
                      value === t.abbr && "bg-accent/50"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(t.abbr)}
                  >
                    <TeamLogo url={t.logoUrl} abbr={t.abbr} />
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {t.abbr}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function TeamLogo({ url, abbr }: { url?: string; abbr: string }) {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      {url ? (
        <Image
          src={url}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
          unoptimized
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
          {abbr}
        </span>
      )}
    </span>
  )
}
