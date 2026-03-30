"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function formatParts(ms: number) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return { days, h, m, sec }
}

type Props = {
  initialIso: string
}

const NUMBER_CLASS =
  "font-black tabular-nums leading-none text-primary [font-size:clamp(1.75rem,9vmin,5.5rem)]"

const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"

function Colon() {
  return (
    <span
      className="select-none pb-[0.12em] text-3xl font-light leading-none text-primary/45 sm:text-5xl md:text-7xl"
      aria-hidden
    >
      :
    </span>
  )
}

export function LaunchCountdownScreen({ initialIso }: Props) {
  const router = useRouter()
  const refreshedAfterOpenRef = useRef(false)
  const [iso, setIso] = useState<string | null>(initialIso)
  /** null until after mount — avoids server/client clock mismatch hydration warning */
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/season/site-launch", { cache: "no-store" })
        if (cancelled || !res.ok) return
        const data = (await res.json()) as { siteLaunchTime?: string | null }
        if (!cancelled) setIso(data.siteLaunchTime ?? null)
      } catch {
        /* keep initial */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (iso == null || now == null) return
    const target = new Date(iso).getTime()
    if (Number.isNaN(target)) return
    if (now < target) return
    if (refreshedAfterOpenRef.current) return
    refreshedAfterOpenRef.current = true
    router.refresh()
  }, [iso, now, router])

  if (iso == null) {
    return null
  }

  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso))

  const remaining = now == null ? null : target - now
  const expired = remaining != null && remaining <= 0
  const parts =
    remaining != null && remaining > 0 ? formatParts(remaining) : null

  const d = parts ? String(parts.days) : "—"
  const h = parts ? pad(parts.h) : "—"
  const m = parts ? pad(parts.m) : "—"
  const s = parts ? pad(parts.sec) : "—"

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-10 px-3 py-8 text-center sm:px-4">
      <p className="text-sm font-medium uppercase tracking-[0.35em] text-muted-foreground">
        Opens in
      </p>

      {expired ? (
        <p className="text-2xl font-semibold text-muted-foreground">
          We&apos;re live — use the menu to open the bracket.
        </p>
      ) : (
        <div
          className="mx-auto grid w-full max-w-6xl items-end justify-items-center gap-x-0.5 sm:gap-x-1 md:gap-x-2"
          style={{
            gridTemplateColumns:
              "minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr)",
            gridTemplateRows: "auto auto",
          }}
        >
          {/* d : h : m : s — horizontal on all breakpoints */}
          <span className={`${NUMBER_CLASS} col-start-1 row-start-1 justify-self-center`}>
            {d}
          </span>
          <div className="col-start-2 row-start-1 flex items-end justify-center self-end">
            <Colon />
          </div>
          <span className={`${NUMBER_CLASS} col-start-3 row-start-1 justify-self-center`}>
            {h}
          </span>
          <div className="col-start-4 row-start-1 flex items-end justify-center self-end">
            <Colon />
          </div>
          <span className={`${NUMBER_CLASS} col-start-5 row-start-1 justify-self-center`}>
            {m}
          </span>
          <div className="col-start-6 row-start-1 flex items-end justify-center self-end">
            <Colon />
          </div>
          <span className={`${NUMBER_CLASS} col-start-7 row-start-1 justify-self-center`}>
            {s}
          </span>

          <span className={`${LABEL_CLASS} col-start-1 row-start-2 mt-2`}>days</span>
          <span className={`${LABEL_CLASS} col-start-3 row-start-2 mt-2`}>hours</span>
          <span className={`${LABEL_CLASS} col-start-5 row-start-2 mt-2`}>minutes</span>
          <span className={`${LABEL_CLASS} col-start-7 row-start-2 mt-2`}>seconds</span>
        </div>
      )}

      <p className="max-w-xl text-sm text-muted-foreground">{formattedDate}</p>

      <Button variant="outline" size="lg" className="text-base" asChild>
        <Link href="/rules">Rules &amp; scoring</Link>
      </Button>
    </div>
  )
}
