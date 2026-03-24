import { redirect } from "next/navigation"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import {
  isWhatIfAvailable,
  seasonRawToPlayoffsInput,
} from "@/app/lib/locking/earlyFinalsLock"
import { WhatIfClient } from "@/components/what-if/WhatIfClient"

export default async function WhatIfPage() {
  await requireAuth()
  await dbConnect()
  const raw = await Season.collection.findOne({ isActive: true })
  if (!isWhatIfAvailable(seasonRawToPlayoffsInput(raw))) {
    redirect("/bracket")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Playoff What If</h1>
      <WhatIfClient />
    </div>
  )
}
