import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"

export function isBeforeSiteLaunch(
  siteLaunchTime: Date | string | null | undefined
): boolean {
  if (siteLaunchTime == null) return false
  const t = new Date(siteLaunchTime).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() < t
}

export async function getActiveSeasonSiteLaunch(): Promise<Date | null> {
  await dbConnect()
  const raw = await Season.collection.findOne(
    { isActive: true },
    { projection: { siteLaunchTime: 1 } }
  )
  const v = raw?.siteLaunchTime
  if (v == null) return null
  const d = new Date(v as string | Date | number)
  if (Number.isNaN(d.getTime())) return null
  return d
}
