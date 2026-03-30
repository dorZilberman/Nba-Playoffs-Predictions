"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
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
  /** Pre-formatted on the server — must not use client-only Intl here (hydration). */
  launchAtLabel: string
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

const FIREWORK_EMOJIS = ["✨", "🎆", "🎇", "⭐", "💫", "🎉", "✨", "🎆"] as const

const FIREWORK_BURSTS: { x: number; y: number; delay: number }[] = [
  { x: 10, y: 16, delay: 0 },
  { x: 52, y: 10, delay: 0.12 },
  { x: 90, y: 20, delay: 0.24 },
  { x: 22, y: 42, delay: 0.36 },
  { x: 78, y: 44, delay: 0.48 },
  { x: 48, y: 62, delay: 0.6 },
  { x: 14, y: 72, delay: 0.72 },
  { x: 86, y: 70, delay: 0.84 },
]

const RAYS_PER_BURST = 16

function LaunchFireworks() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      {FIREWORK_BURSTS.map((burst, bi) => (
        <div
          key={bi}
          className="absolute"
          style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
        >
          {Array.from({ length: RAYS_PER_BURST }, (_, j) => {
            const angle = (360 / RAYS_PER_BURST) * j
            const emoji = FIREWORK_EMOJIS[j % FIREWORK_EMOJIS.length]
            return (
              <span
                key={j}
                className="launch-firework-particle absolute left-1/2 top-1/2 text-lg sm:text-2xl md:text-3xl"
                style={
                  {
                    ["--launch-angle"]: `${angle}deg`,
                    animationDelay: `${burst.delay + j * 0.025}s`,
                  } as CSSProperties
                }
              >
                {emoji}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function LaunchCountdownScreen({
  initialIso,
  launchAtLabel,
}: Props) {
  const [iso, setIso] = useState<string | null>(initialIso)
  /** null until after mount — avoids server/client clock mismatch hydration warning */
  const [now, setNow] = useState<number | null>(null)

  /** Prefer client state; fall back to server prop so we never blank if refetch returns null. */
  const effectiveIso = iso ?? initialIso

  useEffect(() => {
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    setIso(initialIso)
  }, [initialIso])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/season/site-launch", { cache: "no-store" })
        if (cancelled || !res.ok) return
        const data = (await res.json()) as { siteLaunchTime?: string | null }
        const next = data.siteLaunchTime
        /** Never replace a valid launch time with null (avoids blank UI if API/DB is flaky on cold deploy). */
        if (!cancelled && next != null && String(next).trim() !== "") {
          setIso(next)
        }
      } catch {
        /* keep initial */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (effectiveIso == null || effectiveIso === "") {
    return null
  }

  const target = new Date(effectiveIso).getTime()
  if (Number.isNaN(target)) return null

  const remaining = now == null ? null : target - now
  const expired = remaining != null && remaining <= 0
  const parts =
    remaining != null && remaining > 0 ? formatParts(remaining) : null

  const d = parts ? String(parts.days) : "—"
  const h = parts ? pad(parts.h) : "—"
  const m = parts ? pad(parts.m) : "—"
  const s = parts ? pad(parts.sec) : "—"

  return (
    <div
      className={`relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-10 px-3 py-8 text-center sm:px-4 ${expired ? "overflow-hidden" : ""}`}
    >
      {expired ? <LaunchFireworks /> : null}

      <div className="relative z-10 flex w-full flex-col items-center gap-10">
      <p
        className={
          expired
            ? "text-2xl sm:text-3xl"
            : "text-sm font-medium uppercase tracking-[0.35em] text-muted-foreground"
        }
      >
        {expired ? (
          <span
            className="inline-block animate-pulse motion-reduce:animate-none"
            aria-hidden
          >
            🎉 🎊 ✨
          </span>
        ) : (
          "Opens in"
        )}
      </p>

      {expired ? (
        <div className="flex max-w-lg flex-col items-center gap-3 px-2">
          <p className="text-3xl font-black tracking-tight text-primary sm:text-4xl md:text-5xl">
            <span aria-hidden>🎆 </span>
            We&apos;re live!
            <span aria-hidden> 🎆</span>
          </p>
          <p className="text-base font-medium text-muted-foreground sm:text-lg">
            Refresh the page to open the bracket.{" "}
            <span className="whitespace-nowrap" aria-hidden>
              🥳 ✨ 🏀
            </span>
          </p>
        </div>
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

      <p className="max-w-xl text-sm text-muted-foreground">{launchAtLabel}</p>

      <div className="w-full max-w-2xl rounded-2xl border-2 border-primary/50 bg-primary/10 px-6 py-8 text-center shadow-lg ring-1 ring-primary/20 sm:px-8 sm:py-10">
        <p className="text-base font-bold uppercase tracking-widest text-primary sm:text-lg">
          Paybox link
        </p>
        <a
          href="https://links.payboxapp.com/jc7XmjzsV1b"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block break-all text-lg font-semibold leading-snug text-foreground underline decoration-2 underline-offset-[6px] transition-colors hover:text-primary sm:mt-5 sm:text-xl md:text-2xl"
        >
          https://links.payboxapp.com/jc7XmjzsV1b
        </a>
      </div>

      <Button variant="outline" size="lg" className="text-base" asChild>
        <Link href="/rules">Rules &amp; scoring</Link>
      </Button>
      </div>
    </div>
  )
}
