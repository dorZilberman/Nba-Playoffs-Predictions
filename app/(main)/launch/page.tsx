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

  return <LaunchCountdownScreen initialIso={launchAt!.toISOString()} />
}
