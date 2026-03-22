import { requireAuth } from "@/app/lib/utils/auth"
import { WhatIfClient } from "@/components/what-if/WhatIfClient"

export default async function WhatIfPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Playoff What If</h1>
      <WhatIfClient />
    </div>
  )
}
