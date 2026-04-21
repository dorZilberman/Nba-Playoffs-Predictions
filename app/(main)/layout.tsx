import { Nav } from "@/components/nav"
import { BracketStandingsProvider } from "@/components/context/BracketStandingsContext"
import { requireAuth } from "@/app/lib/utils/auth"
import { getSeasonNavGateFlags } from "@/app/lib/season/navFlags"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
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
  const pathname = h.get("x-next-pathname") ?? ""

  if (
    preLaunch &&
    !user.isAdmin &&
    pathname &&
    pathname !== "/launch" &&
    pathname !== "/rules"
  ) {
    redirect("/launch")
  }

  const { showWhatIf, showAnalytics } = await getSeasonNavGateFlags()
  const siteLaunchRestricted = preLaunch && !user.isAdmin

  const mainClass =
    pathname === "/launch"
      ? "w-full min-w-0 flex-1 px-0 py-0"
      : "container mx-auto min-w-0 flex-1 px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"

  return (
    <BracketStandingsProvider>
      <div className="flex min-h-screen min-h-dvh flex-col bg-background">
        <Nav
          showWhatIf={showWhatIf}
          showAnalytics={showAnalytics}
          siteLaunchRestricted={siteLaunchRestricted}
        />
        <main className={mainClass}>{children}</main>
      </div>
    </BracketStandingsProvider>
  )
}
