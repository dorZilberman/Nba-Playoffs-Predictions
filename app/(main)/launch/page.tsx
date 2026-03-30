import { redirect } from "next/navigation"
import { requireAuth } from "@/app/lib/utils/auth"
import { LaunchCountdownScreen } from "@/components/launch/LaunchCountdownScreen"
import {
  getActiveSeasonSiteLaunch,
  isBeforeSiteLaunch,
} from "@/app/lib/siteLaunch"

export default async function LaunchPage() {
  await requireAuth()

  const launchAt = await getActiveSeasonSiteLaunch()
  if (!isBeforeSiteLaunch(launchAt)) {
    redirect("/bracket")
  }

  /** Format once on the server so client HTML matches (avoids Intl locale/TZ hydration errors). */
  const launchAtLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(launchAt!)

  return (
    <LaunchCountdownScreen
      initialIso={launchAt!.toISOString()}
      launchAtLabel={launchAtLabel}
    />
  )
}
