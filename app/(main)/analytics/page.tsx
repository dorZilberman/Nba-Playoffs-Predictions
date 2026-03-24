import { redirect } from "next/navigation"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import {
  isAnalyticsAvailable,
  seasonRawToAnalyticsInput,
} from "@/app/lib/locking/earlyFinalsLock"
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient"

export default async function AnalyticsPage() {
  await requireAuth()
  await dbConnect()
  const raw = await Season.collection.findOne({ isActive: true })
  if (!isAnalyticsAvailable(seasonRawToAnalyticsInput(raw))) {
    redirect("/bracket")
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      <AnalyticsClient />
    </div>
  )
}
