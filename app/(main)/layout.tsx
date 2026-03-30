import { Nav } from "@/components/nav"
import { requireAuth } from "@/app/lib/utils/auth"
import { getSeasonNavGateFlags } from "@/app/lib/season/navFlags"
import { headers } from "next/headers"
import {
  getActiveSeasonSiteLaunch,
  isBeforeSiteLaunch,
} from "@/app/lib/siteLaunch"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  const launchAt = await getActiveSeasonSiteLaunch()
  const preLaunch = isBeforeSiteLaunch(launchAt)
  const h = await headers()
  /** Styling only; pre-launch route gating lives in middleware (avoids redirect loops if this header is missing). */
  const pathname = h.get("x-next-pathname") ?? ""

  const { showWhatIf, showAnalytics } = await getSeasonNavGateFlags()
  const siteLaunchRestricted = preLaunch && !user.isAdmin

  const mainClass =
    pathname === "/launch"
      ? "w-full flex-1 px-0 py-0"
      : "container mx-auto px-4 py-8"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Nav
        showWhatIf={showWhatIf}
        showAnalytics={showAnalytics}
        siteLaunchRestricted={siteLaunchRestricted}
      />
      <main className={mainClass}>{children}</main>
    </div>
  )
}
