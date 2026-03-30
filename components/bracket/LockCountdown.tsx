"use client"

import { useEffect, useState } from "react"
import { Timer } from "lucide-react"
import { cn } from "@/app/lib/utils/cn"

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

interface LockCountdownProps {
  lockAt: Date | string
  /** Hide entirely (e.g. already locked or no winner deadline relevant) */
  hide?: boolean
  className?: string
  iconClassName?: string
}

export function LockCountdown({
  lockAt,
  hide = false,
  className,
  iconClassName,
}: LockCountdownProps) {
  /** null until after mount — Date.now() in useState breaks SSR/client hydration. */
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (hide) return
    const lockMs = new Date(lockAt).getTime()
    if (Number.isNaN(lockMs)) return

    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hide, lockAt])

  if (hide) return null

  const lockMs = new Date(lockAt).getTime()
  if (Number.isNaN(lockMs)) return null

  if (now == null) return null

  const remaining = lockMs - now
  if (remaining <= 0 || remaining > TWENTY_FOUR_HOURS_MS) return null

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 text-xs font-medium tabular-nums text-amber-600 dark:text-amber-400",
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Predictions lock in ${formatRemaining(remaining)}`}
    >
      <Timer className={cn("h-3 w-3 shrink-0", iconClassName)} aria-hidden />
      <span>Locks in {formatRemaining(remaining)}</span>
    </div>
  )
}
