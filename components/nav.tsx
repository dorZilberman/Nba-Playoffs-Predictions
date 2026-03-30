"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import type { UserStanding } from "@/app/api/standings/route"

type NavProps = {
  showWhatIf: boolean
  showAnalytics: boolean
  /** Pre-launch non-admin: only Countdown + Rules */
  siteLaunchRestricted?: boolean
}

export function Nav({
  showWhatIf,
  showAnalytics,
  siteLaunchRestricted,
}: NavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [standingsSummary, setStandingsSummary] = useState<{
    totalScore: number
    rank: number
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid || siteLaunchRestricted) {
      setStandingsSummary(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/standings", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as UserStanding[] | { error?: string }
        if (!Array.isArray(data) || cancelled) return
        if (data.length === 0) {
          setStandingsSummary(null)
          return
        }
        const sorted = [...data].sort((a, b) => b.totalScore - a.totalScore)
        const idx = sorted.findIndex((s) => s.userId === uid)
        if (idx < 0 || cancelled) {
          setStandingsSummary(null)
          return
        }
        setStandingsSummary({
          totalScore: sorted[idx].totalScore,
          rank: idx + 1,
        })
      } catch {
        if (!cancelled) setStandingsSummary(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, pathname, siteLaunchRestricted])

  if (!session) {
    return null
  }

  const homeHref = siteLaunchRestricted ? "/launch" : "/bracket"

  const navItems = siteLaunchRestricted
    ? [
        { href: "/launch" as const, label: "Countdown" },
        { href: "/rules" as const, label: "Rules" },
      ]
    : [
        { href: "/bracket", label: "Bracket" },
        ...(showAnalytics
          ? [{ href: "/analytics" as const, label: "Analytics" }]
          : []),
        { href: "/standings", label: "Standings" },
        ...(showWhatIf ? [{ href: "/what-if" as const, label: "What if" }] : []),
        { href: "/rules", label: "Rules" },
      ]

  if (!siteLaunchRestricted && session.user.isAdmin) {
    navItems.push({ href: "/admin", label: "Admin" })
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <>
      <nav className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            {/* Mobile Burger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href={homeHref} className="text-xl font-bold">
              NBA Playoffs Predictions
            </Link>
            <div className="hidden md:flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {standingsSummary && (
              <span
                className="hidden md:inline shrink-0 text-sm text-muted-foreground whitespace-nowrap"
                aria-live="polite"
              >
                Total: {standingsSummary.totalScore} points, rank #
                {standingsSummary.rank}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-lg font-bold">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t space-y-3">
            {standingsSummary && (
              <p
                className="px-4 text-sm text-muted-foreground"
                aria-live="polite"
              >
                Total: {standingsSummary.totalScore} points, rank #
                {standingsSummary.rank}
              </p>
            )}
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                closeSidebar()
                signOut()
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
