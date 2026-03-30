import { auth } from "@/app/lib/auth"
import { redirect } from "next/navigation"
import {
  getActiveSeasonSiteLaunch,
  isBeforeSiteLaunch,
} from "@/app/lib/siteLaunch"

/**
 * Keep this aligned with middleware pre-launch rules. Sending pre-launch users
 * straight to /launch avoids / → /bracket → /launch chains that flood the
 * App Router (history.replaceState / IPC throttling on Vercel).
 */
export default async function Home() {
  const session = await auth()
  const launchAt = await getActiveSeasonSiteLaunch()
  const preLaunch = isBeforeSiteLaunch(launchAt)

  if (session?.user && preLaunch && !session.user.isAdmin) {
    redirect("/launch")
  }

  redirect("/bracket")
}
