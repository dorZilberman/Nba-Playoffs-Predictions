import { requireAuth } from "@/app/lib/utils/auth"
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient"

export default async function AnalyticsPage() {
  await requireAuth()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      <AnalyticsClient />
    </div>
  )
}
