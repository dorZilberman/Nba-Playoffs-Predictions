"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/app/lib/utils/cn"
import type { HangmanPlayer } from "@/app/lib/minigames/types"

type WhoAmIPlayerPickerProps = {
  players: HangmanPlayer[]
  guessedIds: Set<string>
  value: string
  onChange: (playerId: string) => void
  onSubmitPick: (playerId: string) => void
  disabled?: boolean
  id?: string
  /** After a photo hint, no avatar/initials — name only (avoids matching the hint). */
  hidePlayerHeadshot?: boolean
}

export function WhoAmIPlayerPicker({
  players,
  guessedIds,
  value,
  onChange,
  onSubmitPick,
  disabled,
  id,
  hidePlayerHeadshot = false,
}: WhoAmIPlayerPickerProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(
    () => [...players].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [players]
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const base = q
      ? sorted.filter(
          (p) =>
            p.displayName.toLowerCase().includes(q) ||
            p.team.toLowerCase().includes(q) ||
            p.teamAbbr.toLowerCase().includes(q)
        )
      : sorted
    return base.filter((p) => !guessedIds.has(p.id)).slice(0, 100)
  }, [sorted, filter, guessedIds])

  const selected = value ? players.find((p) => p.id === value) : undefined

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
    (playerId: string) => {
      onChange(playerId)
      setOpen(false)
      setFilter("")
    },
    [onChange]
  )

  const submit = useCallback(() => {
    if (!value || guessedIds.has(value)) return
    onSubmitPick(value)
  }, [value, guessedIds, onSubmitPick])

  return (
    <div ref={rootRef} className="relative w-full max-w-md space-y-2">
      <div className="flex gap-2">
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="h-auto min-h-10 min-w-0 flex-1 justify-between gap-2 px-3 py-2 font-normal"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selected ? (
              <>
                {!hidePlayerHeadshot && (
                  <Head url={selected.photoUrl} name={selected.displayName} />
                )}
                <span className="truncate text-sm">{selected.displayName}</span>
              </>
            ) : (
              <span className="truncate text-sm text-muted-foreground">
                Search players…
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
        <Button
          type="button"
          disabled={disabled || !value || guessedIds.has(value)}
          onClick={submit}
        >
          Guess
        </Button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="Name or team…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
          </div>
          <ul
            className="max-h-[min(320px,50vh)] overflow-y-auto py-1"
            role="listbox"
            aria-label="Players"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
            ) : (
              filtered.map((p) => (
                <li key={p.id} role="none">
                  <button
                    type="button"
                    role="option"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                      p.id === value && "bg-muted"
                    )}
                    onClick={() => handlePick(p.id)}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {p.displayName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.teamAbbr}
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

function Head({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border bg-muted">
        <Image src={url} alt="" fill className="object-cover object-top" sizes="36px" />
      </span>
    )
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-medium text-muted-foreground"
      aria-hidden
    >
      {name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  )
}
