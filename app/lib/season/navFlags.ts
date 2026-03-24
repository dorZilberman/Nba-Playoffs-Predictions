import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import {
  isAnalyticsAvailable,
  isWhatIfAvailable,
  seasonRawToAnalyticsInput,
  seasonRawToPlayoffsInput,
} from "@/app/lib/locking/earlyFinalsLock"

export async function getSeasonNavGateFlags(): Promise<{
  showWhatIf: boolean
  showAnalytics: boolean
}> {
  await dbConnect()
  const raw = await Season.collection.findOne({ isActive: true })
  return {
    showWhatIf: isWhatIfAvailable(seasonRawToPlayoffsInput(raw)),
    showAnalytics: isAnalyticsAvailable(seasonRawToAnalyticsInput(raw)),
  }
}
